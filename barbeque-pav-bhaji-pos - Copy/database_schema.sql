-- ============================================================================
-- Barbeque Pav Bhaji POS - PostgreSQL Database Schema (Neon / Render / Cloud SQL)
-- ============================================================================

-- 1. Tables & Dining Layout
CREATE TABLE IF NOT EXISTS dining_tables (
    id VARCHAR(50) PRIMARY KEY,
    number VARCHAR(20) NOT NULL UNIQUE,
    section VARCHAR(50) NOT NULL, -- 'Indoor AC', 'Barbeque Patio', 'Family Lounge', 'Quick Counter'
    capacity INT NOT NULL DEFAULT 4,
    status VARCHAR(30) NOT NULL DEFAULT 'available', -- 'available', 'seated', 'ordering', 'in_kitchen', 'served', 'billed', 'paid'
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
    category VARCHAR(50) NOT NULL, -- 'Barbeque Specials', 'Cheese & Gourmet', 'Tava Pulao & Rice', etc.
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
    order_type VARCHAR(30) NOT NULL, -- 'in_dine', 'online_zomato', 'bulk_catering', 'takeaway'
    table_id VARCHAR(50) REFERENCES dining_tables(id),
    table_number VARCHAR(20),
    captain_name VARCHAR(100),
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    status VARCHAR(40) NOT NULL DEFAULT 'sent_to_kitchen', -- 'awaiting_approval', 'sent_to_kitchen', 'kitchen_preparing', 'food_ready', 'ready_to_dispatch', 'dispatched', 'served', 'completed', 'cancelled'
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL, -- 5% GST
    discount NUMERIC(10, 2) DEFAULT 0,
    service_charge NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    special_instructions TEXT,
    kot_fired_at TIMESTAMP WITH TIME ZONE,
    kitchen_acknowledged_at TIMESTAMP WITH TIME ZONE,
    kitchen_ready_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Order Items & Modifiers (Spice level, butter, exclusions)
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id VARCHAR(50) REFERENCES menu_items(id),
    name VARCHAR(150) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    spice_level VARCHAR(30) DEFAULT 'Medium', -- 'Mild', 'Medium', 'Spicy', 'Kolhapuri Fiery'
    butter_preference VARCHAR(50) DEFAULT 'Normal Butter',
    pav_type VARCHAR(50) DEFAULT 'Standard Butter Pav',
    exclusions TEXT[], -- ARRAY['No Onion (Jain)', 'No Garlic', 'Less Butter']
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
    approval_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
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
    event_type VARCHAR(50) NOT NULL, -- 'Wedding', 'Corporate Event', 'Birthday Party', 'Festival Gathering'
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
    category VARCHAR(50) NOT NULL, -- 'Bakery', 'Produce', 'Dairy', 'Spices', 'Charcoal & Fuel'
    current_stock NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- 'kg', 'packets', 'blocks', 'pcs', 'liters'
    min_threshold NUMERIC(10, 2) NOT NULL,
    cost_per_unit NUMERIC(10, 2) NOT NULL,
    supplier VARCHAR(150),
    last_restocked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Payment Records & Thermal Bill Settle
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id),
    method VARCHAR(30) NOT NULL, -- 'UPI_QR', 'CASH', 'CARD', 'SPLIT'
    transaction_id VARCHAR(100),
    amount_paid NUMERIC(10, 2) NOT NULL,
    cash_tendered NUMERIC(10, 2),
    change_given NUMERIC(10, 2),
    split_count INT,
    amount_per_person NUMERIC(10, 2),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
