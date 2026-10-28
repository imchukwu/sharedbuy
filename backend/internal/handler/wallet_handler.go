package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"sharedbuy-backend/internal/middleware"
	"sharedbuy-backend/internal/service"
)

type WalletHandler struct {
	walletService *service.WalletService
}

func NewWalletHandler(walletService *service.WalletService) *WalletHandler {
	return &WalletHandler{walletService: walletService}
}

func (h *WalletHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	summary, err := h.walletService.GetSummary(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

type TopUpInitRequest struct {
	AmountKobo  int64  `json:"amount_kobo"`
	CallbackURL string `json:"callback_url"`
}

func (h *WalletHandler) InitializeTopUp(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var req TopUpInitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.AmountKobo <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "amount_kobo must be greater than zero"})
		return
	}

	resp, err := h.walletService.InitializeTopUp(r.Context(), userID, req.AmountKobo, req.CallbackURL)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *WalletHandler) VerifyTopUp(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	ref := chi.URLParam(r, "reference")
	if ref == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "reference is required"})
		return
	}

	res, err := h.walletService.VerifyTopUp(r.Context(), userID, ref)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, res)
}

type WithdrawRequestPayload struct {
	AmountKobo    int64  `json:"amount_kobo"`
	BankName      string `json:"bank_name"`
	AccountNumber string `json:"account_number"`
	AccountName   string `json:"account_name"`
}

func (h *WalletHandler) Withdraw(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var req WithdrawRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.AmountKobo <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "amount_kobo must be positive"})
		return
	}
	if req.BankName == "" || req.AccountNumber == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bank_name and account_number are required"})
		return
	}

	res, err := h.walletService.RequestWithdrawal(r.Context(), userID, req.AmountKobo, req.BankName, req.AccountNumber, req.AccountName)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, res)
}

type PayUnitWithWalletPayload struct {
	UnitID      string `json:"unit_id"`
	SharesCount int    `json:"shares_count"`
}

func (h *WalletHandler) PayUnitWithWallet(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var req PayUnitWithWalletPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.UnitID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unit_id is required"})
		return
	}

	res, err := h.walletService.PayUnitWithWallet(r.Context(), req.UnitID, userID, req.SharesCount)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, res)
}
