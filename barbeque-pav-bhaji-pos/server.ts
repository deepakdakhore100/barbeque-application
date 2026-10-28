import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { pool, query, testConnection, initDatabaseSchema, seedInitialDataIfEmpty } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // Auto-initialize Neon PostgreSQL tables in the background
  initDatabaseSchema()
    .then(async () => {
      console.log('Neon PostgreSQL tables initialized successfully.');
      await seedInitialDataIfEmpty();
    })
    .catch((err) => {
      console.warn('Neon PostgreSQL auto-init notice:', err.message || err);
    });

  // =========================================================================
  // API Routes: PostgreSQL Database Operations & Queries
  // =========================================================================

  // 1. Health & Connection Status
  app.get('/api/database/status', async (req, res) => {
    try {
      const conn = await testConnection();
      if (!conn.connected) {
        return res.status(500).json(conn);
      }

      // Query table statistics
      const ordersCountRes = await query('SELECT count(*) as total_orders FROM orders');
      const tablesCountRes = await query('SELECT count(*) as total_tables FROM dining_tables');
      const menuCountRes = await query('SELECT count(*) as total_menu FROM menu_items');
      const revenueRes = await query('SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders');

      res.json({
        ...conn,
        stats: {
          totalOrders: parseInt(ordersCountRes.rows[0].total_orders, 10),
          totalTables: parseInt(tablesCountRes.rows[0].total_tables, 10),
          totalMenuItems: parseInt(menuCountRes.rows[0].total_menu, 10),
          totalRevenue: parseFloat(revenueRes.rows[0].total_revenue),
        },
      });
    } catch (err: any) {
      res.status(500).json({ connected: false, error: err.message || String(err) });
    }
  });

  // 2. Initialize Schema
  app.post('/api/database/init', async (req, res) => {
    try {
      const result = await initDatabaseSchema();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // 3. Seed Database
  app.post('/api/database/seed', async (req, res) => {
    try {
      const result = await seedInitialDataIfEmpty();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // 4. Interactive SQL Query Runner (SELECT, SHOW, EXPLAIN)
  app.post('/api/database/query', async (req, res) => {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL query string is required' });
    }

    try {
      const result = await query(sql);
      res.json({
        success: true,
        command: result.command,
        rowCount: result.rowCount,
        fields: result.fields ? result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })) : [],
        rows: result.rows,
        durationMs: result.duration,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || String(err),
      });
    }
  });

  // 5. Fetch Live Orders from PostgreSQL
  app.get('/api/orders', async (req, res) => {
    try {
      const ordersRes = await query(`
        SELECT 
          o.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'menuItemId', oi.menu_item_id,
                'name', oi.name,
                'price', oi.price,
                'quantity', oi.quantity,
                'spiceLevel', oi.spice_level,
                'butterPreference', oi.butter_preference,
                'pavType', oi.pav_type,
                'exclusions', oi.exclusions,
                'specialNotes', oi.special_notes,
                'itemStatus', oi.item_status
              )
            ) FILTER (WHERE oi.id IS NOT NULL), '[]'
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `);

      res.json(ordersRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // 6. Create New Order in PostgreSQL
  app.post('/api/orders', async (req, res) => {
    const { order } = req.body;
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }

    try {
      await pool.query('BEGIN');

      const insertOrderSql = `
        INSERT INTO orders (
          id, order_number, order_type, table_id, table_number, captain_name,
          customer_name, customer_phone, status, subtotal, tax, discount, service_charge,
          total, special_instructions, kot_fired_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          total = EXCLUDED.total
      `;

      await pool.query(insertOrderSql, [
        order.id,
        order.orderNumber,
        order.type || 'in_dine',
        order.tableId || null,
        order.tableNumber || null,
        order.captainName || null,
        order.customerName || null,
        order.customerPhone || null,
        order.status || 'sent_to_kitchen',
        order.subtotal,
        order.tax,
        order.discount || 0,
        order.serviceCharge || 0,
        order.total,
        order.specialInstructions || null,
        order.kotFiredAt || new Date().toISOString(),
      ]);

      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          await pool.query(
            `INSERT INTO order_items (
              id, order_id, menu_item_id, name, price, quantity,
              spice_level, butter_preference, pav_type, exclusions, special_notes, item_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET item_status = EXCLUDED.item_status`,
            [
              item.id,
              order.id,
              item.menuItemId,
              item.name,
              item.price,
              item.quantity,
              item.customization?.spiceLevel || 'Medium',
              item.customization?.butterPreference || 'Normal Butter',
              item.customization?.pavType || 'Standard Butter Pav',
              item.customization?.exclusions || [],
              item.customization?.specialNotes || null,
              item.itemStatus || 'pending',
            ]
          );
        }
      }

      await pool.query('COMMIT');
      res.json({ success: true, orderId: order.id });
    } catch (err: any) {
      await pool.query('ROLLBACK');
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Health check for Render
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // =========================================================================
  // Frontend Serving (Dev via Vite middlewares, Prod via dist)
  // =========================================================================
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Production build not found. Please run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Barbeque Pav Bhaji POS server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
