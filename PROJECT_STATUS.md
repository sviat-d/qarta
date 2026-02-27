# Qarta — Project Status Assessment

**Date:** 2026-02-27
**Goal:** Assess readiness to assemble into a working end-to-end product

---

## TL;DR

The project has solid **architecture and scaffolding** (~40% done), but the pieces are **not connected into a working pipeline**. The DB schema is production-grade, the policy engine works, the refund executor is ready, the dashboard UI looks great — but nothing talks to anything. The webhook handler drops parsed data on the floor, routes return stubs, dashboard runs on mock data, and there's no auth.

**To get a working MVP: ~5-7 days of focused work.**

---

## Component Status Map

```
                    ┌────────────────────────────────┐
                    │       LANDING PAGE (web)        │
                    │  ████████████████████  100%     │
                    │  Hero, FAQ, Calculator, CTA,    │
                    │  Waitlist form — all done        │
                    └────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │                        API (Fastify)                        │
   │                                                             │
   │  DB Schema         ████████████████████  100%  ✅           │
   │  Policy Engine     ████████████████████  100%  ✅           │
   │  Alert Parser      ████████████████████  100%  ✅           │
   │  Refund Executor   ████████████████████  100%  ✅           │
   │  Stripe Helpers    ████████████████████  100%  ✅           │
   │  Server Setup      ██████████████████░░   90%  ✅           │
   │  ─────────────────────────────────────────────              │
   │  Webhook Handler   ██████░░░░░░░░░░░░░░   30%  ⚠️  KEY    │
   │  Auth Middleware    ████████░░░░░░░░░░░░   40%  ⚠️         │
   │  Alert Routes      ████░░░░░░░░░░░░░░░░   20%  ⚠️         │
   │  Policy Routes     ████████░░░░░░░░░░░░   40%  ⚠️         │
   │  Outcomes Routes   ██░░░░░░░░░░░░░░░░░░   10%  ⚠️         │
   │  Stripe OAuth      ░░░░░░░░░░░░░░░░░░░░    0%  ❌         │
   │  DB Migrations     ░░░░░░░░░░░░░░░░░░░░    0%  ❌         │
   │  Tests             ░░░░░░░░░░░░░░░░░░░░    0%  ❌         │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │                    DASHBOARD (Next.js)                      │
   │                                                             │
   │  Overview Page     ████████████████████  100%  ✅ (mock)    │
   │  Alerts Page       ████████████████████  100%  ✅ (mock)    │
   │  Alert Detail      ████████████████████  100%  ✅ (mock)    │
   │  Policies Page     ██████████████░░░░░░   65%  ⚠️ (mock)   │
   │  Settings Page     ████████████████████  100%  ✅ (mock)    │
   │  Sidebar/Layout    ████████████████████  100%  ✅           │
   │  ─────────────────────────────────────────────              │
   │  API Integration   ░░░░░░░░░░░░░░░░░░░░    0%  ❌          │
   │  Auth Flow         ██░░░░░░░░░░░░░░░░░░   10%  ❌          │
   │  Policy CRUD UI    ░░░░░░░░░░░░░░░░░░░░    0%  ❌          │
   │  Real Actions      ░░░░░░░░░░░░░░░░░░░░    0%  ❌          │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │                    SHARED PACKAGES                          │
   │                                                             │
   │  @qarta/shared     ████████████████████  100%  ✅           │
   │    Types (221 lines), Constants (110 lines)                 │
   │  @qarta/ui         ████████░░░░░░░░░░░░   40%  ⚠️          │
   │    Button, Input, utils only                                │
   │  @qarta/config     ████████████████████  100%  ✅           │
   │  Turborepo         ████████████████████  100%  ✅           │
   │  Docker Compose    ████████████████████  100%  ✅           │
   └─────────────────────────────────────────────────────────────┘
```

---

## What's Really Good

1. **DB schema** (`apps/api/src/db/schema.ts`) — 241 lines, all 7 tables with proper FKs, indexes, enums. Production-ready.

2. **Domain types** (`packages/shared/src/types/index.ts`) — 221 lines of well-structured types: Alert, Policy, Merchant, RefundAction, ApiResponse<T>, etc. Both frontend and backend use them.

3. **Policy engine** (`apps/api/src/services/policy-engine.ts`) — 111 lines. Complete condition matching with priority ordering and operators (eq, lt, gt, in, etc.). Ready to evaluate alerts.

4. **Refund executor** (`apps/api/src/services/refund-executor.ts`) — 52 lines. Calls Stripe Refunds API, handles errors, returns result. Complete but not called from anywhere.

5. **Dashboard UI** — All major screens exist with filtering, pagination, detail panels, charts. Looks production-quality. Running on mock data.

6. **Landing page** — Complete with hero, problems, solution, how-it-works, calculator, FAQ, CTA, waitlist form.

7. **Infra** — Turborepo, docker-compose (Postgres + Redis), shared configs all wired correctly.

---

## The Critical Gap: Nothing Is Connected

The **single biggest problem** is that individual components exist but the data pipeline doesn't flow end-to-end:

```
Stripe Webhook ──→ Parse Event ──→ Create Alert ──→ Evaluate Policy ──→ Execute Refund
     ✅                ✅              ❌               ❌                  ❌
  (received)       (parsed)       (not saved)      (not called)       (not called)

Dashboard ←── API Routes ←── Database ←── Webhook Pipeline
   ✅(mock)    ❌(stubs)    ❌(no migrations)    ❌(broken pipe)
```

Specifically in `apps/api/src/routes/webhooks.ts`:
- Line 11: `TODO: Verify Stripe webhook signature` — SECURITY CRITICAL
- Line 34: `TODO: Check idempotency` — No dedup
- Line 35: `TODO: Store raw event` — Events lost
- Line 47: Hardcoded `0, "USD"` instead of charge lookup
- Lines 58-61: `TODO: Create alert in DB`, `TODO: Run policy engine`, `TODO: Execute action`

**The entire alert → policy → refund pipeline is TODOs.**

---

## Recommended Next Steps (in priority order)

### Phase 1: Wire the Core Pipeline (3 days)

This is the minimum to make Qarta actually deflect a chargeback.

**1.1 Run DB migrations** (30 min)
- `npm run db:generate && npm run db:migrate`
- Verify all 7 tables created

**1.2 Complete the webhook handler** (`apps/api/src/routes/webhooks.ts`) (1 day)
- Implement Stripe signature verification (security-critical)
- Store raw webhook event in `webhook_events` (idempotency)
- Look up charge details via Stripe API (amount, currency, customer)
- Create alert record in `alerts` table
- Call policy engine `evaluateAlert()`
- Execute action: call refund executor or escalate
- Create audit log entry
- **This is THE critical path item**

**1.3 Wire auth middleware** (`apps/api/src/middleware/auth.ts`) (0.5 day)
- Implement merchant lookup by API key hash
- Attach merchant to request context
- Hook into all `/v1/*` routes (except webhooks)

**1.4 Implement route business logic** (1.5 days)
- `GET /v1/alerts` — Query alerts table with filters, pagination
- `GET /v1/alerts/:id` — Single alert with related actions
- `POST /v1/alerts/:id/resolve` — Manual refund/dismiss with safety check
- `POST /v1/policies` — Insert policy to DB
- `GET /v1/policies` — List merchant policies
- `DELETE /v1/policies/:id` — Soft delete
- `GET /v1/outcomes` — Aggregation query (disputes avoided, rate, fees saved)

### Phase 2: Connect Dashboard to API (2 days)

**2.1 API client layer** (0.5 day)
- Create `apps/dashboard/src/lib/api.ts` with typed fetch functions
- Environment variable for API base URL
- Error handling wrapper

**2.2 Auth flow** (0.5 day)
- Connect login page to real auth endpoint
- Session/token management
- Protected route middleware in Next.js

**2.3 Replace mock data** (1 day)
- Overview page → `GET /v1/outcomes`
- Alerts page → `GET /v1/alerts`
- Policies page → `GET /v1/policies`
- Settings page → merchant config endpoint
- Wire action buttons (refund, dismiss, create policy)

### Phase 3: Stripe Connect OAuth (1 day)

- `GET /v1/connect/stripe` — Redirect to Stripe OAuth
- `GET /v1/connect/stripe/callback` — Store tokens in `stripe_connections`
- Dashboard settings Stripe tab → real connection status

### Phase 4: Safety & Quality (1 day)

- Safety rails enforcement (max refunds/day, per-customer, amount cap)
- Error handling & logging throughout
- Basic test suite (policy engine, webhook parsing, refund executor)
- Input validation on all routes

---

## What NOT to Build Yet

- Ethoca/Verifi integration (Phase 2+)
- Slack/email notifications (nice-to-have, not MVP)
- Subscription retry logic (Phase 2+)
- Risk scoring (Phase 2+)
- Multi-PSP support (stay Stripe-only)
- Real-time WebSocket updates (polling is fine for v1)

---

## Summary

| Area | Status | What's Needed |
|------|--------|---------------|
| **Landing** | Done | Nothing |
| **Shared Types** | Done | Nothing |
| **DB Schema** | Done | Run migrations |
| **Policy Engine** | Done | Nothing (just call it) |
| **Refund Executor** | Done | Nothing (just call it) |
| **Webhook Pipeline** | 30% | Complete the TODOs — this is THE blocker |
| **API Routes** | 20% | Implement real DB queries + auth |
| **Dashboard UI** | 90% | Add policy create/edit modal |
| **Dashboard ↔ API** | 0% | Build API client, replace mock data |
| **Auth** | 10% | End-to-end auth flow |
| **Stripe OAuth** | 0% | Full implementation needed |
| **Tests** | 0% | At minimum: policy engine + webhook handler |

**Bottom line:** The building blocks are solid. The priority is connecting them into a working pipeline, starting with the webhook handler → policy engine → refund executor chain. That's the product.
