-- SharedBuy PostgreSQL Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Areas
CREATE TABLE IF NOT EXISTS areas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    password_hash TEXT,
    role VARCHAR(30) NOT NULL DEFAULT 'MEMBER', -- MEMBER, UNIT_MANAGER, ADMIN
    admin_subrole VARCHAR(30), -- SUPER_ADMIN, OPS, FINANCE, SUPPORT
    area_id VARCHAR(50) REFERENCES areas(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
    rating NUMERIC(3, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url TEXT,
    description TEXT,
    pack_size VARCHAR(50) NOT NULL, -- e.g. "50kg bag"
    unit_of_share VARCHAR(50) NOT NULL, -- e.g. "5kg"
    shares_per_pack INT NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(150),
    address TEXT NOT NULL,
    products_supplied TEXT,
    rating NUMERIC(3, 2) DEFAULT 4.80,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Quotes
CREATE TABLE IF NOT EXISTS supplier_quotes (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
    supplier_id VARCHAR(50) REFERENCES suppliers(id) ON DELETE CASCADE,
    price_per_pack_kobo BIGINT NOT NULL,
    delivery_fee_kobo BIGINT NOT NULL DEFAULT 0,
    min_order_packs INT NOT NULL DEFAULT 1,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Units
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE RESTRICT,
    manager_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    area_id VARCHAR(50) REFERENCES areas(id) ON DELETE RESTRICT,
    collection_address TEXT NOT NULL,
    collection_landmark TEXT NOT NULL,
    total_packs INT NOT NULL DEFAULT 1,
    share_size VARCHAR(50) NOT NULL,
    max_members INT NOT NULL,
    price_per_share_quoted_kobo BIGINT NOT NULL,
    buffer_percent NUMERIC(4, 2) DEFAULT 4.00,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    payment_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    sharing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unit Members
CREATE TABLE IF NOT EXISTS unit_members (
    id VARCHAR(50) PRIMARY KEY,
    unit_id VARCHAR(50) REFERENCES units(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    shares_count INT NOT NULL DEFAULT 1,
    amount_paid_kobo BIGINT NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, REFUNDED
    collection_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COLLECTED, NO_SHOW
    collection_code VARCHAR(10) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    collected_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_unit_member UNIQUE(unit_id, user_id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    unit_id VARCHAR(50) REFERENCES units(id) ON DELETE RESTRICT,
    amount_kobo BIGINT NOT NULL,
    gateway_ref VARCHAR(100) UNIQUE NOT NULL,
    gateway VARCHAR(30) NOT NULL DEFAULT 'PAYSTACK',
    status VARCHAR(20) NOT NULL DEFAULT 'INITIALIZED', -- INITIALIZED, SUCCESS, FAILED
    method VARCHAR(30) DEFAULT 'CARD',
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(100)
);

-- Wallet Ledger
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL, -- CREDIT, DEBIT
    amount_kobo BIGINT NOT NULL,
    balance_after_kobo BIGINT NOT NULL,
    reason VARCHAR(50) NOT NULL, -- SURPLUS_REFUND, UNIT_REFUND, WALLET_PAYMENT, WITHDRAWAL
    ref_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    unit_id VARCHAR(50) REFERENCES units(id) ON DELETE RESTRICT,
    supplier_id VARCHAR(50) REFERENCES suppliers(id) ON DELETE RESTRICT,
    final_price_per_pack_kobo BIGINT NOT NULL,
    total_cost_kobo BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ordered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    driver_phone VARCHAR(25) NOT NULL,
    vehicle_note TEXT,
    delivery_cost_kobo BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    expected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Manager Commissions
CREATE TABLE IF NOT EXISTS manager_commissions (
    id VARCHAR(50) PRIMARY KEY,
    manager_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    unit_id VARCHAR(50) REFERENCES units(id) ON DELETE CASCADE,
    amount_kobo BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, PAID
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(50) PRIMARY KEY,
    unit_id VARCHAR(50) REFERENCES units(id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL, -- SHORTAGE, QUALITY, NO_SHOW, OTHER
    description TEXT NOT NULL,
    photo_urls TEXT[] DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED, REJECTED
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    actor_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OTP Codes for phone sign-in
CREATE TABLE IF NOT EXISTS otp_codes (
    phone VARCHAR(25) PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_area ON units(area_id);
CREATE INDEX IF NOT EXISTS idx_units_manager ON units(manager_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_unit ON unit_members(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_user ON unit_members(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_code ON unit_members(collection_code);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_ledger(user_id);
