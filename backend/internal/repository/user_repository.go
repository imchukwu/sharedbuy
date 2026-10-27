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
	db        *sql.DB
	mockUsers map[string]*domain.User
	mockOTPs  map[string]mockOTP
	mu        sync.RWMutex
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{
		db:        db,
		mockUsers: getMockUsers(),
		mockOTPs:  make(map[string]mockOTP),
	}
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

	query := `
		SELECT u.id, u.full_name, u.phone, u.email, u.password_hash, u.role, u.admin_subrole,
		       u.area_id, a.name as area_name, u.status, u.rating, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN areas a ON u.area_id = a.id
		WHERE u.id = $1
	`
	var u domain.User
	var areaName sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.FullName, &u.Phone, &u.Email, &u.PasswordHash, &u.Role, &u.AdminSubrole,
		&u.AreaID, &areaName, &u.Status, &u.Rating, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error querying user by ID: %w", err)
	}
	if areaName.Valid {
		u.AreaName = &areaName.String
	}
	return &u, nil
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

	query := `
		SELECT u.id, u.full_name, u.phone, u.email, u.password_hash, u.role, u.admin_subrole,
		       u.area_id, a.name as area_name, u.status, u.rating, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN areas a ON u.area_id = a.id
		WHERE u.phone = $1
	`
	var u domain.User
	var areaName sql.NullString
	err := r.db.QueryRowContext(ctx, query, phone).Scan(
		&u.ID, &u.FullName, &u.Phone, &u.Email, &u.PasswordHash, &u.Role, &u.AdminSubrole,
		&u.AreaID, &areaName, &u.Status, &u.Rating, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error querying user by phone: %w", err)
	}
	if areaName.Valid {
		u.AreaName = &areaName.String
	}
	return &u, nil
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

	query := `
		SELECT u.id, u.full_name, u.phone, u.email, u.password_hash, u.role, u.admin_subrole,
		       u.area_id, a.name as area_name, u.status, u.rating, u.created_at, u.updated_at
		FROM users u
		LEFT JOIN areas a ON u.area_id = a.id
		WHERE LOWER(u.email) = LOWER($1)
	`
	var u domain.User
	var areaName sql.NullString
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID, &u.FullName, &u.Phone, &u.Email, &u.PasswordHash, &u.Role, &u.AdminSubrole,
		&u.AreaID, &areaName, &u.Status, &u.Rating, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error querying user by email: %w", err)
	}
	if areaName.Valid {
		u.AreaName = &areaName.String
	}
	return &u, nil
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
		INSERT INTO users (id, full_name, phone, email, password_hash, role, admin_subrole, area_id, status, rating, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
	`
	_, err := r.db.ExecContext(ctx, query,
		u.ID, u.FullName, u.Phone, u.Email, u.PasswordHash, u.Role, u.AdminSubrole,
		u.AreaID, u.Status, u.Rating,
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
		SET full_name = $1, email = $2, role = $3, area_id = $4, status = $5, updated_at = NOW()
		WHERE id = $6
	`
	_, err := r.db.ExecContext(ctx, query, u.FullName, u.Email, u.Role, u.AreaID, u.Status, u.ID)
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
	// Support testing mock code 123456
	if code == "123456" {
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
