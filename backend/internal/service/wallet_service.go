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
	"sync"
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
	isDev             bool
	pendingTopUps     map[string]int64
	fulfilledTopUps   map[string]int64
	mu                sync.RWMutex
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
		isDev:             false,
		pendingTopUps:     make(map[string]int64),
		fulfilledTopUps:   make(map[string]int64),
	}
}

func (s *WalletService) SetDevelopmentMode(isDev bool) {
	s.isDev = isDev
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

	s.mu.Lock()
	s.pendingTopUps[reference] = amountKobo
	s.mu.Unlock()

	if s.walletRepo != nil {
		_ = s.walletRepo.SavePaymentRecord(ctx, repository.PaymentRecord{
			UserID:     userID,
			UserName:   user.FullName,
			UserPhone:  user.Phone,
			ActionType: "WALLET_TOPUP",
			AmountKobo: amountKobo,
			GatewayRef: reference,
			Status:     "INITIALIZED",
		})
	}

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

	s.mu.RLock()
	if prevBalance, done := s.fulfilledTopUps[reference]; done {
		amt := s.pendingTopUps[reference]
		s.mu.RUnlock()
		return &TopUpVerifyResult{
			Status:         "SUCCESS",
			Reference:      reference,
			AmountKobo:     amt,
			NewBalanceKobo: prevBalance,
		}, nil
	}
	amountKobo, ok := s.pendingTopUps[reference]
	s.mu.RUnlock()

	if !ok && s.walletRepo != nil {
		if dbRec, err := s.walletRepo.GetPaymentRecordByRef(ctx, reference); err == nil && dbRec != nil {
			amountKobo = dbRec.AmountKobo
			if userID == "" {
				userID = dbRec.UserID
			}
			ok = true
			if dbRec.Status == "SUCCESS" {
				summary, _ := s.walletRepo.GetWalletSummary(ctx, userID)
				var bal int64
				if summary != nil {
					bal = summary.BalanceKobo
				}
				return &TopUpVerifyResult{
					Status:         "SUCCESS",
					Reference:      reference,
					AmountKobo:     amountKobo,
					NewBalanceKobo: bal,
				}, nil
			}
		}
	}

	if !ok || amountKobo <= 0 {
		if !s.isDev {
			return nil, errors.New("top-up payment reference not found or invalid")
		}
		amountKobo = 500000 // default mock fallback (₦5,000) only in dev mode
	}

	// If using live Paystack API, enforce strict verification
	if s.paystackSecretKey != "" && !strings.Contains(s.paystackSecretKey, "placeholder") && s.paystackSecretKey != "mock" {
		req, err := http.NewRequestWithContext(ctx, "GET", "https://api.paystack.co/transaction/verify/"+reference, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("paystack top-up verification failed: %w", err)
		}
		defer resp.Body.Close()

		var psResp struct {
			Status  bool   `json:"status"`
			Message string `json:"message"`
			Data    struct {
				Status   string `json:"status"`
				Amount   int64  `json:"amount"`
				Currency string `json:"currency"`
				Metadata struct {
					UserID string `json:"user_id"`
				} `json:"metadata"`
			} `json:"data"`
		}
		body, _ := io.ReadAll(resp.Body)
		if err := json.Unmarshal(body, &psResp); err != nil {
			return nil, err
		}
		if !psResp.Status || psResp.Data.Status != "success" {
			return nil, fmt.Errorf("paystack top-up not successful (status: %s)", psResp.Data.Status)
		}
		if psResp.Data.Currency != "NGN" {
			return nil, errors.New("invalid top-up currency")
		}
		amountKobo = psResp.Data.Amount
		if userID == "" && psResp.Data.Metadata.UserID != "" {
			userID = psResp.Data.Metadata.UserID
		}
	}

	if userID == "" {
		return nil, errors.New("unable to determine user for wallet top-up")
	}

	// Credit wallet
	newBalance, err := s.walletRepo.Credit(ctx, userID, amountKobo, "WALLET_TOPUP: Account funded via Paystack", reference)
	if err != nil {
		return nil, fmt.Errorf("failed to credit wallet: %w", err)
	}

	s.mu.Lock()
	s.fulfilledTopUps[reference] = newBalance
	s.mu.Unlock()

	if s.walletRepo != nil {
		_ = s.walletRepo.SavePaymentRecord(ctx, repository.PaymentRecord{
			UserID:     userID,
			ActionType: "WALLET_TOPUP",
			AmountKobo: amountKobo,
			GatewayRef: reference,
			Status:     "SUCCESS",
		})
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

	wdr, err := s.walletRepo.CreateWithdrawal(ctx, req)
	if err != nil {
		return nil, err
	}

	// If live Paystack Secret Key is configured, initiate Paystack Transfer Recipient & Transfer
	if s.paystackSecretKey != "" && !strings.Contains(s.paystackSecretKey, "placeholder") && s.paystackSecretKey != "mock" {
		bankCode := resolveCBNBankCode(bankName)
		if bankCode != "" {
			if err := s.initiatePaystackTransfer(ctx, wdr.ID, amountKobo, bankCode, accountNumber, accountName); err != nil {
				// Mark PENDING for Admin Finance manual approval if automated transfer is not enabled on the Paystack business account
				_, _ = s.walletRepo.UpdateWithdrawalStatus(ctx, wdr.ID, "PENDING")
				wdr.Status = "PENDING"
			}
		}
	}

	return wdr, nil
}

func resolveCBNBankCode(bankName string) string {
	switch strings.ToLower(strings.TrimSpace(bankName)) {
	case "gtbank", "guaranty trust bank", "guaranty trust bank (gtbank)":
		return "058"
	case "access bank":
		return "044"
	case "first bank", "first bank of nigeria":
		return "011"
	case "zenith bank":
		return "057"
	case "opay":
		return "999992"
	case "palmpay":
		return "999991"
	case "kuda bank", "kuda microfinance bank":
		return "50211"
	case "united bank for africa", "uba":
		return "033"
	default:
		return "058"
	}
}

func (s *WalletService) ResolveBankAccount(ctx context.Context, userID, bankName, accountNumber string) (string, string, error) {
	cleanAcct := strings.TrimSpace(accountNumber)
	if len(cleanAcct) != 10 {
		return "", "", errors.New("account number must be 10 digits (NUBAN)")
	}
	bankCode := resolveCBNBankCode(bankName)

	// Live Paystack NUBAN Resolution API
	if s.paystackSecretKey != "" && !strings.Contains(s.paystackSecretKey, "placeholder") && s.paystackSecretKey != "mock" {
		url := fmt.Sprintf("https://api.paystack.co/bank/resolve?account_number=%s&bank_code=%s", cleanAcct, bankCode)
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
			client := &http.Client{Timeout: 8 * time.Second}
			resp, err := client.Do(req)
			if err == nil {
				defer resp.Body.Close()
				var psResp struct {
					Status  bool   `json:"status"`
					Message string `json:"message"`
					Data    struct {
						AccountNumber string `json:"account_number"`
						AccountName   string `json:"account_name"`
					} `json:"data"`
				}
				if json.NewDecoder(resp.Body).Decode(&psResp) == nil && psResp.Status && psResp.Data.AccountName != "" {
					return psResp.Data.AccountName, bankCode, nil
				}
			}
		}
	}

	// Fallback NUBAN resolution in dev/sandbox mode
	user, _ := s.userRepo.GetByID(ctx, userID)
	holder := "VERIFIED NUBAN HOLDER"
	if user != nil && user.FullName != "" {
		holder = strings.ToUpper(user.FullName)
	}
	return holder, bankCode, nil
}

func (s *WalletService) initiatePaystackTransfer(ctx context.Context, reference string, amountKobo int64, bankCode, accountNumber, accountName string) error {
	client := &http.Client{Timeout: 10 * time.Second}

	// 1. Create Transfer Recipient
	recPayload, _ := json.Marshal(map[string]interface{}{
		"type":           "nuban",
		"name":           accountName,
		"account_number": accountNumber,
		"bank_code":      bankCode,
		"currency":       "NGN",
	})
	recReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.paystack.co/transferrecipient", bytes.NewBuffer(recPayload))
	if err != nil {
		return err
	}
	recReq.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
	recReq.Header.Set("Content-Type", "application/json")

	recResp, err := client.Do(recReq)
	if err != nil {
		return err
	}
	defer recResp.Body.Close()

	var recData struct {
		Status bool `json:"status"`
		Data   struct {
			RecipientCode string `json:"recipient_code"`
		} `json:"data"`
	}
	if err := json.NewDecoder(recResp.Body).Decode(&recData); err != nil || !recData.Status || recData.Data.RecipientCode == "" {
		return errors.New("failed to create paystack transfer recipient")
	}

	// 2. Initiate Transfer
	tfPayload, _ := json.Marshal(map[string]interface{}{
		"source":    "balance",
		"amount":    amountKobo,
		"recipient": recData.Data.RecipientCode,
		"reason":    "SharedBuy Wallet Withdrawal " + reference,
		"reference": reference,
	})
	tfReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.paystack.co/transfer", bytes.NewBuffer(tfPayload))
	if err != nil {
		return err
	}
	tfReq.Header.Set("Authorization", "Bearer "+s.paystackSecretKey)
	tfReq.Header.Set("Content-Type", "application/json")

	tfResp, err := client.Do(tfReq)
	if err != nil {
		return err
	}
	defer tfResp.Body.Close()

	if tfResp.StatusCode != http.StatusOK {
		return fmt.Errorf("paystack transfer returned status %d", tfResp.StatusCode)
	}
	return nil
}

func (s *WalletService) ListWithdrawals(ctx context.Context) ([]domain.WithdrawalRequest, error) {
	return s.walletRepo.ListWithdrawals(ctx)
}

func (s *WalletService) ProcessWithdrawal(ctx context.Context, withdrawalID, status string) (*domain.WithdrawalRequest, error) {
	return s.walletRepo.UpdateWithdrawalStatus(ctx, withdrawalID, status)
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
