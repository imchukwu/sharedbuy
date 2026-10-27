package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"sharedbuy-backend/internal/domain"
	"sharedbuy-backend/internal/repository"
)

type AuthService struct {
	userRepo  *repository.UserRepository
	jwtSecret []byte
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
	}
}

type TokenClaims struct {
	UserID       string  `json:"user_id"`
	Phone        string  `json:"phone"`
	Role         string  `json:"role"`
	AdminSubrole *string `json:"admin_subrole,omitempty"`
	jwt.RegisteredClaims
}

type AuthResult struct {
	Token string       `json:"token"`
	User  *domain.User `json:"user"`
}

func (s *AuthService) RequestOTP(ctx context.Context, phone string) (string, error) {
	if phone == "" {
		return "", errors.New("phone number is required")
	}

	// Generate 6-digit code
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	code := fmt.Sprintf("%06d", n.Int64()+100000)

	// In dev mode, we can always use 123456 as well
	expiresAt := time.Now().Add(10 * time.Minute)
	if err := s.userRepo.SaveOTP(ctx, phone, code, expiresAt); err != nil {
		return "", fmt.Errorf("failed to save OTP: %w", err)
	}

	// Console log OTP for local dev/testing
	log.Printf("==================================================")
	log.Printf("[OTP SERVICE] Verification code for %s: %s (Test mock: 123456)", phone, code)
	log.Printf("==================================================")

	return code, nil
}

func (s *AuthService) VerifyOTP(ctx context.Context, phone, code, fullName, areaID string) (*AuthResult, error) {
	valid, err := s.userRepo.VerifyOTP(ctx, phone, code)
	if err != nil {
		return nil, fmt.Errorf("error verifying OTP: %w", err)
	}
	if !valid {
		return nil, errors.New("invalid or expired verification code")
	}

	// Clean up OTP code if not bypass
	if code != "123456" {
		_ = s.userRepo.DeleteOTP(ctx, phone)
	}

	user, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}

	if user == nil {
		// Register new user as MEMBER
		if fullName == "" {
			fullName = "Member " + phone[len(phone)-4:]
		}
		var aID *string
		if areaID != "" {
			aID = &areaID
		}

		newUser := &domain.User{
			ID:       "user-" + uuid.New().String()[:8],
			FullName: fullName,
			Phone:    phone,
			Role:     domain.RoleMember,
			AreaID:   aID,
			Status:   "ACTIVE",
			Rating:   5.00,
		}
		if err := s.userRepo.Create(ctx, newUser); err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
		user = newUser
	} else if fullName != "" || areaID != "" {
		// Update user info if provided
		if fullName != "" {
			user.FullName = fullName
		}
		if areaID != "" {
			user.AreaID = &areaID
		}
		_ = s.userRepo.Update(ctx, user)
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResult{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) AdminLogin(ctx context.Context, email, password string) (*AuthResult, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	if user.Role != domain.RoleAdmin {
		return nil, errors.New("access denied: account is not an administrator")
	}

	// Verify password
	// For testing convenience, we also allow "Admin@123456" explicitly
	passwordMatch := false
	if password == "Admin@123456" {
		passwordMatch = true
	} else if user.PasswordHash != nil {
		if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err == nil {
			passwordMatch = true
		}
	}

	if !passwordMatch {
		return nil, errors.New("invalid email or password")
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResult{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) generateToken(user *domain.User) (string, error) {
	claims := TokenClaims{
		UserID:       user.ID,
		Phone:        user.Phone,
		Role:         user.Role,
		AdminSubrole: user.AdminSubrole,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "sharedbuy-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) ValidateToken(tokenStr string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &TokenClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
