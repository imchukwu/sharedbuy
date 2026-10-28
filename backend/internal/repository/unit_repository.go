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
	mockDisputes []domain.Dispute
	mu           sync.RWMutex
}

func NewUnitRepository(db *sql.DB) *UnitRepository {
	now := time.Now()
	resolvedAt := now.Add(-18 * time.Hour)
	repo := &UnitRepository{
		db:           db,
		mockUnits:    getMockUnits(),
		mockAreas:    defaultAreas,
		mockProducts: defaultProducts,
		mockMembers:  getMockMembers(),
		mockDisputes: []domain.Dispute{
			{
				ID:              "disp-piwoyi-02",
				UnitID:          "unit-piwoyi-milk-02",
				UnitProductName: "Lactorich Instant Full Cream Powdered Milk",
				UnitLandmark:    "Behind Salam Salam",
				UserID:          "user-mgr-aisha",
				ReporterName:    "Aisha Bello",
				Type:            "SHORTAGE",
				Description:     "25kg Lactorich sack weighed 24.75kg on calibrated hub scale during pre-splitting check (0.25kg transit loss). Requesting 4% buffer allocation note.",
				PhotoURLs:       []string{},
				Status:          "OPEN",
				ResolutionNotes: "",
				CreatedAt:       now.Add(-3 * time.Hour),
			},
			{
				ID:              "disp-piwoyi-01",
				UnitID:          "unit-piwoyi-rice-01",
				UnitProductName: "Mama Gold Premium Long Grain Parboiled Rice",
				UnitLandmark:    "16 Biana street, New Extension",
				UserID:          "user-mgr-aisha",
				ReporterName:    "Aisha Bello",
				Type:            "QUALITY",
				Description:     "Verified bag seal and digital scale weight at 50.2kg upon truck offloading at 16 Biana street. Outer sack had minor scuffing from transit; inner grain quality 100% intact.",
				PhotoURLs:       []string{},
				Status:          "RESOLVED",
				ResolutionNotes: "Logged by Hub Coordinator during waybill WB-9941 inspection. Approved for member distribution.",
				CreatedAt:       now.Add(-20 * time.Hour),
				ResolvedAt:      &resolvedAt,
			},
		},
	}
	for i := range repo.mockUnits {
		repo.calculatePricingBreakdown(&repo.mockUnits[i])
	}
	return repo
}

type UnitFilter struct {
	AreaID    string
	Locality  string
	State     string
	Country   string
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
				remI := result[i].MaxMembers - result[i].CurrentSharesCount
				remJ := result[j].MaxMembers - result[j].CurrentSharesCount
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
			u.area_id, a.name as area_name, COALESCE(a.locality, a.city) as area_locality, a.city as area_city, a.state as area_state, COALESCE(a.country, 'Nigeria') as area_country,
			COALESCE(u.hub_id, '') as hub_id, u.collection_address, u.collection_landmark, COALESCE(u.collection_map_url, '') as collection_map_url,
			u.total_packs, u.share_size, u.max_members,
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
	if filter.Locality != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("LOWER(a.locality) = LOWER($%d)", argIdx))
		args = append(args, filter.Locality)
		argIdx++
	}
	if filter.State != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("LOWER(a.state) = LOWER($%d)", argIdx))
		args = append(args, filter.State)
		argIdx++
	}
	if filter.Country != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(LOWER(a.country) = LOWER($%d) OR LOWER(a.country_code) = LOWER($%d))", argIdx, argIdx))
		args = append(args, filter.Country)
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
		         mgr.full_name, mgr.phone, mgr.rating, a.name, a.locality, a.city, a.state, a.country
	`

	switch filter.Sort {
	case "almost_full":
		baseQuery += " ORDER BY (u.max_members - COALESCE(SUM(um.shares_count), 0)) ASC, u.payment_deadline ASC"
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
			&u.AreaID, &u.AreaName, &u.AreaLocality, &u.AreaCity, &u.AreaState, &u.AreaCountry,
			&u.HubID, &u.CollectionAddress, &u.CollectionLandmark, &u.CollectionMapURL,
			&u.TotalPacks, &u.ShareSize, &u.MaxMembers,
			&u.PricePerShareQuotedKobo, &u.BufferPercent, &u.Status, &u.PaymentDeadline, &u.SharingDate,
			&u.CreatedAt, &u.UpdatedAt,
			&u.CurrentSharesCount, &u.CurrentMembersCount,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning unit: %w", err)
		}

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
			u.area_id, a.name as area_name, COALESCE(a.locality, a.city) as area_locality, a.city as area_city, a.state as area_state, COALESCE(a.country, 'Nigeria') as area_country,
			COALESCE(u.hub_id, '') as hub_id, u.collection_address, u.collection_landmark, COALESCE(u.collection_map_url, '') as collection_map_url,
			u.total_packs, u.share_size, u.max_members,
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
		         mgr.full_name, mgr.phone, mgr.rating, a.name, a.locality, a.city, a.state, a.country
	`

	var u domain.Unit
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.ProductID, &u.ProductName, &u.ProductCategory,
		&u.ProductImageURL, &u.ProductPackSize, &u.UnitOfShare,
		&u.ManagerID, &u.ManagerName, &u.ManagerPhone, &u.ManagerRating,
		&u.AreaID, &u.AreaName, &u.AreaLocality, &u.AreaCity, &u.AreaState, &u.AreaCountry,
		&u.HubID, &u.CollectionAddress, &u.CollectionLandmark, &u.CollectionMapURL,
		&u.TotalPacks, &u.ShareSize, &u.MaxMembers,
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

	// Estimated retail market price is ~28% higher
	u.EstimatedMarketPriceKobo = int64(float64(total) * 1.28)
	u.EstimatedSavingsKobo = u.EstimatedMarketPriceKobo - total
}

func (r *UnitRepository) GetUnitMembers(ctx context.Context, unitID string) ([]domain.UnitMember, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		if members, ok := r.mockMembers[unitID]; ok {
			res := make([]domain.UnitMember, len(members))
			copy(res, members)
			return res, nil
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

func (r *UnitRepository) GetMemberUnits(ctx context.Context, userID string) ([]domain.MemberUnitBooking, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()

		var bookings []domain.MemberUnitBooking
		for _, u := range r.mockUnits {
			members := r.mockMembers[u.ID]
			for _, m := range members {
				if m.UserID == userID {
					unitCopy := u
					r.calculatePricingBreakdown(&unitCopy)
					bookings = append(bookings, domain.MemberUnitBooking{
						MemberID:         m.ID,
						UnitID:           u.ID,
						UserID:           m.UserID,
						SharesCount:      m.SharesCount,
						AmountPaidKobo:   m.AmountPaidKobo,
						PaymentStatus:    m.PaymentStatus,
						CollectionStatus: m.CollectionStatus,
						CollectionCode:   m.CollectionCode,
						JoinedAt:         m.JoinedAt,
						CollectedAt:      m.CollectedAt,
						Unit:             unitCopy,
					})
				}
			}
		}

		sort.Slice(bookings, func(i, j int) bool {
			return bookings[i].JoinedAt.After(bookings[j].JoinedAt)
		})

		return bookings, nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, unit_id, user_id, shares_count, amount_paid_kobo, payment_status, collection_status, collection_code, joined_at, collected_at
		FROM unit_members
		WHERE user_id = $1
		ORDER BY joined_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []domain.MemberUnitBooking
	for rows.Next() {
		var b domain.MemberUnitBooking
		if err := rows.Scan(&b.MemberID, &b.UnitID, &b.UserID, &b.SharesCount, &b.AmountPaidKobo, &b.PaymentStatus, &b.CollectionStatus, &b.CollectionCode, &b.JoinedAt, &b.CollectedAt); err != nil {
			return nil, err
		}
		unit, err := r.GetUnitByID(ctx, b.UnitID)
		if err == nil && unit != nil {
			b.Unit = *unit
			bookings = append(bookings, b)
		}
	}
	return bookings, nil
}

func (r *UnitRepository) GetAreas(ctx context.Context) ([]domain.Area, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		return r.mockAreas, nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, COALESCE(locality, city), city, state, COALESCE(country, 'Nigeria'), COALESCE(country_code, 'NG'), COALESCE(currency, 'NGN'), COALESCE(launch_phase, 'LIVE'), is_active, created_at
		FROM areas
		WHERE is_active = TRUE
		ORDER BY CASE WHEN launch_phase = 'LIVE' THEN 0 ELSE 1 END, name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var areas []domain.Area
	for rows.Next() {
		var a domain.Area
		if err := rows.Scan(&a.ID, &a.Name, &a.Locality, &a.City, &a.State, &a.Country, &a.CountryCode, &a.Currency, &a.LaunchPhase, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, err
		}
		// Load hubs for this area
		hubRows, hErr := r.db.QueryContext(ctx, `
			SELECT id, area_id, name, landmark, address, COALESCE(map_url, ''), is_active
			FROM collection_hubs
			WHERE area_id = $1 AND is_active = TRUE
			ORDER BY name ASC
		`, a.ID)
		if hErr == nil {
			for hubRows.Next() {
				var h domain.CollectionHub
				if err := hubRows.Scan(&h.ID, &h.AreaID, &h.Name, &h.Landmark, &h.Address, &h.MapURL, &h.IsActive); err == nil {
					a.Hubs = append(a.Hubs, h)
				}
			}
			hubRows.Close()
		}
		areas = append(areas, a)
	}
	return areas, nil
}

func (r *UnitRepository) GetAreaByID(ctx context.Context, areaID string) *domain.Area {
	areas, err := r.GetAreas(ctx)
	if err != nil {
		return nil
	}
	for _, a := range areas {
		if a.ID == areaID {
			aCopy := a
			return &aCopy
		}
	}
	return nil
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
	if sharesCount <= 0 {
		sharesCount = 1
	}

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

		if targetUnit.CurrentSharesCount+sharesCount > targetUnit.MaxMembers {
			rem := targetUnit.MaxMembers - targetUnit.CurrentSharesCount
			if rem <= 0 {
				return nil, errors.New("unit is already full")
			}
			return nil, fmt.Errorf("only %d share(s) remaining in this unit", rem)
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

		targetUnit.CurrentMembersCount += sharesCount
		targetUnit.CurrentSharesCount += sharesCount
		targetUnit.UpdatedAt = time.Now()

		if targetUnit.CurrentSharesCount >= targetUnit.MaxMembers {
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

	var maxMembers, currentShares int
	var status string
	err = tx.QueryRowContext(ctx, "SELECT max_members, status, (SELECT COALESCE(SUM(shares_count), 0) FROM unit_members WHERE unit_id = $1 AND payment_status = 'PAID') FROM units WHERE id = $1 FOR UPDATE", unitID).Scan(&maxMembers, &status, &currentShares)
	if err != nil {
		return nil, fmt.Errorf("error verifying unit: %w", err)
	}

	if status != domain.UnitStatusOpen {
		return nil, fmt.Errorf("unit is not open for new joins (status: %s)", status)
	}
	if currentShares+sharesCount > maxMembers {
		return nil, errors.New("not enough shares remaining in this unit")
	}

	memberID := fmt.Sprintf("um-%d", time.Now().UnixNano()%1000000)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO unit_members (id, unit_id, user_id, shares_count, amount_paid_kobo, payment_status, collection_status, collection_code, joined_at)
		VALUES ($1, $2, $3, $4, $5, 'PAID', 'PENDING', $6, NOW())
	`, memberID, unitID, userID, sharesCount, amountKobo, collectionCode)
	if err != nil {
		return nil, fmt.Errorf("error inserting unit member: %w", err)
	}

	if currentShares+sharesCount >= maxMembers {
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

func (r *UnitRepository) VerifyCollectionCode(ctx context.Context, managerID, code string) (*domain.UnitMember, *domain.Unit, bool, []domain.UnitMember, error) {
	cleanCode := strings.TrimSpace(code)
	if len(cleanCode) != 6 {
		return nil, nil, false, nil, errors.New("collection code must be exactly 6 digits")
	}

	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()

		for unitID, members := range r.mockMembers {
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
						return nil, nil, false, nil, fmt.Errorf("collection code %s was already verified and collected on %s", cleanCode, collectedDate)
					}

					now := time.Now()
					m.CollectionStatus = domain.CollectionStatusCollected
					m.CollectedAt = &now

					// Check if all paid members in this unit have now collected
					allCollected := len(members) > 0
					for j := range members {
						if members[j].PaymentStatus == domain.PaymentStatusPaid && members[j].CollectionStatus != domain.CollectionStatusCollected {
							allCollected = false
							break
						}
					}

					unitCompletedNow := false
					if allCollected && targetUnit.Status != domain.UnitStatusCompleted {
						targetUnit.Status = domain.UnitStatusCompleted
						targetUnit.UpdatedAt = now
						unitCompletedNow = true
					}

					unitCopy := *targetUnit
					r.calculatePricingBreakdown(&unitCopy)
					membersCopy := make([]domain.UnitMember, len(members))
					copy(membersCopy, members)

					return m, &unitCopy, unitCompletedNow, membersCopy, nil
				}
			}
		}

		return nil, nil, false, nil, errors.New("invalid collection code or code not found for your managed units")
	}

	// PostgreSQL verification
	var memberID, unitID, userID, userName, userPhone, paymentStatus, collectionStatus string
	var sharesCount int
	var amountPaidKobo int64
	var joinedAt time.Time
	var collectedAt sql.NullTime

	query := `
		SELECT um.id, um.unit_id, um.user_id, u.full_name, u.phone, um.shares_count, um.amount_paid_kobo,
		       um.payment_status, um.collection_status, um.joined_at, um.collected_at
		FROM unit_members um
		JOIN users u ON um.user_id = u.id
		JOIN units un ON um.unit_id = un.id
		WHERE um.collection_code = $1 AND ($2 = '' OR un.manager_id = $2)
		LIMIT 1
	`
	err := r.db.QueryRowContext(ctx, query, cleanCode, managerID).Scan(
		&memberID, &unitID, &userID, &userName, &userPhone, &sharesCount, &amountPaidKobo,
		&paymentStatus, &collectionStatus, &joinedAt, &collectedAt,
	)
	if err != nil {
		return nil, nil, false, nil, errors.New("invalid collection code or code not found for your managed units")
	}

	if collectionStatus == domain.CollectionStatusCollected {
		return nil, nil, false, nil, fmt.Errorf("collection code %s was already verified and collected", cleanCode)
	}

	now := time.Now()
	_, err = r.db.ExecContext(ctx, "UPDATE unit_members SET collection_status = 'COLLECTED', collected_at = $1 WHERE id = $2", now, memberID)
	if err != nil {
		return nil, nil, false, nil, err
	}

	var pendingCount int
	_ = r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM unit_members WHERE unit_id = $1 AND payment_status = 'PAID' AND collection_status != 'COLLECTED'", unitID).Scan(&pendingCount)
	unitCompletedNow := false
	if pendingCount == 0 {
		_, _ = r.db.ExecContext(ctx, "UPDATE units SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1 AND status != 'COMPLETED'", unitID)
		unitCompletedNow = true
	}

	unit, _ := r.GetUnitByID(ctx, unitID)
	allMembers, _ := r.GetUnitMembers(ctx, unitID)
	m := &domain.UnitMember{
		ID:               memberID,
		UnitID:           unitID,
		UserID:           userID,
		UserName:         userName,
		UserPhone:        userPhone,
		SharesCount:      sharesCount,
		AmountPaidKobo:   amountPaidKobo,
		PaymentStatus:    paymentStatus,
		CollectionStatus: domain.CollectionStatusCollected,
		CollectionCode:   cleanCode,
		JoinedAt:         joinedAt,
		CollectedAt:      &now,
	}

	return m, unit, unitCompletedNow, allMembers, nil
}

func (r *UnitRepository) CreateUnit(ctx context.Context, u *domain.Unit) error {
	r.calculatePricingBreakdown(u)
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()
	if u.Status == "" {
		u.Status = domain.UnitStatusOpen
	}
	u.CurrentMembersCount = 0
	u.CurrentSharesCount = 0

	locSlug := strings.ToLower(strings.ReplaceAll(u.AreaLocality, " ", "-"))
	if locSlug == "" {
		locSlug = "piwoyi"
	}
	if u.ID == "" {
		u.ID = fmt.Sprintf("unit-%s-%s-%d", locSlug, strings.ToLower(strings.Split(u.ProductCategory, " ")[0]), time.Now().Unix()%10000)
	}

	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.mockUnits = append([]domain.Unit{*u}, r.mockUnits...)
		return nil
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO units (
			id, product_id, manager_id, area_id, hub_id, collection_address, collection_landmark, collection_map_url,
			total_packs, share_size, max_members, price_per_share_quoted_kobo, buffer_percent, status,
			payment_deadline, sharing_date, created_at, updated_at
		) VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
	`, u.ID, u.ProductID, u.ManagerID, u.AreaID, u.HubID, u.CollectionAddress, u.CollectionLandmark, u.CollectionMapURL,
		u.TotalPacks, u.ShareSize, u.MaxMembers, u.PricePerShareQuotedKobo, u.BufferPercent, u.Status,
		u.PaymentDeadline, u.SharingDate)
	return err
}

func (r *UnitRepository) UpdateUnitStatus(ctx context.Context, unitID, status string) error {
	if r.db == nil {
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

	_, err := r.db.ExecContext(ctx, "UPDATE units SET status = $1, updated_at = NOW() WHERE id = $2", status, unitID)
	return err
}

func (r *UnitRepository) CheckLifecycleAndExpire(
	ctx context.Context,
	refundFn func(userID string, amountKobo int64, reason, refID string) error,
) (lockedCount int, refundedCount int, err error) {
	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()

		now := time.Now()

		for i := range r.mockUnits {
			u := &r.mockUnits[i]

			// 1. Auto-Lock when unit reaches full capacity
			if u.Status == domain.UnitStatusOpen && u.CurrentSharesCount >= u.MaxMembers {
				u.Status = domain.UnitStatusFull
				u.UpdatedAt = now
				lockedCount++
			}

			// 2. Deadline Expiry & Auto-Refund
			if u.Status == domain.UnitStatusOpen && now.After(u.PaymentDeadline) && u.CurrentSharesCount < u.MaxMembers {
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

	// PostgreSQL Lifecycle Check
	res, err := r.db.ExecContext(ctx, `
		UPDATE units u
		SET status = 'FULL', updated_at = NOW()
		WHERE u.status = 'OPEN'
		  AND (SELECT COALESCE(SUM(shares_count), 0) FROM unit_members um WHERE um.unit_id = u.id AND um.payment_status = 'PAID') >= u.max_members
	`)
	if err == nil {
		affected, _ := res.RowsAffected()
		lockedCount = int(affected)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT u.id, p.name
		FROM units u
		JOIN products p ON u.product_id = p.id
		WHERE u.status = 'OPEN' AND u.payment_deadline < NOW()
	`)
	if err == nil {
		var expiredUnits []struct {
			id   string
			name string
		}
		for rows.Next() {
			var item struct {
				id   string
				name string
			}
			if rows.Scan(&item.id, &item.name) == nil {
				expiredUnits = append(expiredUnits, item)
			}
		}
		rows.Close()

		for _, eu := range expiredUnits {
			mems, _ := r.GetUnitMembers(ctx, eu.id)
			for _, m := range mems {
				if m.PaymentStatus == domain.PaymentStatusPaid {
					if refundFn != nil {
						_ = refundFn(m.UserID, m.AmountPaidKobo, "UNIT_EXPIRED_REFUND: "+eu.name, eu.id)
					}
					_, _ = r.db.ExecContext(ctx, "UPDATE unit_members SET payment_status = 'REFUNDED' WHERE id = $1", m.ID)
					refundedCount++
				}
			}
			_, _ = r.db.ExecContext(ctx, "UPDATE units SET status = 'REFUNDING', updated_at = NOW() WHERE id = $1", eu.id)
		}
	}

	return lockedCount, refundedCount, nil
}

func (r *UnitRepository) UpdateMemberCollectionStatus(ctx context.Context, unitID, memberID, status string) (*domain.UnitMember, error) {
	if status != domain.CollectionStatusPending && status != domain.CollectionStatusCollected && status != domain.CollectionStatusNoShow {
		return nil, errors.New("invalid collection status")
	}

	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()

		members, exists := r.mockMembers[unitID]
		if !exists {
			return nil, errors.New("unit members not found")
		}
		for i := range members {
			if members[i].ID == memberID {
				now := time.Now()
				members[i].CollectionStatus = status
				if status == domain.CollectionStatusCollected {
					members[i].CollectedAt = &now
				} else {
					members[i].CollectedAt = nil
				}
				memCopy := members[i]
				return &memCopy, nil
			}
		}
		return nil, errors.New("member not found in unit")
	}

	var collectedAt interface{}
	if status == domain.CollectionStatusCollected {
		now := time.Now()
		collectedAt = now
	}
	_, err := r.db.ExecContext(ctx, "UPDATE unit_members SET collection_status = $1, collected_at = $2 WHERE id = $3 AND unit_id = $4", status, collectedAt, memberID, unitID)
	if err != nil {
		return nil, err
	}

	mems, _ := r.GetUnitMembers(ctx, unitID)
	for _, m := range mems {
		if m.ID == memberID {
			mCopy := m
			return &mCopy, nil
		}
	}
	return nil, errors.New("updated member not found")
}

func (r *UnitRepository) ListDisputes(ctx context.Context, managerID string) ([]domain.Dispute, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()

		var res []domain.Dispute
		for _, d := range r.mockDisputes {
			if managerID == "" || d.UserID == managerID {
				res = append(res, d)
			}
		}
		return res, nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT d.id, d.unit_id, COALESCE(p.name, ''), COALESCE(un.collection_landmark, ''),
		       d.user_id, COALESCE(u.full_name, ''), d.type, d.description, d.status,
		       COALESCE(d.resolution_notes, ''), d.created_at, d.resolved_at
		FROM disputes d
		LEFT JOIN units un ON d.unit_id = un.id
		LEFT JOIN products p ON un.product_id = p.id
		LEFT JOIN users u ON d.user_id = u.id
		WHERE ($1 = '' OR d.user_id = $1 OR un.manager_id = $1)
		ORDER BY d.created_at DESC
	`, managerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Dispute
	for rows.Next() {
		var d domain.Dispute
		var resolvedAt sql.NullTime
		if err := rows.Scan(
			&d.ID, &d.UnitID, &d.UnitProductName, &d.UnitLandmark,
			&d.UserID, &d.ReporterName, &d.Type, &d.Description, &d.Status,
			&d.ResolutionNotes, &d.CreatedAt, &resolvedAt,
		); err == nil {
			if resolvedAt.Valid {
				d.ResolvedAt = &resolvedAt.Time
			}
			list = append(list, d)
		}
	}
	return list, nil
}

func (r *UnitRepository) CreateDispute(ctx context.Context, d *domain.Dispute) error {
	if d.ID == "" {
		d.ID = fmt.Sprintf("disp-%d", time.Now().UnixNano()%1000000)
	}
	if d.Status == "" {
		d.Status = "OPEN"
	}
	d.CreatedAt = time.Now()

	// Enrich unit metadata if missing
	if d.UnitProductName == "" || d.UnitLandmark == "" {
		u, _ := r.GetUnitByID(ctx, d.UnitID)
		if u != nil {
			d.UnitProductName = u.ProductName
			d.UnitLandmark = u.CollectionLandmark
		}
	}

	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.mockDisputes = append([]domain.Dispute{*d}, r.mockDisputes...)
		return nil
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO disputes (id, unit_id, user_id, type, description, status, resolution_notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`, d.ID, d.UnitID, d.UserID, d.Type, d.Description, d.Status, d.ResolutionNotes)
	return err
}

func (r *UnitRepository) ResolveDispute(ctx context.Context, disputeID, status, resolutionNotes string) (*domain.Dispute, error) {
	if status == "" {
		status = "RESOLVED"
	}
	now := time.Now()

	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()

		for i := range r.mockDisputes {
			if r.mockDisputes[i].ID == disputeID {
				r.mockDisputes[i].Status = status
				r.mockDisputes[i].ResolutionNotes = resolutionNotes
				if status == "RESOLVED" || status == "REJECTED" {
					r.mockDisputes[i].ResolvedAt = &now
				}
				dCopy := r.mockDisputes[i]
				return &dCopy, nil
			}
		}
		return nil, errors.New("dispute not found")
	}

	_, err := r.db.ExecContext(ctx, `
		UPDATE disputes
		SET status = $1, resolution_notes = $2, resolved_at = NOW()
		WHERE id = $3
	`, status, resolutionNotes, disputeID)
	if err != nil {
		return nil, err
	}

	disputes, _ := r.ListDisputes(ctx, "")
	for _, d := range disputes {
		if d.ID == disputeID {
			dCopy := d
			return &dCopy, nil
		}
	}
	return nil, errors.New("updated dispute not found")
}

func (r *UnitRepository) CancelUnitAndRefund(
	ctx context.Context,
	unitID, reason string,
	refundFn func(userID string, amountKobo int64, reason, refID string) error,
) (refundedMembers int, totalRefundedKobo int64, err error) {
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
			return 0, 0, errors.New("unit not found")
		}

		targetUnit.Status = domain.UnitStatusCancelled
		targetUnit.UpdatedAt = time.Now()

		members := r.mockMembers[unitID]
		for i := range members {
			m := &members[i]
			if m.PaymentStatus == domain.PaymentStatusPaid {
				if refundFn != nil && m.AmountPaidKobo > 0 {
					_ = refundFn(
						m.UserID,
						m.AmountPaidKobo,
						fmt.Sprintf("UNIT_CANCELLED_REFUND: 100%% capital returned (%s - %s)", targetUnit.ProductName, reason),
						"cancel-"+unitID+"-"+m.ID,
					)
				}
				m.PaymentStatus = domain.PaymentStatusRefunded
				refundedMembers++
				totalRefundedKobo += m.AmountPaidKobo
			}
		}
		return refundedMembers, totalRefundedKobo, nil
	}

	u, err := r.GetUnitByID(ctx, unitID)
	if err != nil || u == nil {
		return 0, 0, errors.New("unit not found")
	}
	members, _ := r.GetUnitMembers(ctx, unitID)
	for _, m := range members {
		if m.PaymentStatus == domain.PaymentStatusPaid {
			if refundFn != nil && m.AmountPaidKobo > 0 {
				_ = refundFn(
					m.UserID,
					m.AmountPaidKobo,
					fmt.Sprintf("UNIT_CANCELLED_REFUND: 100%% capital returned (%s - %s)", u.ProductName, reason),
					"cancel-"+unitID+"-"+m.ID,
				)
			}
			_, _ = r.db.ExecContext(ctx, "UPDATE unit_members SET payment_status = 'REFUNDED' WHERE id = $1", m.ID)
			refundedMembers++
			totalRefundedKobo += m.AmountPaidKobo
		}
	}
	_, err = r.db.ExecContext(ctx, "UPDATE units SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", unitID)
	return refundedMembers, totalRefundedKobo, err
}


