# Pocket Canteen Backend

> **Campus food ordering backend for 5 canteens**  
> Modular Monolith built with TypeScript, Node.js, Express, PostgreSQL 16, Prisma 5, Socket.io 4, and Vitest.

---

## 🏗️ Architecture & Decisions

Pocket Canteen is designed as a **modular monolith** with clean boundary enforcement across six lifecycle phases:

```
apps/backend/
├── prisma/
│   ├── schema.prisma              # Unified database schema
│   ├── constraints.sql            # Append-only triggers & integrity checks
│   ├── seed.ts                    # Idempotent runner for prisma/seeds/NN-*.ts
│   └── seeds/
│       ├── _shared.ts             # 5 core campus canteens definition
│       └── 01-identity.ts         # Phase 1 seed: admin, staff, demo student
├── src/
│   ├── app.ts                     # Express application & middleware chain
│   ├── server.ts                  # HTTP & graceful shutdown bootstrap
│   ├── container.ts               # Inversion-of-control ports registry
│   ├── config/env.ts              # Zod-validated environment config
│   ├── lib/                       # Errors, logger, JWT, crypto, time, money
│   ├── middleware/                # Auth, RBAC, tenant scoping, validation, rate limiting
│   ├── ports/                     # Inter-module TypeScript contracts
│   ├── realtime/                  # Real-time event broker & recording emitter
│   └── modules/
│       └── identity/              # Phase 1: Identity & Platform Admin
└── test/
    ├── helpers.ts                 # Test database resetting & entity factories
    ├── fakes.ts                   # In-memory test stand-ins for cross-phase ports
    └── identity/                  # Full Vitest integration test suite
```

### Core Tenets Locked Across All Phases
1. **Money discipline:** Arithmetic in integer **paise** in code, DTOs, and API. DB stores `NUMERIC(10,2)` rupees.
2. **Tenant isolation:** Staff access is scoped strictly by the JWT `canteenId`, never by request body or URL. Cross-canteen access returns `404 Not Found` (never leaks existence).
3. **Append-only ledger:** Wallets are closed-loop credit funded by refunds. Database triggers forbid `UPDATE` and `DELETE` on `wallet_ledger` and `order_status_log`.
4. **Deterministic pickup codes:** 4-digit pickup codes in `[1000, 9999]` derived deterministically on-the-fly via `HMAC-SHA256(PICKUP_SECRET, order_id + salt)`; never stored in plaintext or cracked offline.
5. **No Redis for MVP:** Token sequence counters use atomic PostgreSQL upserts, rate limiting uses in-memory sliding windows, row locks use `SELECT ... FOR UPDATE`.

---

## 🚀 Phase 1: Identity & Platform Admin

Phase 1 provides the authentication, authorization, user profiles, and platform onboarding foundations:

### Owned Features & Routes
- **Student OTP Login:**
  - `POST /api/v1/auth/otp/request` — 6-digit cryptographic OTP generation with SHA-256 HMAC storage, 3 requests/10 min rate limiting, and optional domain allow-listing.
  - `POST /api/v1/auth/otp/verify` — Constant-time code verification, atomic attempts tracking (locked at 5 failed attempts), automatic student user + wallet initialization.
- **Staff & Admin Credentials Login:**
  - `POST /api/v1/auth/login` — Argon2id password hashing, IP+email sliding-window rate limit, role-based JWT access token issuance (carries `canteenId` for staff).
- **Token Lifecycle:**
  - `POST /api/v1/auth/refresh` — Rotating 48-byte cryptographically secure refresh tokens with family revocation on reuse detection.
  - `POST /api/v1/auth/logout` — Instant refresh token revocation.
- **Profile & Canteen Discovery:**
  - `GET /api/v1/me` — Authenticated profile (includes `walletBalancePaise` for students, `null` for staff/admin).
  - `PATCH /api/v1/me` — Update display name and contact phone number.
  - `GET /api/v1/canteens` — Campus canteens list ordered by token prefix (`A` to `E`), computing real-time `openNow` status against operating hours and `CAMPUS_TZ`.
- **Platform Admin Controls (Admin Role Only):**
  - `POST /api/v1/admin/canteens` — Atomic canteen onboarding with active Razorpay payment account.
  - `PATCH /api/v1/admin/canteens/:id` — Canteen metadata updates and payment account rotation.
  - `POST /api/v1/admin/canteens/:id/staff` — Onboard canteen staff with auto-generated one-time temporary password.
  - `PATCH /api/v1/admin/users/:id/active` — Activate/deactivate accounts with immediate token family revocation (self-deactivation prevented).
- **Scheduled Background Job:**
  - `identityCleanup` (Hourly) — Purges expired OTP challenges and expired/revoked refresh tokens older than 24 hours.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v20+ (v24 tested)
- **PostgreSQL**: v16+ running locally or in Docker

### 2. Database Setup (Docker or Local Postgres)
If using Docker:
```bash
docker run -d --name pc-pg -e POSTGRES_USER=pc -e POSTGRES_PASSWORD=pc \
  -e POSTGRES_DB=pocketcanteen -p 5432:5432 postgres:16
docker exec pc-pg psql -U pc -c "CREATE DATABASE pocketcanteen_test;"
```

### 3. Environment Configuration
```bash
cd apps/backend
cp .env.example .env
```

Default connection string: `postgresql://pc:pc@localhost:5432/pocketcanteen`  
Test database string: `postgresql://pc:pc@localhost:5432/pocketcanteen_test`

### 4. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 5. Push Schema & Constraints
```bash
npm run db:push
```

### 6. Run Seeds
```bash
npm run seed
```
Creates:
- 5 canteens (`Main Canteen`, `Tech Park Cafe`, `Hostel Mess Cafe`, `Library Cafe`, `Sports Complex Snacks`)
- Active payment accounts for all canteens
- Default Admin: `admin@pocketcanteen.test` (password: `Admin@12345`)
- Staff for each canteen: `staff.a@pocketcanteen.test`, `staff.b@...` (password: `Staff@12345`)
- Demo Student: `demo.student@pocketcanteen.test` with initialized wallet balance 0

### 7. Run Test Suite
```bash
npm test
```
Executes all 10 Phase 1 test cases testing the complete identity lifecycle:
1. OTP request rate limits & domain restriction
2. OTP verify with wallet creation, replay protection, brute-force locking, and expiry
3. Staff exclusion from OTP login
4. Password login & inactive account gating
5. Refresh token rotation & family revocation
6. `/me` profile and wallet balance retrieval
7. Admin canteen provisioning and payment account rotation
8. Staff provisioning with temporary passwords
9. RBAC route security
10. Account deactivation token revocation

### 8. Start Development Server
```bash
npm run dev
```
Listens on `http://localhost:4000/api/v1`.

---

## 📋 API Reference Summary

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/otp/request` | Public | Any | Request 6-digit email OTP |
| `POST` | `/api/v1/auth/otp/verify` | Public | Any | Verify OTP, create student/wallet if new |
| `POST` | `/api/v1/auth/login` | Public | Staff/Admin | Email + password login |
| `POST` | `/api/v1/auth/refresh` | Public | Any | Rotate refresh token for fresh access token |
| `POST` | `/api/v1/auth/logout` | Public | Any | Revoke refresh token |
| `GET` | `/api/v1/me` | Bearer | Any | Current user profile & wallet balance |
| `PATCH` | `/api/v1/me` | Bearer | Any | Update user name and phone |
| `GET` | `/api/v1/canteens` | Bearer | Any | List canteens with open/closed status |
| `POST` | `/api/v1/admin/canteens` | Bearer | Admin | Onboard canteen & payment account |
| `PATCH` | `/api/v1/admin/canteens/:id` | Bearer | Admin | Update canteen & swap payment account |
| `POST` | `/api/v1/admin/canteens/:id/staff` | Bearer | Admin | Provision staff user with temporary password |
| `PATCH` | `/api/v1/admin/users/:id/active` | Bearer | Admin | Activate or deactivate user |

---

## 📄 License
MIT
