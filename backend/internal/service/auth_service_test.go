package service

import (
	"context"
	"testing"

	"sharedbuy-backend/internal/repository"
)

func TestPriority1AuthSecurity(t *testing.T) {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(nil)
	authSvc := NewAuthService(userRepo, "test-jwt-secret")

	// 1. In production mode (default: allowMockOTP=false, isDev=false), "123456" bypass MUST be rejected
	_, err := authSvc.VerifyOTP(ctx, "+2348100000001", "123456", "", "", "")
	if err == nil {
		t.Fatalf("expected 123456 OTP bypass to be rejected when production mode is active")
	}

	// 2. Real generated OTP must succeed and be consumed after one use
	code, err := authSvc.RequestOTP(ctx, "+2348100000001")
	if err != nil {
		t.Fatalf("RequestOTP failed: %v", err)
	}
	res, err := authSvc.VerifyOTP(ctx, "+2348100000001", code, "", "", "")
	if err != nil || res == nil || res.Token == "" {
		t.Fatalf("expected valid OTP to succeed, got err=%v", err)
	}
	// Replay of the same OTP must fail in production mode
	_, err = authSvc.VerifyOTP(ctx, "+2348100000001", code, "", "", "")
	if err == nil {
		t.Fatalf("expected replayed OTP to be rejected after consumption")
	}

	// 3. AdminLogin must verify bcrypt hash and reject wrong passwords
	_, err = authSvc.AdminLogin(ctx, "admin@sharedbuy.ng", "WrongPassword123")
	if err == nil {
		t.Fatalf("expected wrong admin password to fail")
	}
	adminRes, err := authSvc.AdminLogin(ctx, "admin@sharedbuy.ng", "Admin@123456")
	if err != nil || adminRes == nil {
		t.Fatalf("expected valid bcrypt admin password to succeed, got err=%v", err)
	}
}

