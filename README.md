# FixItNow — Home Services Marketplace Backend

A backend-only REST API for a home services marketplace (think: book a plumber, electrician, cleaner, etc.), built as an assignment project. Customers browse services and book technicians; technicians manage their profile, availability, and jobs; admins moderate the platform.

This README is written to be read cold, months later, by you — it covers everything needed to understand, run, and extend the project, including notes for the Next.js frontend you're planning to build against it.

---

## Live server url

 [Live Link](https://fixitnow-server.onrender.com/)

---
## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Reference](#api-reference)
9. [Key Business Logic](#key-business-logic)
10. [Error Response Format](#error-response-format)
11. [Stripe Setup Notes](#stripe-setup-notes)
12. [Connecting a Next.js Frontend](#connecting-a-nextjs-frontend)
13. [Known Assumptions & Limitations](#known-assumptions--limitations)

---

## Project Overview

**Three roles**, chosen at registration (`CUSTOMER` / `TECHNICIAN` — `ADMIN` cannot self-register, must be promoted manually via the database):

- **Customer** — browses services/technicians, books a specific technician availability slot, pays via Stripe, tracks booking status, leaves a review after completion.
- **Technician** — creates a profile, lists services under categories, publishes availability slots, accepts/declines/progresses bookings assigned to them.
- **Admin** — manages service categories, views/bans users, views all bookings across the platform.

**Core flow:**
```
Technician creates profile → adds services → publishes availability slots
        ↓
Customer browses services/technicians → picks a slot → creates a booking (PENDING)
        ↓
Technician ACCEPTS or DECLINES
        ↓ (if accepted)
Customer pays via Stripe Checkout → Payment record marked COMPLETED
        ↓
Technician marks IN_PROGRESS → then COMPLETED
        ↓
Customer leaves a Review → Technician's averageRating/totalReviews recalculated
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js, TypeScript (ESM, `module: esnext`, `moduleResolution: bundler`) |
| Framework | Express 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 (multi-file schema under `prisma/schema/`, driver adapter via `@prisma/adapter-pg` + `pg`) |
| Auth | JWT (access + refresh), httpOnly cookies via `cookie-parser` |
| Password hashing | `bcryptjs` |
| Payments | Stripe (Checkout Sessions + webhooks) |
| Dev runner | `tsx` (no `ts-node`, no separate build step needed for `dev`) |
| HTTP status codes | `http-status` package |

Why these choices, briefly: Prisma 7's driver-adapter model (`@prisma/adapter-pg`) is the modern way to connect Prisma to Postgres without the legacy engine binary; `tsx` sidesteps ESM/CommonJS interop headaches that `ts-node` has; httpOnly cookies for JWTs (rather than `Authorization` header + localStorage) protect against XSS token theft — important since you're planning a frontend that will actually run in a browser.

---

## Project Structure

```
prisma/
  schema/               # multi-file Prisma schema
    schema.prisma        # datasource + generator config
    enums.prisma          # all enums
    user.prisma
    technician.prisma
    availability.prisma
    service.prisma
    category.prisma
    booking.prisma
    payment.prisma
    review.prisma
  generated/             # generated Prisma Client (gitignored, regenerate with `npx prisma generate`)
  migrations/             # migration history

src/
  config/index.ts         # all env vars in one typed object
  lib/
    prisma.ts              # Prisma Client singleton (uses PrismaPg adapter)
    stripe.ts               # Stripe client singleton
  middlewares/
    auth.ts                 # JWT verification + role guard: auth(), auth('ADMIN'), auth('CUSTOMER','TECHNICIAN')
    globalErrorHandler.ts    # central error formatter (ApiError, Prisma errors, generic errors)
    notFound.ts               # 404 fallback
  types/
    express.d.ts             # augments Express Request with req.user
  utils/
    ApiError.ts               # custom throwable HTTP error class
    catchAsync.ts               # wraps async controllers, forwards errors to next()
    sendResponse.ts              # standard { success, message, data } response shape
    cookies.ts                    # setAuthCookies / clearAuthCookies helpers
    jwt.ts                         # sign/verify access & refresh tokens
  modules/
    auth/         # register, login, me, refresh, logout
    category/     # public browse + admin CRUD
    service/      # public browse + technician-owned CRUD
    technician/    # public browse + technician's own profile/availability
    booking/        # create, list, cancel, technician status transitions
    payment/         # Stripe Checkout creation, webhook, history
    review/           # create + browse, drives technician rating aggregation
    admin/             # user management, all-bookings view
  app.ts          # Express app: middleware + route mounting
  server.ts        # bootstraps DB connection + HTTP server, graceful shutdown
```

**Module-internal convention** (every module in `src/modules/*` follows this):
- `*.interface.ts` — TypeScript types for request payloads/filters
- `*.service.ts` — business logic + Prisma queries (throws `ApiError` on invalid state)
- `*.controller.ts` — thin HTTP layer, wraps service calls in `catchAsync`, formats via `sendResponse`
- `*.route.ts` — Express `Router`, wires `auth()` middleware per endpoint

---

## Getting Started

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, JWT secrets, Stripe keys (see below)

npx prisma generate
npx prisma migrate dev

npm run dev
```

Server runs at `http://localhost:5000` by default. `GET /` is a health check.

**To create your first admin** (no self-registration for admins by design):
1. `POST /api/auth/register` with any `role: "CUSTOMER"`
2. `npx prisma studio` → open `users` table → change that row's `role` to `ADMIN`

**For Stripe payment testing**, run this in a second terminal while the server is running:
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```
(See [Stripe Setup Notes](#stripe-setup-notes) for full details.)

---

## Environment Variables

```env
NODE_ENV=development
PORT=5000
APP_BASE_URL=http://localhost:5000        # no trailing slash - used to build Stripe redirect URLs

DATABASE_URL="postgresql://user:password@localhost:5432/fixitnow?schema=public"

JWT_ACCESS_SECRET=your-access-secret
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

BCRYPT_SALT_ROUNDS=12

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...            # changes every time you restart `stripe listen` locally
```

---

## Database Schema

**Models:** `User`, `TechnicianProfile`, `Availability`, `Category`, `Service`, `Booking`, `Payment`, `Review`

**Key relationships:**
- `User 1—1 TechnicianProfile` (only for users with `role: TECHNICIAN`)
- `TechnicianProfile 1—* Availability` (technician publishes slots)
- `TechnicianProfile 1—* Service`, `Category 1—* Service`
- `Availability 1—1 Booking` (a booking consumes exactly one slot)
- `User(customer) 1—* Booking`, `User(technician) 1—* Booking` (two separate FKs to `User`, named relations `CustomerBookings`/`TechnicianBookings`)
- `Booking 1—1 Payment`, `Booking 1—1 Review`

**Enums:**
| Enum | Values | Used on |
|---|---|---|
| `Role` | `CUSTOMER`, `TECHNICIAN`, `ADMIN` | `User.role` |
| `UserStatus` | `ACTIVE`, `BANNED` | `User.status` |
| `SlotStatus` | `AVAILABLE`, `RESERVED`, `COMPLETED`, `CANCELLED` | `Availability.status` |
| `BookingStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | `Booking.status` |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED` | `Payment.status` |
| `PaymentProvider` | `STRIPE`, `SSLCOMMERZ` | `Payment.provider` (only `STRIPE` is actually implemented) |
| `AvailabilityStatus` | (as you defined — defaults to `AVAILABLE`) | `Service.availability` — **note:** unrelated to `SlotStatus` above; this is a service-level toggle, not a specific time slot's state |

All primary keys are `Int @id @default(autoincrement())` (not UUIDs) — matches your ERD.

---

## Authentication & Authorization

- **JWT strategy:** access token (short-lived) + refresh token (long-lived), both signed separately with their own secrets.
- **Delivery:** both tokens are set as **httpOnly cookies** (`accessToken`, `refreshToken`) — never exposed to client-side JS, never returned in a JSON response body.
- **Middleware:** `auth()` in `src/middlewares/auth.ts`.
  - `auth()` — any authenticated user
  - `auth('ADMIN')` — admins only
  - `auth('CUSTOMER', 'TECHNICIAN')` — either role
  - Reads the `accessToken` cookie, verifies it, attaches `{ id, email, role }` to `req.user`.
- **Refresh flow:** `POST /api/auth/refresh-token` reads the `refreshToken` cookie, issues a new `accessToken` cookie. No server-side revocation list — logout just clears cookies client-side.
- **Registration** only allows `role: CUSTOMER | TECHNICIAN`. Admins must be promoted manually.
- **Banned users** (`User.status === 'BANNED'`) are blocked at login and at booking creation.

---

## API Reference

All response bodies follow: `{ success: boolean, message: string, data?: T, meta?: {...} }`. All authenticated routes rely on the `accessToken` cookie — no `Authorization` header is used.

### Auth — `/api/auth`
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/register` | public | `{ name, email, password, phone?, role: "CUSTOMER"\|"TECHNICIAN" }` |
| POST | `/login` | public | `{ email, password }` |
| GET | `/me` | any | — |
| POST | `/refresh-token` | requires `refreshToken` cookie | — |
| POST | `/logout` | any | — |

### Categories
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/api/categories` | public | — |
| GET | `/api/admin/categories` | ADMIN | — |
| POST | `/api/admin/categories` | ADMIN | `{ name, description? }` |

### Services
| Method | Endpoint | Auth | Body / Query |
|---|---|---|---|
| GET | `/api/services` | public | query: `categoryId, location, minPrice, maxPrice, search` |
| GET | `/api/services/:id` | public | — |
| GET | `/api/technician/services` | TECHNICIAN | own services |
| POST | `/api/technician/services` | TECHNICIAN | `{ categoryId, title, description, price, duration, location, availability?, isActive? }` |
| PUT | `/api/technician/services/:id` | TECHNICIAN | any subset of the above |
| DELETE | `/api/technician/services/:id` | TECHNICIAN | blocked (409) if the service has existing bookings |

### Technicians
| Method | Endpoint | Auth | Body / Query |
|---|---|---|---|
| GET | `/api/technicians` | public | query: `categoryId, location, search` |
| GET | `/api/technicians/:id` | public | includes services + reviews |
| GET | `/api/technician/profile` | TECHNICIAN | own profile |
| PUT | `/api/technician/profile` | TECHNICIAN | `{ bio?, experience?, yearsExperience, location }` — upsert (create on first call) |
| GET | `/api/technician/availability` | TECHNICIAN | own slots |
| PUT | `/api/technician/availability` | TECHNICIAN | `{ slots: [{ date, startTime, endTime }, ...] }` — replaces all unbooked slots |

### Bookings
| Method | Endpoint | Auth | Body / Query |
|---|---|---|---|
| POST | `/api/bookings` | CUSTOMER | `{ serviceId, availabilityId, address?, note? }` |
| GET | `/api/bookings` | any | auto-scoped by role; query `status, date, technicianId, customerId` (last two: admin only) |
| GET | `/api/bookings/:id` | any (ownership checked) | — |
| PATCH | `/api/bookings/:id/cancel` | CUSTOMER | only own booking, only while `PENDING` |
| PATCH | `/api/technician/bookings/:id` | TECHNICIAN | `{ status: "ACCEPTED"\|"DECLINED"\|"IN_PROGRESS"\|"COMPLETED" }` |

### Payments
| Method | Endpoint | Auth | Body / Query |
|---|---|---|---|
| POST | `/api/payments/create` | CUSTOMER | `{ bookingId }` — booking must be `ACCEPTED`; returns `{ payment, checkoutUrl }` |
| GET | `/api/payments` | CUSTOMER, ADMIN | query `status, bookingId` |
| GET | `/api/payments/:id` | CUSTOMER, ADMIN | ownership checked |
| GET | `/api/payments/success` | public | Stripe redirects the browser here after checkout |
| GET | `/api/payments/cancel` | public | Stripe redirects here if the customer cancels checkout |
| POST | `/api/payments/webhook` | public (Stripe server calls this) | raw body, signature-verified |

### Reviews
| Method | Endpoint | Auth | Body / Query |
|---|---|---|---|
| POST | `/api/reviews` | CUSTOMER | `{ bookingId, rating (1-5 int), comment? }` — booking must be `COMPLETED`, one review per booking |
| GET | `/api/reviews` | public | query `technicianId, serviceId, customerId` |
| GET | `/api/reviews/:id` | public | — |

### Admin
| Method | Endpoint | Auth | Body / Query |
|---|---|---|---|
| GET | `/api/admin/users` | ADMIN | query `role, status, search` |
| PATCH | `/api/admin/users/:id` | ADMIN | `{ status: "ACTIVE"\|"BANNED" }` — cannot target another admin |
| GET | `/api/admin/bookings` | ADMIN | same filters as `GET /api/bookings` |

### Misc
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/` | public — health check |

---

## Key Business Logic

**Double-booking prevention (booking creation):** wrapped in a Prisma interactive transaction. Instead of "read slot status, check it, then write" (which has a race condition), it does a single atomic conditional `updateMany` — `WHERE id = ... AND technicianId = ... AND status = 'AVAILABLE'` — and checks `count`. Two simultaneous requests for the same slot can't both succeed; Postgres serializes the writes to that row.

**Booking status transitions** are whitelisted, not free-form:
```
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
PENDING → DECLINED
PENDING → CANCELLED   (customer-initiated, only from PENDING)
```
Any other transition is rejected with a 400.

**Availability slot lifecycle**, tied to the booking above it:
```
AVAILABLE → RESERVED (on booking creation)
RESERVED → AVAILABLE  (if booking is DECLINED or CANCELLED)
RESERVED → COMPLETED   (when booking is marked COMPLETED)
```

**Payments:** uses Stripe **Checkout Sessions** (hosted payment page), not a server-side-confirmed PaymentIntent — meaning the customer is redirected to an actual Stripe-hosted page to enter card details (test card `4242 4242 4242 4242`). `Payment.status` is updated to `COMPLETED` primarily via the `checkout.session.completed` webhook; the `/api/payments/success` landing page also actively re-checks with Stripe as a fallback in case the webhook hasn't arrived yet (useful for local dev where `stripe listen` might not be running).

**Reviews → rating aggregation:** creating a review runs in a transaction that also recalculates `TechnicianProfile.averageRating`/`totalReviews` via a fresh `aggregate()` over *all* of that technician's reviews — not an incremental running average — so it can't drift out of sync.

---

## Error Response Format

Every error (validation, auth, not-found, Prisma constraint violations) returns:
```json
{
  "success": false,
  "message": "Human-readable summary",
  "errorSources": [{ "path": "field_name_or_empty", "message": "detail" }],
  "stack": "... (development only)"
}
```
Handled centrally in `src/middlewares/globalErrorHandler.ts` — recognizes `ApiError` (thrown deliberately in services), Prisma's `P2002` (unique constraint), `P2025` (not found), `P2003` (foreign key constraint), and generic errors.

---

## Stripe Setup Notes

1. Dashboard → **Developers → API keys** → copy the **Secret key** (`sk_test_...`) into `STRIPE_SECRET_KEY`.
2. Install the Stripe CLI, run `stripe login` once.
3. With the server running, in a separate terminal:
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
4. Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` — **this value changes every time you restart `stripe listen`**, so keep them in sync.
5. Test card: `4242 4242 4242 4242`, any future expiry, any CVC. Decline test: `4000 0000 0000 0002`.
6. Currency is hardcoded to `usd` (Stripe doesn't support direct BDT card settlement) — revisit if this needs to change.

---

## Connecting a Next.js Frontend

A few things that matter for the frontend build, specifically because auth uses httpOnly cookies rather than a bearer token:

- **`fetch`/`axios` calls must include credentials.** With `fetch`: `fetch(url, { credentials: 'include' })`. With `axios`: `axios.defaults.withCredentials = true`. Without this, the browser won't send/receive the `accessToken`/`refreshToken` cookies at all.
- **CORS is currently `origin: true, credentials: true`** in `src/app.ts` (reflects any origin). Fine for local dev; **tighten this to your actual frontend origin before deploying** (`origin: 'https://your-frontend-domain.com'`).
- **Cross-domain cookies in production** (e.g. frontend on Vercel, backend elsewhere) need `sameSite: 'none'` + `secure: true` on the cookies (see `src/utils/cookies.ts`) — currently set to `sameSite: 'lax'`, which works for same-site/local dev but **will silently fail to send cookies cross-origin in production.** Update this when you deploy.
- **Server Components can't read httpOnly cookies for API calls directly** the way client components can rely on the browser doing automatically — for SSR data fetching, you'll likely want to forward the incoming request's cookies manually (`headers().get('cookie')`) when calling this API from a Next.js Server Component or Route Handler.
- **Stripe Checkout redirect** (`checkoutUrl` from `POST /api/payments/create`) is a full-page redirect target — in Next.js, this is `window.location.href = checkoutUrl` (client-side), not something you can embed in an iframe or handle via SPA routing.
- Consider building a thin **Next.js Route Handler proxy** (`/app/api/[...path]/route.ts`) if you run into cross-origin cookie pain — proxying through your own Next.js server keeps everything same-origin from the browser's perspective.

---

## Known Assumptions & Limitations

Things decided along the way that you might want to revisit:

- **No refresh-token revocation list** — logout is purely client-side cookie clearing. A stolen refresh token remains valid until it expires. Fine for an assignment; would need a DB-backed denylist/rotation for production.
- **`Service.availability` enum values** — defined by you as `AvailabilityStatus`, distinct from `Availability.status` (`SlotStatus`). Don't confuse the two when reading the schema.
- **`price` fields serialize as strings** in JSON (e.g. `"500.00"`) — normal behavior for Prisma's `Decimal` type. Parse with `parseFloat()` on the frontend.
- **Currency is hardcoded to `usd`** for Stripe (see above).
- **`isVerified` on `TechnicianProfile`** exists in the schema but nothing currently sets it — no "verify technician" admin action was built. Add one if you want that feature live.
- **Duplicate active booking check** only blocks a customer from having more than one active (`PENDING`/`ACCEPTED`/`IN_PROGRESS`) booking for the *same service* — not the same technician generally.
- **No pagination** on any list endpoint (`GET /api/services`, `/api/bookings`, etc.) — fine at assignment scale, would need `page`/`limit` query params + `meta` before this handles real data volume.
