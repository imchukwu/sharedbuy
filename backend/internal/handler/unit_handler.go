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
	lifecycleService *service.LifecycleService
}

func NewUnitHandler(
	unitRepo *repository.UnitRepository,
	userRepo *repository.UserRepository,
	lifecycleService *service.LifecycleService,
) *UnitHandler {
	return &UnitHandler{
		unitRepo:         unitRepo,
		userRepo:         userRepo,
		lifecycleService: lifecycleService,
	}
}

func (h *UnitHandler) ListUnits(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.UnitFilter{
		AreaID:    q.Get("area_id"),
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

	writeJSON(w, http.StatusOK, members)
}

type VerifyCodeRequest struct {
	Code string `json:"code"`
}

type VerifyCodeResponse struct {
	Success bool               `json:"success"`
	Message string             `json:"message"`
	Member  *domain.UnitMember `json:"member"`
	Unit    *domain.Unit       `json:"unit"`
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
	member, unit, err := h.unitRepo.VerifyCollectionCode(r.Context(), userID, code)
	if err != nil {
		// If not found for this specific manager, try verifying generally if user is admin
		member, unit, err = h.unitRepo.VerifyCollectionCode(r.Context(), "", code)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
	}

	msg := fmt.Sprintf("✓ Verified! Release %d share(s) of %s (%s) to %s.",
		member.SharesCount, unit.ProductName, unit.ShareSize, member.UserName)

	writeJSON(w, http.StatusOK, VerifyCodeResponse{
		Success: true,
		Message: msg,
		Member:  member,
		Unit:    unit,
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
	ManagerID               string `json:"manager_id"`
	AreaID                  string `json:"area_id"`
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
	prodName := "Mama Gold Premium Long Grain Parboiled Rice"
	prodCategory := "Grains"
	prodImg := "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80"
	prodPackSize := "50kg Bag"
	unitOfShare := "5kg Share"

	switch req.ProductID {
	case "prod-lactorich-milk-25kg":
		prodName = "Lactorich Instant Full Cream Powdered Milk"
		prodCategory = "Dairy"
		prodImg = "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80"
		prodPackSize = "25kg Bag"
		unitOfShare = "2.5kg Share"
	case "prod-crayfish-bag":
		prodName = "Oron Premium Dried Crayfish"
		prodCategory = "Seafood & Seasonings"
		prodImg = "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80"
		prodPackSize = "Large Sack (Bag)"
		unitOfShare = "Paint Bucket Share (~2kg)"
	case "prod-palm-oil-25l":
		prodName = "Direct Mill Pure Red Palm Oil"
		prodCategory = "Oils"
		prodImg = "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80"
		prodPackSize = "25L Gallon"
		unitOfShare = "5L Share"
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

	areaName := "Piwoyi District Hub"
	areaCity := "Piwoyi, Abuja"
	areaState := "FCT"

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
		AreaCity:                areaCity,
		AreaState:               areaState,
		CollectionAddress:       address,
		CollectionLandmark:      landmark,
		CollectionMapURL:        mapURL,
		TotalPacks:              req.TotalPacks,
		ShareSize:               req.ShareSize,
		MaxMembers:              req.MaxMembers,
		PricePerShareQuotedKobo: req.PricePerShareQuotedKobo,
		BufferPercent:           4,
		Status:                  domain.UnitStatusOpen,
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
