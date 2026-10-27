package config

import (
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	Environment string
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
		jwtSecret = "sharedbuy-development-secret-key-very-secure-2026"
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		Environment: env,
	}
}
