import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Neon PostgreSQL connection string provided by user
const DEFAULT_DATABASE_URL =
  'postgresql://neondb_owner:npg_WwLSkUcfs0E9@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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
      connectionHost: 'ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech',
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || String(error),
    };
  }
}

export async function initDatabaseSchema() {
  const schemaSql = `
    -- 1. Tables & Dining Layout
    CREATE TABLE IF NOT EXISTS dining_tables (
        id VARCHAR(50) PRIMARY KEY,
        number VARCHAR(20) NOT NULL UNIQUE,
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

    -- 3. In-Dine, Online & Bulk Orders
    CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        order_type VARCHAR(30) NOT NULL,
        table_id VARCHAR(50) REFERENCES dining_tables(id),
        table_number VARCHAR(20),
        captain_name VARCHAR(100),
        customer_name VARCHAR(150),
        customer_phone VARCHAR(50),
        status VARCHAR(40) NOT NULL DEFAULT 'sent_to_kitchen',
        subtotal NUMERIC(10, 2) NOT NULL,
        tax NUMERIC(10, 2) NOT NULL,
        discount NUMERIC(10, 2) DEFAULT 0,
        service_charge NUMERIC(10, 2) DEFAULT 0,
        total NUMERIC(10, 2) NOT NULL,
        special_instructions TEXT,
        kot_fired_at TIMESTAMP WITH TIME ZONE,
        kitchen_acknowledged_at TIMESTAMP WITH TIME ZONE,
        kitchen_ready_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Order Items & Customizations
    CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id VARCHAR(50) REFERENCES menu_items(id),
        name VARCHAR(150) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        spice_level VARCHAR(30) DEFAULT 'Medium',
        butter_preference VARCHAR(50) DEFAULT 'Normal Butter',
        pav_type VARCHAR(50) DEFAULT 'Standard Butter Pav',
        exclusions TEXT[],
        special_notes TEXT,
        item_status VARCHAR(30) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Zomato / Swiggy Online Order Details
    CREATE TABLE IF NOT EXISTS online_delivery_orders (
        order_id VARCHAR(50) PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        platform VARCHAR(30) NOT NULL DEFAULT 'Zomato',
        platform_order_id VARCHAR(100) NOT NULL,
        delivery_address TEXT NOT NULL,
        approval_status VARCHAR(30) DEFAULT 'pending',
        rejection_reason TEXT,
        delivery_partner_name VARCHAR(100),
        delivery_partner_phone VARCHAR(50),
        delivery_vehicle VARCHAR(100),
        pickup_otp VARCHAR(10),
        estimated_delivery_time VARCHAR(50)
    );

    -- 6. Bulk & Catering Orders
    CREATE TABLE IF NOT EXISTS bulk_catering_orders (
        order_id VARCHAR(50) PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        event_name VARCHAR(200) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_date DATE NOT NULL,
        target_delivery_time VARCHAR(20) NOT NULL,
        guest_pax_count INT NOT NULL,
        venue_address TEXT NOT NULL,
        live_counter_required BOOLEAN DEFAULT TRUE,
        chaffing_dishes_supplied BOOLEAN DEFAULT TRUE,
        cutlery_included BOOLEAN DEFAULT TRUE,
        advance_deposit_paid NUMERIC(10, 2) DEFAULT 0,
        balance_payment_due NUMERIC(10, 2) DEFAULT 0,
        custom_requirements_notes TEXT
    );

    -- 7. Real-Time Raw Inventory SKUs
    CREATE TABLE IF NOT EXISTS inventory_items (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL,
        current_stock NUMERIC(10, 2) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        min_threshold NUMERIC(10, 2) NOT NULL,
        cost_per_unit NUMERIC(10, 2) NOT NULL,
        supplier VARCHAR(150),
        last_restocked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Payment Records
    CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) REFERENCES orders(id),
        method VARCHAR(30) NOT NULL,
        transaction_id VARCHAR(100),
        amount_paid NUMERIC(10, 2) NOT NULL,
        cash_tendered NUMERIC(10, 2),
        change_given NUMERIC(10, 2),
        split_count INT,
        amount_per_person NUMERIC(10, 2),
        paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(schemaSql);
  return { success: true, message: 'Schema tables initialized successfully in Neon PostgreSQL' };
}

export async function seedInitialDataIfEmpty() {
  const tableCheck = await pool.query('SELECT count(*) as count FROM dining_tables');
  if (parseInt(tableCheck.rows[0].count, 10) > 0) {
    return { seeded: false, message: 'Database already has records' };
  }

  // Seed dining tables
  await pool.query(`
    INSERT INTO dining_tables (id, number, section, capacity, status, guest_count, assigned_captain) VALUES
      ('tbl_t1', 'T-1', 'Indoor AC', 4, 'seated', 3, 'Vikram Joshi'),
      ('tbl_t2', 'T-2', 'Indoor AC', 4, 'in_kitchen', 4, 'Rahul Sharma'),
      ('tbl_t3', 'T-3', 'Indoor AC', 6, 'available', NULL, NULL),
      ('tbl_t4', 'T-4', 'Indoor AC', 2, 'served', 2, 'Vikram Joshi'),
      ('tbl_t5', 'T-5', 'Indoor AC', 4, 'available', NULL, NULL),
      ('tbl_t6', 'T-6', 'Indoor AC', 6, 'billed', 5, 'Amit Deshmukh'),
      ('tbl_p1', 'P-1', 'Barbeque Patio', 4, 'ordering', 4, 'Amit Deshmukh'),
      ('tbl_p2', 'P-2', 'Barbeque Patio', 4, 'available', NULL, NULL),
      ('tbl_l1', 'L-1', 'Family Lounge', 6, 'available', NULL, NULL),
      ('tbl_c1', 'C-1', 'Quick Counter', 2, 'available', NULL, NULL)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Seed menu items
  await pool.query(`
    INSERT INTO menu_items (id, name, category, price, description, is_veg, is_jain_available, prep_time_minutes, station) VALUES
      ('item_bbq_signature', 'Signature Barbeque Pav Bhaji', 'Barbeque Specials', 240, 'Charcoal-smoked slow-cooked bhaji infused with aromatic BBQ herbs, served with 2 golden butter pavs', TRUE, TRUE, 8, 'Tawa Griddle'),
      ('item_cheese_burst_bbq', 'Cheese Burst Barbeque Pav Bhaji', 'Cheese & Gourmet', 290, 'Smoky signature bhaji layered and topped with shredded Amul cheese and butter drizzle', TRUE, TRUE, 9, 'Tawa Griddle'),
      ('item_classic_butter_bhaji', 'Classic Mumbai Butter Pav Bhaji', 'Barbeque Specials', 210, 'Authentic Chowpatty style spiced mashed vegetables with ripe tomatoes and fresh butter', TRUE, TRUE, 7, 'Tawa Griddle'),
      ('item_kolhapuri_teekha_bhaji', 'Kolhapuri Fiery Pav Bhaji', 'Barbeque Specials', 230, 'Intensely spiced with stone-ground Kolhapuri Lavangi chilies and roasted whole spices', TRUE, FALSE, 8, 'Tawa Griddle'),
      ('item_barbeque_tava_pulao', 'Barbeque Special Tava Pulao', 'Tava Pulao & Rice', 230, 'Basmati rice sauteed on hot iron tawa with capsicum, green peas, and rich spices', TRUE, TRUE, 9, 'Tawa Griddle'),
      ('item_extra_butter_pav', 'Extra Butter Pav (Pair of 2)', 'Pav & Accompaniments', 45, 'Fresh bakery soft ladi pav generously toasted on iron griddle with pure butter', TRUE, TRUE, 3, 'Pav Grill'),
      ('item_masala_chaas', 'Smoked Spiced Masala Chaas', 'Beverages & Desserts', 60, 'Refreshing churned curd with roasted cumin, mint, green chili, and mild smoke touch', TRUE, TRUE, 2, 'Beverages'),
      ('item_kesari_gulab_jamun', 'Royal Kesari Gulab Jamun (2 pcs)', 'Beverages & Desserts', 85, 'Soft mawa dumplings steeped in saffron cardamom syrup, served warm', TRUE, TRUE, 2, 'Beverages')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Seed sample initial orders
  await pool.query(`
    INSERT INTO orders (id, order_number, order_type, table_id, table_number, captain_name, status, subtotal, tax, discount, service_charge, total, special_instructions) VALUES
      ('ord_101', '#BBQ-1041', 'in_dine', 'tbl_t1', 'T-1', 'Vikram Joshi', 'sent_to_kitchen', 600, 30, 0, 0, 630, 'Pav nicely grilled and crispy'),
      ('ord_102', '#BBQ-1042', 'in_dine', 'tbl_t2', 'T-2', 'Rahul Sharma', 'kitchen_preparing', 900, 45, 0, 0, 945, 'Strictly Jain - No onion no garlic in gravy'),
      ('ord_103', '#BBQ-1039', 'in_dine', 'tbl_t4', 'T-4', 'Vikram Joshi', 'served', 460, 23, 0, 0, 483, NULL),
      ('ord_104', '#BBQ-1036', 'in_dine', 'tbl_t6', 'T-6', 'Amit Deshmukh', 'billed', 1160, 58, 58, 0, 1160, NULL)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Seed sample order items
  await pool.query(`
    INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, spice_level, butter_preference, pav_type, exclusions, special_notes, item_status) VALUES
      ('oi_1', 'ord_101', 'item_bbq_signature', 'Signature Barbeque Pav Bhaji', 240, 2, 'Medium', 'Extra Amul Butter', 'Standard Butter Pav', '{}', 'Pav crispy', 'preparing'),
      ('oi_2', 'ord_101', 'item_masala_chaas', 'Smoked Spiced Masala Chaas', 60, 2, 'Mild', 'Normal Butter', 'Standard Butter Pav', '{}', NULL, 'preparing'),
      ('oi_3', 'ord_102', 'item_cheese_burst_bbq', 'Cheese Burst Barbeque Pav Bhaji', 290, 2, 'Spicy', 'Extra Amul Butter', 'Kadak Crispy Pav', '{"No Onion (Jain)"}', 'Strictly Jain', 'preparing'),
      ('oi_4', 'ord_102', 'item_barbeque_tava_pulao', 'Barbeque Special Tava Pulao', 230, 1, 'Medium', 'Normal Butter', 'Standard Butter Pav', '{"No Onion (Jain)"}', NULL, 'preparing'),
      ('oi_5', 'ord_102', 'item_extra_butter_pav', 'Extra Butter Pav (Pair of 2)', 45, 2, 'Mild', 'Extra Amul Butter', 'Kadak Crispy Pav', '{}', NULL, 'preparing')
    ON CONFLICT (id) DO NOTHING;
  `);

  return { seeded: true, message: 'Initial sample orders and menu seeded into PostgreSQL' };
}
