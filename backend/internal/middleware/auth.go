package middleware

import (
	"context"
	"net/http"
	"strings"

	"sharedbuy-backend/internal/service"
)

type contextKey string

const (
	UserIDKey       contextKey = "user_id"
	UserRoleKey     contextKey = "user_role"
	AdminSubroleKey contextKey = "admin_subrole"
	UserPhoneKey    contextKey = "user_phone"
)

func AuthMiddleware(authService *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				next.ServeHTTP(w, r)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := authService.ValidateToken(tokenStr)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
			ctx = context.WithValue(ctx, UserPhoneKey, claims.Phone)
			if claims.AdminSubrole != nil {
				ctx = context.WithValue(ctx, AdminSubroleKey, *claims.AdminSubrole)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value(UserIDKey)
		if userID == nil {
			http.Error(w, `{"error":"Unauthorized: Authentication required"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roleVal := r.Context().Value(UserRoleKey)
			if roleVal == nil {
				http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
				return
			}

			userRole, ok := roleVal.(string)
			if !ok {
				http.Error(w, `{"error":"Forbidden"}`, http.StatusForbidden)
				return
			}

			for _, allowed := range allowedRoles {
				if userRole == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}

			http.Error(w, `{"error":"Forbidden: Insufficient privileges for this portal"}`, http.StatusForbidden)
		})
	}
}

func GetUserID(ctx context.Context) string {
	if val := ctx.Value(UserIDKey); val != nil {
		if s, ok := val.(string); ok {
			return s
		}
	}
	return ""
}

func GetUserRole(ctx context.Context) string {
	if val := ctx.Value(UserRoleKey); val != nil {
		if s, ok := val.(string); ok {
			return s
		}
	}
	return ""
}
