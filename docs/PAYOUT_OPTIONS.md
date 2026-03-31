# Line Holder payouts (banking) — operations guide

## Supported path: Stripe Connect (Express)

LineCrew pays Line Holders via **Stripe Connect** transfers to a **bank account** (or eligible debit path) collected in **Stripe’s hosted flow**. The app does **not** store bank account or routing numbers; Stripe does.

### Fix “can’t update banking” / stuck onboarding

1. **Vercel / server env**
   - `STRIPE_SECRET_KEY` (secret key, test or live to match Stripe Dashboard mode)
   - `SUPABASE_SERVICE_ROLE_KEY` (so Connect flags and `stripe_account_id` save reliably)
   - `NEXT_PUBLIC_APP_URL` = your production URL (Stripe return/refresh URLs)

2. **Supabase SQL** (run in SQL Editor if not already applied)
   - `supabase/stripe-migration.sql` — `profiles.stripe_account_id`
   - `supabase/stripe-connect-status-migration.sql` — `stripe_details_submitted`, `stripe_payouts_enabled`

3. **Stripe Dashboard**
   - **Connect** enabled for your platform
   - **Webhooks**: `account.updated` (and payment/job events as already configured)

4. **In the app**
   - Line Holder → **Payouts** / **Set up payouts** (or **Continue payout setup** / **Update bank details** after the UI labels).
   - First-time or incomplete: Stripe opens **onboarding** (`account_onboarding`).
   - Already fully onboarded: Stripe opens **bank / profile update** (`account_update`).

5. **After returning** from Stripe, reload **Profile** or **Waiter dashboard** so flags sync (`?connect=return` triggers refresh).

---

## PayPal, Zelle, Cash App — not implemented

| Method | Why it is not a drop-in “download” |
|--------|-------------------------------------|
| **Zelle** | No public API for marketplaces to send arbitrary payouts to arbitrary users; bank-led. |
| **Cash App** | Business payout APIs are limited and not equivalent to Stripe Connect for this product. |
| **PayPal** | Possible via **PayPal Payouts** / Hyperwallet-class integrations, but it is a **separate** product: OAuth, compliance, reconciliation, and app changes — not an npm package swap. |

**Recommendation:** Keep **Stripe Connect** as the single automated rail. If you later add PayPal, plan a dedicated epic (legal, accounting, engineering).

---

## Production checklist

- [ ] Env vars on Vercel (Stripe + Supabase + `NEXT_PUBLIC_APP_URL`)
- [ ] Supabase migrations applied
- [ ] Stripe Connect + webhooks live
- [ ] Deploy app; test Line Holder payout button end-to-end in **test mode** before going live
