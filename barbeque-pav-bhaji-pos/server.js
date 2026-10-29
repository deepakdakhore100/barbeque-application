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

function cleanConnectionString(connStr) {
  if (!connStr) return connStr;
  let clean = connStr.trim();
  // Strip channel_binding to prevent TLS handshake incompatibilities on poolers
  clean = clean.replace(/([&?])channel_binding=[^&]+(&|$)/, '$1').replace(/\?$/, '');
  // Add uselibpqcompat=true if sslmode is specified to satisfy modern pg driver without warning
  if (clean.includes('sslmode=') && !clean.includes('uselibpqcompat=')) {
    const separator = clean.includes('?') ? '&' : '?';
    clean = `${clean}${separator}uselibpqcompat=true`;
  }
  return clean;
}

function replaceDbInUrl(connStr, newDbName) {
  try {
    const url = new URL(connStr);
    url.pathname = `/${newDbName}`;
    return url.toString();
  } catch {
    return connStr.replace(/\/[a-zA-Z0-9_.-]+(\?|$)/, `/${newDbName}$1`);
  }
}

function extractDbName(connStr) {
  try {
    const url = new URL(connStr);
    return url.pathname.replace(/^\//, '') || 'neondb';
  } catch {
    const match = connStr.match(/\/([a-zA-Z0-9_.-]+)(\?|$)/);
    return match ? match[1] : 'neondb';
  }
}

let configuredConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WwLSkUcfs0E9@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/Barbeque_ledger?sslmode=require';

let activeDatabase = extractDbName(configuredConnectionString);
let isFallbackActive = false;
let currentConnectionString = configuredConnectionString;

function createPool(connStr) {
  const cleanConn = cleanConnectionString(connStr);
  return new Pool({
    connectionString: cleanConn,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

let pool = createPool(currentConnectionString);
let connectionInitPromise = null;

async function ensureConnectionReady() {
  if (connectionInitPromise) {
    return connectionInitPromise.then(() => ({ database: activeDatabase, fallback: isFallbackActive }));
  }

  connectionInitPromise = (async () => {
    const targetDb = extractDbName(configuredConnectionString);
    try {
      const res = await pool.query('SELECT current_database() as db');
      activeDatabase = res.rows[0].db;
      isFallbackActive = activeDatabase.toLowerCase() !== targetDb.toLowerCase();
      console.log(`[PostgreSQL] Connected directly to database "${activeDatabase}".`);
    } catch (err) {
      if (err.code === '3D000' || (err.message && err.message.toLowerCase().includes('does not exist'))) {
        console.warn(`[PostgreSQL] Database "${targetDb}" does not exist on Neon.`);
        const fallbackDb = targetDb.toLowerCase() === 'neondb' ? 'postgres' : 'neondb';
        const fallbackUrl = replaceDbInUrl(configuredConnectionString, fallbackDb);
        const fallbackPool = createPool(fallbackUrl);

        let createdTarget = false;
        try {
          await fallbackPool.query(`CREATE DATABASE "${targetDb}"`);
          console.log(`[PostgreSQL] Database "${targetDb}" created automatically on Neon.`);
          createdTarget = true;
        } catch (createErr) {
          console.warn(`[PostgreSQL] Note: Auto-create database not permitted via pooler (${createErr.message}). Switching to default database "${fallbackDb}".`);
        }

        if (createdTarget) {
          try {
            await fallbackPool.end();
          } catch {}
          activeDatabase = targetDb;
          isFallbackActive = false;
        } else {
          try {
            await pool.end();
          } catch {}
          pool = fallbackPool;
          currentConnectionString = fallbackUrl;
          activeDatabase = fallbackDb;
          isFallbackActive = true;
          console.log(`[PostgreSQL] Active database set to "${fallbackDb}". All tables and orders will be safely persisted in "${fallbackDb}".`);
        }
      } else {
        throw err;
      }
    }
  })();

  try {
    await connectionInitPromise;
  } catch (err) {
    connectionInitPromise = null;
    throw err;
  }

  return { database: activeDatabase, fallback: isFallbackActive };
}

// Schema creation
async function ensureTables() {
  await ensureConnectionReady().catch((e) => {
    console.warn('[PostgreSQL] Pre-schema note:', e.message);
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS dining_tables (
      id VARCHAR(50) PRIMARY KEY,
      number VARCHAR(20) NOT NULL,
      section VARCHAR(50) NOT NULL,
      capacity INT NOT NULL DEFAULT 4,
      status VARCHAR(30) NOT NULL DEFAULT 'available',
      current_order_id VARCHAR(50),
      guest_count INT,
      assigned_captain VARCHAR(100),
      seated_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      description TEXT,
      image_url TEXT,
      is_veg BOOLEAN DEFAULT TRUE,
      is_jain_available BOOLEAN DEFAULT TRUE,
      prep_time_minutes INT DEFAULT 8,
      station VARCHAR(50) DEFAULT 'Tawa Griddle',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL,
      order_type VARCHAR(30) NOT NULL DEFAULT 'in_dine',
      table_id VARCHAR(50),
      table_number VARCHAR(20),
      captain_name VARCHAR(100),
      customer_name VARCHAR(150),
      customer_phone VARCHAR(50),
      status VARCHAR(40) NOT NULL DEFAULT 'sent_to_kitchen',
      subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
      tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(10, 2) DEFAULT 0,
      service_charge NUMERIC(10, 2) DEFAULT 0,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      special_instructions TEXT,
      kot_fired_at TIMESTAMP WITH TIME ZONE,
      kitchen_acknowledged_at TIMESTAMP WITH TIME ZONE,
      kitchen_ready_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(50) PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      menu_item_id VARCHAR(50),
      name VARCHAR(150) NOT NULL,
      price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      quantity INT NOT NULL DEFAULT 1,
      spice_level VARCHAR(30) DEFAULT 'Medium',
      butter_preference VARCHAR(50) DEFAULT 'Normal Butter',
      pav_type VARCHAR(50) DEFAULT 'Standard Butter Pav',
      exclusions TEXT[],
      special_notes TEXT,
      item_status VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id VARCHAR(50) PRIMARY KEY,
      order_id VARCHAR(50),
      method VARCHAR(30) NOT NULL DEFAULT 'UPI_QR',
      transaction_id VARCHAR(100),
      amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
      cash_tendered NUMERIC(10, 2),
      change_given NUMERIC(10, 2),
      paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(sql);
    console.log(`[PostgreSQL] All schema tables confirmed in database "${activeDatabase}".`);
  } catch (e) {
    console.warn('Auto-schema note:', e.message);
  }
}

// Background init
ensureTables();

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Database status
app.get('/api/database/status', async (req, res) => {
  try {
    await ensureConnectionReady().catch(() => {});
    const timeRes = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    activeDatabase = timeRes.rows[0].db_name;
    const targetDb = extractDbName(configuredConnectionString);

    let totalOrders = 0;
    let totalTables = 0;
    let totalRevenue = 0;

    try {
      const ordersCountRes = await pool.query('SELECT count(*) as total_orders FROM orders');
      totalOrders = parseInt(ordersCountRes.rows[0].total_orders, 10);
    } catch {}

    try {
      const tablesCountRes = await pool.query('SELECT count(*) as total_tables FROM dining_tables');
      totalTables = parseInt(tablesCountRes.rows[0].total_tables, 10);
    } catch {}

    try {
      const revRes = await pool.query('SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders');
      totalRevenue = parseFloat(revRes.rows[0].total_revenue);
    } catch {}

    res.json({
      connected: true,
      time: timeRes.rows[0].current_time,
      database: timeRes.rows[0].db_name,
      targetDatabase: targetDb,
      fallbackActive: isFallbackActive,
      version: timeRes.rows[0].pg_version,
      stats: {
        totalOrders,
        totalTables,
        totalRevenue,
      },
    });
  } catch (err) {
    const targetDb = extractDbName(configuredConnectionString);
    let hint = err.message || String(err);
    if (err.code === '28P01') {
      hint = "Password authentication failed for user 'neondb_owner'. Neon passwords can be reset in console.neon.tech. Paste your fresh connection string in the Reconnect box.";
    } else if (err.code === '3D000') {
      hint = `Database "${targetDb}" does not exist on Neon yet. You can create database "${targetDb}" in Neon Console (Databases > New Database) or connect to default database "neondb".`;
    }
    res.status(500).json({
      connected: false,
      error: err.message || String(err),
      targetDatabase: targetDb,
      fallbackActive: isFallbackActive,
      hint,
    });
  }
});

// Update connection string dynamically from UI
app.post('/api/database/config', async (req, res) => {
  const { connectionString } = req.body;
  if (!connectionString) return res.status(400).json({ error: 'Connection string is required' });

  try {
    await pool.end();
  } catch {}

  configuredConnectionString = cleanConnectionString(connectionString);
  currentConnectionString = configuredConnectionString;
  activeDatabase = extractDbName(configuredConnectionString);
  isFallbackActive = false;
  connectionInitPromise = null;
  pool = createPool(currentConnectionString);

  try {
    await ensureConnectionReady();
    await ensureTables();
    res.json({
      success: true,
      connected: true,
      message: 'Connected to PostgreSQL successfully',
      database: activeDatabase,
      targetDatabase: extractDbName(configuredConnectionString),
      fallbackActive: isFallbackActive,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      connected: false,
      error: err.message || String(err),
      hint: err.code === '28P01' ? 'Password authentication failed. Please update password in Neon console.' : undefined,
    });
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

// Fetch all orders
app.get('/api/orders', async (req, res) => {
  try {
    await ensureTables();
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

// INSERT / UPSERT order into PostgreSQL
app.post('/api/orders', async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ error: 'Order data required' });

  try {
    await ensureTables();

    const insertOrderSql = `
      INSERT INTO orders (
        id, order_number, order_type, table_id, table_number, captain_name,
        customer_name, customer_phone, status, subtotal, tax, discount, service_charge,
        total, special_instructions, kot_fired_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        subtotal = EXCLUDED.subtotal,
        tax = EXCLUDED.tax,
        total = EXCLUDED.total,
        table_number = EXCLUDED.table_number,
        captain_name = EXCLUDED.captain_name,
        special_instructions = EXCLUDED.special_instructions
    `;

    const orderTime = order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString();

    await pool.query(insertOrderSql, [
      order.id || `ord_${Date.now()}`,
      order.orderNumber || `#BBQ-${Math.floor(1000 + Math.random() * 9000)}`,
      order.type || 'in_dine',
      order.tableId || null,
      order.tableNumber || null,
      order.captainName || null,
      order.customerName || null,
      order.customerPhone || null,
      order.status || 'sent_to_kitchen',
      order.subtotal || 0,
      order.tax || 0,
      order.discount || 0,
      order.serviceCharge || 0,
      order.total || 0,
      order.specialInstructions || null,
      order.kotFiredAt ? new Date(order.kotFiredAt).toISOString() : orderTime,
      orderTime,
    ]);

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const itemId = item.id || `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await pool.query(
          `INSERT INTO order_items (
            id, order_id, menu_item_id, name, price, quantity,
            spice_level, butter_preference, pav_type, exclusions, special_notes, item_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            item_status = EXCLUDED.item_status`,
          [
            itemId,
            order.id,
            item.menuItemId || null,
            item.name || 'Menu Item',
            item.price || 0,
            item.quantity || 1,
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

    res.json({ success: true, orderId: order.id, database: activeDatabase });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || String(err) });
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
