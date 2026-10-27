package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	"sharedbuy-backend/internal/domain"
)

type UnitRepository struct {
	db           *sql.DB
	mockUnits    []domain.Unit
	mockAreas    []domain.Area
	mockProducts []domain.Product
	mockMembers  map[string][]domain.UnitMember
	mu           sync.RWMutex
}

func NewUnitRepository(db *sql.DB) *UnitRepository {
	repo := &UnitRepository{
		db:           db,
		mockUnits:    getMockUnits(),
		mockAreas:    defaultAreas,
		mockProducts: defaultProducts,
		mockMembers:  getMockMembers(),
	}
	for i := range repo.mockUnits {
		repo.calculatePricingBreakdown(&repo.mockUnits[i])
	}
	return repo
}

type UnitFilter struct {
	AreaID    string
	ProductID string
	Status    string
	Sort      string // "almost_full", "ending_soon", "newest"
}

func (r *UnitRepository) ListUnits(ctx context.Context, filter UnitFilter) ([]domain.Unit, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()

		var result []domain.Unit
		for _, u := range r.mockUnits {
			if matchesFilter(u, filter) {
				unitCopy := u
				r.calculatePricingBreakdown(&unitCopy)
				result = append(result, unitCopy)
			}
		}

		switch filter.Sort {
		case "almost_full":
			sort.Slice(result, func(i, j int) bool {
				remI := result[i].MaxMembers - result[i].CurrentMembersCount
				remJ := result[j].MaxMembers - result[j].CurrentMembersCount
				if remI != remJ {
					return remI < remJ
				}
				return result[i].PaymentDeadline.Before(result[j].PaymentDeadline)
			})
		case "ending_soon":
			sort.Slice(result, func(i, j int) bool {
				return result[i].PaymentDeadline.Before(result[j].PaymentDeadline)
			})
		default:
			sort.Slice(result, func(i, j int) bool {
				return result[i].CreatedAt.After(result[j].CreatedAt)
			})
		}

		return result, nil
	}
	baseQuery := `
		SELECT 
			u.id, u.product_id, p.name as product_name, p.category as product_category,
			p.image_url as product_image_url, p.pack_size as product_pack_size, p.unit_of_share,
			u.manager_id, mgr.full_name as manager_name, mgr.phone as manager_phone, mgr.rating as manager_rating,
			u.area_id, a.name as area_name, a.city as area_city, a.state as area_state,
			u.collection_address, u.collection_landmark, u.total_packs, u.share_size, u.max_members,
			u.price_per_share_quoted_kobo, u.buffer_percent, u.status, u.payment_deadline, u.sharing_date,
			u.created_at, u.updated_at,
			COALESCE(SUM(um.shares_count), 0) as current_shares_count,
			COUNT(DISTINCT um.id) as current_members_count
		FROM units u
		JOIN products p ON u.product_id = p.id
		JOIN users mgr ON u.manager_id = mgr.id
		JOIN areas a ON u.area_id = a.id
		LEFT JOIN unit_members um ON u.id = um.unit_id AND um.payment_status = 'PAID'
	`

	var whereClauses []string
	var args []interface{}
	argIdx := 1

	if filter.AreaID != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("u.area_id = $%d", argIdx))
		args = append(args, filter.AreaID)
		argIdx++
	}

	if filter.ProductID != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("u.product_id = $%d", argIdx))
		args = append(args, filter.ProductID)
		argIdx++
	}

	if filter.Status != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("u.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	if len(whereClauses) > 0 {
		baseQuery += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	baseQuery += `
		GROUP BY u.id, p.name, p.category, p.image_url, p.pack_size, p.unit_of_share,
		         mgr.full_name, mgr.phone, mgr.rating, a.name, a.city, a.state
	`

	switch filter.Sort {
	case "almost_full":
		baseQuery += " ORDER BY (u.max_members - COUNT(DISTINCT um.id)) ASC, u.payment_deadline ASC"
	case "ending_soon":
		baseQuery += " ORDER BY u.payment_deadline ASC"
	default:
		baseQuery += " ORDER BY u.created_at DESC"
	}

	rows, err := r.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("error listing units: %w", err)
	}
	defer rows.Close()

	var units []domain.Unit
	for rows.Next() {
		var u domain.Unit
		err := rows.Scan(
			&u.ID, &u.ProductID, &u.ProductName, &u.ProductCategory,
			&u.ProductImageURL, &u.ProductPackSize, &u.UnitOfShare,
			&u.ManagerID, &u.ManagerName, &u.ManagerPhone, &u.ManagerRating,
			&u.AreaID, &u.AreaName, &u.AreaCity, &u.AreaState,
			&u.CollectionAddress, &u.CollectionLandmark, &u.TotalPacks, &u.ShareSize, &u.MaxMembers,
			&u.PricePerShareQuotedKobo, &u.BufferPercent, &u.Status, &u.PaymentDeadline, &u.SharingDate,
			&u.CreatedAt, &u.UpdatedAt,
			&u.CurrentSharesCount, &u.CurrentMembersCount,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning unit: %w", err)
		}

		// Calculate pricing breakdowns & estimated savings
		r.calculatePricingBreakdown(&u)
		units = append(units, u)
	}

	return units, nil
}

func (r *UnitRepository) GetUnitByID(ctx context.Context, id string) (*domain.Unit, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		for _, u := range r.mockUnits {
			if u.ID == id {
				unitCopy := u
				r.calculatePricingBreakdown(&unitCopy)
				return &unitCopy, nil
			}
		}
		return nil, nil
	}

	query := `
		SELECT 
			u.id, u.product_id, p.name as product_name, p.category as product_category,
			p.image_url as product_image_url, p.pack_size as product_pack_size, p.unit_of_share,
			u.manager_id, mgr.full_name as manager_name, mgr.phone as manager_phone, mgr.rating as manager_rating,
			u.area_id, a.name as area_name, a.city as area_city, a.state as area_state,
			u.collection_address, u.collection_landmark, u.total_packs, u.share_size, u.max_members,
			u.price_per_share_quoted_kobo, u.buffer_percent, u.status, u.payment_deadline, u.sharing_date,
			u.created_at, u.updated_at,
			COALESCE(SUM(um.shares_count), 0) as current_shares_count,
			COUNT(DISTINCT um.id) as current_members_count
		FROM units u
		JOIN products p ON u.product_id = p.id
		JOIN users mgr ON u.manager_id = mgr.id
		JOIN areas a ON u.area_id = a.id
		LEFT JOIN unit_members um ON u.id = um.unit_id AND um.payment_status = 'PAID'
		WHERE u.id = $1
		GROUP BY u.id, p.name, p.category, p.image_url, p.pack_size, p.unit_of_share,
		         mgr.full_name, mgr.phone, mgr.rating, a.name, a.city, a.state
	`

	var u domain.Unit
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.ProductID, &u.ProductName, &u.ProductCategory,
		&u.ProductImageURL, &u.ProductPackSize, &u.UnitOfShare,
		&u.ManagerID, &u.ManagerName, &u.ManagerPhone, &u.ManagerRating,
		&u.AreaID, &u.AreaName, &u.AreaCity, &u.AreaState,
		&u.CollectionAddress, &u.CollectionLandmark, &u.TotalPacks, &u.ShareSize, &u.MaxMembers,
		&u.PricePerShareQuotedKobo, &u.BufferPercent, &u.Status, &u.PaymentDeadline, &u.SharingDate,
		&u.CreatedAt, &u.UpdatedAt,
		&u.CurrentSharesCount, &u.CurrentMembersCount,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error querying unit by ID: %w", err)
	}

	r.calculatePricingBreakdown(&u)
	return &u, nil
}

func (r *UnitRepository) calculatePricingBreakdown(u *domain.Unit) {
	// Base breakdown estimation according to rule:
	// Goods share: ~76% of total
	// Delivery share: ~15% of total
	// Platform fee: 4% of goods cost
	// Manager commission: 3% of goods cost
	// Buffer: 4% of goods cost
	total := u.PricePerShareQuotedKobo
	goodsShare := int64(float64(total) * 0.76)
	deliveryShare := int64(float64(total) * 0.15)
	platformFee := int64(float64(goodsShare) * 0.04)
	managerComm := int64(float64(goodsShare) * 0.03)
	buffer := total - (goodsShare + deliveryShare + platformFee + managerComm)
	if buffer < 0 {
		buffer = int64(float64(goodsShare) * 0.04)
	}

	u.GoodsCostShareKobo = goodsShare
	u.DeliveryCostShareKobo = deliveryShare
	u.PlatformFeeShareKobo = platformFee
	u.ManagerCommissionShareKobo = managerComm
	u.BufferShareKobo = buffer

	// Estimated retail market price is ~25-30% higher
	u.EstimatedMarketPriceKobo = int64(float64(total) * 1.28)
	u.EstimatedSavingsKobo = u.EstimatedMarketPriceKobo - total
}

func (r *UnitRepository) GetUnitMembers(ctx context.Context, unitID string) ([]domain.UnitMember, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		if members, ok := r.mockMembers[unitID]; ok {
			return members, nil
		}
		return []domain.UnitMember{}, nil
	}

	query := `
		SELECT um.id, um.unit_id, um.user_id, u.full_name as user_name, u.phone as user_phone,
		       um.shares_count, um.amount_paid_kobo, um.payment_status, um.collection_status,
		       um.collection_code, um.joined_at, um.collected_at
		FROM unit_members um
		JOIN users u ON um.user_id = u.id
		WHERE um.unit_id = $1
		ORDER BY um.joined_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []domain.UnitMember
	for rows.Next() {
		var m domain.UnitMember
		err := rows.Scan(
			&m.ID, &m.UnitID, &m.UserID, &m.UserName, &m.UserPhone,
			&m.SharesCount, &m.AmountPaidKobo, &m.PaymentStatus, &m.CollectionStatus,
			&m.CollectionCode, &m.JoinedAt, &m.CollectedAt,
		)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *UnitRepository) GetAreas(ctx context.Context) ([]domain.Area, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		return r.mockAreas, nil
	}

	rows, err := r.db.QueryContext(ctx, "SELECT id, name, city, state, is_active, created_at FROM areas WHERE is_active = TRUE ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var areas []domain.Area
	for rows.Next() {
		var a domain.Area
		if err := rows.Scan(&a.ID, &a.Name, &a.City, &a.State, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, err
		}
		areas = append(areas, a)
	}
	return areas, nil
}

func (r *UnitRepository) GetProducts(ctx context.Context) ([]domain.Product, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		return r.mockProducts, nil
	}

	rows, err := r.db.QueryContext(ctx, "SELECT id, name, category, image_url, description, pack_size, unit_of_share, shares_per_pack, is_active, created_at FROM products WHERE is_active = TRUE ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var p domain.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.ImageURL, &p.Description, &p.PackSize, &p.UnitOfShare, &p.SharesPerPack, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}
