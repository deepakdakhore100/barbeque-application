import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DEFAULT_DATABASE_URL =
  'postgresql://neondb_owner:npg_WwLSkUcfs0E9@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Database status
app.get('/api/database/status', async (req, res) => {
  try {
    const timeRes = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    const ordersCountRes = await pool.query('SELECT count(*) as total_orders FROM orders');
    const tablesCountRes = await pool.query('SELECT count(*) as total_tables FROM dining_tables');
    const revenueRes = await pool.query('SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders');

    res.json({
      connected: true,
      time: timeRes.rows[0].current_time,
      database: timeRes.rows[0].db_name,
      version: timeRes.rows[0].pg_version,
      stats: {
        totalOrders: parseInt(ordersCountRes.rows[0].total_orders, 10),
        totalTables: parseInt(tablesCountRes.rows[0].total_tables, 10),
        totalRevenue: parseFloat(revenueRes.rows[0].total_revenue),
      },
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message || String(err) });
  }
});

// Run SQL query directly
app.post('/api/database/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL string is required' });
  try {
    const start = Date.now();
    const result = await pool.query(sql);
    res.json({
      success: true,
      command: result.command,
      rowCount: result.rowCount,
      fields: result.fields ? result.fields.map((f) => ({ name: f.name })) : [],
      rows: result.rows,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

// Fetch orders
app.get('/api/orders', async (req, res) => {
  try {
    const ordersRes = await pool.query(`
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
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Fallback for React Single Page App routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Production build not found. Please run "npm run build".');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Barbeque Pav Bhaji POS production server is active on port ${PORT}`);
});
