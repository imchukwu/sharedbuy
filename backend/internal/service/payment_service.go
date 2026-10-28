package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"sync"
	"time"

	"sharedbuy-backend/internal/domain"
	"sharedbuy-backend/internal/repository"
)

type PaymentService struct {
	unitRepo          *repository.UnitRepository
	userRepo          *repository.UserRepository
	walletRepo        *repository.WalletRepository
	paystackSecretKey string
	paystackPublicKey string
	httpClient        *http.Client
	pendingPayments   map[string]PendingPayment
	mu                sync.RWMutex
}

type PendingPayment struct {
	Reference   string             `json:"reference"`
	UnitID      string             `json:"unit_id"`
	UserID      string             `json:"user_id"`
	UserName    string             `json:"user_name"`
	UserPhone   string             `json:"user_phone"`
	UserEmail   string             `json:"user_email"`
	SharesCount int                `json:"shares_count"`
	AmountKobo  int64              `json:"amount_kobo"`
	Status      string             `json:"status"` // INITIALIZED, SUCCESS, FAILED
	CreatedAt   time.Time          `json:"created_at"`
	FulfilledAt *time.Time         `json:"fulfilled_at,omitempty"`
	Member      *domain.UnitMember `json:"member,omitempty"`
}

func NewPaymentService(
	unitRepo *repository.UnitRepository,
	userRepo *repository.UserRepository,
	walletRepo *repository.WalletRepository,
	paystackSecretKey, paystackPublicKey string,
) *PaymentService {
	return &PaymentService{
		unitRepo:          unitRepo,
		userRepo:          userRepo,
		walletRepo:        walletRepo,
		paystackSecretKey: paystackSecretKey,
		paystackPublicKey: paystackPublicKey,
		httpClient:        &http.Client{Timeout: 15 * time.Second},
		pendingPayments:   make(map[string]PendingPayment),
	}
}

type InitPaymentRequest struct {
	UnitID      string `json:"unit_id"`
	SharesCount int    `json:"shares_count"`
	CallbackURL string `json:"callback_url"`
}

type InitPaymentResponse struct {
	AuthorizationURL string `json:"authorization_url"`
	AccessCode       string `json:"access_code"`
	Reference        string `json:"reference"`
	AmountKobo       int64  `json:"amount_kobo"`
	PublicKey        string `json:"public_key"`
	IsMock           bool   `json:"is_mock"`
}

type VerifyPaymentResponse struct {
	Status         string             `json:"status"`
	Reference      string             `json:"reference"`
	AmountKobo     int64              `json:"amount_kobo"`
	CollectionCode string             `json:"collection_code"`
	Member         *domain.UnitMember `json:"member"`
	SharingDate    time.Time          `json:"sharing_date"`
}

func (s *PaymentService) InitializePayment(ctx context.Context, userID string, req InitPaymentRequest) (*InitPaymentResponse, error) {
	if req.SharesCount <= 0 {
		req.SharesCount = 1
	}

	unit, err := s.unitRepo.GetUnitByID(ctx, req.UnitID)
	if err != nil || unit == nil {
		return nil, errors.New("unit not found")
	}

	if unit.Status != domain.UnitStatusOpen {
		return nil, fmt.Errorf("unit is %s and not accepting payments", unit.Status)
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	amountKobo := unit.PricePerShareQuotedKobo * int64(req.SharesCount)
	email := "member@sharedbuy.ng"
	if user.Email != nil && *user.Email != "" {
		email = *user.Email
	}

	// Generate clean unique Paystack reference
	ref := fmt.Sprintf("sb_%d_%s", time.Now().Unix(), generateRandomString(6))

	s.mu.Lock()
	s.pendingPayments[ref] = PendingPayment{
		Reference:   ref,
		UnitID:      unit.ID,
		UserID:      user.ID,
		UserName:    user.FullName,
		UserPhone:   user.Phone,
		UserEmail:   email,
		SharesCount: req.SharesCount,
		AmountKobo:  amountKobo,
		Status:      "INITIALIZED",
		CreatedAt:   time.Now(),
	}
	s.mu.Unlock()

	// If Paystack Secret Key is configured, initialize with Paystack API
	if s.paystackSecretKey != "" && s.paystackSecretKey != "mock" {
		payload := map[string]interface{}{
			"email":        email,
			"amount":       amountKobo,
			"reference":    ref,
			"callback_url": req.CallbackURL,
			"currency":     "NGN",
			"metadata": map[string]interface{}{
				"unit_id":      unit.ID,
				"user_id":      user.ID,
				"user_name":    user.FullName,
				"phone":        user.Phone,
				"shares_count": req.SharesCount,
				"product_name": unit.ProductName,
			},
		}

		bodyBytes, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}

		httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.paystack.co/transaction/initialize", bytes.NewBuffer(bodyBytes))
		if err != nil {
			return nil, err
		}

		httpReq.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := s.httpClient.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("paystack initialization failed: %w", err)
		}
		defer resp.Body.Close()

		respBody, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("paystack returned status %d: %s", resp.StatusCode, string(respBody))
		}

		var paystackRes struct {
			Status  bool   `json:"status"`
			Message string `json:"message"`
			Data    struct {
				AuthorizationURL string `json:"authorization_url"`
				AccessCode       string `json:"access_code"`
				Reference        string `json:"reference"`
			} `json:"data"`
		}

		if err := json.Unmarshal(respBody, &paystackRes); err != nil {
			return nil, err
		}

		return &InitPaymentResponse{
			AuthorizationURL: paystackRes.Data.AuthorizationURL,
			AccessCode:       paystackRes.Data.AccessCode,
			Reference:        ref,
			AmountKobo:       amountKobo,
			PublicKey:        s.paystackPublicKey,
			IsMock:           false,
		}, nil
	}

	// Demo / In-Memory Mock Mode
	mockAuthURL := fmt.Sprintf("/?reference=%s&mock_pay=true", ref)
	return &InitPaymentResponse{
		AuthorizationURL: mockAuthURL,
		AccessCode:       "mock_access_" + ref,
		Reference:        ref,
		AmountKobo:       amountKobo,
		PublicKey:        s.paystackPublicKey,
		IsMock:           true,
	}, nil
}

func (s *PaymentService) VerifyPayment(ctx context.Context, reference string) (*VerifyPaymentResponse, error) {
	s.mu.Lock()
	pending, exists := s.pendingPayments[reference]
	if !exists {
		s.mu.Unlock()
		return nil, errors.New("payment reference not found")
	}

	// Idempotency: if already fulfilled, return saved member
	if pending.Status == "SUCCESS" && pending.Member != nil {
		s.mu.Unlock()
		unit, _ := s.unitRepo.GetUnitByID(ctx, pending.UnitID)
		var sharingDate time.Time
		if unit != nil {
			sharingDate = unit.SharingDate
		}
		return &VerifyPaymentResponse{
			Status:         "SUCCESS",
			Reference:      reference,
			AmountKobo:     pending.AmountKobo,
			CollectionCode: pending.Member.CollectionCode,
			Member:         pending.Member,
			SharingDate:    sharingDate,
		}, nil
	}
	s.mu.Unlock()

	// If Paystack Secret Key is configured, verify with Paystack API
	if s.paystackSecretKey != "" && s.paystackSecretKey != "mock" {
		httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.paystack.co/transaction/verify/"+reference, nil)
		if err != nil {
			return nil, err
		}

		httpReq.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
		resp, err := s.httpClient.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("paystack verification request failed: %w", err)
		}
		defer resp.Body.Close()

		respBody, _ := io.ReadAll(resp.Body)
		var paystackRes struct {
			Status  bool   `json:"status"`
			Message string `json:"message"`
			Data    struct {
				Status   string `json:"status"`
				Amount   int64  `json:"amount"`
				Currency string `json:"currency"`
			} `json:"data"`
		}

		if err := json.Unmarshal(respBody, &paystackRes); err != nil {
			return nil, err
		}

		if !paystackRes.Status || paystackRes.Data.Status != "success" {
			return nil, fmt.Errorf("payment not successful (status: %s)", paystackRes.Data.Status)
		}

		if paystackRes.Data.Currency != "NGN" {
			return nil, errors.New("invalid payment currency")
		}
	}

	// Fulfill and Join Unit
	collectionCode := generate6DigitCode()
	member, err := s.unitRepo.JoinUnit(
		ctx,
		pending.UnitID,
		pending.UserID,
		pending.UserName,
		pending.UserPhone,
		pending.SharesCount,
		pending.AmountKobo,
		collectionCode,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to add member to unit: %w", err)
	}

	unit, err := s.unitRepo.GetUnitByID(ctx, pending.UnitID)
	var sharingDate time.Time
	if unit != nil {
		sharingDate = unit.SharingDate
	}

	now := time.Now()
	s.mu.Lock()
	pending.Status = "SUCCESS"
	pending.FulfilledAt = &now
	pending.Member = member
	s.pendingPayments[reference] = pending
	s.mu.Unlock()

	log.Printf("✅ Payment fulfilled: ref=%s, unit=%s, user=%s, code=%s", reference, pending.UnitID, pending.UserID, collectionCode)

	// Award referral bonus if member was referred
	if s.walletRepo != nil {
		_, _ = s.walletRepo.AwardReferralBonus(ctx, pending.UserID, pending.UnitID)
	}

	return &VerifyPaymentResponse{
		Status:         "SUCCESS",
		Reference:      reference,
		AmountKobo:     pending.AmountKobo,
		CollectionCode: collectionCode,
		Member:         member,
		SharingDate:    sharingDate,
	}, nil
}

func (s *PaymentService) HandleWebhook(ctx context.Context, signature string, payload []byte) error {
	if s.paystackSecretKey == "" {
		return errors.New("paystack secret key not configured")
	}

	// Verify HMAC SHA512 signature
	mac := hmac.New(sha512.New, []byte(s.paystackSecretKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return errors.New("invalid webhook signature")
	}

	var event struct {
		Event string `json:"event"`
		Data  struct {
			Reference string `json:"reference"`
			Status    string `json:"status"`
			Amount    int64  `json:"amount"`
		} `json:"data"`
	}

	if err := json.Unmarshal(payload, &event); err != nil {
		return err
	}

	if event.Event == "charge.success" && event.Data.Status == "success" {
		log.Printf("🔔 Paystack Webhook received charge.success: ref=%s", event.Data.Reference)
		_, err := s.VerifyPayment(ctx, event.Data.Reference)
		return err
	}

	return nil
}

func generate6DigitCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "581920"
	}
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

func generateRandomString(n int) string {
	bytes := make([]byte, n)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)[:n]
}
