package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

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

func (r *UnitRepository) JoinUnit(ctx context.Context, unitID, userID, userName, userPhone string, sharesCount int, amountKobo int64, collectionCode string) (*domain.UnitMember, error) {
	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()

		var targetUnit *domain.Unit
		for i := range r.mockUnits {
			if r.mockUnits[i].ID == unitID {
				targetUnit = &r.mockUnits[i]
				break
			}
		}

		if targetUnit == nil {
			return nil, errors.New("unit not found")
		}

		if targetUnit.Status != domain.UnitStatusOpen {
			return nil, fmt.Errorf("unit is %s and not accepting new members", targetUnit.Status)
		}

		if targetUnit.CurrentMembersCount >= targetUnit.MaxMembers {
			return nil, errors.New("unit is already full")
		}

		memberID := fmt.Sprintf("um-%d", time.Now().UnixNano()%1000000)
		newMember := domain.UnitMember{
			ID:               memberID,
			UnitID:           unitID,
			UserID:           userID,
			UserName:         userName,
			UserPhone:        userPhone,
			SharesCount:      sharesCount,
			AmountPaidKobo:   amountKobo,
			PaymentStatus:    domain.PaymentStatusPaid,
			CollectionStatus: domain.CollectionStatusPending,
			CollectionCode:   collectionCode,
			JoinedAt:         time.Now(),
		}

		if r.mockMembers == nil {
			r.mockMembers = make(map[string][]domain.UnitMember)
		}
		r.mockMembers[unitID] = append(r.mockMembers[unitID], newMember)

		targetUnit.CurrentMembersCount++
		targetUnit.CurrentSharesCount += sharesCount
		targetUnit.UpdatedAt = time.Now()

		if targetUnit.CurrentMembersCount >= targetUnit.MaxMembers {
			targetUnit.Status = domain.UnitStatusFull
		}

		return &newMember, nil
	}

	// PostgreSQL implementation
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var maxMembers, currentMembers int
	var status string
	err = tx.QueryRowContext(ctx, "SELECT max_members, status, (SELECT COUNT(DISTINCT user_id) FROM unit_members WHERE unit_id = $1 AND payment_status = 'PAID') FROM units WHERE id = $1 FOR UPDATE", unitID).Scan(&maxMembers, &status, &currentMembers)
	if err != nil {
		return nil, fmt.Errorf("error verifying unit: %w", err)
	}

	if status != domain.UnitStatusOpen {
		return nil, fmt.Errorf("unit is not open for new joins (status: %s)", status)
	}
	if currentMembers >= maxMembers {
		return nil, errors.New("unit is already full")
	}

	memberID := fmt.Sprintf("um-%d", time.Now().UnixNano()%1000000)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO unit_members (id, unit_id, user_id, shares_count, amount_paid_kobo, payment_status, collection_status, collection_code, joined_at)
		VALUES ($1, $2, $3, $4, $5, 'PAID', 'PENDING', $6, NOW())
	`, memberID, unitID, userID, sharesCount, amountKobo, collectionCode)
	if err != nil {
		return nil, fmt.Errorf("error inserting unit member: %w", err)
	}

	if currentMembers+1 >= maxMembers {
		_, _ = tx.ExecContext(ctx, "UPDATE units SET status = 'FULL', updated_at = NOW() WHERE id = $1", unitID)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &domain.UnitMember{
		ID:               memberID,
		UnitID:           unitID,
		UserID:           userID,
		UserName:         userName,
		UserPhone:        userPhone,
		SharesCount:      sharesCount,
		AmountPaidKobo:   amountKobo,
		PaymentStatus:    domain.PaymentStatusPaid,
		CollectionStatus: domain.CollectionStatusPending,
		CollectionCode:   collectionCode,
		JoinedAt:         time.Now(),
	}, nil
}

func (r *UnitRepository) GetManagedUnits(ctx context.Context, managerID string) ([]domain.Unit, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		var res []domain.Unit
		for _, u := range r.mockUnits {
			if managerID == "" || u.ManagerID == managerID {
				unitCopy := u
				r.calculatePricingBreakdown(&unitCopy)
				res = append(res, unitCopy)
			}
		}
		return res, nil
	}

	filter := UnitFilter{}
	units, err := r.ListUnits(ctx, filter)
	if err != nil {
		return nil, err
	}
	var res []domain.Unit
	for _, u := range units {
		if managerID == "" || u.ManagerID == managerID {
			res = append(res, u)
		}
	}
	return res, nil
}

func (r *UnitRepository) VerifyCollectionCode(ctx context.Context, managerID, code string) (*domain.UnitMember, *domain.Unit, error) {
	cleanCode := strings.TrimSpace(code)
	if len(cleanCode) != 6 {
		return nil, nil, errors.New("collection code must be exactly 6 digits")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	for unitID, members := range r.mockMembers {
		// Find unit
		var targetUnit *domain.Unit
		for i := range r.mockUnits {
			if r.mockUnits[i].ID == unitID {
				targetUnit = &r.mockUnits[i]
				break
			}
		}

		if targetUnit == nil {
			continue
		}

		// If managerID specified, check authorization (allow empty for admin)
		if managerID != "" && targetUnit.ManagerID != managerID {
			continue
		}

		for idx := range members {
			if members[idx].CollectionCode == cleanCode {
				m := &members[idx]
				if m.CollectionStatus == domain.CollectionStatusCollected {
					collectedDate := "earlier"
					if m.CollectedAt != nil {
						collectedDate = m.CollectedAt.Format("02 Jan 15:04")
					}
					return nil, nil, fmt.Errorf("collection code %s was already verified and collected on %s", cleanCode, collectedDate)
				}

				now := time.Now()
				m.CollectionStatus = domain.CollectionStatusCollected
				m.CollectedAt = &now

				unitCopy := *targetUnit
				r.calculatePricingBreakdown(&unitCopy)

				return m, &unitCopy, nil
			}
		}
	}

	return nil, nil, errors.New("invalid collection code or code not found for your managed units")
}

func (r *UnitRepository) CreateUnit(ctx context.Context, u *domain.Unit) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if u.ID == "" {
		u.ID = fmt.Sprintf("unit-piwoyi-%s-%d", strings.ToLower(u.ProductCategory), time.Now().Unix()%10000)
	}

	r.calculatePricingBreakdown(u)
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()
	u.Status = domain.UnitStatusOpen
	u.CurrentMembersCount = 0
	u.CurrentSharesCount = 0

	r.mockUnits = append([]domain.Unit{*u}, r.mockUnits...)
	return nil
}

func (r *UnitRepository) UpdateUnitStatus(ctx context.Context, unitID, status string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i := range r.mockUnits {
		if r.mockUnits[i].ID == unitID {
			r.mockUnits[i].Status = status
			r.mockUnits[i].UpdatedAt = time.Now()
			return nil
		}
	}
	return errors.New("unit not found")
}

func (r *UnitRepository) CheckLifecycleAndExpire(
	ctx context.Context,
	refundFn func(userID string, amountKobo int64, reason, refID string) error,
) (lockedCount int, refundedCount int, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()

	for i := range r.mockUnits {
		u := &r.mockUnits[i]

		// 1. Auto-Lock when unit reaches full capacity
		if u.Status == domain.UnitStatusOpen && u.CurrentMembersCount >= u.MaxMembers {
			u.Status = domain.UnitStatusFull
			u.UpdatedAt = now
			lockedCount++
		}

		// 2. Deadline Expiry & Auto-Refund
		if u.Status == domain.UnitStatusOpen && now.After(u.PaymentDeadline) && u.CurrentMembersCount < u.MaxMembers {
			u.Status = domain.UnitStatusExpired
			u.UpdatedAt = now

			members := r.mockMembers[u.ID]
			for mIdx := range members {
				m := &members[mIdx]
				if m.PaymentStatus == domain.PaymentStatusPaid {
					if refundFn != nil {
						_ = refundFn(m.UserID, m.AmountPaidKobo, "UNIT_EXPIRED_REFUND: "+u.ProductName, u.ID)
					}
					m.PaymentStatus = domain.PaymentStatusRefunded
					refundedCount++
				}
			}
			u.Status = domain.UnitStatusRefunding
		}
	}

	return lockedCount, refundedCount, nil
}
