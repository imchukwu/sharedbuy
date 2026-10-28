package middleware

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// SecurityHeaders adds production HTTP security headers and limits request body size to 1MB.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(self), geolocation=(self)")
		w.Header().Set("Cache-Control", "no-store, max-age=0")

		// Cap request body to 1MB to prevent memory exhaustion
		if r.Body != nil {
			r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		}

		next.ServeHTTP(w, r)
	})
}

type clientBucket struct {
	tokens     int
	lastRefill time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	clients map[string]*clientBucket
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		clients: make(map[string]*clientBucket),
	}
}

func (rl *RateLimiter) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if host, _, err := net.SplitHostPort(ip); err == nil {
			ip = host
		}

		// Stricter rate limit on sensitive auth/payment routes (15/min) vs general API (120/min)
		maxTokens := 120
		bucketPrefix := "gen:"
		if strings.HasPrefix(r.URL.Path, "/api/auth/otp") {
			maxTokens = 15
			bucketPrefix = "otp:"
		}

		key := bucketPrefix + ip
		now := time.Now()

		rl.mu.Lock()
		b, exists := rl.clients[key]
		if !exists || now.Sub(b.lastRefill) >= time.Minute {
			b = &clientBucket{
				tokens:     maxTokens - 1,
				lastRefill: now,
			}
			rl.clients[key] = b
			rl.mu.Unlock()
		} else {
			if b.tokens <= 0 {
				rl.mu.Unlock()
				w.Header().Set("Retry-After", "60")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":"Rate limit exceeded. Please wait a moment and try again."}`))
				return
			}
			b.tokens--
			rl.mu.Unlock()
		}

		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", maxTokens))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", b.tokens))

		next.ServeHTTP(w, r)
	})
}

