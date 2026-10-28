export type UserRole = 'MEMBER' | 'UNIT_MANAGER' | 'DISTRIBUTOR' | 'ADMIN';
export type AdminSubrole = 'SUPER_ADMIN' | 'OPS' | 'FINANCE' | 'SUPPORT';

export interface User {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  role: UserRole;
  admin_subrole?: AdminSubrole;
  area_id?: string;
  area_name?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  rating: number;
  wallet_balance_kobo?: number;
  referral_code?: string;
  referred_by?: string;
  referral_earnings_kobo?: number;
  referrals_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WalletLedger {
  id: string;
  user_id: string;
  type: 'CREDIT' | 'DEBIT';
  amount_kobo: number;
  balance_after_kobo: number;
  reason: string;
  ref_id: string;
  created_at: string;
}

export interface WalletSummary {
  balance_kobo: number;
  referral_code: string;
  referrals_count: number;
  referral_earnings_kobo: number;
  transactions: WalletLedger[];
}

export interface Area {
  id: string;
  name: string;
  city: string;
  state: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  image_url: string;
  description: string;
  pack_size: string;
  unit_of_share: string;
  shares_per_pack: number;
  is_active: boolean;
  created_at: string;
}

export type UnitStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'FULL'
  | 'PAYMENT_CLOSED'
  | 'ORDERED'
  | 'IN_TRANSIT'
  | 'DELIVERED_TO_MANAGER'
  | 'READY_FOR_COLLECTION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDING';

export interface Unit {
  id: string;
  product_id: string;
  product_name: string;
  product_category: string;
  product_image_url: string;
  product_pack_size: string;
  unit_of_share: string;
  manager_id: string;
  manager_name: string;
  manager_phone: string;
  manager_rating: number;
  area_id: string;
  area_name: string;
  area_city: string;
  area_state: string;
  collection_address: string;
  collection_landmark: string;
  collection_map_url?: string;
  total_packs: number;
  share_size: string;
  max_members: number;
  current_members_count: number;
  current_shares_count: number;
  price_per_share_quoted_kobo: number;
  goods_cost_share_kobo: number;
  delivery_cost_share_kobo: number;
  platform_fee_share_kobo: number;
  manager_commission_share_kobo: number;
  buffer_share_kobo: number;
  estimated_market_price_kobo: number;
  estimated_savings_kobo: number;
  buffer_percent: number;
  status: UnitStatus;
  payment_deadline: string;
  sharing_date: string;
  created_at: string;
  updated_at: string;
}

export interface UnitMember {
  id: string;
  unit_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  shares_count: number;
  amount_paid_kobo: number;
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
  collection_status: 'PENDING' | 'COLLECTED' | 'NO_SHOW';
  collection_code: string;
  joined_at: string;
  collected_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DistributorCommodity {
  id: string;
  distributor_id: string;
  distributor_name: string;
  distributor_phone: string;
  product_id: string;
  product_name: string;
  category: string;
  pack_size: string;
  price_per_pack_kobo: number;
  delivery_fee_kobo: number;
  min_order_packs: number;
  available_packs: number;
  warehouse_location: string;
  status: 'ACTIVE' | 'OUT_OF_STOCK';
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  distributor_id: string;
  distributor_name: string;
  distributor_phone: string;
  created_by_admin_id: string;
  destination_area: string;
  destination_landmarks: string[];
  total_packs: number;
  total_goods_cost_kobo: number;
  total_delivery_fee_kobo: number;
  total_amount_kobo: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  associated_unit_ids: string[];
  driver_name?: string;
  driver_phone?: string;
  vehicle_plate?: string;
  waybill_number?: string;
  notes?: string;
  ordered_at: string;
  dispatched_at?: string;
  delivered_at?: string;
}
