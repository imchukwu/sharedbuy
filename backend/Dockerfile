# Stage 1: Build Go Binary
FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/sharedbuy-server ./cmd/server

# Stage 2: Minimal Production Runtime
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

COPY --from=builder /app/sharedbuy-server /app/sharedbuy-server
COPY --from=builder /app/migrations /app/migrations

RUN mkdir -p /app/uploads
EXPOSE 8080

CMD ["/app/sharedbuy-server"]

