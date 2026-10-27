package handler

import (
	"encoding/json"
	"net/http"

	"sharedbuy-backend/internal/middleware"
	"sharedbuy-backend/internal/repository"
	"sharedbuy-backend/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
	userRepo    *repository.UserRepository
}

func NewAuthHandler(authService *service.AuthService, userRepo *repository.UserRepository) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		userRepo:    userRepo,
	}
}

type RequestOTPRequest struct {
	Phone string `json:"phone"`
}

type VerifyOTPRequest struct {
	Phone    string `json:"phone"`
	Code     string `json:"code"`
	FullName string `json:"full_name"`
	AreaID   string `json:"area_id"`
}

type AdminLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) RequestOTP(w http.ResponseWriter, r *http.Request) {
	var req RequestOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.Phone == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Phone number is required"})
		return
	}

	code, err := h.authService.RequestOTP(r.Context(), req.Phone)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// For convenience in dev, return the code and helpful hint
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":   "OTP sent successfully",
		"phone":     req.Phone,
		"debug_otp": code, // Can use 123456 as well
	})
}

func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req VerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.Phone == "" || req.Code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Phone number and verification code are required"})
		return
	}

	result, err := h.authService.VerifyOTP(r.Context(), req.Phone, req.Code, req.FullName, req.AreaID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *AuthHandler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req AdminLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Email and password are required"})
		return
	}

	result, err := h.authService.AdminLogin(r.Context(), req.Email, req.Password)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch user"})
		return
	}
	if user == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
