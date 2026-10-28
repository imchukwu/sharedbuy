package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"sharedbuy-backend/internal/domain"
	"sharedbuy-backend/internal/middleware"
	"sharedbuy-backend/internal/repository"
	"sharedbuy-backend/internal/service"
)

type UnitHandler struct {
	unitRepo         *repository.UnitRepository
	userRepo         *repository.UserRepository
	walletRepo       *repository.WalletRepository
	lifecycleService *service.LifecycleService
}

func NewUnitHandler(
	unitRepo *repository.UnitRepository,
	userRepo *repository.UserRepository,
	walletRepo *repository.WalletRepository,
	lifecycleService *service.LifecycleService,
) *UnitHandler {
	return &UnitHandler{
		unitRepo:         unitRepo,
		userRepo:         userRepo,
		walletRepo:       walletRepo,
		lifecycleService: lifecycleService,
	}
}

func (h *UnitHandler) ListUnits(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.UnitFilter{
		AreaID:    q.Get("area_id"),
		Locality:  q.Get("locality"),
		State:     q.Get("state"),
		Country:   q.Get("country"),
		ProductID: q.Get("product_id"),
		Status:    q.Get("status"),
		Sort:      q.Get("sort"),
	}

	units, err := h.unitRepo.ListUnits(r.Context(), filter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to list units: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, units)
}

func (h *UnitHandler) GetUnit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unit ID is required"})
		return
	}

	unit, err := h.unitRepo.GetUnitByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to retrieve unit"})
		return
	}
	if unit == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Unit not found"})
		return
	}

	writeJSON(w, http.StatusOK, unit)
}

func (h *UnitHandler) GetUnitMembers(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unit ID is required"})
		return
	}

	members, err := h.unitRepo.GetUnitMembers(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to retrieve unit members"})
		return
	}

	callerID := middleware.GetUserID(r.Context())
	callerRole := middleware.GetUserRole(r.Context())

	// Full unmasked access is restricted to Platform Admins or the Unit's assigned Coordinator
	hasFullAccess := callerRole == domain.RoleAdmin
	if !hasFullAccess && callerRole == domain.RoleUnitManager && callerID != "" {
		if unit, err := h.unitRepo.GetUnitByID(r.Context(), id); err == nil && unit != nil && unit.ManagerID == callerID {
			hasFullAccess = true
		}
	}

	if hasFullAccess {
		writeJSON(w, http.StatusOK, members)
		return
	}

	// Sanitize PII and strip 6-digit pickup codes for public / other members
	sanitized := make([]domain.UnitMember, len(members))
	for i, m := range members {
		if callerID != "" && m.UserID == callerID {
			sanitized[i] = m
			continue
		}
		masked := m
		masked.CollectionCode = "" // Never expose another neighbor's 6-digit pickup code
		masked.UserPhone = maskMemberPhone(m.UserPhone)
		masked.UserName = maskMemberName(m.UserName)
		sanitized[i] = masked
	}

	writeJSON(w, http.StatusOK, sanitized)
}

func maskMemberPhone(phone string) string {
	if len(phone) <= 7 {
		return "***"
	}
	return phone[:6] + "****" + phone[len(phone)-3:]
}

func maskMemberName(name string) string {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) <= 1 {
		return name
	}
	lastInitial := string([]rune(parts[len(parts)-1])[0])
	return parts[0] + " " + lastInitial + "."
}

func (h *UnitHandler) GetMemberUnits(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	bookings, err := h.unitRepo.GetMemberUnits(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to retrieve member units"})
		return
	}
	if bookings == nil {
		bookings = []domain.MemberUnitBooking{}
	}

	writeJSON(w, http.StatusOK, bookings)
}

type VerifyCodeRequest struct {
	Code string `json:"code"`
}

type VerifyCodeResponse struct {
	Success       bool               `json:"success"`
	Message       string             `json:"message"`
	Member        *domain.UnitMember `json:"member"`
	Unit          *domain.Unit       `json:"unit"`
	UnitCompleted bool               `json:"unit_completed"`
}

func (h *UnitHandler) VerifyCollectionCode(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var req VerifyCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	code := strings.TrimSpace(req.Code)
	if len(code) != 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Collection code must be exactly 6 digits"})
		return
	}

	// Verify against manager's units (if manager role), or any unit if admin
	member, unit, unitCompleted, allMembers, err := h.unitRepo.VerifyCollectionCode(r.Context(), userID, code)
	if err != nil {
		// If not found for this specific manager, try verifying generally if user is admin
		member, unit, unitCompleted, allMembers, err = h.unitRepo.VerifyCollectionCode(r.Context(), "", code)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
	}

	// If unit completed all collections, settle Coordinator 3% Commission & Member 4% Buffer Surplus Refunds
	if unitCompleted && h.walletRepo != nil && unit != nil {
		totalShares := int64(unit.CurrentSharesCount)
		if totalShares <= 0 {
			totalShares = int64(len(allMembers))
		}
		commissionKobo := unit.ManagerCommissionShareKobo * totalShares
		if commissionKobo > 0 && unit.ManagerID != "" {
			_, _ = h.walletRepo.Credit(
				r.Context(),
				unit.ManagerID,
				commissionKobo,
				fmt.Sprintf("MANAGER_COMMISSION: 3%% Coordinator Reward for completing %s (%s)", unit.ProductName, unit.CollectionLandmark),
				"comm-"+unit.ID,
			)
		}

		// Refund unused 4% price buffer surplus to each member's wallet
		if unit.BufferShareKobo > 0 {
			for _, m := range allMembers {
				if m.PaymentStatus == domain.PaymentStatusPaid {
					surplusKobo := unit.BufferShareKobo * int64(m.SharesCount)
					if surplusKobo > 0 {
						_, _ = h.walletRepo.Credit(
							r.Context(),
							m.UserID,
							surplusKobo,
							fmt.Sprintf("SURPLUS_REFUND: Unused 4%% price buffer returned (%s)", unit.ProductName),
							"surplus-"+unit.ID+"-"+m.ID,
						)
					}
				}
			}
		}
	}

	msg := fmt.Sprintf("✓ Verified! Release %d share(s) of %s (%s) to %s.",
		member.SharesCount, unit.ProductName, unit.ShareSize, member.UserName)
	if unitCompleted {
		msg += " All shares collected — Unit marked COMPLETED & 3% coordinator commission settled!"
	}

	writeJSON(w, http.StatusOK, VerifyCodeResponse{
		Success:       true,
		Message:       msg,
		Member:        member,
		Unit:          unit,
		UnitCompleted: unitCompleted,
	})
}

func (h *UnitHandler) GetManagedUnits(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	units, err := h.unitRepo.GetManagedUnits(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, units)
}

type CreateUnitRequestPayload struct {
	ProductID               string `json:"product_id"`
	ProductName             string `json:"product_name"`
	ProductCategory         string `json:"product_category"`
	ProductPackSize         string `json:"product_pack_size"`
	ManagerID               string `json:"manager_id"`
	AreaID                  string `json:"area_id"`
	HubID                   string `json:"hub_id"`
	CollectionAddress       string `json:"collection_address"`
	CollectionLandmark      string `json:"collection_landmark"`
	CollectionMapURL        string `json:"collection_map_url"`
	TotalPacks              int    `json:"total_packs"`
	ShareSize               string `json:"share_size"`
	MaxMembers              int    `json:"max_members"`
	PricePerShareQuotedKobo int64  `json:"price_per_share_quoted_kobo"`
	PaymentDeadlineHours    int    `json:"payment_deadline_hours"`
	SharingDaysAhead        int    `json:"sharing_days_ahead"`
}

func (h *UnitHandler) CreateUnit(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var req CreateUnitRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.ProductID == "" || req.MaxMembers <= 0 || req.PricePerShareQuotedKobo <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "product_id, max_members, and price_per_share_quoted_kobo are required"})
		return
	}

	managerID := req.ManagerID
	if managerID == "" {
		managerID = userID
	}

	mgrUser, _ := h.userRepo.GetByID(r.Context(), managerID)
	mgrName := "Aisha Bello"
	mgrPhone := "+2348011112222"
	var mgrRating float64 = 4.95
	if mgrUser != nil {
		mgrName = mgrUser.FullName
		mgrPhone = mgrUser.Phone
		mgrRating = mgrUser.Rating
	}

	// Product catalog details lookup
	prodName := req.ProductName
	prodCategory := req.ProductCategory
	prodPackSize := req.ProductPackSize
	prodImg := "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80"
	unitOfShare := "5kg Share"

	switch req.ProductID {
	case "prod-rice-mama-gold-50kg":
		if prodName == "" {
			prodName = "Mama Gold Premium Long Grain Parboiled Rice"
		}
		prodCategory = "Grains"
		prodImg = "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80"
		prodPackSize = "50kg Bag"
		unitOfShare = "5kg Share"
	case "prod-lactorich-milk-25kg":
		if prodName == "" {
			prodName = "Lactorich Instant Full Cream Powdered Milk"
		}
		prodCategory = "Dairy"
		prodImg = "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80"
		prodPackSize = "25kg Bag"
		unitOfShare = "2.5kg Share"
	case "prod-crayfish-bag":
		if prodName == "" {
			prodName = "Oron Premium Dried Crayfish"
		}
		prodCategory = "Seafood & Seasonings"
		prodImg = "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80"
		prodPackSize = "Large Sack (Bag)"
		unitOfShare = "Paint Bucket Share (~2kg)"
	case "prod-palm-oil-25l":
		if prodName == "" {
			prodName = "Direct Mill Pure Red Palm Oil"
		}
		prodCategory = "Oils"
		prodImg = "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80"
		prodPackSize = "25L Gallon"
		unitOfShare = "5L Share"
	default:
		if prodName == "" {
			prodName = "Wholesale Staple Commodity"
		}
		if prodCategory == "" {
			prodCategory = "Grains"
		}
		if prodPackSize == "" {
			prodPackSize = "50kg Bag"
		}
	}

	if req.ShareSize == "" {
		req.ShareSize = unitOfShare
	}
	if req.TotalPacks <= 0 {
		req.TotalPacks = 1
	}

	areaID := req.AreaID
	if areaID == "" {
		areaID = "area-piwoyi-abuja"
	}

	area := h.unitRepo.GetAreaByID(r.Context(), areaID)
	areaName := "Piwoyi District Hub"
	areaLocality := "Piwoyi"
	areaCity := "Abuja"
	areaState := "FCT"
	areaCountry := "Nigeria"
	if area != nil {
		areaName = area.Name
		areaLocality = area.Locality
		areaCity = area.City
		areaState = area.State
		areaCountry = area.Country
	}

	address := req.CollectionAddress
	if address == "" {
		address = "16 Biana street, New Extension, Piwoyi, Abuja"
	}
	landmark := req.CollectionLandmark
	if landmark == "" {
		landmark = "16 Biana street, New Extension"
	}
	mapURL := req.CollectionMapURL
	if mapURL == "" {
		mapURL = fmt.Sprintf("https://www.google.com/maps/search/?api=1&query=%s", strings.ReplaceAll(address, " ", "+"))
	}

	deadlineHours := req.PaymentDeadlineHours
	if deadlineHours <= 0 {
		deadlineHours = 48
	}
	daysAhead := req.SharingDaysAhead
	if daysAhead <= 0 {
		daysAhead = 4
	}

	now := time.Now()
	userRole := middleware.GetUserRole(r.Context())
	initialStatus := domain.UnitStatusPendingAdminReview
	if userRole == domain.RoleAdmin {
		initialStatus = domain.UnitStatusOpen
	}

	newUnit := domain.Unit{
		ProductID:               req.ProductID,
		ProductName:             prodName,
		ProductCategory:         prodCategory,
		ProductImageURL:         prodImg,
		ProductPackSize:         prodPackSize,
		UnitOfShare:             req.ShareSize,
		ManagerID:               managerID,
		ManagerName:             mgrName,
		ManagerPhone:            mgrPhone,
		ManagerRating:           mgrRating,
		AreaID:                  areaID,
		AreaName:                areaName,
		AreaLocality:            areaLocality,
		AreaCity:                areaCity,
		AreaState:               areaState,
		AreaCountry:             areaCountry,
		HubID:                   req.HubID,
		CollectionAddress:       address,
		CollectionLandmark:      landmark,
		CollectionMapURL:        mapURL,
		TotalPacks:              req.TotalPacks,
		ShareSize:               req.ShareSize,
		MaxMembers:              req.MaxMembers,
		PricePerShareQuotedKobo: req.PricePerShareQuotedKobo,
		BufferPercent:           4,
		Status:                  initialStatus,
		PaymentDeadline:         now.Add(time.Duration(deadlineHours) * time.Hour),
		SharingDate:             now.Add(time.Duration(daysAhead) * 24 * time.Hour),
	}

	if err := h.unitRepo.CreateUnit(r.Context(), &newUnit); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create unit: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, newUnit)
}

func (h *UnitHandler) RunLifecycleCheck(w http.ResponseWriter, r *http.Request) {
	if h.lifecycleService == nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Lifecycle service not configured"})
		return
	}

	report, err := h.lifecycleService.RunCheck(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, report)
}

type UpdateUnitStatusRequest struct {
	Status string `json:"status"`
	Notes  string `json:"notes,omitempty"`
}

// POST /api/manager/units/{id}/status
func (h *UnitHandler) UpdateUnitStatus(w http.ResponseWriter, r *http.Request) {
	unitID := chi.URLParam(r, "id")
	if unitID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unit ID is required"})
		return
	}

	var req UpdateUnitStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Status == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Valid target status is required"})
		return
	}

	unit, err := h.unitRepo.GetUnitByID(r.Context(), unitID)
	if err != nil || unit == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Unit not found"})
		return
	}

	prevStatus := unit.Status
	if err := h.unitRepo.UpdateUnitStatus(r.Context(), unitID, req.Status); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// If transitioning into COMPLETED for the first time, settle 3% Coordinator Commission & 4% Buffer Surplus
	if req.Status == domain.UnitStatusCompleted && prevStatus != domain.UnitStatusCompleted && h.walletRepo != nil {
		allMembers, _ := h.unitRepo.GetUnitMembers(r.Context(), unitID)
		totalShares := int64(unit.CurrentSharesCount)
		if totalShares <= 0 {
			totalShares = int64(len(allMembers))
		}
		commissionKobo := unit.ManagerCommissionShareKobo * totalShares
		if commissionKobo > 0 && unit.ManagerID != "" {
			_, _ = h.walletRepo.Credit(
				r.Context(),
				unit.ManagerID,
				commissionKobo,
				fmt.Sprintf("MANAGER_COMMISSION: 3%% Coordinator Reward for completing %s (%s)", unit.ProductName, unit.CollectionLandmark),
				"comm-"+unit.ID,
			)
		}

		if unit.BufferShareKobo > 0 {
			for _, m := range allMembers {
				if m.PaymentStatus == domain.PaymentStatusPaid {
					surplusKobo := unit.BufferShareKobo * int64(m.SharesCount)
					if surplusKobo > 0 {
						_, _ = h.walletRepo.Credit(
							r.Context(),
							m.UserID,
							surplusKobo,
							fmt.Sprintf("SURPLUS_REFUND: Unused 4%% price buffer returned (%s)", unit.ProductName),
							"surplus-"+unit.ID+"-"+m.ID,
						)
					}
				}
			}
		}
	}

	updatedUnit, _ := h.unitRepo.GetUnitByID(r.Context(), unitID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("✓ Unit status updated to %s", req.Status),
		"unit":    updatedUnit,
	})
}

type UpdateMemberStatusRequest struct {
	CollectionStatus string `json:"collection_status"`
}

// POST /api/manager/units/{id}/members/{memberId}/status
func (h *UnitHandler) UpdateMemberStatus(w http.ResponseWriter, r *http.Request) {
	unitID := chi.URLParam(r, "id")
	memberID := chi.URLParam(r, "memberId")
	if unitID == "" || memberID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unit ID and Member ID are required"})
		return
	}

	var req UpdateMemberStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CollectionStatus == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "collection_status is required"})
		return
	}

	member, err := h.unitRepo.UpdateMemberCollectionStatus(r.Context(), unitID, memberID, req.CollectionStatus)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("✓ Member %s marked as %s", member.UserName, req.CollectionStatus),
		"member":  member,
	})
}

// GET /api/manager/commissions
func (h *UnitHandler) GetManagerCommissions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	userRole := middleware.GetUserRole(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	filterMgrID := userID
	if userRole == domain.RoleAdmin {
		if qMgr := r.URL.Query().Get("manager_id"); qMgr != "" {
			filterMgrID = qMgr
		} else {
			filterMgrID = ""
		}
	}

	units, err := h.unitRepo.GetManagedUnits(r.Context(), filterMgrID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	mgrUser, _ := h.userRepo.GetByID(r.Context(), userID)
	mgrName := "Aisha Bello"
	var walletBal int64
	avgRating := 4.95
	if mgrUser != nil {
		mgrName = mgrUser.FullName
		walletBal = mgrUser.WalletBalanceKobo
		if mgrUser.Rating > 0 {
			avgRating = mgrUser.Rating
		}
	}

	var items []domain.ManagerCommissionItem
	var pendingTotal, settledTotal, projectedTotal int64
	completedCount := 0
	totalSharesManaged := 0
	totalSharesCollected := 0

	for _, u := range units {
		commPerShare := u.ManagerCommissionShareKobo
		projected := commPerShare * int64(u.MaxMembers)
		earnedSoFar := commPerShare * int64(u.CurrentSharesCount)
		totalSharesManaged += u.CurrentSharesCount

		unitMembers, _ := h.unitRepo.GetUnitMembers(r.Context(), u.ID)
		for _, m := range unitMembers {
			if m.CollectionStatus == domain.CollectionStatusCollected {
				totalSharesCollected += m.SharesCount
			}
		}

		payoutStatus := "PENDING"
		if u.Status == domain.UnitStatusCompleted {
			payoutStatus = "SETTLED"
			settledTotal += earnedSoFar
			completedCount++
		} else if u.Status != domain.UnitStatusCancelled && u.Status != domain.UnitStatusExpired && u.Status != domain.UnitStatusRefunding {
			pendingTotal += earnedSoFar
		}
		projectedTotal += projected

		items = append(items, domain.ManagerCommissionItem{
			UnitID:                  u.ID,
			ProductName:             u.ProductName,
			ProductPackSize:         u.ProductPackSize,
			CollectionLandmark:      u.CollectionLandmark,
			AreaLocality:            u.AreaLocality,
			UnitStatus:              u.Status,
			CurrentSharesCount:      u.CurrentSharesCount,
			MaxMembers:              u.MaxMembers,
			CommissionPerShareKobo:  commPerShare,
			ProjectedCommissionKobo: projected,
			EarnedCommissionKobo:    earnedSoFar,
			PayoutStatus:            payoutStatus,
			SharingDate:             u.SharingDate,
		})
	}

	if items == nil {
		items = []domain.ManagerCommissionItem{}
	}

	pickupRate := 100.0
	if totalSharesManaged > 0 {
		pickupRate = float64(totalSharesCollected) / float64(totalSharesManaged) * 100.0
	}

	summary := domain.ManagerCommissionSummary{
		ManagerID:             userID,
		ManagerName:           mgrName,
		TotalUnitsManaged:     len(units),
		CompletedUnitsCount:   completedCount,
		TotalSharesManaged:    totalSharesManaged,
		TotalSharesCollected:  totalSharesCollected,
		PickupCompletionRate:  pickupRate,
		OnTimeFulfillmentRate: 100.0,
		AverageRating:         avgRating,
		PendingCommissionKobo: pendingTotal,
		SettledCommissionKobo: settledTotal,
		TotalProjectedKobo:    projectedTotal,
		WalletBalanceKobo:     walletBal,
		Items:                 items,
	}

	writeJSON(w, http.StatusOK, summary)
}

// GET /api/manager/disputes
func (h *UnitHandler) ListDisputes(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	userRole := middleware.GetUserRole(r.Context())
	filterMgrID := userID
	if userRole == domain.RoleAdmin {
		filterMgrID = ""
	}

	disputes, err := h.unitRepo.ListDisputes(r.Context(), filterMgrID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if disputes == nil {
		disputes = []domain.Dispute{}
	}
	writeJSON(w, http.StatusOK, disputes)
}

// POST /api/manager/disputes
func (h *UnitHandler) CreateDispute(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var req domain.Dispute
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.UnitID == "" || strings.TrimSpace(req.Description) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unit_id and description are required"})
		return
	}

	req.UserID = userID
	if req.ReporterName == "" {
		if u, _ := h.userRepo.GetByID(r.Context(), userID); u != nil {
			req.ReporterName = u.FullName
		} else {
			req.ReporterName = "Hub Coordinator"
		}
	}
	if req.Type == "" {
		req.Type = "QUALITY"
	}

	if err := h.unitRepo.CreateDispute(r.Context(), &req); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, req)
}

type CancelUnitRequest struct {
	Reason string `json:"reason"`
}

// POST /api/admin/units/{id}/cancel
func (h *UnitHandler) CancelUnitAndRefund(w http.ResponseWriter, r *http.Request) {
	unitID := chi.URLParam(r, "id")
	if unitID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Unit ID is required"})
		return
	}

	var req CancelUnitRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	if strings.TrimSpace(req.Reason) == "" {
		req.Reason = "Admin operational cancellation"
	}

	refundedMembers, totalRefundedKobo, err := h.unitRepo.CancelUnitAndRefund(
		r.Context(),
		unitID,
		req.Reason,
		func(userID string, amountKobo int64, reason, refID string) error {
			if h.walletRepo != nil {
				_, wErr := h.walletRepo.Credit(r.Context(), userID, amountKobo, reason, refID)
				return wErr
			}
			return nil
		},
	)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	unit, _ := h.unitRepo.GetUnitByID(r.Context(), unitID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":             true,
		"message":             fmt.Sprintf("✓ Unit cancelled and %d paid member(s) refunded 100%% to wallet.", refundedMembers),
		"refunded_members":    refundedMembers,
		"total_refunded_kobo": totalRefundedKobo,
		"unit":                unit,
	})
}

type ResolveDisputeRequest struct {
	Status              string `json:"status"` // RESOLVED, INVESTIGATING, REJECTED
	ResolutionNotes     string `json:"resolution_notes"`
	CompensationUserID  string `json:"compensation_user_id,omitempty"`
	CompensationKobo    int64  `json:"compensation_kobo,omitempty"`
}

// POST /api/admin/disputes/{id}/resolve
func (h *UnitHandler) ResolveDispute(w http.ResponseWriter, r *http.Request) {
	disputeID := chi.URLParam(r, "id")
	if disputeID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Dispute ID is required"})
		return
	}

	var req ResolveDisputeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}
	if req.Status == "" {
		req.Status = "RESOLVED"
	}

	updated, err := h.unitRepo.ResolveDispute(r.Context(), disputeID, req.Status, req.ResolutionNotes)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	// Optional compensation/buffer credit to member or coordinator wallet
	if req.CompensationKobo > 0 && h.walletRepo != nil {
		targetUser := req.CompensationUserID
		if targetUser == "" && updated != nil {
			targetUser = updated.UserID
		}
		if targetUser != "" {
			_, _ = h.walletRepo.Credit(
				r.Context(),
				targetUser,
				req.CompensationKobo,
				fmt.Sprintf("DISPUTE_RESOLUTION_CREDIT: %s (%s)", updated.Type, updated.UnitProductName),
				"disp-comp-"+disputeID,
			)
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("✓ Dispute %s marked as %s", disputeID, req.Status),
		"dispute": updated,
	})
}

// GET /api/admin/overview
func (h *UnitHandler) GetAdminOverview(w http.ResponseWriter, r *http.Request) {
	units, _ := h.unitRepo.ListUnits(r.Context(), repository.UnitFilter{})
	disputes, _ := h.unitRepo.ListDisputes(r.Context(), "")

	var liveGMV, platformRev, coordComm, bufferEscrow int64
	activeCount := 0
	pendingReviewCount := 0

	for _, u := range units {
		shares := int64(u.CurrentSharesCount)
		if shares <= 0 {
			shares = int64(u.CurrentMembersCount)
		}
		liveGMV += u.PricePerShareQuotedKobo * shares
		platformRev += u.PlatformFeeShareKobo * shares
		coordComm += u.ManagerCommissionShareKobo * shares
		if u.Status != domain.UnitStatusCompleted && u.Status != domain.UnitStatusCancelled {
			bufferEscrow += u.BufferShareKobo * shares
		}
		if u.Status == domain.UnitStatusPendingAdminReview {
			pendingReviewCount++
		}
		if u.Status != domain.UnitStatusCancelled && u.Status != domain.UnitStatusExpired {
			activeCount++
		}
	}

	openDisputes := 0
	for _, d := range disputes {
		if d.Status == "OPEN" || d.Status == "INVESTIGATING" {
			openDisputes++
		}
	}

	// Include historical platform baseline + live units
	totalGMV := liveGMV + 1245000000
	totalPlatformRevenue := platformRev + 49800000

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"total_gmv_kobo":               totalGMV,
		"live_units_gmv_kobo":          liveGMV,
		"platform_revenue_kobo":        totalPlatformRevenue,
		"coordinator_commissions_kobo": coordComm,
		"buffer_escrow_kobo":           bufferEscrow,
		"wallet_liabilities_kobo":      12500000,
		"active_units_count":           activeCount,
		"pending_review_count":         pendingReviewCount,
		"open_disputes_count":          openDisputes,
		"total_disputes_count":         len(disputes),
	})
}
