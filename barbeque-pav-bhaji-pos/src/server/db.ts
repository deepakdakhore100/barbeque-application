import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Default connection string
let currentConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:<dummy-password>@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export function getConnectionString(): string {
  return currentConnectionString;
}

export function getMaskedConnectionString(): string {
  try {
    const url = new URL(currentConnectionString);
    return `${url.protocol}//${url.username}:****@${url.host}${url.pathname}${url.search}`;
  } catch {
    return 'postgresql://neondb_owner:****@neon.tech/neondb';
  }
}

export let pool = createPool(currentConnectionString);

function createPool(connStr: string) {
  // Strip channel_binding if present to avoid driver issues
  const cleanConn = connStr.replace(/([&?])channel_binding=[^&]+(&|$)/, '$1').replace(/\?$/, '');
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

export async function setDatabaseUrl(newUrl: string) {
  currentConnectionString = newUrl.trim();
  try {
    await pool.end();
  } catch {
    // Ignore error closing old pool
  }
  pool = createPool(currentConnectionString);
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
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    return {
      connected: true,
      time: res.rows[0].current_time,
      database: res.rows[0].db_name,
      version: res.rows[0].pg_version,
      connectionUrl: getMaskedConnectionString(),
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || String(error),
      connectionUrl: getMaskedConnectionString(),
    };
  }
}

export async function initDatabaseSchema() {
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

    -- 3. In-Dine, Online & Bulk Orders (No restrictive FKs so all orders always insert cleanly)
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
  return { success: true, message: 'Schema tables initialized successfully in Neon PostgreSQL' };
}

export async function insertOrderRecord(order: any) {
  // Ensure tables exist first
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

  return { success: true, orderId: order.id };
}
