package domain

import (
	"time"
)

// Roles
const (
	RoleMember      = "MEMBER"
	RoleUnitManager = "UNIT_MANAGER"
	RoleDistributor = "DISTRIBUTOR"
	RoleAdmin       = "ADMIN"
)

// Admin Sub-roles
const (
	AdminSuperAdmin = "SUPER_ADMIN"
	AdminOps        = "OPS"
	AdminFinance    = "FINANCE"
	AdminSupport    = "SUPPORT"
)

// Unit Statuses (State Machine)
const (
	UnitStatusDraft               = "DRAFT"
	UnitStatusPendingAdminReview  = "PENDING_ADMIN_REVIEW"
	UnitStatusOpen                = "OPEN"
	UnitStatusFull                = "FULL"
	UnitStatusPaymentClosed       = "PAYMENT_CLOSED"
	UnitStatusOrdered             = "ORDERED"
	UnitStatusInTransit           = "IN_TRANSIT"
	UnitStatusDeliveredToManager  = "DELIVERED_TO_MANAGER"
	UnitStatusReadyForCollection  = "READY_FOR_COLLECTION"
	UnitStatusCompleted           = "COMPLETED"
	UnitStatusCancelled           = "CANCELLED"
	UnitStatusExpired             = "EXPIRED"
	UnitStatusRefunding           = "REFUNDING"
)

// Payment & Collection Statuses
const (
	PaymentStatusPending   = "PENDING"
	PaymentStatusPaid      = "PAID"
	PaymentStatusRefunded  = "REFUNDED"

	CollectionStatusPending   = "PENDING"
	CollectionStatusCollected = "COLLECTED"
	CollectionStatusNoShow    = "NO_SHOW"
)

type User struct {
	ID           string     `json:"id"`
	FullName     string     `json:"full_name"`
	Phone        string     `json:"phone"`
	Email        *string    `json:"email,omitempty"`
	PasswordHash *string    `json:"-"`
	Role         string     `json:"role"`
	AdminSubrole *string    `json:"admin_subrole,omitempty"`
	AreaID       *string    `json:"area_id,omitempty"`
	AreaName     *string    `json:"area_name,omitempty"`
	Status                string     `json:"status"` // ACTIVE, SUSPENDED
	Rating                float64    `json:"rating"`
	WalletBalanceKobo     int64      `json:"wallet_balance_kobo"`
	ReferralCode          string     `json:"referral_code"`
	ReferredBy            *string    `json:"referred_by,omitempty"`
	ReferralEarningsKobo  int64      `json:"referral_earnings_kobo"`
	ReferralsCount        int        `json:"referrals_count"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

type WithdrawalRequest struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	AmountKobo    int64      `json:"amount_kobo"`
	BankName      string     `json:"bank_name"`
	AccountNumber string     `json:"account_number"`
	AccountName   string     `json:"account_name"`
	Status        string     `json:"status"` // PENDING, COMPLETED, REJECTED
	CreatedAt     time.Time  `json:"created_at"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
}

type Area struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`         // e.g. "Piwoyi District Hub"
	Locality    string          `json:"locality"`     // e.g. "Piwoyi", "Lugbe", "Gwarinpa"
	City        string          `json:"city"`         // e.g. "Abuja"
	State       string          `json:"state"`        // e.g. "FCT"
	Country     string          `json:"country"`      // e.g. "Nigeria"
	CountryCode string          `json:"country_code"` // e.g. "NG"
	Currency    string          `json:"currency"`     // e.g. "NGN"
	LaunchPhase string          `json:"launch_phase"` // e.g. "LIVE", "EXPANDING", "COMING_SOON"
	IsActive    bool            `json:"is_active"`
	Hubs        []CollectionHub `json:"hubs,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

type CollectionHub struct {
	ID        string `json:"id"`
	AreaID    string `json:"area_id"`
	Name      string `json:"name"`
	Landmark  string `json:"landmark"`
	Address   string `json:"address"`
	MapURL    string `json:"map_url"`
	ManagerID string `json:"manager_id,omitempty"`
	IsActive  bool   `json:"is_active"`
}

type Product struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	ImageURL    string    `json:"image_url"`
	Description string    `json:"description"`
	PackSize    string    `json:"pack_size"`    // e.g. "50kg bag"
	UnitOfShare string    `json:"unit_of_share"`// e.g. "5kg"
	SharesPerPack int     `json:"shares_per_pack"` // e.g. 10
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

type Supplier struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	ContactName      string    `json:"contact_name"`
	Phone            string    `json:"phone"`
	Email            string    `json:"email"`
	Address          string    `json:"address"`
	ProductsSupplied string    `json:"products_supplied"`
	Rating           float64   `json:"rating"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
}

type SupplierQuote struct {
	ID               string    `json:"id"`
	ProductID        string    `json:"product_id"`
	SupplierID       string    `json:"supplier_id"`
	PricePerPackKobo int64     `json:"price_per_pack_kobo"`
	DeliveryFeeKobo  int64     `json:"delivery_fee_kobo"`
	MinOrderPacks    int       `json:"min_order_packs"`
	ValidUntil       time.Time `json:"valid_until"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"created_at"`
}

type DistributorCommodity struct {
	ID                string    `json:"id"`
	DistributorID     string    `json:"distributor_id"`
	DistributorName   string    `json:"distributor_name"`
	DistributorPhone  string    `json:"distributor_phone"`
	ProductID         string    `json:"product_id"`
	ProductName       string    `json:"product_name"`
	Category          string    `json:"category"`
	PackSize          string    `json:"pack_size"`
	PricePerPackKobo  int64     `json:"price_per_pack_kobo"`
	DeliveryFeeKobo   int64     `json:"delivery_fee_kobo"`
	MinOrderPacks     int       `json:"min_order_packs"`
	AvailablePacks    int       `json:"available_packs"`
	WarehouseLocation string    `json:"warehouse_location"`
	Status            string    `json:"status"` // ACTIVE, OUT_OF_STOCK
	UpdatedAt         time.Time `json:"updated_at"`
}

type PurchaseOrder struct {
	ID                   string     `json:"id"`
	OrderNumber          string     `json:"order_number"` // e.g. "PO-PIWOYI-2026-001"
	DistributorID        string     `json:"distributor_id"`
	DistributorName      string     `json:"distributor_name"`
	DistributorPhone     string     `json:"distributor_phone"`
	CreatedByAdminID     string     `json:"created_by_admin_id"`
	DestinationArea      string     `json:"destination_area"` // "Piwoyi District Hub, Abuja"
	DestinationLandmarks []string   `json:"destination_landmarks"`
	TotalPacks           int        `json:"total_packs"`
	TotalGoodsCostKobo   int64      `json:"total_goods_cost_kobo"`
	TotalDeliveryFeeKobo int64      `json:"total_delivery_fee_kobo"`
	TotalAmountKobo      int64      `json:"total_amount_kobo"`
	Status               string     `json:"status"` // PENDING, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED
	AssociatedUnitIDs    []string   `json:"associated_unit_ids"`
	DriverName           *string    `json:"driver_name,omitempty"`
	DriverPhone          *string    `json:"driver_phone,omitempty"`
	VehiclePlate         *string    `json:"vehicle_plate,omitempty"`
	WaybillNumber        *string    `json:"waybill_number,omitempty"`
	Notes                string     `json:"notes"`
	OrderedAt            time.Time  `json:"ordered_at"`
	DispatchedAt         *time.Time `json:"dispatched_at,omitempty"`
	DeliveredAt          *time.Time `json:"delivered_at,omitempty"`
}

type Unit struct {
	ID                     string     `json:"id"`
	ProductID              string     `json:"product_id"`
	ProductName            string     `json:"product_name,omitempty"`
	ProductCategory        string     `json:"product_category,omitempty"`
	ProductImageURL        string     `json:"product_image_url,omitempty"`
	ProductPackSize        string     `json:"product_pack_size,omitempty"`
	UnitOfShare            string     `json:"unit_of_share,omitempty"`
	ManagerID              string     `json:"manager_id"`
	ManagerName            string     `json:"manager_name,omitempty"`
	ManagerPhone           string     `json:"manager_phone,omitempty"`
	ManagerRating          float64    `json:"manager_rating,omitempty"`
	AreaID                     string     `json:"area_id"`
	AreaName                   string     `json:"area_name,omitempty"`
	AreaLocality               string     `json:"area_locality,omitempty"`
	AreaCity                   string     `json:"area_city,omitempty"`
	AreaState                  string     `json:"area_state,omitempty"`
	AreaCountry                string     `json:"area_country,omitempty"`
	HubID                      string     `json:"hub_id,omitempty"`
	CollectionAddress          string     `json:"collection_address"`
	CollectionLandmark     string     `json:"collection_landmark"`
	CollectionMapURL       string     `json:"collection_map_url,omitempty"`
	TotalPacks             int        `json:"total_packs"`
	ShareSize              string     `json:"share_size"`
	MaxMembers             int        `json:"max_members"`
	CurrentMembersCount    int        `json:"current_members_count"`
	CurrentSharesCount     int        `json:"current_shares_count"`
	PricePerShareQuotedKobo int64     `json:"price_per_share_quoted_kobo"`
	GoodsCostShareKobo     int64      `json:"goods_cost_share_kobo"`
	DeliveryCostShareKobo  int64      `json:"delivery_cost_share_kobo"`
	PlatformFeeShareKobo   int64      `json:"platform_fee_share_kobo"`
	ManagerCommissionShareKobo int64  `json:"manager_commission_share_kobo"`
	BufferShareKobo        int64      `json:"buffer_share_kobo"`
	EstimatedMarketPriceKobo int64    `json:"estimated_market_price_kobo"`
	EstimatedSavingsKobo   int64      `json:"estimated_savings_kobo"`
	BufferPercent          float64    `json:"buffer_percent"`
	Status                 string     `json:"status"`
	PaymentDeadline        time.Time  `json:"payment_deadline"`
	SharingDate            time.Time  `json:"sharing_date"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type UnitMember struct {
	ID               string     `json:"id"`
	UnitID           string     `json:"unit_id"`
	UserID           string     `json:"user_id"`
	UserName         string     `json:"user_name,omitempty"`
	UserPhone        string     `json:"user_phone,omitempty"`
	SharesCount      int        `json:"shares_count"`
	AmountPaidKobo   int64      `json:"amount_paid_kobo"`
	PaymentStatus    string     `json:"payment_status"`
	CollectionStatus string     `json:"collection_status"`
	CollectionCode   string     `json:"collection_code"`
	JoinedAt         time.Time  `json:"joined_at"`
	CollectedAt      *time.Time `json:"collected_at,omitempty"`
}

type MemberUnitBooking struct {
	MemberID         string     `json:"member_id"`
	UnitID           string     `json:"unit_id"`
	UserID           string     `json:"user_id"`
	SharesCount      int        `json:"shares_count"`
	AmountPaidKobo   int64      `json:"amount_paid_kobo"`
	PaymentStatus    string     `json:"payment_status"`
	CollectionStatus string     `json:"collection_status"`
	CollectionCode   string     `json:"collection_code"`
	JoinedAt         time.Time  `json:"joined_at"`
	CollectedAt      *time.Time `json:"collected_at,omitempty"`
	Unit             Unit       `json:"unit"`
}

type Payment struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	UnitID         string    `json:"unit_id"`
	AmountKobo     int64     `json:"amount_kobo"`
	GatewayRef     string    `json:"gateway_ref"`
	Gateway        string    `json:"gateway"` // PAYSTACK, FLUTTERWAVE
	Status         string    `json:"status"`  // INITIALIZED, SUCCESS, FAILED
	Method         string    `json:"method"`  // CARD, TRANSFER, USSD
	PaidAt         time.Time `json:"paid_at"`
	IdempotencyKey string    `json:"idempotency_key"`
}

type WalletLedger struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	Type             string    `json:"type"` // CREDIT, DEBIT
	AmountKobo       int64     `json:"amount_kobo"`
	BalanceAfterKobo int64     `json:"balance_after_kobo"`
	Reason           string    `json:"reason"` // SURPLUS_REFUND, UNIT_REFUND, WALLET_PAYMENT, WITHDRAWAL
	RefID            string    `json:"ref_id"`
	CreatedAt        time.Time `json:"created_at"`
}

type Order struct {
	ID                   string     `json:"id"`
	UnitID               string     `json:"unit_id"`
	SupplierID           string     `json:"supplier_id"`
	FinalPricePerPackKobo int64     `json:"final_price_per_pack_kobo"`
	TotalCostKobo        int64      `json:"total_cost_kobo"`
	Status               string     `json:"status"`
	OrderedAt            time.Time  `json:"ordered_at"`
	DeliveredAt          *time.Time `json:"delivered_at,omitempty"`
}

type Delivery struct {
	ID               string     `json:"id"`
	OrderID          string     `json:"order_id"`
	DriverName       string     `json:"driver_name"`
	DriverPhone      string     `json:"driver_phone"`
	VehicleNote      string     `json:"vehicle_note"`
	DeliveryCostKobo int64      `json:"delivery_cost_kobo"`
	Status           string     `json:"status"`
	ExpectedAt       time.Time  `json:"expected_at"`
	DeliveredAt      *time.Time `json:"delivered_at,omitempty"`
}

type ManagerCommission struct {
	ID         string     `json:"id"`
	ManagerID  string     `json:"manager_id"`
	UnitID     string     `json:"unit_id"`
	AmountKobo int64      `json:"amount_kobo"`
	Status     string     `json:"status"` // PENDING, APPROVED, PAID
	PaidAt     *time.Time `json:"paid_at,omitempty"`
}

type ManagerCommissionItem struct {
	UnitID                  string    `json:"unit_id"`
	ProductName             string    `json:"product_name"`
	ProductPackSize         string    `json:"product_pack_size"`
	CollectionLandmark      string    `json:"collection_landmark"`
	AreaLocality            string    `json:"area_locality"`
	UnitStatus              string    `json:"unit_status"`
	CurrentSharesCount      int       `json:"current_shares_count"`
	MaxMembers              int       `json:"max_members"`
	CommissionPerShareKobo  int64     `json:"commission_per_share_kobo"`
	ProjectedCommissionKobo int64     `json:"projected_commission_kobo"`
	EarnedCommissionKobo    int64     `json:"earned_commission_kobo"`
	PayoutStatus            string    `json:"payout_status"` // PENDING, SETTLED
	SharingDate             time.Time `json:"sharing_date"`
}

type ManagerCommissionSummary struct {
	ManagerID               string                  `json:"manager_id"`
	ManagerName             string                  `json:"manager_name"`
	TotalUnitsManaged       int                     `json:"total_units_managed"`
	CompletedUnitsCount     int                     `json:"completed_units_count"`
	TotalSharesManaged      int                     `json:"total_shares_managed"`
	TotalSharesCollected    int                     `json:"total_shares_collected"`
	PickupCompletionRate    float64                 `json:"pickup_completion_rate"`
	OnTimeFulfillmentRate   float64                 `json:"on_time_fulfillment_rate"`
	AverageRating           float64                 `json:"average_rating"`
	PendingCommissionKobo   int64                   `json:"pending_commission_kobo"`
	SettledCommissionKobo   int64                   `json:"settled_commission_kobo"`
	TotalProjectedKobo      int64                   `json:"total_projected_kobo"`
	WalletBalanceKobo       int64                   `json:"wallet_balance_kobo"`
	Items                   []ManagerCommissionItem `json:"items"`
}

type Dispute struct {
	ID              string     `json:"id"`
	UnitID          string     `json:"unit_id"`
	UnitProductName string     `json:"unit_product_name,omitempty"`
	UnitLandmark    string     `json:"unit_landmark,omitempty"`
	UserID          string     `json:"user_id"`
	ReporterName    string     `json:"reporter_name,omitempty"`
	Type            string     `json:"type"` // SHORTAGE, QUALITY, NO_SHOW, OTHER
	Description     string     `json:"description"`
	PhotoURLs       []string   `json:"photo_urls"`
	Status          string     `json:"status"` // OPEN, INVESTIGATING, RESOLVED, REJECTED
	ResolutionNotes string     `json:"resolution_notes"`
	CreatedAt       time.Time  `json:"created_at"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
}

type AuditLog struct {
	ID          string    `json:"id"`
	ActorID     *string   `json:"actor_id,omitempty"`
	Action      string    `json:"action"`
	Entity      string    `json:"entity"`
	EntityID    string    `json:"entity_id"`
	BeforeState *string   `json:"before_state,omitempty"`
	AfterState  *string   `json:"after_state,omitempty"`
	Reason      string    `json:"reason"`
	IPAddress   string    `json:"ip_address"`
	CreatedAt   time.Time `json:"created_at"`
}

type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NotificationLog struct {
	ID            string    `json:"id"`
	Recipient     string    `json:"recipient"`
	RecipientName string    `json:"recipient_name,omitempty"`
	Channel       string    `json:"channel"`  // SMS_DND, WHATSAPP, SMS_GENERIC
	Category      string    `json:"category"` // OTP, PAYMENT_RECEIPT, HUB_ARRIVAL, PICKUP_REMINDER, REFUND_ALERT
	UnitID        string    `json:"unit_id,omitempty"`
	Message       string    `json:"message"`
	Gateway       string    `json:"gateway"`    // TERMII
	GatewayMsgID  string    `json:"gateway_msg_id"`
	Status        string    `json:"status"`     // DELIVERED, SENT, SIMULATED
	CreatedAt     time.Time `json:"created_at"`
}

