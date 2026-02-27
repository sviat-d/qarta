# Qarta — Chargeback Deflection for Stripe SaaS

## What is Qarta?

Qarta is a chargeback deflection SaaS for Stripe-first subscription businesses. We intercept pre-dispute signals, apply auto-refund policies, and protect your Stripe dispute ratio — before chargebacks happen.

**Core value proposition:** Stop chargebacks before they hit your Stripe account. Protect your dispute ratio. Save revenue automatically.

## What we solve

SaaS companies on Stripe lose revenue and face account risk from:
- Chargebacks and disputes (each costs $15-25 in fees + lost revenue)
- Stripe account monitoring when dispute rate crosses 0.75%
- Stripe account freezes from high dispute/fraud rates (VAMP programme)
- No pre-dispute visibility — chargebacks arrive after the fact
- Manual dispute triage eating team time
- Failed subscription renewals causing involuntary churn

## What's inside

- **Pre-dispute alert ingestion** — Stripe Early Fraud Warnings (EFW) + dispute events
- **Auto-refund policy engine** — Rules based on amount, reason, customer history
- **Safety rails** — Max refunds/day, max per-customer, amount caps
- **Outcomes dashboard** — Disputes avoided, ratio trend, fees saved, time saved
- **Slack/email notifications** — Real-time alerts on actions taken
- **Manual review queue** — Escalation for cases that don't match policies

Future (Phase 2+): Ethoca/Verifi network alerts, smarter retry, risk scoring

## We sell the RESULT

- "We reduced your dispute rate from 0.8% to 0.3%"
- "We saved you $4,200 in dispute fees last month"
- "We auto-resolved 47 pre-disputes before they became chargebacks"

Not: "We have alerts" or "We have a chargeback tool"

## Target ICP

- SaaS / subscription businesses
- $200k–3M ARR
- Stripe-first (Stripe is primary PSP)
- 1k–20k transactions/month
- No dedicated risk/payments team
- Recurring billing with trials, upgrades, cancellations
- Segments: EdTech, AI SaaS, Creator tools, B2C subscription SaaS

## Project Structure

```
qarta/
├── apps/
│   ├── web/              # Next.js 14 landing page (qarta.eu)
│   ├── api/              # Fastify chargeback deflection API
│   └── dashboard/        # Next.js 14 merchant dashboard
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
| Dashboard | Next.js 14 (App Router) + Tailwind |
| API | Fastify + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Cache/Queues | Redis (+ BullMQ planned) |
| PSP | Stripe (only) |
| Deploy | Vercel (web + dashboard) + Railway (api) |

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

1. **Stripe-first, Stripe-only (v1)**: No multi-PSP. Stripe webhook events + EFW are the signal source. Refunds executed via Stripe Refunds API.

2. **Alert → Policy → Action → Outcome pipeline**: Every Stripe event flows through: ingestion → matching → policy evaluation → action execution → outcome recording.

3. **Policy engine**: Rules defined by merchant: amount thresholds, reason categories, safety caps (max refunds/day, max per-customer). Policies are evaluated in priority order.

4. **Safety rails first**: Auto-refund is powerful but dangerous. Every action has audit logs, daily caps, per-customer limits, and manual escalation fallback.

5. **Outcomes-driven dashboard**: The product IS the dashboard. Merchants see: disputes prevented, ratio trend, fees saved, automation rate — not raw alerts.

6. **Shared types** (`packages/shared/`): Domain types and constants used by both frontend and backend.

## API Endpoints (v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/webhooks/stripe` | Stripe webhook handler (EFW + disputes) |
| GET | `/v1/alerts` | List alerts for merchant |
| GET | `/v1/alerts/:id` | Get alert details |
| POST | `/v1/policies` | Create/update refund policy |
| GET | `/v1/policies` | List active policies |
| DELETE | `/v1/policies/:id` | Delete a policy |
| GET | `/v1/actions` | List refund actions taken |
| GET | `/v1/outcomes` | Dashboard metrics (disputes avoided, ratio, savings) |
| POST | `/v1/alerts/:id/resolve` | Manually resolve an alert |
| GET | `/v1/connect/stripe` | Initiate Stripe OAuth connect |
| GET | `/v1/connect/stripe/callback` | Handle Stripe OAuth callback |

## Database Schema

Core tables: `merchants`, `stripe_connections`, `alerts`, `policies`, `refund_actions`, `audit_log`, `webhook_events`

See `apps/api/src/db/schema.ts` for full Drizzle schema.

## Environment Variables

API requires these env vars (see `apps/api/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `STRIPE_SECRET_KEY` — Stripe platform API key (for OAuth)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_CLIENT_ID` — Stripe OAuth client ID (for Connect)

## Code Conventions

- TypeScript strict mode everywhere
- Zod for runtime validation
- Use `@qarta/shared` types across apps
- API responses follow `ApiResponse<T>` shape
- All amounts in cents (integer) in the database, converted at API boundary
- Every auto-refund action has an audit log entry
- Stripe webhook events are stored raw before processing (idempotency)

## Competitive Positioning

**Competitors:** Chargeflow ($29/deflection), Chargeblast, ChargebackStop, Midigator, OutCharge

**Our wedge:**
- Stripe-only = simpler onboarding (10 min vs days)
- SaaS-focused = understand subscription patterns
- Self-serve = no enterprise sales demo needed
- Transparent pricing = flat fee or hybrid (subscription + per-deflection)
- Outcomes-first dashboard = CFO-credible reporting

## Pricing Strategy

- **Free tier**: First 10 alerts/month (adoption friction killer)
- **Pro**: $199–$399/month + $15–$20 per deflected chargeback
- **Growth**: Volume discounts for 50+ deflections/month
