# Payment stack prerequisites (LineCrew)

Complete these **before** relying on webhooks, `payment_status`, refunds, or disputes in production.

## 1. Supabase SQL (order matters)

Run in the Supabase SQL Editor (or your migration pipeline) **in this order**:

1. Core `jobs` / profiles as your project already has.
2. `supabase/stripe-migration.sql` (if not already applied) — Stripe columns on `jobs` / `profiles`.
3. `supabase/stripe-connect-status-migration.sql` (if used) — Connect flags on `profiles`.
4. **`supabase/payment-phase1-migration.sql`** — `processed_stripe_events`, `jobs.payment_status`, `stripe_checkout_session_id`, `stripe_charge_id`.
5. **`supabase/payment-phase1-5-migration.sql`** — `jobs.stripe_dispute_id`.

Until steps 4–5 are applied, app inserts/updates that reference those columns will fail.

## 2. Environment variables (server)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | API calls (Checkout, refunds, webhooks retrieve, etc.) |
| `STRIPE_WEBHOOK_SECRET` | Verify `POST /api/stripe/webhook` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks and service inserts bypass RLS |

Local: `.env.local`. Production: Vercel (or host) project env.

## 3. Stripe Dashboard — webhook endpoint

Point your endpoint to:

`https://<your-domain>/api/stripe/webhook`

Subscribe at least to:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `account.updated` (Connect)
- `charge.dispute.created`
- **`charge.refunded`** (reconciles `payment_status` when refunds occur outside the app)

Use the **same** signing secret as `STRIPE_WEBHOOK_SECRET` (per endpoint or CLI secret).

## 4. Verify locally

From the repo root:

```bash
npm run verify:payment-prerequisites
```

This checks required env vars are set (it does not run SQL). The same check runs as part of **`npm run test:web:full`** (after lint and `tsc`, before `build`). CI must supply the same secrets or that step will fail.

## 5. Smoke test after deploy

1. Complete a test Checkout → job row exists with `payment_status = captured` (after migration).
2. Cancel booking (customer) → `payment_status = refunded`.
3. In Stripe Dashboard, resend a webhook → duplicate should return `{ duplicate: true }` without double-inserting jobs.
