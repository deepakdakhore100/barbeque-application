import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

export function cleanConnectionString(connStr: string): string {
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

export function replaceDbInUrl(connStr: string, newDbName: string): string {
  try {
    const url = new URL(connStr);
    url.pathname = `/${newDbName}`;
    return url.toString();
  } catch {
    return connStr.replace(/\/[a-zA-Z0-9_.-]+(\?|$)/, `/${newDbName}$1`);
  }
}

export function extractDbName(connStr: string): string {
  try {
    const url = new URL(connStr);
    return url.pathname.replace(/^\//, '') || 'neondb';
  } catch {
    const match = connStr.match(/\/([a-zA-Z0-9_.-]+)(\?|$)/);
    return match ? match[1] : 'neondb';
  }
}

// Configured connection string (defaults to Barbeque_ledger on Neon)
let configuredConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WwLSkUcfs0E9@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/Barbeque_ledger?sslmode=require';

let activeDatabase = extractDbName(configuredConnectionString);
let isFallbackActive = false;
let currentConnectionString = configuredConnectionString;

export function getConnectionString(): string {
  return currentConnectionString;
}

export function getActiveDatabase(): string {
  return activeDatabase;
}

export function getIsFallbackActive(): boolean {
  return isFallbackActive;
}

export function getMaskedConnectionString(): string {
  try {
    const url = new URL(currentConnectionString);
    return `${url.protocol}//${url.username}:****@${url.host}${url.pathname}${url.search}`;
  } catch {
    return `postgresql://neondb_owner:****@neon.tech/${activeDatabase}`;
  }
}

export function createPool(connStr: string) {
  const cleanConn = cleanConnectionString(connStr);
  return new Pool({
    connectionString: cleanConn,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

export let pool = createPool(currentConnectionString);

let connectionInitPromise: Promise<void> | null = null;

export async function ensureConnectionReady(): Promise<{ database: string; fallback: boolean }> {
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
    } catch (err: any) {
      // 3D000 = INVALID_CATALOG_NAME (database does not exist)
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
        } catch (createErr: any) {
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

export async function setDatabaseUrl(newUrl: string) {
  configuredConnectionString = cleanConnectionString(newUrl);
  currentConnectionString = configuredConnectionString;
  activeDatabase = extractDbName(configuredConnectionString);
  isFallbackActive = false;
  connectionInitPromise = null;

  // Persist to .env file for restart longevity
  try {
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf-8');
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${configuredConnectionString}"`);
      } else {
        envContent += `\nDATABASE_URL="${configuredConnectionString}"\n`;
      }
    } else {
      envContent = `DATABASE_URL="${configuredConnectionString}"\n`;
    }
    fs.writeFileSync('.env', envContent, 'utf-8');
  } catch (e) {
    console.warn('Could not write to .env:', e);
  }

  try {
    await pool.end();
  } catch {
    // Ignore error closing old pool
  }

  pool = createPool(currentConnectionString);

  try {
    await ensureConnectionReady();
    await initDatabaseSchema();
  } catch (e: any) {
    console.warn('[PostgreSQL] Reconnect schema init note:', e.message || e);
  }

  return testConnection();
}

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return { ...res, duration };
}

export async function testConnection() {
  try {
    await ensureConnectionReady().catch(() => {});
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    activeDatabase = res.rows[0].db_name;
    const targetDb = extractDbName(configuredConnectionString);
    return {
      connected: true,
      time: res.rows[0].current_time,
      database: res.rows[0].db_name,
      targetDatabase: targetDb,
      fallbackActive: isFallbackActive,
      version: res.rows[0].pg_version,
      connectionUrl: getMaskedConnectionString(),
    };
  } catch (error: any) {
    const targetDb = extractDbName(configuredConnectionString);
    let hint = error.message || String(error);
    if (error.code === '28P01') {
      hint = "Password authentication failed for user 'neondb_owner'. Neon passwords can be reset in console.neon.tech. Paste your fresh connection string into the Reconnect form.";
    } else if (error.code === '3D000') {
      hint = `Database "${targetDb}" does not exist on Neon. You can create database "${targetDb}" in Neon Console (Databases > New Database) or connect to default database "neondb".`;
    }
    return {
      connected: false,
      error: error.message || String(error),
      code: error.code,
      hint,
      targetDatabase: targetDb,
      fallbackActive: isFallbackActive,
      connectionUrl: getMaskedConnectionString(),
    };
  }
}

export async function initDatabaseSchema() {
  await ensureConnectionReady().catch((e) => {
    console.warn('[PostgreSQL] Pre-schema connection check note:', e.message);
  });

  const schemaSql = `
    -- 1. Tables & Dining Layout
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

    -- 2. Menu Items & Recipe Matrix
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

    -- 3. In-Dine, Online & Bulk Orders (Safe without restrictive FKs so all orders always record cleanly)
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

    -- 4. Order Items & Customizations
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

    -- 5. Payment Records
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

  await pool.query(schemaSql);
  return {
    success: true,
    database: activeDatabase,
    fallback: isFallbackActive,
    message: `Schema tables initialized successfully in Neon PostgreSQL (database: "${activeDatabase}")`,
  };
}

export async function insertOrderRecord(order: any) {
  // Ensure tables exist in active database first
  await initDatabaseSchema();

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

  return { success: true, orderId: order.id, database: activeDatabase };
}
