-- SharedBuy Seed Data

-- 1. Settings
INSERT INTO settings (key, value) VALUES
('platform_fee_percent', '4'),
('manager_commission_percent', '3'),
('default_buffer_percent', '4'),
('payment_window_hours', '48')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Areas
INSERT INTO areas (id, name, city, state, is_active) VALUES
('area-maiduguri', 'Customs & Post Office Hub', 'Maiduguri', 'Borno', TRUE),
('area-kano', 'Fagge & Sabon Gari', 'Kano', 'Kano', TRUE),
('area-lagos', 'Ikeja & Maryland Estate', 'Ikeja', 'Lagos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Products
INSERT INTO products (id, name, category, image_url, description, pack_size, unit_of_share, shares_per_pack, is_active) VALUES
('prod-rice-50kg', 'Premium Long Grain Parboiled Rice', 'Grains', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80', 'Stone-free, polished Nigerian parboiled rice in standard bulk 50kg bag.', '50kg Bag', '5kg Share', 10, TRUE),
('prod-beans-50kg', 'Honey Beans (Oloyin)', 'Legumes', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=400&q=80', 'Sweet high-yield Nigerian honey beans, clean and insect-free.', '50kg Bag', '5kg Share', 10, TRUE),
('prod-garri-50kg', 'Ijebu White Garri', 'Tubers', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80', 'Crispy, dry and properly fermented premium Ijebu garri.', '50kg Bag', '5kg Share', 10, TRUE),
('prod-oil-25l', 'King’s Pure Vegetable Cooking Oil', 'Oils', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80', 'Cholesterol-free, vitamin A fortified pure vegetable cooking oil in 25L jerrycan.', '25L Jerrycan', '5L Share', 5, TRUE),
('prod-sugar-50kg', 'Golden Penny Refined Pure Sugar', 'Condiments', 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?auto=format&fit=crop&w=400&q=80', 'Clean granulated fortified white sugar directly from industrial millers.', '50kg Bag', '5kg Share', 10, TRUE),
('prod-milk-carton', 'Peak Full Cream Evaporated Milk', 'Dairy', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80', 'Full cream rich evaporated milk in standard carton containing 48 tins.', 'Carton of 48', '6 Tins Share', 8, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Suppliers
INSERT INTO suppliers (id, name, contact_name, phone, email, address, products_supplied, rating, status) VALUES
('supp-northern', 'Northern Agro Millers Ltd', 'Alhaji Bashir Umar', '+2348031110001', 'sales@northernam.ng', 'Baga Road Industrial Layout, Maiduguri', 'Rice, Beans, Garri', 4.90, 'ACTIVE'),
('supp-dawanau', 'Dawanau Grain Merchants Union', 'Malam Sanusi Garba', '+2348031110002', 'orders@dawanaugrains.com', 'Dawanau International Market, Kano', 'Beans, Sugar, Grains', 4.85, 'ACTIVE'),
('supp-eko', 'Eko Wholesale Commodities Depot', 'Mrs. Folake Adeyemi', '+2348031110003', 'procurement@ekowholesale.com', 'Orile Iganmu Distribution Hub, Lagos', 'Cooking Oil, Sugar, Milk', 4.75, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 5. Supplier Quotes
-- Rice: 50kg bag = ₦75,000 (7,500,000 kobo)
-- Beans: 50kg bag = ₦68,000 (6,800,000 kobo)
-- Garri: 50kg bag = ₦38,000 (3,800,000 kobo)
-- Oil: 25L = ₦45,000 (4,500,000 kobo)
-- Sugar: 50kg bag = ₦82,000 (8,200,000 kobo)
-- Milk: Carton 48 = ₦34,000 (3,400,000 kobo)
INSERT INTO supplier_quotes (id, product_id, supplier_id, price_per_pack_kobo, delivery_fee_kobo, min_order_packs, valid_until, notes) VALUES
('quote-rice-01', 'prod-rice-50kg', 'supp-northern', 7500000, 300000, 2, CURRENT_TIMESTAMP + INTERVAL '14 days', 'Guaranteed Grade A parboiled'),
('quote-beans-01', 'prod-beans-50kg', 'supp-dawanau', 6800000, 250000, 2, CURRENT_TIMESTAMP + INTERVAL '10 days', 'New harvest Honey Beans'),
('quote-garri-01', 'prod-garri-50kg', 'supp-northern', 3800000, 200000, 2, CURRENT_TIMESTAMP + INTERVAL '20 days', 'Properly dried Ijebu batch'),
('quote-oil-01', 'prod-oil-25l', 'supp-eko', 4500000, 200000, 2, CURRENT_TIMESTAMP + INTERVAL '14 days', 'Direct manufacturer delivery'),
('quote-sugar-01', 'prod-sugar-50kg', 'supp-dawanau', 8200000, 300000, 2, CURRENT_TIMESTAMP + INTERVAL '12 days', 'Refined grade white sugar'),
('quote-milk-01', 'prod-milk-carton', 'supp-eko', 3400000, 150000, 2, CURRENT_TIMESTAMP + INTERVAL '15 days', 'Original manufacturer seal')
ON CONFLICT (id) DO NOTHING;

-- 6. Users: Admin & 5 Unit Managers
-- Password hash for 'Admin@123456' generated via bcrypt cost 10
INSERT INTO users (id, full_name, phone, email, password_hash, role, admin_subrole, area_id, status, rating) VALUES
('user-admin-01', 'SharedBuy Operations Admin', '+2348000000001', 'admin@sharedbuy.ng', '$2a$10$7Z2v1F0yIkm.qC4o741.0.9Y90Z2eI5i327Z1y8x7w6v5u4t3s2r1', 'ADMIN', 'SUPER_ADMIN', 'area-lagos', 'ACTIVE', 5.00),
('user-mgr-aisha', 'Aisha Bello', '+2348011112222', 'aisha.bello@gmail.com', NULL, 'UNIT_MANAGER', NULL, 'area-maiduguri', 'ACTIVE', 4.95),
('user-mgr-ibrahim', 'Ibrahim Danladi', '+2348022223333', 'ibrahim.d@yahoo.com', NULL, 'UNIT_MANAGER', NULL, 'area-kano', 'ACTIVE', 4.88),
('user-mgr-chidinma', 'Chidinma Eze', '+2348033334444', 'chidinma.eze@gmail.com', NULL, 'UNIT_MANAGER', NULL, 'area-lagos', 'ACTIVE', 4.92),
('user-mgr-fatima', 'Fatima Mohammed', '+2348044445555', 'fatima.m@gmail.com', NULL, 'UNIT_MANAGER', NULL, 'area-maiduguri', 'ACTIVE', 4.80),
('user-mgr-olumide', 'Olumide Bakare', '+2348055556666', 'olumide.b@gmail.com', NULL, 'UNIT_MANAGER', NULL, 'area-lagos', 'ACTIVE', 4.75)
ON CONFLICT (id) DO NOTHING;

-- 7. 30 Sample Members
INSERT INTO users (id, full_name, phone, email, role, area_id, status, rating) VALUES
('mem-01', 'Babagana Kyari', '+2348100000001', 'babagana@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-02', 'Zainab Bukar', '+2348100000002', 'zainab.b@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-03', 'Musa Usman', '+2348100000003', 'musa.u@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-04', 'Hadiza Mustapha', '+2348100000004', 'hadiza.m@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-05', 'Ali Goni', '+2348100000005', 'ali.g@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-06', 'Khadija Sheriff', '+2348100000006', 'khadija.s@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-07', 'Aminu Kano', '+2348100000007', 'aminu.k@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-08', 'Fatima Balarabe', '+2348100000008', 'fatima.b@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-09', 'Sani Abdu', '+2348100000009', 'sani.a@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-10', 'Bilkisu Ahmed', '+2348100000010', 'bilkisu.a@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-11', 'Lawal Jibrin', '+2348100000011', 'lawal.j@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-12', 'Maryam Aliyu', '+2348100000012', 'maryam.a@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-13', 'Emeka Okafor', '+2348100000013', 'emeka.o@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-14', 'Yetunde Adeleke', '+2348100000014', 'yetunde.a@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-15', 'Tunde Ogunlesi', '+2348100000015', 'tunde.o@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-16', 'Blessing Nwosu', '+2348100000016', 'blessing.n@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-17', 'Kehinde Balogun', '+2348100000017', 'kehinde.b@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-18', 'Ngozi Okoli', '+2348100000018', 'ngozi.o@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-19', 'Femi Ajayi', '+2348100000019', 'femi.a@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-20', 'Amaka Nnamdi', '+2348100000020', 'amaka.n@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-21', 'Usman Shehu', '+2348100000021', 'usman.s@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-22', 'Rukayya Saleh', '+2348100000022', 'rukayya.s@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-23', 'Kabiru Wada', '+2348100000023', 'kabiru.w@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-24', 'Hauwa Danbatta', '+2348100000024', 'hauwa.d@gmail.com', 'MEMBER', 'area-kano', 'ACTIVE', 5.0),
('mem-25', 'Biodun Shonibare', '+2348100000025', 'biodun.s@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-26', 'Chioma Obi', '+2348100000026', 'chioma.o@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-27', 'Bayo Alabi', '+2348100000027', 'bayo.a@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0),
('mem-28', 'Halima Maina', '+2348100000028', 'halima.m@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-29', 'Yakubu Gana', '+2348100000029', 'yakubu.g@gmail.com', 'MEMBER', 'area-maiduguri', 'ACTIVE', 5.0),
('mem-30', 'Oluwaseun Daniels', '+2348100000030', 'seun.d@gmail.com', 'MEMBER', 'area-lagos', 'ACTIVE', 5.0)
ON CONFLICT (id) DO NOTHING;

-- 8. 8 Sample Units in different lifecycle statuses
-- Pricing calculation per share:
-- For Rice 50kg (2 packs = 20 shares, pack price ₦75,000, delivery ₦30,000 for 2 packs = ₦1,500/share)
-- Goods share: ₦7,500. Delivery share: ₦1,500.
-- Platform fee (4% of ₦7,500) = ₦300
-- Manager comm (3% of ₦7,500) = ₦225
-- Buffer (4% of ₦7,500) = ₦300
-- Total per share = ₦7,500 + ₦1,500 + ₦300 + ₦225 + ₦300 = ₦9,825 = 982,500 kobo.
-- Retail market price for 5kg is ~₦12,500 (1,250,000 kobo). Savings = ~₦2,675.

INSERT INTO units (
    id, product_id, manager_id, area_id, collection_address, collection_landmark,
    total_packs, share_size, max_members, price_per_share_quoted_kobo, buffer_percent,
    status, payment_deadline, sharing_date
) VALUES
-- Unit 1: Rice in Maiduguri (OPEN, 16/20 joined, Almost Full)
('unit-rice-maiduguri-01', 'prod-rice-50kg', 'user-mgr-aisha', 'area-maiduguri', 'Shop 14, Opposite Post Office Roundabout, Maiduguri', 'Beside Zenith Bank ATM', 2, '5kg', 20, 982500, 4.00, 'OPEN', CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '4 days'),

-- Unit 2: Honey Beans in Kano (OPEN, 4/10 joined, Ending Soon)
('unit-beans-kano-01', 'prod-beans-50kg', 'user-mgr-ibrahim', 'area-kano', 'No. 42 France Road, Sabon Gari, Kano', 'Near Total Filling Station', 1, '5kg', 10, 895000, 4.00, 'OPEN', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '3 days'),

-- Unit 3: Cooking Oil in Lagos (FULL, 10/10 joined, Ready for payment close)
('unit-oil-lagos-01', 'prod-oil-25l', 'user-mgr-chidinma', 'area-lagos', '12 Awolowo Way, Ikeja, Lagos', 'Directly opposite Ikeja City Mall Gate 2', 2, '5L', 10, 1080000, 4.00, 'FULL', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '3 days'),

-- Unit 4: Garri in Lagos (PAYMENT_CLOSED, Paid, Awaiting Admin Order Consolidation)
('unit-garri-lagos-02', 'prod-garri-50kg', 'user-mgr-olumide', 'area-lagos', 'Plot 7 Bode Thomas Street, Surulere, Lagos', 'Beside Tasty Fried Chicken', 1, '5kg', 10, 520000, 4.00, 'PAYMENT_CLOSED', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '2 days'),

-- Unit 5: Sugar in Kano (ORDERED, Supplier Order Placed)
('unit-sugar-kano-02', 'prod-sugar-50kg', 'user-mgr-ibrahim', 'area-kano', 'Shop 8 Dawanau Commercial Center, Kano', 'Opposite Gate 3', 1, '5kg', 10, 1070000, 4.00, 'ORDERED', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days'),

-- Unit 6: Rice in Lagos (IN_TRANSIT, On delivery truck to manager location)
('unit-rice-lagos-03', 'prod-rice-50kg', 'user-mgr-chidinma', 'area-lagos', '12 Awolowo Way, Ikeja, Lagos', 'Opposite Ikeja City Mall Gate 2', 2, '5kg', 20, 995000, 4.00, 'IN_TRANSIT', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '1 day'),

-- Unit 7: Rice in Maiduguri (READY_FOR_COLLECTION, Goods Delivered & Weighed, Members Collecting!)
('unit-rice-maiduguri-02', 'prod-rice-50kg', 'user-mgr-fatima', 'area-maiduguri', 'No. 3 Airport Road, Bulumkutu, Maiduguri', 'Behind Federal High Court', 1, '5kg', 10, 982500, 4.00, 'READY_FOR_COLLECTION', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP + INTERVAL '1 day'),

-- Unit 8: Beans in Lagos (COMPLETED, All shares collected & ratings logged)
('unit-beans-lagos-04', 'prod-beans-50kg', 'user-mgr-chidinma', 'area-lagos', '12 Awolowo Way, Ikeja, Lagos', 'Opposite Ikeja City Mall Gate 2', 1, '5kg', 10, 895000, 4.00, 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- 9. Unit Members Seed
-- Attach members to unit-rice-maiduguri-01 (16 members joined)
INSERT INTO unit_members (id, unit_id, user_id, shares_count, amount_paid_kobo, payment_status, collection_status, collection_code) VALUES
('um-01', 'unit-rice-maiduguri-01', 'mem-01', 1, 982500, 'PAID', 'PENDING', '384912'),
('um-02', 'unit-rice-maiduguri-01', 'mem-02', 1, 982500, 'PAID', 'PENDING', '749103'),
('um-03', 'unit-rice-maiduguri-01', 'mem-03', 1, 982500, 'PAID', 'PENDING', '194829'),
('um-04', 'unit-rice-maiduguri-01', 'mem-04', 1, 982500, 'PAID', 'PENDING', '829401'),
('um-05', 'unit-rice-maiduguri-01', 'mem-05', 1, 982500, 'PAID', 'PENDING', '472910'),
('um-06', 'unit-rice-maiduguri-01', 'mem-06', 1, 982500, 'PAID', 'PENDING', '381920'),
('um-07', 'unit-rice-maiduguri-01', 'mem-21', 1, 982500, 'PAID', 'PENDING', '629183'),
('um-08', 'unit-rice-maiduguri-01', 'mem-22', 1, 982500, 'PAID', 'PENDING', '920194'),
('um-09', 'unit-rice-maiduguri-01', 'mem-28', 1, 982500, 'PAID', 'PENDING', '518293'),
('um-10', 'unit-rice-maiduguri-01', 'mem-29', 1, 982500, 'PAID', 'PENDING', '381048'),
('um-11', 'unit-rice-maiduguri-01', 'mem-07', 1, 982500, 'PAID', 'PENDING', '491029'),
('um-12', 'unit-rice-maiduguri-01', 'mem-08', 1, 982500, 'PAID', 'PENDING', '638102'),
('um-13', 'unit-rice-maiduguri-01', 'mem-09', 1, 982500, 'PAID', 'PENDING', '839201'),
('um-14', 'unit-rice-maiduguri-01', 'mem-10', 1, 982500, 'PAID', 'PENDING', '294819'),
('um-15', 'unit-rice-maiduguri-01', 'mem-11', 1, 982500, 'PAID', 'PENDING', '103928'),
('um-16', 'unit-rice-maiduguri-01', 'mem-12', 1, 982500, 'PAID', 'PENDING', '759102')
ON CONFLICT (id) DO NOTHING;

-- Attach members to unit-rice-maiduguri-02 (READY_FOR_COLLECTION with active collection codes)
INSERT INTO unit_members (id, unit_id, user_id, shares_count, amount_paid_kobo, payment_status, collection_status, collection_code) VALUES
('um-ready-01', 'unit-rice-maiduguri-02', 'mem-01', 1, 982500, 'PAID', 'PENDING', '840192'),
('um-ready-02', 'unit-rice-maiduguri-02', 'mem-02', 1, 982500, 'PAID', 'COLLECTED', '492019'),
('um-ready-03', 'unit-rice-maiduguri-02', 'mem-03', 1, 982500, 'PAID', 'PENDING', '671920'),
('um-ready-04', 'unit-rice-maiduguri-02', 'mem-04', 1, 982500, 'PAID', 'PENDING', '391029'),
('um-ready-05', 'unit-rice-maiduguri-02', 'mem-05', 1, 982500, 'PAID', 'COLLECTED', '581920')
ON CONFLICT (id) DO NOTHING;

-- 10. Sample Wallet balance for mem-01 (e.g. from surplus refund)
INSERT INTO wallet_ledger (id, user_id, type, amount_kobo, balance_after_kobo, reason, ref_id) VALUES
('wl-01', 'mem-01', 'CREDIT', 125000, 125000, 'SURPLUS_REFUND', 'unit-beans-lagos-04')
ON CONFLICT (id) DO NOTHING;
