package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"sharedbuy-backend/internal/repository"
)

type UnitHandler struct {
	unitRepo *repository.UnitRepository
}

func NewUnitHandler(unitRepo *repository.UnitRepository) *UnitHandler {
	return &UnitHandler{unitRepo: unitRepo}
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
