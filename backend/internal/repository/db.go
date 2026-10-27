package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type DB struct {
	SQL *sql.DB
}

func Connect(dbURL string) (*DB, error) {
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Connected to PostgreSQL database successfully.")
	return &DB{SQL: db}, nil
}
