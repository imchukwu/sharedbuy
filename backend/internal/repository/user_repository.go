package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"sharedbuy-backend/internal/domain"
)

type mockOTP struct {
	code      string
	expiresAt time.Time
}

type UserRepository struct {
	db           *sql.DB
	mockUsers    map[string]*domain.User
	mockOTPs     map[string]mockOTP
	allowMockOTP bool
	mu           sync.RWMutex
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{
		db:           db,
		mockUsers:    getMockUsers(),
		mockOTPs:     make(map[string]mockOTP),
		allowMockOTP: false,
	}
}

func (r *UserRepository) SetAllowMockOTP(allow bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.allowMockOTP = allow
}

const userSelectColumns = `
	SELECT u.id, u.full_name, u.phone, u.email, u.password_hash, u.role, u.admin_subrole,
	       u.area_id, a.name as area_name, u.status, u.rating,
	       COALESCE(u.wallet_balance_kobo, 0), COALESCE(u.referral_code, ''), u.referred_by,
	       COALESCE(u.referral_earnings_kobo, 0), COALESCE(u.referrals_count, 0),
	       u.created_at, u.updated_at
	FROM users u
	LEFT JOIN areas a ON u.area_id = a.id
`

func scanUserRow(row interface{ Scan(dest ...any) error }) (*domain.User, error) {
	var u domain.User
	var areaName sql.NullString
	err := row.Scan(
		&u.ID, &u.FullName, &u.Phone, &u.Email, &u.PasswordHash, &u.Role, &u.AdminSubrole,
		&u.AreaID, &areaName, &u.Status, &u.Rating,
		&u.WalletBalanceKobo, &u.ReferralCode, &u.ReferredBy,
		&u.ReferralEarningsKobo, &u.ReferralsCount,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if areaName.Valid {
		u.AreaName = &areaName.String
	}
	return &u, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		if u, ok := r.mockUsers[id]; ok {
			userCopy := *u
			return &userCopy, nil
		}
		return nil, nil
	}

	u, err := scanUserRow(r.db.QueryRowContext(ctx, userSelectColumns+" WHERE u.id = $1", id))
	if err != nil {
		return nil, fmt.Errorf("error querying user by ID: %w", err)
	}
	return u, nil
}

func (r *UserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		for _, u := range r.mockUsers {
			if u.Phone == phone {
				userCopy := *u
				return &userCopy, nil
			}
		}
		return nil, nil
	}

	u, err := scanUserRow(r.db.QueryRowContext(ctx, userSelectColumns+" WHERE u.phone = $1", phone))
	if err != nil {
		return nil, fmt.Errorf("error querying user by phone: %w", err)
	}
	return u, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		for _, u := range r.mockUsers {
			if u.Email != nil && strings.EqualFold(*u.Email, email) {
				userCopy := *u
				return &userCopy, nil
			}
		}
		return nil, nil
	}

	u, err := scanUserRow(r.db.QueryRowContext(ctx, userSelectColumns+" WHERE LOWER(u.email) = LOWER($1)", email))
	if err != nil {
		return nil, fmt.Errorf("error querying user by email: %w", err)
	}
	return u, nil
}

func (r *UserRepository) GetByReferralCode(ctx context.Context, code string) (*domain.User, error) {
	if code == "" {
		return nil, nil
	}
	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		for _, u := range r.mockUsers {
			if strings.EqualFold(u.ReferralCode, code) || strings.EqualFold(u.ID, code) {
				userCopy := *u
				return &userCopy, nil
			}
		}
		return nil, nil
	}

	u, err := scanUserRow(r.db.QueryRowContext(ctx, userSelectColumns+" WHERE LOWER(u.referral_code) = LOWER($1) OR LOWER(u.id) = LOWER($1)", code))
	if err != nil {
		return nil, fmt.Errorf("error querying user by referral: %w", err)
	}
	return u, nil
}

func (r *UserRepository) Create(ctx context.Context, u *domain.User) error {
	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		uCopy := *u
		if uCopy.CreatedAt.IsZero() {
			uCopy.CreatedAt = time.Now()
		}
		uCopy.UpdatedAt = time.Now()
		r.mockUsers[u.ID] = &uCopy
		return nil
	}

	query := `
		INSERT INTO users (
			id, full_name, phone, email, password_hash, role, admin_subrole, area_id,
			status, rating, wallet_balance_kobo, referral_code, referred_by,
			referral_earnings_kobo, referrals_count, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULLIF($12, ''), $13, $14, $15, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query,
		u.ID, u.FullName, u.Phone, u.Email, u.PasswordHash, u.Role, u.AdminSubrole,
		u.AreaID, u.Status, u.Rating, u.WalletBalanceKobo, u.ReferralCode, u.ReferredBy,
		u.ReferralEarningsKobo, u.ReferralsCount,
	)
	return err
}

func (r *UserRepository) Update(ctx context.Context, u *domain.User) error {
	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		uCopy := *u
		uCopy.UpdatedAt = time.Now()
		r.mockUsers[u.ID] = &uCopy
		return nil
	}

	query := `
		UPDATE users
		SET full_name = $1, email = $2, role = $3, area_id = $4, status = $5,
		    wallet_balance_kobo = $6, referral_code = NULLIF($7, ''), referred_by = $8,
		    referral_earnings_kobo = $9, referrals_count = $10, updated_at = NOW()
		WHERE id = $11
	`
	_, err := r.db.ExecContext(ctx, query,
		u.FullName, u.Email, u.Role, u.AreaID, u.Status,
		u.WalletBalanceKobo, u.ReferralCode, u.ReferredBy,
		u.ReferralEarningsKobo, u.ReferralsCount, u.ID,
	)
	return err
}

// OTP Management
func (r *UserRepository) SaveOTP(ctx context.Context, phone, code string, expiresAt time.Time) error {
	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.mockOTPs[phone] = mockOTP{code: code, expiresAt: expiresAt}
		return nil
	}

	query := `
		INSERT INTO otp_codes (phone, code, expires_at, created_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (phone) DO UPDATE
		SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = NOW()
	`
	_, err := r.db.ExecContext(ctx, query, phone, code, expiresAt)
	return err
}

func (r *UserRepository) VerifyOTP(ctx context.Context, phone, code string) (bool, error) {
	r.mu.RLock()
	allowBypass := r.allowMockOTP
	r.mu.RUnlock()

	// Support testing mock code 123456 ONLY when explicitly enabled in development mode
	if allowBypass && code == "123456" {
		return true, nil
	}

	if r.db == nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		item, exists := r.mockOTPs[phone]
		if !exists {
			return false, nil
		}
		if time.Now().After(item.expiresAt) {
			return false, nil
		}
		return item.code == code, nil
	}

	query := `
		SELECT code, expires_at
		FROM otp_codes
		WHERE phone = $1
	`
	var storedCode string
	var expiresAt time.Time
	err := r.db.QueryRowContext(ctx, query, phone).Scan(&storedCode, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}

	if time.Now().After(expiresAt) {
		return false, nil
	}

	return storedCode == code, nil
}

func (r *UserRepository) DeleteOTP(ctx context.Context, phone string) error {
	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		delete(r.mockOTPs, phone)
		return nil
	}

	_, err := r.db.ExecContext(ctx, "DELETE FROM otp_codes WHERE phone = $1", phone)
	return err
}
