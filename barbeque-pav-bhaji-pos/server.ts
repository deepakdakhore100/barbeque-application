import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  pool,
  query,
  testConnection,
  initDatabaseSchema,
  insertOrderRecord,
  setDatabaseUrl,
  getMaskedConnectionString,
} from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // Auto-initialize Neon PostgreSQL tables
  initDatabaseSchema()
    .then(() => console.log('PostgreSQL tables initialized.'))
    .catch((err) => console.warn('PostgreSQL init note:', err.message || err));

  // 1. Health & Connection Status
  app.get('/api/database/status', async (req, res) => {
    try {
      const conn = await testConnection();
      let totalOrders = 0;
      let totalTables = 0;
      let totalRevenue = 0;

      if (conn.connected) {
        try {
          const ordersCountRes = await query('SELECT count(*) as total_orders FROM orders');
          totalOrders = parseInt((ordersCountRes.rows[0] as any).total_orders, 10);
        } catch {}

        try {
          const tablesCountRes = await query('SELECT count(*) as total_tables FROM dining_tables');
          totalTables = parseInt((tablesCountRes.rows[0] as any).total_tables, 10);
        } catch {}

        try {
          const revenueRes = await query('SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders');
          totalRevenue = parseFloat((revenueRes.rows[0] as any).total_revenue);
        } catch {}
      }

      res.status(conn.connected ? 200 : 500).json({
        ...conn,
        stats: {
          totalOrders,
          totalTables,
          totalRevenue,
        },
      });
    } catch (err: any) {
      res.status(500).json({ connected: false, error: err.message || String(err) });
    }
  });

  // 2. Update Connection String Dynamically
  app.post('/api/database/config', async (req, res) => {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ error: 'Connection string is required' });

    try {
      const conn = await setDatabaseUrl(connectionString);
      if (conn.connected) {
        await initDatabaseSchema();
      }
      res.json(conn);
    } catch (err: any) {
      res.status(400).json({ connected: false, error: err.message || String(err) });
    }
  });

  // 3. Interactive SQL Query Runner
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

  // 4. Fetch Live Orders
  app.get('/api/orders', async (req, res) => {
    try {
      await initDatabaseSchema();
      const ordersRes = await query(`
        SELECT 
          o.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'name', oi.name,
                'price', oi.price,
                'quantity', oi.quantity,
                'spiceLevel', oi.spice_level,
                'butterPreference', oi.butter_preference,
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

  // 5. Create / Sync Order in PostgreSQL
  app.post('/api/orders', async (req, res) => {
    const { order } = req.body;
    if (!order) {
      return res.status(400).json({ error: 'Order data required' });
    }

    try {
      const result = await insertOrderRecord(order);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Health check for Render
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Frontend Serving
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
