package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"sharedbuy-backend/internal/domain"
	"sharedbuy-backend/internal/middleware"
	"sharedbuy-backend/internal/repository"
)

type DistributorHandler struct {
	distRepo *repository.DistributorRepository
	unitRepo *repository.UnitRepository
}

func NewDistributorHandler(distRepo *repository.DistributorRepository, unitRepo *repository.UnitRepository) *DistributorHandler {
	return &DistributorHandler{
		distRepo: distRepo,
		unitRepo: unitRepo,
	}
}

// GET /api/distributor/commodities
func (h *DistributorHandler) ListCommodities(w http.ResponseWriter, r *http.Request) {
	distID := r.URL.Query().Get("distributor_id")
	userRole := middleware.GetUserRole(r.Context())
	userID := middleware.GetUserID(r.Context())

	// If caller is distributor and didn't specify, filter to their own
	if userRole == domain.RoleDistributor {
		if distID == "" {
			distID = userID
		}
	}

	commodities, err := h.distRepo.ListCommodities(r.Context(), distID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if commodities == nil {
		commodities = []domain.DistributorCommodity{}
	}
	writeJSON(w, http.StatusOK, commodities)
}

// POST /api/distributor/commodities
func (h *DistributorHandler) CreateCommodity(w http.ResponseWriter, r *http.Request) {
	userRole := middleware.GetUserRole(r.Context())
	userID := middleware.GetUserID(r.Context())

	if userRole != domain.RoleDistributor && userRole != domain.RoleAdmin {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Only verified distributors or admins can list wholesale commodities"})
		return
	}

	var req domain.DistributorCommodity
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.ProductName == "" || req.PricePerPackKobo <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Product name and wholesale price are required"})
		return
	}

	if req.DistributorID == "" {
		req.DistributorID = userID
	}
	if req.DistributorName == "" {
		req.DistributorName = "Alhaji Dahiru (Northern Agro Millers)"
	}
	if req.DistributorPhone == "" {
		req.DistributorPhone = "+2348055556666"
	}
	if req.MinOrderPacks <= 0 {
		req.MinOrderPacks = 1
	}

	if err := h.distRepo.CreateCommodity(r.Context(), &req); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, req)
}

// PUT /api/distributor/commodities/{id}
func (h *DistributorHandler) UpdateCommodity(w http.ResponseWriter, r *http.Request) {
	userRole := middleware.GetUserRole(r.Context())
	if userRole != domain.RoleDistributor && userRole != domain.RoleAdmin {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Unauthorized to update this quote"})
		return
	}

	commID := chi.URLParam(r, "id")
	var req domain.DistributorCommodity
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	req.ID = commID
	if err := h.distRepo.UpdateCommodity(r.Context(), &req); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, req)
}

// GET /api/distributor/orders
func (h *DistributorHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	userRole := middleware.GetUserRole(r.Context())
	userID := middleware.GetUserID(r.Context())
	distID := r.URL.Query().Get("distributor_id")

	if userRole == domain.RoleDistributor {
		distID = userID
	}

	orders, err := h.distRepo.ListPurchaseOrders(r.Context(), distID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if orders == nil {
		orders = []domain.PurchaseOrder{}
	}
	writeJSON(w, http.StatusOK, orders)
}

// POST /api/admin/orders
func (h *DistributorHandler) CreatePurchaseOrder(w http.ResponseWriter, r *http.Request) {
	userRole := middleware.GetUserRole(r.Context())
	userID := middleware.GetUserID(r.Context())

	if userRole != domain.RoleAdmin {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Admin privileges required to issue supplier purchase orders"})
		return
	}

	var req domain.PurchaseOrder
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid purchase order payload"})
		return
	}

	if req.DistributorID == "" || req.TotalAmountKobo <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Distributor and order cost are required"})
		return
	}

	req.CreatedByAdminID = userID
	if err := h.distRepo.CreatePurchaseOrder(r.Context(), &req); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Update associated units to ORDERED
	for _, unitID := range req.AssociatedUnitIDs {
		_ = h.unitRepo.UpdateUnitStatus(r.Context(), unitID, domain.UnitStatusOrdered)
	}

	writeJSON(w, http.StatusCreated, req)
}

type DispatchRequest struct {
	DriverName    string `json:"driver_name"`
	DriverPhone   string `json:"driver_phone"`
	VehiclePlate  string `json:"vehicle_plate"`
	WaybillNumber string `json:"waybill_number"`
}

// POST /api/distributor/orders/{id}/dispatch
func (h *DistributorHandler) DispatchOrder(w http.ResponseWriter, r *http.Request) {
	poID := chi.URLParam(r, "id")
	var req DispatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid dispatch payload"})
		return
	}

	if strings.TrimSpace(req.DriverName) == "" || strings.TrimSpace(req.DriverPhone) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Driver name and phone are required for dispatch"})
		return
	}

	order, err := h.distRepo.DispatchPurchaseOrder(
		r.Context(),
		poID,
		req.DriverName,
		req.DriverPhone,
		req.VehiclePlate,
		req.WaybillNumber,
	)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	// Update associated units to IN_TRANSIT
	for _, unitID := range order.AssociatedUnitIDs {
		_ = h.unitRepo.UpdateUnitStatus(r.Context(), unitID, domain.UnitStatusInTransit)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "✓ Purchase order successfully dispatched to Piwoyi, Abuja hubs",
		"order":   order,
	})
}

// POST /api/distributor/orders/{id}/delivered
func (h *DistributorHandler) MarkDelivered(w http.ResponseWriter, r *http.Request) {
	poID := chi.URLParam(r, "id")
	order, unitIDs, err := h.distRepo.MarkOrderDelivered(r.Context(), poID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	// Update associated units to READY_FOR_COLLECTION so coordinators can release goods to members
	for _, unitID := range unitIDs {
		_ = h.unitRepo.UpdateUnitStatus(r.Context(), unitID, domain.UnitStatusReadyForCollection)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "✓ Goods safely delivered to Piwoyi Hub coordinators. Units are now ready for member pickup!",
		"order":   order,
	})
}
