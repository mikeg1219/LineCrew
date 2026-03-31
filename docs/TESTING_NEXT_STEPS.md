# LineCrew Testing Next Steps

This guide keeps testing focused while the project has active web + mobile updates.

## Testing lanes (recommended)

## Lane 1: Web stabilization (primary)
- Goal: Checkout, job creation, dashboard, and payout gating are consistent.
- Run first every cycle:
  1. `npm run test:web:quick`
  2. Manual booking flow on `https://line-crew-sigma.vercel.app`

## Lane 2: Mobile shell validation (secondary)
- Goal: Verify the same web flows run correctly inside Android/iOS app shells.
- Run only after Lane 1 is green:
  1. `npm run test:mobile:android:quick`
  2. `npm run mobile:android:open`

---

## Daily test cycle (15-20 minutes)

1. Automated quick checks
   - `npm run test:web:quick`
2. Customer flow
   - Login as customer
   - Post booking
   - Select payment method tag
   - Continue to Stripe checkout
3. Line Holder flow
   - Login as Line Holder
   - Browse and accept booking
   - Verify setup gating behavior is expected
4. Regression spot-check
   - Profile page loads
   - Waiter dashboard loads
   - No generic server error page

---

## Payment-method test matrix

For each method below, run a new booking and capture result:
- `stripe_card`
- `stripe_apple_pay`
- `stripe_google_pay`
- `stripe_link` (when Link is enabled)
- `external_paypal`
- `external_cash_app`
- `external_zelle`

Record:
- Browser/device
- Method selected in app
- Method(s) displayed by Stripe Checkout
- Payment success/failure
- Job row created (`yes/no`)

Note: Stripe may filter methods by device, account config, country, and mode.

---

## Troubleshooting quick answers

- **Continue to checkout appears to do nothing**
  - Refresh and retry; check inline form error text.
  - Confirm required fields in post-job form are filled.
- **Apple Pay not showing**
  - Test on Safari/iOS/macOS with Wallet configured.
- **Google Pay not showing**
  - Test on Android Chrome with eligible account.
- **Link OTP test step appears**
  - Set `STRIPE_CHECKOUT_DISABLE_LINK=true` and redeploy.
- **Build fails with `.next` EPERM on Windows**
  - `cmd /c rmdir /s /q .next` then rerun build.

---

## Before go-live hardening

1. Disable test-only flags:
   - `NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS=false` (or remove)
   - `NEXT_PUBLIC_SHOW_PAYMENT_METHOD_SELECTOR=false` (or remove)
2. Verify Stripe live keys and Connect in live mode.
3. Run:
   - `npm run test:web:full`
4. Execute full manual checklist in `docs/GO_LIVE_CHECKLIST.md`.
