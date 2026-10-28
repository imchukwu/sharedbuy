package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"sharedbuy-backend/internal/domain"
	"sharedbuy-backend/internal/repository"
)

type WalletService struct {
	walletRepo        *repository.WalletRepository
	userRepo          *repository.UserRepository
	unitRepo          *repository.UnitRepository
	paystackSecretKey string
	paystackPublicKey string
}

func NewWalletService(
	walletRepo *repository.WalletRepository,
	userRepo *repository.UserRepository,
	unitRepo *repository.UnitRepository,
	paystackSecretKey, paystackPublicKey string,
) *WalletService {
	return &WalletService{
		walletRepo:        walletRepo,
		userRepo:          userRepo,
		unitRepo:          unitRepo,
		paystackSecretKey: paystackSecretKey,
		paystackPublicKey: paystackPublicKey,
	}
}

type InitializeTopUpResponse struct {
	AuthorizationURL string `json:"authorization_url"`
	AccessCode       string `json:"access_code"`
	Reference        string `json:"reference"`
	AmountKobo       int64  `json:"amount_kobo"`
	PublicKey        string `json:"public_key"`
	IsMock           bool   `json:"is_mock"`
}

type TopUpVerifyResult struct {
	Status           string `json:"status"`
	Reference        string `json:"reference"`
	AmountKobo       int64  `json:"amount_kobo"`
	NewBalanceKobo   int64  `json:"new_balance_kobo"`
}

type PayWithWalletResult struct {
	Status         string             `json:"status"`
	CollectionCode string             `json:"collection_code"`
	Member         *domain.UnitMember `json:"member"`
	SharingDate    time.Time          `json:"sharing_date"`
	NewBalanceKobo int64              `json:"new_balance_kobo"`
}

func (s *WalletService) GetSummary(ctx context.Context, userID string) (*repository.WalletSummary, error) {
	return s.walletRepo.GetWalletSummary(ctx, userID)
}

func (s *WalletService) InitializeTopUp(ctx context.Context, userID string, amountKobo int64, callbackURL string) (*InitializeTopUpResponse, error) {
	if amountKobo <= 0 {
		return nil, errors.New("top-up amount must be greater than zero")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	reference := fmt.Sprintf("wtop_%d_%s", time.Now().Unix(), uuid.New().String()[:6])

	// If Paystack live/test key is set, call Paystack initialize
	if s.paystackSecretKey != "" && !strings.Contains(s.paystackSecretKey, "placeholder") {
		email := ""
		if user.Email != nil && *user.Email != "" {
			email = *user.Email
		} else {
			cleanPhone := strings.ReplaceAll(user.Phone, "+", "")
			email = fmt.Sprintf("user_%s@sharedbuy.ng", cleanPhone)
		}

		payload := map[string]interface{}{
			"email":        email,
			"amount":       amountKobo,
			"reference":    reference,
			"callback_url": callbackURL,
			"metadata": map[string]interface{}{
				"user_id": userID,
				"action":  "WALLET_TOPUP",
			},
		}

		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, "POST", "https://api.paystack.co/transaction/initialize", bytes.NewBuffer(bodyBytes))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var psResp struct {
				Status  bool   `json:"status"`
				Message string `json:"message"`
				Data    struct {
					AuthorizationURL string `json:"authorization_url"`
					AccessCode       string `json:"access_code"`
					Reference        string `json:"reference"`
				} `json:"data"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&psResp); err == nil && psResp.Status {
				return &InitializeTopUpResponse{
					AuthorizationURL: psResp.Data.AuthorizationURL,
					AccessCode:       psResp.Data.AccessCode,
					Reference:        psResp.Data.Reference,
					AmountKobo:       amountKobo,
					PublicKey:        s.paystackPublicKey,
					IsMock:           false,
				}, nil
			}
		}
	}

	// Mock / Sandbox mode fallback
	return &InitializeTopUpResponse{
		AuthorizationURL: fmt.Sprintf("/wallet?reference=%s&mock_topup=true", reference),
		AccessCode:       "mock_access_" + reference,
		Reference:        reference,
		AmountKobo:       amountKobo,
		PublicKey:        s.paystackPublicKey,
		IsMock:           true,
	}, nil
}

func (s *WalletService) VerifyTopUp(ctx context.Context, userID, reference string) (*TopUpVerifyResult, error) {
	if reference == "" {
		return nil, errors.New("reference is required")
	}

	var amountKobo int64 = 500000 // default mock fallback (₦5,000)

	// If using live Paystack API
	if s.paystackSecretKey != "" && !strings.Contains(s.paystackSecretKey, "placeholder") {
		req, err := http.NewRequestWithContext(ctx, "GET", "https://api.paystack.co/transaction/verify/"+reference, nil)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Do(req)
			if err == nil && resp.StatusCode == http.StatusOK {
				defer resp.Body.Close()
				var psResp struct {
					Status  bool `json:"status"`
					Data    struct {
						Status   string `json:"status"`
						Amount   int64  `json:"amount"`
						Currency string `json:"currency"`
					} `json:"data"`
				}
				body, _ := io.ReadAll(resp.Body)
				_ = json.Unmarshal(body, &psResp)
				if psResp.Status && psResp.Data.Status == "success" {
					amountKobo = psResp.Data.Amount
				}
			}
		}
	}

	// Credit wallet
	newBalance, err := s.walletRepo.Credit(ctx, userID, amountKobo, "WALLET_TOPUP: Account funded via Paystack", reference)
	if err != nil {
		return nil, fmt.Errorf("failed to credit wallet: %w", err)
	}

	return &TopUpVerifyResult{
		Status:         "SUCCESS",
		Reference:      reference,
		AmountKobo:     amountKobo,
		NewBalanceKobo: newBalance,
	}, nil
}

func (s *WalletService) RequestWithdrawal(ctx context.Context, userID string, amountKobo int64, bankName, accountNumber, accountName string) (*domain.WithdrawalRequest, error) {
	if amountKobo <= 0 {
		return nil, errors.New("withdrawal amount must be greater than zero")
	}
	if bankName == "" || accountNumber == "" {
		return nil, errors.New("bank name and account number are required")
	}

	req := &domain.WithdrawalRequest{
		UserID:        userID,
		AmountKobo:    amountKobo,
		BankName:      bankName,
		AccountNumber: accountNumber,
		AccountName:   accountName,
	}

	return s.walletRepo.CreateWithdrawal(ctx, req)
}

func (s *WalletService) PayUnitWithWallet(ctx context.Context, unitID, userID string, sharesCount int) (*PayWithWalletResult, error) {
	if sharesCount <= 0 {
		sharesCount = 1
	}

	unit, err := s.unitRepo.GetUnitByID(ctx, unitID)
	if err != nil {
		return nil, fmt.Errorf("error fetching unit: %w", err)
	}
	if unit == nil {
		return nil, errors.New("unit not found")
	}

	if unit.Status != domain.UnitStatusOpen {
		return nil, fmt.Errorf("unit is not open for joining (status: %s)", unit.Status)
	}

	if unit.CurrentSharesCount+sharesCount > unit.MaxMembers {
		return nil, errors.New("not enough shares remaining in this unit")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	totalAmountKobo := unit.PricePerShareQuotedKobo * int64(sharesCount)

	// Generate 6-digit pickup collection code
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	collectionCode := fmt.Sprintf("%06d", n.Int64()+100000)

	// Debit wallet
	reason := fmt.Sprintf("UNIT_PAYMENT: Joined %s (%s)", unit.ProductName, unit.ShareSize)
	refID := "wpay-" + uuid.New().String()[:8]
	newBalance, err := s.walletRepo.Debit(ctx, userID, totalAmountKobo, reason, refID)
	if err != nil {
		return nil, err
	}

	// Join unit
	member, err := s.unitRepo.JoinUnit(
		ctx,
		unit.ID,
		user.ID,
		user.FullName,
		user.Phone,
		sharesCount,
		totalAmountKobo,
		collectionCode,
	)
	if err != nil {
		// Refund back to wallet if joining unit fails
		_, _ = s.walletRepo.Credit(ctx, userID, totalAmountKobo, "REFUND: Unit join failed", refID)
		return nil, fmt.Errorf("failed to join unit: %w", err)
	}

	// Award referral bonus if this member was referred
	_, _ = s.walletRepo.AwardReferralBonus(ctx, userID, unit.ID)

	return &PayWithWalletResult{
		Status:         "SUCCESS",
		CollectionCode: collectionCode,
		Member:         member,
		SharingDate:    unit.SharingDate,
		NewBalanceKobo: newBalance,
	}, nil
}
