-- SharedBuy Seed Data (Multi-Locality Hierarchy: Piwoyi Launch + Lugbe & Gwarinpa Expansion)

-- 1. Settings
INSERT INTO settings (key, value) VALUES
('platform_fee_percent', '4'),
('manager_commission_percent', '3'),
('default_buffer_percent', '4'),
('payment_window_hours', '48')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Geographic Areas (Country -> State -> City -> Locality)
INSERT INTO areas (id, name, locality, city, state, country, country_code, currency, launch_phase, is_active) VALUES
('area-piwoyi-abuja', 'Piwoyi District Hub', 'Piwoyi', 'Abuja', 'FCT', 'Nigeria', 'NG', 'NGN', 'LIVE', TRUE),
('area-lugbe-abuja', 'Lugbe Airport Road Hub', 'Lugbe', 'Abuja', 'FCT', 'Nigeria', 'NG', 'NGN', 'EXPANDING', TRUE),
('area-gwarinpa-abuja', 'Gwarinpa Estate Hub', 'Gwarinpa', 'Abuja', 'FCT', 'Nigeria', 'NG', 'NGN', 'EXPANDING', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    locality = EXCLUDED.locality,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    country_code = EXCLUDED.country_code,
    launch_phase = EXCLUDED.launch_phase;

-- 3. Verified Collection Hubs per Locality
INSERT INTO collection_hubs (id, area_id, name, landmark, address, map_url, is_active) VALUES
-- Piwoyi Vicinity (Launch Hubs)
('hub-piwoyi-biana', 'area-piwoyi-abuja', 'Piwoyi New Extension Hub', '16 Biana street, New Extension', '16 Biana street, New Extension, Piwoyi, Abuja', 'https://www.google.com/maps/search/?api=1&query=16+Biana+street+New+Extension+Piwoyi+Abuja', TRUE),
('hub-piwoyi-salam', 'area-piwoyi-abuja', 'Salam Salam Community Hub', 'Behind Salam Salam', 'Behind Salam Salam, Piwoyi, Abuja', 'https://www.google.com/maps/search/?api=1&query=Behind+Salam+Salam+Piwoyi+Abuja', TRUE),
('hub-piwoyi-sarah', 'area-piwoyi-abuja', 'Sarah Dominion Hub', 'Behind Sarah Dominion School', 'Behind Sarah Dominion School, Piwoyi, Abuja', 'https://www.google.com/maps/search/?api=1&query=Behind+Sarah+Dominion+School+Piwoyi+Abuja', TRUE),
('hub-piwoyi-bakery', 'area-piwoyi-abuja', 'Piwoyi Bakery Hub', 'By Bakery, Piwoyi Main Road', 'By Bakery, Piwoyi, Abuja', 'https://www.google.com/maps/search/?api=1&query=By+Bakery+Piwoyi+Abuja', TRUE),
-- Lugbe Vicinity (Expansion Hubs)
('hub-lugbe-fha', 'area-lugbe-abuja', 'FHA Lugbe Phase 1 Hub', 'Opposite FHA Police Signboard, Lugbe', 'FHA Estate Phase 1, Airport Road, Lugbe, Abuja', 'https://www.google.com/maps/search/?api=1&query=FHA+Estate+Lugbe+Abuja', TRUE),
('hub-lugbe-trademore', 'area-lugbe-abuja', 'Trademore Estate Gate Hub', 'Beside Trademore Pharmacy', 'Trademore Mega City Estate, Lugbe, Abuja', 'https://www.google.com/maps/search/?api=1&query=Trademore+Estate+Lugbe+Abuja', TRUE),
-- Gwarinpa Vicinity (Expansion Hubs)
('hub-gwarinpa-3rd-ave', 'area-gwarinpa-abuja', 'Gwarinpa 3rd Avenue Hub', '3rd Avenue by Charley Boy Bus Stop', '3rd Avenue, Gwarinpa Estate, Abuja', 'https://www.google.com/maps/search/?api=1&query=3rd+Avenue+Gwarinpa+Abuja', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Products Catalog
INSERT INTO products (id, name, category, image_url, description, pack_size, unit_of_share, shares_per_pack, is_active) VALUES
('prod-rice-mama-gold-50kg', 'Mama Gold Premium Long Grain Parboiled Rice', 'Grains', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', 'Grade-A stone-free Nigerian parboiled rice in sealed 50kg bag. Direct bulk order from domestic millers.', '50kg Bag', '5kg Share', 10, TRUE),
('prod-lactorich-milk-25kg', 'Lactorich Instant Full Cream Powdered Milk', 'Dairy', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', 'Rich, creamy full-cream instant milk powder in commercial wholesale 25kg bag. Ideal for home use, tea, and cereals.', '25kg Bag', '2.5kg Share', 10, TRUE),
('prod-crayfish-bag', 'Oron Premium Dried Crayfish', 'Seafood & Seasonings', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80', 'Crisp, sweet, sand-free dried red crayfish sourced directly from coastal landing jetties.', 'Large Sack (Bag)', 'Paint Bucket Share (~2kg)', 8, TRUE),
('prod-palm-oil-25l', 'Direct Mill Pure Red Palm Oil', 'Oils', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80', '100% pure, unadulterated first-press red palm oil in 25-liter gallon direct from palm processing mills.', '25L Gallon', '5L Share', 5, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5. Users: Admin, Distributor, Unit Managers, and Members
INSERT INTO users (id, full_name, phone, email, password_hash, role, admin_subrole, area_id, status, rating, wallet_balance_kobo, referral_code, referral_earnings_kobo, referrals_count) VALUES
('user-admin-01', 'SharedBuy Operations Admin', '+2348000000001', 'admin@sharedbuy.ng', '$2a$10$7Z2v1F0yIkm.qC4o741.0.9Y90Z2eI5i327Z1y8x7w6v5u4t3s2r1', 'ADMIN', 'SUPER_ADMIN', 'area-piwoyi-abuja', 'ACTIVE', 5.00, 0, 'REF-ADMIN01', 0, 0),
('user-dist-dahiru', 'Alhaji Dahiru (Northern Agro Millers & Grain Depot)', '+2348055556666', 'distributor@northernagro.ng', NULL, 'DISTRIBUTOR', NULL, 'area-piwoyi-abuja', 'ACTIVE', 4.94, 0, 'REF-DAHIRU', 0, 0),
('user-mgr-aisha', 'Aisha Bello', '+2348011112222', 'aisha.bello@gmail.com', NULL, 'UNIT_MANAGER', NULL, 'area-piwoyi-abuja', 'ACTIVE', 4.95, 450000, 'REF-AISHA', 0, 0),
('user-mgr-fatima', 'Fatima Mohammed', '+2348044445555', 'fatima.m@gmail.com', NULL, 'UNIT_MANAGER', NULL, 'area-piwoyi-abuja', 'ACTIVE', 4.80, 0, 'REF-FATIMA', 0, 0),
('user-mgr-ibrahim', 'Ibrahim Danladi', '+2348022223333', 'ibrahim.d@yahoo.com', NULL, 'UNIT_MANAGER', NULL, 'area-piwoyi-abuja', 'ACTIVE', 4.88, 0, 'REF-IBRAHIM', 0, 0),
('user-mgr-chidinma', 'Chidinma Eze', '+2348033334444', 'chidinma.eze@gmail.com', NULL, 'UNIT_MANAGER', NULL, 'area-piwoyi-abuja', 'ACTIVE', 4.92, 0, 'REF-CHIDINMA', 0, 0),
('mem-01', 'Babagana Kyari', '+2348100000001', 'babagana@gmail.com', NULL, 'MEMBER', NULL, 'area-piwoyi-abuja', 'ACTIVE', 5.00, 1250000, 'REF-BABAGANA', 40000, 2),
('mem-02', 'Zainab Bukar', '+2348100000002', 'zainab.b@gmail.com', NULL, 'MEMBER', NULL, 'area-piwoyi-abuja', 'ACTIVE', 5.00, 0, 'REF-ZAINAB', 0, 0),
('mem-03', 'Musa Usman', '+2348100000003', 'musa.u@gmail.com', NULL, 'MEMBER', NULL, 'area-piwoyi-abuja', 'ACTIVE', 5.00, 0, 'REF-MUSA', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 6. Distributor Wholesale Commodities
INSERT INTO distributor_commodities (id, distributor_id, distributor_name, distributor_phone, product_id, product_name, category, pack_size, price_per_pack_kobo, delivery_fee_kobo, min_order_packs, available_packs, warehouse_location, area_id, status) VALUES
('comm-rice-01', 'user-dist-dahiru', 'Alhaji Dahiru (Northern Agro Millers)', '+2348055556666', 'prod-rice-mama-gold-50kg', 'Mama Gold Premium Long Grain Parboiled Rice', 'Grains', '50kg Bag', 6650000, 1312500, 1, 150, 'Idu Industrial Layout, Abuja Central Depot', 'area-piwoyi-abuja', 'ACTIVE'),
('comm-milk-02', 'user-dist-dahiru', 'Alhaji Dahiru (Northern Agro Millers & Dairy)', '+2348055556666', 'prod-lactorich-milk-25kg', 'Lactorich Instant Full Cream Powdered Milk', 'Dairy', '25kg Bag', 6992000, 1380000, 1, 80, 'Gwagwalada Commercial Depot, Abuja', 'area-piwoyi-abuja', 'ACTIVE'),
('comm-crayfish-03', 'user-dist-dahiru', 'Alhaji Dahiru (Northern Agro Millers & Seafood)', '+2348055556666', 'prod-crayfish-bag', 'Oron Premium Dried Crayfish', 'Seafood & Seasonings', 'Large Sack (Bag)', 5700000, 1125000, 1, 45, 'Dei-Dei Regional Terminal, Abuja', 'area-piwoyi-abuja', 'ACTIVE'),
('comm-palmoil-04', 'user-dist-dahiru', 'Alhaji Dahiru (Northern Agro Millers & Oils)', '+2348055556666', 'prod-palm-oil-25l', 'Direct Mill Pure Red Palm Oil', 'Oils', '25L Gallon', 6384000, 1260000, 1, 60, 'Nyanya Central Depot, Abuja', 'area-piwoyi-abuja', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 7. Units in Piwoyi, Abuja
INSERT INTO units (
    id, product_id, manager_id, area_id, hub_id, collection_address, collection_landmark, collection_map_url,
    total_packs, share_size, max_members, price_per_share_quoted_kobo, buffer_percent,
    status, payment_deadline, sharing_date
) VALUES
('unit-piwoyi-rice-01', 'prod-rice-mama-gold-50kg', 'user-mgr-aisha', 'area-piwoyi-abuja', 'hub-piwoyi-biana', '16 Biana street, New Extension, Piwoyi, Abuja', '16 Biana street, New Extension', 'https://www.google.com/maps/search/?api=1&query=16+Biana+street+New+Extension+Piwoyi+Abuja', 1, '5kg', 10, 875000, 4.00, 'OPEN', CURRENT_TIMESTAMP + INTERVAL '20 hours', CURRENT_TIMESTAMP + INTERVAL '3 days'),
('unit-piwoyi-milk-02', 'prod-lactorich-milk-25kg', 'user-mgr-fatima', 'area-piwoyi-abuja', 'hub-piwoyi-salam', 'Behind Salam Salam, Piwoyi, Abuja', 'Behind Salam Salam', 'https://www.google.com/maps/search/?api=1&query=Behind+Salam+Salam+Piwoyi+Abuja', 1, '2.5kg', 10, 920000, 4.00, 'OPEN', CURRENT_TIMESTAMP + INTERVAL '32 hours', CURRENT_TIMESTAMP + INTERVAL '4 days'),
('unit-piwoyi-crayfish-03', 'prod-crayfish-bag', 'user-mgr-ibrahim', 'area-piwoyi-abuja', 'hub-piwoyi-sarah', 'Behind Sarah Dominion School, Piwoyi, Abuja', 'Behind Sarah Dominion School', 'https://www.google.com/maps/search/?api=1&query=Behind+Sarah+Dominion+School+Piwoyi+Abuja', 1, 'Paint Bucket (~2kg)', 8, 750000, 4.00, 'OPEN', CURRENT_TIMESTAMP + INTERVAL '14 hours', CURRENT_TIMESTAMP + INTERVAL '2 days'),
('unit-piwoyi-palmoil-04', 'prod-palm-oil-25l', 'user-mgr-chidinma', 'area-piwoyi-abuja', 'hub-piwoyi-bakery', 'By Bakery, Piwoyi, Abuja', 'By Bakery, Piwoyi Main Road', 'https://www.google.com/maps/search/?api=1&query=By+Bakery+Piwoyi+Abuja', 1, '5L', 5, 840000, 4.00, 'OPEN', CURRENT_TIMESTAMP + INTERVAL '18 hours', CURRENT_TIMESTAMP + INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 8. Unit Members
INSERT INTO unit_members (id, unit_id, user_id, shares_count, amount_paid_kobo, payment_status, collection_status, collection_code) VALUES
('um-101', 'unit-piwoyi-rice-01', 'mem-01', 1, 875000, 'PAID', 'PENDING', '384912'),
('um-102', 'unit-piwoyi-rice-01', 'mem-02', 1, 875000, 'PAID', 'PENDING', '719401'),
('um-103', 'unit-piwoyi-rice-01', 'mem-03', 1, 875000, 'PAID', 'PENDING', '192847'),
('um-301', 'unit-piwoyi-crayfish-03', 'mem-01', 1, 750000, 'PAID', 'PENDING', '840192')
ON CONFLICT (id) DO NOTHING;

-- 9. Wallet Ledger
INSERT INTO wallet_ledger (id, user_id, type, amount_kobo, balance_after_kobo, reason, ref_id) VALUES
('tx-init-01', 'mem-01', 'CREDIT', 1210000, 1210000, 'SURPLUS_REFUND: Wholesale Price Adjustment (Honey Beans Unit #04)', 'surplus-unit-04'),
('tx-ref-01', 'mem-01', 'CREDIT', 20000, 1230000, 'REFERRAL_BONUS: Neighbor joined Parboiled Rice Unit', 'ref-bonus-01'),
('tx-ref-02', 'mem-01', 'CREDIT', 20000, 1250000, 'REFERRAL_BONUS: Neighbor joined Direct Mill Palm Oil Unit', 'ref-bonus-02')
ON CONFLICT (id) DO NOTHING;
