package handler

import (
	"net/http"

	"sharedbuy-backend/internal/repository"
)

type MetaHandler struct {
	unitRepo *repository.UnitRepository
}

func NewMetaHandler(unitRepo *repository.UnitRepository) *MetaHandler {
	return &MetaHandler{unitRepo: unitRepo}
}

func (h *MetaHandler) GetAreas(w http.ResponseWriter, r *http.Request) {
	areas, err := h.unitRepo.GetAreas(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch areas"})
		return
	}
	writeJSON(w, http.StatusOK, areas)
}

func (h *MetaHandler) GetProducts(w http.ResponseWriter, r *http.Request) {
	products, err := h.unitRepo.GetProducts(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch products"})
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *MetaHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "healthy",
		"service": "sharedbuy-api",
		"version": "1.0.0",
	})
}
