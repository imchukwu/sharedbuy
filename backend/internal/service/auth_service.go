package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
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
	notifSvc  *NotificationService
	isDev     bool
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, notifSvc ...*NotificationService) *AuthService {
	var ns *NotificationService
	if len(notifSvc) > 0 {
		ns = notifSvc[0]
	}
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
		notifSvc:  ns,
		isDev:     false,
	}
}

func (s *AuthService) SetDevelopmentMode(isDev bool) {
	s.isDev = isDev
}

func (s *AuthService) IsDevelopmentMode() bool {
	return s.isDev
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

	// Only log raw OTP code in development mode; mask in production
	if s.isDev {
		log.Printf("==================================================")
		log.Printf("[OTP SERVICE - DEV] Verification code for %s: %s (Test mock: 123456)", phone, code)
		log.Printf("==================================================")
	} else {
		log.Printf("[OTP SERVICE] Dispatched 6-digit OTP to %s", maskPhone(phone))
	}

	if s.notifSvc != nil {
		s.notifSvc.SendOTP(ctx, phone, code)
	}

	return code, nil
}

func maskPhone(phone string) string {
	if len(phone) <= 6 {
		return "***"
	}
	return phone[:4] + "****" + phone[len(phone)-3:]
}

func (s *AuthService) VerifyOTP(ctx context.Context, phone, code, fullName, areaID, referralCode string) (*AuthResult, error) {
	valid, err := s.userRepo.VerifyOTP(ctx, phone, code)
	if err != nil {
		return nil, fmt.Errorf("error verifying OTP: %w", err)
	}
	if !valid {
		return nil, errors.New("invalid or expired verification code")
	}

	// Always consume one-time OTP (keep 123456 reusable only in dev mode)
	if !s.isDev || code != "123456" {
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

		uID := "user-" + uuid.New().String()[:8]
		var refBy *string
		if referralCode != "" {
			if refUser, err := s.userRepo.GetByReferralCode(ctx, referralCode); err == nil && refUser != nil {
				refBy = &refUser.ID
			}
		}

		newUser := &domain.User{
			ID:                uID,
			FullName:          fullName,
			Phone:             phone,
			Role:              domain.RoleMember,
			AreaID:            aID,
			Status:            "ACTIVE",
			Rating:            5.00,
			WalletBalanceKobo: 0,
			ReferralCode:      "REF-" + strings.ToUpper(uID[len(uID)-6:]),
			ReferredBy:        refBy,
		}
		if err := s.userRepo.Create(ctx, newUser); err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
		user = newUser
	} else {
		if user.ReferralCode == "" {
			user.ReferralCode = "REF-" + strings.ToUpper(user.ID[len(user.ID)-6:])
		}
		if fullName != "" || areaID != "" {
			// Update user info if provided
			if fullName != "" {
				user.FullName = fullName
			}
			if areaID != "" {
				user.AreaID = &areaID
			}
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

	// Verify password strictly using bcrypt hash comparison
	if user.PasswordHash == nil || *user.PasswordHash == "" {
		return nil, errors.New("invalid email or password")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
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
