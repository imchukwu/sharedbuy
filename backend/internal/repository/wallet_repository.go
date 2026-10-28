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

	if r.db == nil {
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

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, type, amount_kobo, balance_after_kobo, reason, COALESCE(ref_id, ''), created_at
		FROM wallet_ledger
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("error querying wallet ledger: %w", err)
	}
	defer rows.Close()

	txs := []domain.WalletLedger{}
	for rows.Next() {
		var l domain.WalletLedger
		if err := rows.Scan(&l.ID, &l.UserID, &l.Type, &l.AmountKobo, &l.BalanceAfterKobo, &l.Reason, &l.RefID, &l.CreatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, l)
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

	if r.db == nil {
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

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var currentBalance int64
	if err := tx.QueryRowContext(ctx, "SELECT COALESCE(wallet_balance_kobo, 0) FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&currentBalance); err != nil {
		return 0, fmt.Errorf("user not found: %w", err)
	}

	newBalance := currentBalance + amountKobo
	if _, err := tx.ExecContext(ctx, "UPDATE users SET wallet_balance_kobo = $1, updated_at = NOW() WHERE id = $2", newBalance, userID); err != nil {
		return 0, err
	}

	txID := "tx-" + uuid.New().String()[:8]
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wallet_ledger (id, user_id, type, amount_kobo, balance_after_kobo, reason, ref_id, created_at)
		VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6, NOW())
	`, txID, userID, amountKobo, newBalance, reason, refID); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return newBalance, nil
}

func (r *WalletRepository) Debit(ctx context.Context, userID string, amountKobo int64, reason, refID string) (int64, error) {
	if amountKobo <= 0 {
		return 0, errors.New("debit amount must be positive")
	}

	if r.db == nil {
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

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var currentBalance int64
	if err := tx.QueryRowContext(ctx, "SELECT COALESCE(wallet_balance_kobo, 0) FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&currentBalance); err != nil {
		return 0, fmt.Errorf("user not found: %w", err)
	}

	if currentBalance < amountKobo {
		return 0, fmt.Errorf("insufficient wallet balance (available: %d kobo, required: %d kobo)", currentBalance, amountKobo)
	}

	newBalance := currentBalance - amountKobo
	if _, err := tx.ExecContext(ctx, "UPDATE users SET wallet_balance_kobo = $1, updated_at = NOW() WHERE id = $2", newBalance, userID); err != nil {
		return 0, err
	}

	txID := "tx-" + uuid.New().String()[:8]
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wallet_ledger (id, user_id, type, amount_kobo, balance_after_kobo, reason, ref_id, created_at)
		VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6, NOW())
	`, txID, userID, amountKobo, newBalance, reason, refID); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return newBalance, nil
}

func (r *WalletRepository) CreateWithdrawal(ctx context.Context, req *domain.WithdrawalRequest) (*domain.WithdrawalRequest, error) {
	if req.AmountKobo <= 0 {
		return nil, errors.New("invalid withdrawal amount")
	}

	if r.db == nil {
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
		req.Status = "COMPLETED"
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

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var currentBalance int64
	if err := tx.QueryRowContext(ctx, "SELECT COALESCE(wallet_balance_kobo, 0) FROM users WHERE id = $1 FOR UPDATE", req.UserID).Scan(&currentBalance); err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if currentBalance < req.AmountKobo {
		return nil, errors.New("insufficient wallet balance for withdrawal")
	}

	newBalance := currentBalance - req.AmountKobo
	now := time.Now()
	req.ID = "wdr-" + uuid.New().String()[:8]
	req.Status = "COMPLETED"
	req.CreatedAt = now
	req.CompletedAt = &now

	if _, err := tx.ExecContext(ctx, "UPDATE users SET wallet_balance_kobo = $1, updated_at = NOW() WHERE id = $2", newBalance, req.UserID); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO withdrawal_requests (id, user_id, amount_kobo, bank_name, account_number, account_name, status, created_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, req.ID, req.UserID, req.AmountKobo, req.BankName, req.AccountNumber, req.AccountName, req.Status, req.CreatedAt, req.CompletedAt); err != nil {
		return nil, err
	}

	txID := "tx-" + uuid.New().String()[:8]
	reason := fmt.Sprintf("WITHDRAWAL: Transferred to %s (%s)", req.BankName, req.AccountNumber)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wallet_ledger (id, user_id, type, amount_kobo, balance_after_kobo, reason, ref_id, created_at)
		VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6, NOW())
	`, txID, req.UserID, req.AmountKobo, newBalance, reason, req.ID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return req, nil
}

func (r *WalletRepository) ListWithdrawals(ctx context.Context) ([]domain.WithdrawalRequest, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		res := make([]domain.WithdrawalRequest, 0, len(r.withdrawals))
		for _, w := range r.withdrawals {
			res = append(res, *w)
		}
		return res, nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, amount_kobo, bank_name, account_number, account_name, status, created_at, completed_at
		FROM withdrawal_requests
		ORDER BY created_at DESC
		LIMIT 100
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.WithdrawalRequest
	for rows.Next() {
		var w domain.WithdrawalRequest
		var completedAt sql.NullTime
		if err := rows.Scan(&w.ID, &w.UserID, &w.AmountKobo, &w.BankName, &w.AccountNumber, &w.AccountName, &w.Status, &w.CreatedAt, &completedAt); err == nil {
			if completedAt.Valid {
				w.CompletedAt = &completedAt.Time
			}
			list = append(list, w)
		}
	}
	return list, nil
}

func (r *WalletRepository) UpdateWithdrawalStatus(ctx context.Context, withdrawalID, status string) (*domain.WithdrawalRequest, error) {
	now := time.Now()
	if r.db == nil {
		r.mu.Lock()
		w, ok := r.withdrawals[withdrawalID]
		if !ok {
			r.mu.Unlock()
			return nil, errors.New("withdrawal request not found")
		}
		prevStatus := w.Status
		w.Status = status
		if status == "COMPLETED" {
			w.CompletedAt = &now
		}
		wCopy := *w
		r.mu.Unlock()

		if status == "REJECTED" && prevStatus != "REJECTED" {
			_, _ = r.Credit(ctx, wCopy.UserID, wCopy.AmountKobo, "WITHDRAWAL_REVERSAL: Refunded rejected bank withdrawal "+wCopy.ID, "rev-"+wCopy.ID)
		}
		return &wCopy, nil
	}

	var userID string
	var amountKobo int64
	var prevStatus string
	err := r.db.QueryRowContext(ctx, "SELECT user_id, amount_kobo, status FROM withdrawal_requests WHERE id = $1", withdrawalID).Scan(&userID, &amountKobo, &prevStatus)
	if err != nil {
		return nil, errors.New("withdrawal request not found")
	}

	_, err = r.db.ExecContext(ctx, "UPDATE withdrawal_requests SET status = $1, completed_at = NOW() WHERE id = $2", status, withdrawalID)
	if err != nil {
		return nil, err
	}

	if status == "REJECTED" && prevStatus != "REJECTED" {
		_, _ = r.Credit(ctx, userID, amountKobo, "WITHDRAWAL_REVERSAL: Refunded rejected bank withdrawal "+withdrawalID, "rev-"+withdrawalID)
	}

	list, _ := r.ListWithdrawals(ctx)
	for _, item := range list {
		if item.ID == withdrawalID {
			itemCopy := item
			return &itemCopy, nil
		}
	}
	return nil, nil
}

func (r *WalletRepository) AwardReferralBonus(ctx context.Context, referredUserID, unitID string) (bool, error) {
	if r.db == nil {
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

	// PostgreSQL transactional referral bonus
	user, err := r.userRepo.GetByID(ctx, referredUserID)
	if err != nil || user == nil || user.ReferredBy == nil || *user.ReferredBy == "" {
		return false, nil
	}
	referrerID := *user.ReferredBy
	refID := "ref-" + referredUserID

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var existingCount int
	_ = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM wallet_ledger WHERE user_id = $1 AND ref_id = $2", referrerID, refID).Scan(&existingCount)
	if existingCount > 0 {
		return false, nil
	}

	bonusKobo := int64(20000)
	var newBalance int64
	if err := tx.QueryRowContext(ctx, `
		UPDATE users
		SET wallet_balance_kobo = COALESCE(wallet_balance_kobo, 0) + $1,
		    referral_earnings_kobo = COALESCE(referral_earnings_kobo, 0) + $1,
		    referrals_count = COALESCE(referrals_count, 0) + 1,
		    updated_at = NOW()
		WHERE id = $2
		RETURNING wallet_balance_kobo
	`, bonusKobo, referrerID).Scan(&newBalance); err != nil {
		return false, err
	}

	txID := "tx-" + uuid.New().String()[:8]
	reason := fmt.Sprintf("REFERRAL_BONUS: Neighbor %s joined unit", user.FullName)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO wallet_ledger (id, user_id, type, amount_kobo, balance_after_kobo, reason, ref_id, created_at)
		VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6, NOW())
	`, txID, referrerID, bonusKobo, newBalance, reason, refID); err != nil {
		return false, err
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}
	return true, nil
}

type PaymentRecord struct {
	ID             string
	UserID         string
	UnitID         string
	UserName       string
	UserPhone      string
	UserEmail      string
	SharesCount    int
	ActionType     string // UNIT_JOIN, WALLET_TOPUP
	AmountKobo     int64
	GatewayRef     string
	Status         string // INITIALIZED, SUCCESS, FAILED
	CollectionCode string
	CreatedAt      time.Time
}

func (r *WalletRepository) SavePaymentRecord(ctx context.Context, rec PaymentRecord) error {
	if r.db == nil {
		return nil
	}
	if rec.ID == "" {
		rec.ID = "pay-" + uuid.New().String()[:8]
	}
	if rec.ActionType == "" {
		rec.ActionType = "UNIT_JOIN"
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO payments (
			id, user_id, unit_id, user_name, user_phone, user_email,
			shares_count, action_type, amount_kobo, gateway_ref, gateway, status, collection_code, paid_at
		)
		VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, $9, $10, 'PAYSTACK', $11, NULLIF($12, ''), NOW())
		ON CONFLICT (gateway_ref) DO UPDATE
		SET status = EXCLUDED.status,
		    collection_code = COALESCE(NULLIF(EXCLUDED.collection_code, ''), payments.collection_code)
	`, rec.ID, rec.UserID, rec.UnitID, rec.UserName, rec.UserPhone, rec.UserEmail,
		rec.SharesCount, rec.ActionType, rec.AmountKobo, rec.GatewayRef, rec.Status, rec.CollectionCode)
	return err
}

func (r *WalletRepository) GetPaymentRecordByRef(ctx context.Context, reference string) (*PaymentRecord, error) {
	if r.db == nil || reference == "" {
		return nil, nil
	}
	var rec PaymentRecord
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, COALESCE(unit_id, ''), COALESCE(user_name, ''), COALESCE(user_phone, ''),
		       COALESCE(user_email, ''), COALESCE(shares_count, 1), COALESCE(action_type, 'UNIT_JOIN'),
		       amount_kobo, gateway_ref, status, COALESCE(collection_code, ''), paid_at
		FROM payments
		WHERE gateway_ref = $1
	`, reference).Scan(
		&rec.ID, &rec.UserID, &rec.UnitID, &rec.UserName, &rec.UserPhone,
		&rec.UserEmail, &rec.SharesCount, &rec.ActionType,
		&rec.AmountKobo, &rec.GatewayRef, &rec.Status, &rec.CollectionCode, &rec.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &rec, nil
}

