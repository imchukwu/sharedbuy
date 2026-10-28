package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"sharedbuy-backend/internal/config"
	"sharedbuy-backend/internal/domain"
	"sharedbuy-backend/internal/handler"
	"sharedbuy-backend/internal/middleware"
	"sharedbuy-backend/internal/repository"
	"sharedbuy-backend/internal/service"
)

func main() {
	cfg := config.Load()

	// 1. Database Connection (with automatic fallback to dummy data mode)
	var sqlDB *sql.DB
	dbConn, err := repository.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Printf("⚠️  PostgreSQL connection unavailable: %v", err)
		log.Println("🚀 Starting backend in IN-MEMORY DUMMY DATA mode for review (all mock units & APIs active).")
	} else {
		sqlDB = dbConn.SQL
		defer dbConn.SQL.Close()
	}

	// 2. Repositories
	userRepo := repository.NewUserRepository(sqlDB)
	unitRepo := repository.NewUnitRepository(sqlDB)

	// 3. Services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	paymentService := service.NewPaymentService(unitRepo, userRepo, cfg.PaystackSecretKey, cfg.PaystackPublicKey)

	// 4. Handlers
	authHandler := handler.NewAuthHandler(authService, userRepo)
	metaHandler := handler.NewMetaHandler(unitRepo)
	unitHandler := handler.NewUnitHandler(unitRepo)
	paymentHandler := handler.NewPaymentHandler(paymentService)

	// 5. Router Setup
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))

	// CORS Setup
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "x-paystack-signature"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Context Auth Extractor Middleware
	r.Use(middleware.AuthMiddleware(authService))

	// API Routes
	r.Route("/api", func(api chi.Router) {
		// Health & Metadata (Public)
		api.Get("/health", metaHandler.HealthCheck)
		api.Get("/areas", metaHandler.GetAreas)
		api.Get("/products", metaHandler.GetProducts)

		// Units (Public browsing)
		api.Get("/units", unitHandler.ListUnits)
		api.Get("/units/{id}", unitHandler.GetUnit)
		api.Get("/units/{id}/members", unitHandler.GetUnitMembers)

		// Payments & Paystack Checkout
		api.Route("/payments", func(pay chi.Router) {
			pay.Group(func(authed chi.Router) {
				authed.Use(middleware.RequireAuth)
				authed.Post("/initialize", paymentHandler.InitializePayment)
			})
			pay.Get("/verify/{reference}", paymentHandler.VerifyPayment)
		})

		// Paystack Webhook
		api.Post("/webhooks/paystack", paymentHandler.PaystackWebhook)

		// Authentication (Public)
		api.Route("/auth", func(auth chi.Router) {
			auth.Post("/otp/request", authHandler.RequestOTP)
			auth.Post("/otp/verify", authHandler.VerifyOTP)
			auth.Post("/admin/login", authHandler.AdminLogin)

			// Authenticated user profile
			auth.Group(func(authed chi.Router) {
				authed.Use(middleware.RequireAuth)
				authed.Get("/me", authHandler.GetMe)
			})
		})

		// Role-Guarded Portal APIs
		// 1. Member Portal API
		api.Route("/member", func(m chi.Router) {
			m.Use(middleware.RequireAuth)
			m.Use(middleware.RequireRole(domain.RoleMember, domain.RoleUnitManager, domain.RoleAdmin))
			m.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
				w.Write([]byte(`{"message":"Welcome to Member Portal API"}`))
			})
		})

		// 2. Unit Manager Portal API
		api.Route("/manager", func(mgr chi.Router) {
			mgr.Use(middleware.RequireAuth)
			mgr.Use(middleware.RequireRole(domain.RoleUnitManager, domain.RoleAdmin))
			mgr.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
				w.Write([]byte(`{"message":"Welcome to Unit Manager Portal API"}`))
			})
		})

		// 3. Admin Portal API
		api.Route("/admin", func(adm chi.Router) {
			adm.Use(middleware.RequireAuth)
			adm.Use(middleware.RequireRole(domain.RoleAdmin))
			adm.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
				w.Write([]byte(`{"message":"Welcome to Admin Operations Portal API"}`))
			})
		})
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("🚀 SharedBuy Backend API server running on http://localhost:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen failed: %v", err)
		}
	}()

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
