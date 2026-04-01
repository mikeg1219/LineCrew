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

### Before Stripe opens (each payout button click)

On **Set up payouts** / **Continue payout setup**, the server action **`startStripeConnectOnboardingAction`** (`app/dashboard/waiter/connect/actions.ts`) first runs **`syncStripeConnectFromStripeForUser`**: Stripe **`accounts.retrieve`** → updates **`profiles.stripe_details_submitted`** and **`stripe_payouts_enabled`**. Then it creates the **Account Link** using **`account_onboarding`** if **`stripe_details_submitted`** is not yet true, or **`account_update`** once details are submitted (so onboarding is not requested via `account_update` too early).

5. **After returning** from Stripe, the app lands on a URL with a **`connect`** query param. You do **not** need to manually reload if that URL is one of the supported routes below.

### `?connect=return` and `?connect=refresh`

Stripe **Account Links** use `return_url` and `refresh_url` that append this query string. The app treats **`connect=return`** and **`connect=refresh`** the same for syncing: it **forces a Stripe → `profiles` sync** (`stripe_details_submitted`, `stripe_payouts_enabled`) when the page loads.

| Route | Behavior |
|--------|----------|
| `/dashboard/profile?connect=return` (or `refresh`) | Same as **`/profile`** — client runs **`refreshStripeConnectStatusAction`** on load. If sync fails, a **red in-page alert** appears; use **Refresh Stripe status now** in Payouts or fix env/DB (see above). |
| `/profile?connect=return` (or `refresh`) | Same profile UI and sync as **`/dashboard/profile`**. |
| `/dashboard/waiter?connect=return` (or `refresh`) | Server runs **`syncWaiterStripeIfNeeded`** with **`force: true`**. On failure, a **red banner** appears under the page header. |
| `/dashboard/waiter/browse-jobs?connect=return` (or `refresh`) | Same server sync with **`force`** when those query params are present. On failure, a banner with links to **dashboard** and **Profile** appears (this page has no Payouts block). |

**Stripe return URL allowlist (server):** onboarding actions allow **`/dashboard/waiter`**, **`/dashboard/profile`**, or **`/profile`** for `return_url` / `refresh_url`. Other paths fall back to **`/dashboard/waiter`** unless you add them to the allowlist in `app/dashboard/waiter/connect/actions.ts`.

**Operational note:** If flags stay **`null`** after onboarding, check **Vercel logs** for `[stripe-account-sync]`, `[stripe-refresh]`, or `[profile/save]`, and confirm **`SUPABASE_SERVICE_ROLE_KEY`** is set so `stripe_*` columns can update under RLS.

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
