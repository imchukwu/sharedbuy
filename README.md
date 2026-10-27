# SharedBuy — Group-Buying Web Platform for Nigeria

SharedBuy enables people in the same city or estate to collectively purchase bulk staples (rice, beans, cooking oil, garri, sugar, milk) at wholesale prices.

---

## Architecture Overview

- **Backend**: Go (Go 1.22+) REST API using `chi`, PostgreSQL with connection pooling (`pgx`), and JWT-based role authentication.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS with mobile-first PWA architecture (designed from 360px viewport upwards).
- **Database**: PostgreSQL 16 storing all monetary amounts as **integers in kobo** (`1 NGN = 100 kobo`).
- **Three Portals**:
  1. **Member App** (`/`): Public-facing group buying, 4-step explainer, transparent cost breakdowns, My Units stepper, and escrow wallet.
  2. **Unit Manager Portal** (`/manager`): Hub coordinator dashboard, equipment readiness checklist (scales, containers, storage), 1-tap SMS/WhatsApp member broadcast, and 6-digit pickup verification desk.
  3. **Admin Operations Portal** (`/admin`): GMV, platform revenue (4%), active units lifecycle, ordering console preview, finance reconciliation, and audit trail.

---

## Quick Start

### 1. Database (PostgreSQL via Docker)
```bash
docker compose up -d
```
Runs PostgreSQL 16 on `localhost:5434` with user `sharedbuy`, password `sharedbuy_password`, database `sharedbuy`.

### 2. Backend (Go API)
```bash
cd backend
go run ./cmd/server
```
Runs the API server on `http://localhost:8080`.

### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Serves the web application on `http://localhost:5173`. API requests (`/api/*`) are automatically proxied to the Go backend.

---

## Test Accounts & 1-Tap Portal Switcher

A quick **Role Switcher** widget is located at the top right of the navigation bar, allowing 1-tap switching between portals:

| Portal | Demo Name | Phone / Email | Test Credentials |
|---|---|---|---|
| **Member** | Babagana Kyari | `+2348100000001` | Any 6-digit OTP or `123456` |
| **Unit Manager** | Aisha Bello | `+2348011112222` | Any 6-digit OTP or `123456` |
| **Admin Operations** | SharedBuy Admin | `admin@sharedbuy.ng` | `Admin@123456` |

---

## Seed Data Summary
- **3 Nigerian Areas**: Maiduguri (Borno), Kano Central (Kano), Ikeja / Surulere (Lagos).
- **6 Staple Products**: 50kg Parboiled Rice, 50kg Honey Beans, 50kg Ijebu Garri, 25L Vegetable Oil, 50kg Refined Sugar, 48-tin Peak Milk carton.
- **3 Distributors**: Northern Agro Millers, Dawanau Grain Merchants, Eko Commodities Depot.
- **8 Pre-Seeded Units**: In distinct lifecycle statuses (`OPEN`, `FULL`, `PAYMENT_CLOSED`, `ORDERED`, `IN_TRANSIT`, `READY_FOR_COLLECTION`, `COMPLETED`).
- **30 Realistic Nigerian Members** & **5 Accredited Unit Managers**.
