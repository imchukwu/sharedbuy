package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"

	"sharedbuy-backend/internal/middleware"
	"sharedbuy-backend/internal/service"
)

type PaymentHandler struct {
	paymentService *service.PaymentService
}

func NewPaymentHandler(paymentService *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: paymentService}
}

func (h *PaymentHandler) InitializePayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var req service.InitPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.UnitID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unit_id is required"})
		return
	}

	resp, err := h.paymentService.InitializePayment(r.Context(), userID, req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *PaymentHandler) VerifyPayment(w http.ResponseWriter, r *http.Request) {
	ref := chi.URLParam(r, "reference")
	if ref == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "reference is required"})
		return
	}

	resp, err := h.paymentService.VerifyPayment(r.Context(), ref)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *PaymentHandler) PaystackWebhook(w http.ResponseWriter, r *http.Request) {
	sig := r.Header.Get("x-paystack-signature")
	if sig == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing signature header"})
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to read request body"})
		return
	}

	if err := h.paymentService.HandleWebhook(r.Context(), sig, body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
