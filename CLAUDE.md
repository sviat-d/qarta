# Qarta — Smarter Payments for SaaS

## What is Qarta?

Qarta is a payment engine for SaaS companies. We are NOT a bank, NOT a PSP, NOT a payment gateway. We are an optimization layer that sits on top of payment providers (Stripe, Coinbase Commerce, etc.).

**Core value proposition:** One API. One integration. More revenue. Less risk.

## What we solve

SaaS companies lose revenue to:
- Declined payments (soft declines, card failures)
- Chargebacks and disputes
- Stripe account monitoring/freezing risk
- No fallback when a PSP declines
- Failed subscription renewals (involuntary churn)
- International payment complexity

Stripe handles 80% perfectly. Qarta optimizes the other 20%.

## What's inside (not marketing terms)

- Multi-PSP routing (Stripe + Coinbase Commerce, more later)
- Smart retry logic for soft declines
- Chargeback detection & automation
- Fallback between providers
- Subscription optimization
- Crypto rails (USDT/USDC via Coinbase Commerce)

## We do NOT sell

- "Payment orchestration" as a term
- "Another payment gateway"
- "Crypto gateway"
- "Chargeback tool"

We sell the **result**: More approved payments. Fewer chargebacks. One integration.

## Target ICP

- SaaS / subscription businesses
- $300k–5M ARR
- Stripe-first
- 2k–50k transactions/month
- International cards
- Recurring billing

## Project Structure

```
qarta/
├── apps/
│   ├── web/              # Next.js 14 landing page (qarta.eu)
│   └── api/              # Fastify payment engine API
├── packages/
│   ├── shared/           # Shared types, utils, constants
│   ├── ui/               # UI components (Radix + Tailwind)
│   └── config/           # Shared tsconfig configs
├── docker-compose.yml    # PostgreSQL + Redis for local dev
├── turbo.json            # Turborepo config
└── package.json          # Root workspace
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Monorepo | Turborepo + npm workspaces |
| Landing | Next.js 14 (App Router) + Tailwind + Radix UI |
| API | Fastify + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Cache/Queues | Redis (+ BullMQ planned) |
| Fiat PSP | Stripe |
| Crypto PSP | Coinbase Commerce |
| Deploy | Vercel (web) + Railway (api) |

## Development Commands

```bash
# Install dependencies
npm install

# Start local infrastructure (PostgreSQL + Redis)
docker compose up -d

# Copy env file for API
cp apps/api/.env.example apps/api/.env

# Run database migrations
npm run db:migrate

# Start all apps in dev mode
npm run dev

# Start only the landing page
npm run dev:web

# Start only the API
npm run dev:api

# Type-check everything
npm run type-check
```

## Key Architecture Decisions

1. **PSP Adapter pattern** (`apps/api/src/providers/`): Each PSP implements the `PspAdapter` interface. Adding a new provider = implementing one interface.

2. **Smart routing** (`apps/api/src/services/payment-router.ts`): Decides which PSP handles a payment based on method, priority, and fallback rules.

3. **Soft/hard decline classification**: Soft declines get retried with exponential backoff. Hard declines fail immediately.

4. **Shared types** (`packages/shared/`): Domain types and constants used by both frontend and backend.

5. **UI components** (`packages/ui/`): Headless Radix primitives styled with Tailwind. Design comes from Figma (professional UX/UI designer).

## API Endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/payments` | Create a payment |
| GET | `/v1/payments/:id` | Get payment status |
| GET | `/v1/payments` | List payments |
| POST | `/v1/webhooks/stripe` | Stripe webhook handler |
| POST | `/v1/webhooks/coinbase` | Coinbase webhook handler |

## Database Schema

Tables: `merchants`, `payments`, `payment_attempts`, `subscriptions`, `chargebacks`, `webhook_events`

See `apps/api/src/db/schema.ts` for full Drizzle schema.

## Environment Variables

API requires these env vars (see `apps/api/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `COINBASE_COMMERCE_API_KEY` — Coinbase Commerce API key
- `COINBASE_COMMERCE_WEBHOOK_SECRET` — Coinbase Commerce webhook secret

## Code Conventions

- TypeScript strict mode everywhere
- Zod for runtime validation
- Use `@qarta/shared` types across apps
- API responses follow `ApiResponse<T>` shape
- All amounts in cents (integer) in the database, converted at API boundary
- PSP adapters are stateless — config passed per-call
