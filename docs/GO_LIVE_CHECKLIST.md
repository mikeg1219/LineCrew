# LineCrew – Go‑Live Checklist (Web + Mobile Ready)

Last updated: 2026-03-31

---

## 1. Where we left off

- **Code state**
  - TypeScript and `next build` both pass successfully.
  - Stripe Checkout is wired for bookings (card payments) and Stripe Connect for Line Holder payouts.
  - Wallets (Apple Pay, Google Pay) and Link are structurally supported via Stripe Checkout once enabled in the Stripe Dashboard.
  - Payment methods are **tagged** via `payment_method_code` for:
    - `stripe_card`, `stripe_apple_pay`, `stripe_google_pay`, `stripe_link`, `stripe_wallet_qr`
    - `external_paypal`, `external_cash_app`, `external_zelle`, `external_other`
  - A **test‑only payout bypass** exists:
    - Env var: `NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS`
    - When `true`, payout gating is relaxed so Line Holders can accept bookings without Stripe Connect fully configured.

- **Deployments**
  - Latest commit on `main` is deployed to Vercel production alias
    and used for all current tests.

- **Docs**
  - `docs/TESTING_GUIDE.md` explains current test flows and Stripe wallet setup.
  - Stripe Connect **return URLs** (`?connect=return` / `?connect=refresh`), forced profile sync, and error banners: [`docs/PAYOUT_OPTIONS.md`](PAYOUT_OPTIONS.md) — open the section **“`?connect=return` and `?connect=refresh`”**.

---

## 2. Required steps before public launch

### 2.1 Stripe – Connect and payments (TEST mode first)

1. **Enable Stripe Connect for the platform account**
   - Log into the Stripe account used by `STRIPE_SECRET_KEY`.
   - Open `https://dashboard.stripe.com/connect`.
   - Complete platform onboarding until Connect is enabled.

2. **Wallets and Link**
   - In Stripe Dashboard → **Settings → Payment methods** (TEST mode):
   - Turn on:
     - Apple Pay
     - Google Pay
     - Link
   - Verify your Vercel URL as a domain if Stripe requests it.

3. **Test full booking + payout in TEST mode**
   - As a customer:
     - Post a booking, pay with card / Apple Pay / Google Pay / Link using Stripe test details.
   - As a Line Holder:
     - Accept the booking.
     - Complete the flow to the point where payouts can be triggered (even if payouts are test‑only).

### 2.2 Stripe – Switch to LIVE mode

4. **Create LIVE keys**
   - In Stripe Dashboard, switch to **Live mode**.
   - Create and copy:
     - `sk_live_...` (secret key)
     - `pk_live_...` (publishable key)

5. **Enable Connect + wallets in LIVE mode**
   - Repeat Connect setup and payment method enabling **in Live mode**.

6. **Configure Vercel environment (Production)**
   - Set the following for Production:
     - `STRIPE_SECRET_KEY = sk_live_...`
     - `STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_WEBHOOK_SECRET` (from live webhook endpoint)
   - Keep Supabase env vars:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Set `NEXT_PUBLIC_APP_URL` to your public URL (custom domain when ready).

7. **Run a LIVE mode “penny test”**
   - Use a very small charge in Live mode to confirm:
     - Checkout works.
     - Jobs are created.
     - Payouts can be simulated (even if you do not transfer real funds yet).

---

## 3. Supabase and database checks

8. **Apply all required migrations**
   - In Supabase SQL Editor, run:
     - `supabase/stripe-migration.sql` (if not already applied)
     - `supabase/stripe-connect-status-migration.sql`
   - Confirm columns exist on `profiles`:
     - `stripe_account_id`
     - `stripe_details_submitted`
     - `stripe_payouts_enabled`
   - After Stripe onboarding, **return URLs** (`?connect=return` / `?connect=refresh`), forced sync, and in-app banners: [`docs/PAYOUT_OPTIONS.md`](PAYOUT_OPTIONS.md) — section **“`?connect=return` and `?connect=refresh`”**.

9. **Confirm jobs table inserts**
   - After a test payment, verify a row is created in `jobs` with:
     - `stripe_payment_intent_id`
     - `offered_price`, `overage_rate`, `estimated_wait`
     - `payment_method_code` in metadata (from Stripe or mirrored in DB if added later).

---

## 4. Feature flags and safety switches

10. **Disable payout bypass for production**
    - `NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS` should be **removed** or set to `false` before real launch.
    - Verify that Line Holders **must** complete Connect payouts to accept new bookings.

11. **Confirm auth flows**
    - New users can:
      - Register via `/auth` (customer or Line Holder intent).
      - Verify email successfully.
      - Reach the correct dashboard (customer vs Line Holder).

---

## 5. UX and copy review

12. **Landing page instructions**
    - Home page (`/`) “Getting started on the web” section:
      - Verify the directions for customers and Line Holders match the current flows.
      - Adjust wording if any button labels or route names change.

13. **Dashboard messaging**
    - Check that Line Holder dashboard clearly explains:
      - What is required to accept bookings (profile, airports, payouts).
      - Any remaining test‑mode caveats (only in staging, not in real production).

---

## 6. Pre‑launch verification checklist

Run this sequence on the final staging/production environment before announcing the product:

1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run deploy:prod` (or deploy via Vercel UI)
4. Manual tests:
   - Customer signup + email verification.
   - Line Holder signup + email verification.
   - Customer posts a booking and pays (card + one wallet method).
   - Line Holder completes onboarding and accepts a booking.
   - Booking completes; any payouts logic runs without error.
5. Check Stripe Dashboard:
   - Charges and (if enabled) transfers/Connect payouts look correct.
6. Check Supabase:
   - New job row exists with correct fields and metadata.

When all the above are green in **Live mode** and payout bypass is off, the application is ready for public launch and for Android/iOS clients to be built on top of the existing API and flows.

