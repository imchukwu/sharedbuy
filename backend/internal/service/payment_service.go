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
	"strings"
	"sync"
	"time"

	"sharedbuy-backend/internal/domain"
	"sharedbuy-backend/internal/repository"
)

type PaymentService struct {
	unitRepo          *repository.UnitRepository
	userRepo          *repository.UserRepository
	walletRepo        *repository.WalletRepository
	walletService     *WalletService
	paystackSecretKey string
	paystackPublicKey string
	httpClient        *http.Client
	pendingPayments   map[string]PendingPayment
	mu                sync.RWMutex
}

func (s *PaymentService) SetWalletService(ws *WalletService) {
	s.walletService = ws
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

	if s.walletRepo != nil {
		_ = s.walletRepo.SavePaymentRecord(ctx, repository.PaymentRecord{
			UserID:      user.ID,
			UnitID:      unit.ID,
			UserName:    user.FullName,
			UserPhone:   user.Phone,
			UserEmail:   email,
			SharesCount: req.SharesCount,
			ActionType:  "UNIT_JOIN",
			AmountKobo:  amountKobo,
			GatewayRef:  ref,
			Status:      "INITIALIZED",
		})
	}

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
	s.mu.Unlock()

	if !exists && s.walletRepo != nil {
		if dbRec, err := s.walletRepo.GetPaymentRecordByRef(ctx, reference); err == nil && dbRec != nil {
			pending = PendingPayment{
				Reference:   dbRec.GatewayRef,
				UnitID:      dbRec.UnitID,
				UserID:      dbRec.UserID,
				UserName:    dbRec.UserName,
				UserPhone:   dbRec.UserPhone,
				UserEmail:   dbRec.UserEmail,
				SharesCount: dbRec.SharesCount,
				AmountKobo:  dbRec.AmountKobo,
				Status:      dbRec.Status,
				CreatedAt:   dbRec.CreatedAt,
			}
			if dbRec.Status == "SUCCESS" && dbRec.CollectionCode != "" {
				pending.Member = &domain.UnitMember{
					UnitID:           dbRec.UnitID,
					UserID:           dbRec.UserID,
					UserName:         dbRec.UserName,
					UserPhone:        dbRec.UserPhone,
					SharesCount:      dbRec.SharesCount,
					AmountPaidKobo:   dbRec.AmountKobo,
					PaymentStatus:    domain.PaymentStatusPaid,
					CollectionStatus: domain.CollectionStatusPending,
					CollectionCode:   dbRec.CollectionCode,
					JoinedAt:         dbRec.CreatedAt,
				}
			}
			exists = true
		}
	}

	if !exists {
		return nil, errors.New("payment reference not found")
	}

	// Idempotency: if already fulfilled, return saved member
	if pending.Status == "SUCCESS" && pending.Member != nil {
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

	if s.walletRepo != nil {
		_ = s.walletRepo.SavePaymentRecord(ctx, repository.PaymentRecord{
			UserID:         pending.UserID,
			UnitID:         pending.UnitID,
			UserName:       pending.UserName,
			UserPhone:      pending.UserPhone,
			UserEmail:      pending.UserEmail,
			SharesCount:    pending.SharesCount,
			ActionType:     "UNIT_JOIN",
			AmountKobo:     pending.AmountKobo,
			GatewayRef:     reference,
			Status:         "SUCCESS",
			CollectionCode: collectionCode,
		})
	}

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
			Metadata  struct {
				UserID string `json:"user_id"`
				Action string `json:"action"`
			} `json:"metadata"`
		} `json:"data"`
	}

	if err := json.Unmarshal(payload, &event); err != nil {
		return err
	}

	ref := event.Data.Reference
	if event.Event == "charge.success" && event.Data.Status == "success" {
		log.Printf("🔔 Paystack Webhook received charge.success: ref=%s, action=%s", ref, event.Data.Metadata.Action)
		// Route Wallet Top-Up webhooks to WalletService
		if strings.HasPrefix(ref, "wtop_") || event.Data.Metadata.Action == "WALLET_TOPUP" {
			if s.walletService != nil {
				_, err := s.walletService.VerifyTopUp(ctx, event.Data.Metadata.UserID, ref)
				return err
			}
		}
		_, err := s.VerifyPayment(ctx, ref)
		return err
	}

	// Handle Paystack Transfer payout status webhooks
	if event.Event == "transfer.success" && s.walletService != nil && strings.HasPrefix(ref, "wdr-") {
		_, _ = s.walletService.ProcessWithdrawal(ctx, ref, "COMPLETED")
	} else if (event.Event == "transfer.failed" || event.Event == "transfer.reversed") && s.walletService != nil && strings.HasPrefix(ref, "wdr-") {
		_, _ = s.walletService.ProcessWithdrawal(ctx, ref, "REJECTED")
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
