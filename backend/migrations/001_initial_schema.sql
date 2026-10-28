-- SharedBuy PostgreSQL Schema (Phase 1 & Phase 2 + Multi-Locality/State/Country Hierarchy)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Geographic Areas (Scalable by Country -> State/Region -> City/LGA -> Locality/Vicinity)
CREATE TABLE IF NOT EXISTS areas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,                 -- e.g. "Piwoyi District Hub"
    locality VARCHAR(100) NOT NULL,             -- e.g. "Piwoyi", "Lugbe", "Gwarinpa"
    city VARCHAR(100) NOT NULL,                 -- e.g. "Abuja"
    state VARCHAR(100) NOT NULL,                -- e.g. "FCT"
    country VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    country_code VARCHAR(10) NOT NULL DEFAULT 'NG',
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
    launch_phase VARCHAR(30) NOT NULL DEFAULT 'LIVE', -- LIVE, EXPANDING, COMING_SOON
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Verified Collection Hubs within each Locality/Area
CREATE TABLE IF NOT EXISTS collection_hubs (
    id VARCHAR(50) PRIMARY KEY,
    area_id VARCHAR(50) NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,                 -- e.g. "New Extension Hub"
    landmark VARCHAR(150) NOT NULL,             -- e.g. "16 Biana street, New Extension"
    address TEXT NOT NULL,                      -- e.g. "16 Biana street, New Extension, Piwoyi, Abuja"
    map_url TEXT,
    manager_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    password_hash TEXT,
    role VARCHAR(30) NOT NULL DEFAULT 'MEMBER', -- MEMBER, UNIT_MANAGER, DISTRIBUTOR, ADMIN
    admin_subrole VARCHAR(30),                  -- SUPER_ADMIN, OPS, FINANCE, SUPPORT
    area_id VARCHAR(50) REFERENCES areas(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
    rating NUMERIC(3, 2) DEFAULT 5.00,
    wallet_balance_kobo BIGINT NOT NULL DEFAULT 0,
    referral_code VARCHAR(50) UNIQUE,
    referred_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    referral_earnings_kobo BIGINT NOT NULL DEFAULT 0,
    referrals_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url TEXT,
    description TEXT,
    pack_size VARCHAR(50) NOT NULL,             -- e.g. "50kg Bag"
    unit_of_share VARCHAR(50) NOT NULL,         -- e.g. "5kg Share"
    shares_per_pack INT NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Suppliers (Legacy / General)
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

-- 6. Supplier Quotes
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

-- 7. Distributor Wholesale Commodities (Phase 2)
CREATE TABLE IF NOT EXISTS distributor_commodities (
    id VARCHAR(50) PRIMARY KEY,
    distributor_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    distributor_name VARCHAR(150) NOT NULL,
    distributor_phone VARCHAR(25) NOT NULL,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    pack_size VARCHAR(50) NOT NULL,
    price_per_pack_kobo BIGINT NOT NULL,
    delivery_fee_kobo BIGINT NOT NULL DEFAULT 0,
    min_order_packs INT NOT NULL DEFAULT 1,
    available_packs INT NOT NULL DEFAULT 50,
    warehouse_location TEXT NOT NULL,
    area_id VARCHAR(50) REFERENCES areas(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, OUT_OF_STOCK
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Units
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE RESTRICT,
    manager_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    area_id VARCHAR(50) REFERENCES areas(id) ON DELETE RESTRICT,
    hub_id VARCHAR(50) REFERENCES collection_hubs(id) ON DELETE SET NULL,
    collection_address TEXT NOT NULL,
    collection_landmark TEXT NOT NULL,
    collection_map_url TEXT,
    total_packs INT NOT NULL DEFAULT 1,
    share_size VARCHAR(50) NOT NULL,
    max_members INT NOT NULL,
    price_per_share_quoted_kobo BIGINT NOT NULL,
    buffer_percent NUMERIC(4, 2) DEFAULT 4.00,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    payment_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    sharing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Unit Members
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
    collected_at TIMESTAMP WITH TIME ZONE
);

-- 10. Payments (Unit Share Purchases & Wallet Top-Ups)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    unit_id VARCHAR(50) REFERENCES units(id) ON DELETE RESTRICT,
    user_name VARCHAR(150),
    user_phone VARCHAR(25),
    user_email VARCHAR(150),
    shares_count INT NOT NULL DEFAULT 1,
    action_type VARCHAR(30) NOT NULL DEFAULT 'UNIT_JOIN', -- UNIT_JOIN, WALLET_TOPUP
    amount_kobo BIGINT NOT NULL,
    gateway_ref VARCHAR(100) UNIQUE NOT NULL,
    gateway VARCHAR(30) NOT NULL DEFAULT 'PAYSTACK',
    status VARCHAR(20) NOT NULL DEFAULT 'INITIALIZED', -- INITIALIZED, SUCCESS, FAILED
    method VARCHAR(30) DEFAULT 'CARD',
    collection_code VARCHAR(10),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(100)
);

-- 11. Wallet Ledger
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    type VARCHAR(10) NOT NULL, -- CREDIT, DEBIT
    amount_kobo BIGINT NOT NULL,
    balance_after_kobo BIGINT NOT NULL,
    reason TEXT NOT NULL, -- SURPLUS_REFUND, UNIT_REFUND, WALLET_PAYMENT, WITHDRAWAL, REFERRAL_BONUS, MANAGER_COMMISSION
    ref_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Withdrawal Requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    amount_kobo BIGINT NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', -- PENDING, COMPLETED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 13. Purchase Orders (Admin -> Distributor Wholesale Orders)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(60) UNIQUE NOT NULL,
    distributor_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    distributor_name VARCHAR(150) NOT NULL,
    distributor_phone VARCHAR(25) NOT NULL,
    created_by_admin_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    area_id VARCHAR(50) REFERENCES areas(id) ON DELETE SET NULL,
    destination_area VARCHAR(150) NOT NULL,
    destination_landmarks TEXT[] DEFAULT '{}',
    total_packs INT NOT NULL DEFAULT 1,
    total_goods_cost_kobo BIGINT NOT NULL,
    total_delivery_fee_kobo BIGINT NOT NULL,
    total_amount_kobo BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED
    associated_unit_ids TEXT[] DEFAULT '{}',
    driver_name VARCHAR(150),
    driver_phone VARCHAR(25),
    vehicle_plate VARCHAR(50),
    waybill_number VARCHAR(50),
    notes TEXT,
    ordered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- 14. Manager Commissions
CREATE TABLE IF NOT EXISTS manager_commissions (
    id VARCHAR(50) PRIMARY KEY,
    manager_id VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    unit_id VARCHAR(50) REFERENCES units(id) ON DELETE CASCADE,
    amount_kobo BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PAID', -- PENDING, APPROVED, PAID
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Disputes
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

-- 16. Audit Logs
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

-- 17. Settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. OTP Codes for phone sign-in
CREATE TABLE IF NOT EXISTS otp_codes (
    phone VARCHAR(25) PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Notification Logs (Termii SMS & WhatsApp Dispatch Ledger)
CREATE TABLE IF NOT EXISTS notification_logs (
    id VARCHAR(50) PRIMARY KEY,
    recipient VARCHAR(30) NOT NULL,
    recipient_name VARCHAR(150),
    channel VARCHAR(30) NOT NULL,               -- SMS_DND, WHATSAPP, SMS_GENERIC
    category VARCHAR(50) NOT NULL,              -- OTP, PAYMENT_RECEIPT, HUB_ARRIVAL, PICKUP_REMINDER, REFUND_ALERT
    unit_id VARCHAR(50),
    message TEXT NOT NULL,
    gateway VARCHAR(30) NOT NULL DEFAULT 'TERMII',
    gateway_msg_id VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'SENT', -- DELIVERED, SENT, SIMULATED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & geographic filtering
CREATE INDEX IF NOT EXISTS idx_areas_hierarchy ON areas(country_code, state, city, locality);
CREATE INDEX IF NOT EXISTS idx_hubs_area ON collection_hubs(area_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_area ON units(area_id);
CREATE INDEX IF NOT EXISTS idx_units_manager ON units(manager_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_unit ON unit_members(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_user ON unit_members(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_code ON unit_members(collection_code);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_po_distributor ON purchase_orders(distributor_id);
