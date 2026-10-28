package config

import (
	"os"
	"strings"
)

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	Environment       string
	PaystackSecretKey string
	PaystackPublicKey string
	TermiiAPIKey      string
	TermiiSenderID    string
	TermiiBaseURL     string
	UploadDir         string
	PublicBaseURL     string
	AllowedOrigins    []string
}

const DefaultDevJWTSecret = "sharedbuy-development-secret-key-very-secure-2026"

func (c *Config) IsDevelopment() bool {
	env := strings.ToLower(strings.TrimSpace(c.Environment))
	return env == "" || env == "development" || env == "dev" || env == "test"
}

func (c *Config) ValidateForProduction() []string {
	if c.IsDevelopment() {
		return nil
	}
	var warnings []string
	if c.JWTSecret == "" || c.JWTSecret == DefaultDevJWTSecret || len(c.JWTSecret) < 32 {
		warnings = append(warnings, "JWT_SECRET must be set to a unique random secret (>= 32 chars) in production")
	}
	if c.PaystackSecretKey == "" || c.PaystackSecretKey == "mock" {
		warnings = append(warnings, "PAYSTACK_SECRET_KEY is not set to a live Paystack secret key")
	}
	if c.TermiiAPIKey == "" {
		warnings = append(warnings, "TERMII_API_KEY is not set; SMS/WhatsApp dispatches will run in simulated ledger mode")
	}
	return warnings
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Default to local Docker container on port 5434
		dbURL = "postgres://sharedbuy:sharedbuy_password@localhost:5434/sharedbuy?sslmode=disable"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = DefaultDevJWTSecret
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	paystackSecret := os.Getenv("PAYSTACK_SECRET_KEY")
	paystackPublic := os.Getenv("PAYSTACK_PUBLIC_KEY")

	termiiKey := os.Getenv("TERMII_API_KEY")
	termiiSender := os.Getenv("TERMII_SENDER_ID")
	if termiiSender == "" {
		termiiSender = "SharedBuy"
	}
	termiiURL := os.Getenv("TERMII_BASE_URL")
	if termiiURL == "" {
		termiiURL = "https://v3.api.termii.com"
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	publicBaseURL := os.Getenv("PUBLIC_BASE_URL")

	allowedOrigins := []string{
		"http://localhost:5173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:3000",
	}
	if rawOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); rawOrigins != "" {
		parts := strings.Split(rawOrigins, ",")
		custom := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				custom = append(custom, trimmed)
			}
		}
		if len(custom) > 0 {
			allowedOrigins = custom
		}
	}

	return &Config{
		Port:              port,
		DatabaseURL:       dbURL,
		JWTSecret:         jwtSecret,
		Environment:       env,
		PaystackSecretKey: paystackSecret,
		PaystackPublicKey: paystackPublic,
		TermiiAPIKey:      termiiKey,
		TermiiSenderID:    termiiSender,
		TermiiBaseURL:     termiiURL,
		UploadDir:         uploadDir,
		PublicBaseURL:     publicBaseURL,
		AllowedOrigins:    allowedOrigins,
	}
}
