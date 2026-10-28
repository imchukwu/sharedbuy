package config

import (
	"os"
	"testing"
)

func TestPriority5ConfigAndCORSValidation(t *testing.T) {
	os.Setenv("APP_ENV", "production")
	os.Setenv("ALLOWED_ORIGINS", "https://sharedbuy.ng, https://app.sharedbuy.ng")
	os.Setenv("JWT_SECRET", DefaultDevJWTSecret)
	defer func() {
		os.Unsetenv("APP_ENV")
		os.Unsetenv("ALLOWED_ORIGINS")
		os.Unsetenv("JWT_SECRET")
	}()

	cfg := Load()
	if cfg.IsDevelopment() {
		t.Fatalf("expected IsDevelopment() to be false when APP_ENV=production")
	}
	if len(cfg.AllowedOrigins) != 2 || cfg.AllowedOrigins[0] != "https://sharedbuy.ng" {
		t.Fatalf("expected parsed ALLOWED_ORIGINS, got %v", cfg.AllowedOrigins)
	}

	warnings := cfg.ValidateForProduction()
	if len(warnings) == 0 {
		t.Fatalf("expected production warnings when default JWT_SECRET is used")
	}
}

