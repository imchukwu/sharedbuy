package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"sharedbuy-backend/internal/domain"
)

type WalletRepository struct {
	db          *sql.DB
	userRepo    *UserRepository
	mockLedgers map[string][]domain.WalletLedger // keyed by userID
	withdrawals map[string]*domain.WithdrawalRequest
	awardedRefs map[string]bool // tracks if referral bonus was already given for referred user
	mu          sync.RWMutex
}

func NewWalletRepository(db *sql.DB, userRepo *UserRepository) *WalletRepository {
	repo := &WalletRepository{
		db:          db,
		userRepo:    userRepo,
		mockLedgers: make(map[string][]domain.WalletLedger),
		withdrawals: make(map[string]*domain.WithdrawalRequest),
		awardedRefs: make(map[string]bool),
	}

	// Initialize demo transactions for mem-01
	now := time.Now()
	repo.mockLedgers["mem-01"] = []domain.WalletLedger{
		{
			ID:               "tx-ref-02",
			UserID:           "mem-01",
			Type:             "CREDIT",
			AmountKobo:       20000, // ₦200
			BalanceAfterKobo: 1250000,
			Reason:           "REFERRAL_BONUS: Neighbor joined Direct Mill Palm Oil Unit",
			RefID:            "ref-bonus-02",
			CreatedAt:        now.Add(-4 * time.Hour),
		},
		{
			ID:               "tx-ref-01",
			UserID:           "mem-01",
			Type:             "CREDIT",
			AmountKobo:       20000, // ₦200
			BalanceAfterKobo: 1230000,
			Reason:           "REFERRAL_BONUS: Neighbor joined Parboiled Rice Unit",
			RefID:            "ref-bonus-01",
			CreatedAt:        now.Add(-2 * 24 * time.Hour),
		},
		{
			ID:               "tx-init-01",
			UserID:           "mem-01",
			Type:             "CREDIT",
			AmountKobo:       1210000, // ₦12,100
			BalanceAfterKobo: 1210000,
			Reason:           "SURPLUS_REFUND: Wholesale Price Adjustment (Honey Beans Unit #04)",
			RefID:            "surplus-unit-04",
			CreatedAt:        now.Add(-5 * 24 * time.Hour),
		},
	}

	return repo
}

type WalletSummary struct {
	BalanceKobo          int64                 `json:"balance_kobo"`
	ReferralCode         string                `json:"referral_code"`
	ReferralsCount       int                   `json:"referrals_count"`
	ReferralEarningsKobo int64                 `json:"referral_earnings_kobo"`
	Transactions         []domain.WalletLedger `json:"transactions"`
}

func (r *WalletRepository) GetWalletSummary(ctx context.Context, userID string) (*WalletSummary, error) {
	user, err := r.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("error fetching user: %w", err)
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	txs := r.mockLedgers[userID]
	if txs == nil {
		txs = []domain.WalletLedger{}
	}

	return &WalletSummary{
		BalanceKobo:          user.WalletBalanceKobo,
		ReferralCode:         user.ReferralCode,
		ReferralsCount:       user.ReferralsCount,
		ReferralEarningsKobo: user.ReferralEarningsKobo,
		Transactions:         txs,
	}, nil
}

func (r *WalletRepository) Credit(ctx context.Context, userID string, amountKobo int64, reason, refID string) (int64, error) {
	if amountKobo <= 0 {
		return 0, errors.New("credit amount must be positive")
	}

	user, err := r.userRepo.GetByID(ctx, userID)
	if err != nil {
		return 0, err
	}
	if user == nil {
		return 0, errors.New("user not found")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	newBalance := user.WalletBalanceKobo + amountKobo
	user.WalletBalanceKobo = newBalance

	ledger := domain.WalletLedger{
		ID:               "tx-" + uuid.New().String()[:8],
		UserID:           userID,
		Type:             "CREDIT",
		AmountKobo:       amountKobo,
		BalanceAfterKobo: newBalance,
		Reason:           reason,
		RefID:            refID,
		CreatedAt:        time.Now(),
	}

	// Prepend to transaction list
	r.mockLedgers[userID] = append([]domain.WalletLedger{ledger}, r.mockLedgers[userID]...)

	_ = r.userRepo.Update(ctx, user)
	return newBalance, nil
}

func (r *WalletRepository) Debit(ctx context.Context, userID string, amountKobo int64, reason, refID string) (int64, error) {
	if amountKobo <= 0 {
		return 0, errors.New("debit amount must be positive")
	}

	user, err := r.userRepo.GetByID(ctx, userID)
	if err != nil {
		return 0, err
	}
	if user == nil {
		return 0, errors.New("user not found")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if user.WalletBalanceKobo < amountKobo {
		return 0, fmt.Errorf("insufficient wallet balance (available: %d kobo, required: %d kobo)", user.WalletBalanceKobo, amountKobo)
	}

	newBalance := user.WalletBalanceKobo - amountKobo
	user.WalletBalanceKobo = newBalance

	ledger := domain.WalletLedger{
		ID:               "tx-" + uuid.New().String()[:8],
		UserID:           userID,
		Type:             "DEBIT",
		AmountKobo:       amountKobo,
		BalanceAfterKobo: newBalance,
		Reason:           reason,
		RefID:            refID,
		CreatedAt:        time.Now(),
	}

	r.mockLedgers[userID] = append([]domain.WalletLedger{ledger}, r.mockLedgers[userID]...)

	_ = r.userRepo.Update(ctx, user)
	return newBalance, nil
}

func (r *WalletRepository) CreateWithdrawal(ctx context.Context, req *domain.WithdrawalRequest) (*domain.WithdrawalRequest, error) {
	if req.AmountKobo <= 0 {
		return nil, errors.New("invalid withdrawal amount")
	}

	user, err := r.userRepo.GetByID(ctx, req.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if user.WalletBalanceKobo < req.AmountKobo {
		return nil, errors.New("insufficient wallet balance for withdrawal")
	}

	newBalance := user.WalletBalanceKobo - req.AmountKobo
	user.WalletBalanceKobo = newBalance

	now := time.Now()
	req.ID = "wdr-" + uuid.New().String()[:8]
	req.Status = "COMPLETED" // Completed via instant Paystack transfer in sandbox
	req.CreatedAt = now
	req.CompletedAt = &now

	r.withdrawals[req.ID] = req

	ledger := domain.WalletLedger{
		ID:               "tx-" + uuid.New().String()[:8],
		UserID:           req.UserID,
		Type:             "DEBIT",
		AmountKobo:       req.AmountKobo,
		BalanceAfterKobo: newBalance,
		Reason:           fmt.Sprintf("WITHDRAWAL: Transferred to %s (%s)", req.BankName, req.AccountNumber),
		RefID:            req.ID,
		CreatedAt:        now,
	}

	r.mockLedgers[req.UserID] = append([]domain.WalletLedger{ledger}, r.mockLedgers[req.UserID]...)
	_ = r.userRepo.Update(ctx, user)

	return req, nil
}

func (r *WalletRepository) AwardReferralBonus(ctx context.Context, referredUserID, unitID string) (bool, error) {
	r.mu.Lock()
	if r.awardedRefs[referredUserID] {
		r.mu.Unlock()
		return false, nil // Already awarded for this user
	}
	r.awardedRefs[referredUserID] = true
	r.mu.Unlock()

	user, err := r.userRepo.GetByID(ctx, referredUserID)
	if err != nil || user == nil || user.ReferredBy == nil || *user.ReferredBy == "" {
		return false, nil
	}

	referrerID := *user.ReferredBy
	referrer, err := r.userRepo.GetByID(ctx, referrerID)
	if err != nil || referrer == nil {
		return false, nil
	}

	bonusKobo := int64(20000) // ₦200 referral bonus

	r.mu.Lock()
	referrer.WalletBalanceKobo += bonusKobo
	referrer.ReferralEarningsKobo += bonusKobo
	referrer.ReferralsCount += 1

	ledger := domain.WalletLedger{
		ID:               "tx-" + uuid.New().String()[:8],
		UserID:           referrerID,
		Type:             "CREDIT",
		AmountKobo:       bonusKobo,
		BalanceAfterKobo: referrer.WalletBalanceKobo,
		Reason:           fmt.Sprintf("REFERRAL_BONUS: Neighbor %s joined unit", user.FullName),
		RefID:            "ref-" + referredUserID,
		CreatedAt:        time.Now(),
	}
	r.mockLedgers[referrerID] = append([]domain.WalletLedger{ledger}, r.mockLedgers[referrerID]...)
	r.mu.Unlock()

	_ = r.userRepo.Update(ctx, referrer)
	return true, nil
}
