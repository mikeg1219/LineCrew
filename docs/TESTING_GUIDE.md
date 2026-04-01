# LineCrew – Web & Payments Testing Guide

Last updated: 2026-04-01  
Environment: Vercel (production alias), Stripe **test mode**

---

## 1. Roles and registration

### Travelers (customers)

1. Go to your web app (Vercel alias), e.g. `https://line-crew-sigma.vercel.app`.
2. Click **“Book a Line Holder”** at the top of the page.
3. Create an account with your email and password.
4. Open your email and click the **verification link**.
5. After verifying, go to **Dashboard → Customer** and:
   - Add your name and contact details.
   - Confirm your profile is complete.
6. From the customer dashboard, post a **new booking** and complete checkout.

### Line Holders (LineWaiters)

1. Go to your web app (Vercel alias), e.g. `https://line-crew-sigma.vercel.app`.
2. Click **“Become a Line Holder”** at the top of the page.
3. Create an account and verify your email.
4. Go to **Dashboard → Line Holder** and finish onboarding:
   - Upload a photo.
   - Add a short bio.
   - Select at least one airport you serve.
5. When Stripe Connect is ready, complete payout setup.  
   Until then, you can test with the **payout bypass** flag in development.
6. Browse jobs, accept a booking, and follow the on-screen status steps.

---

## 2. Stripe configuration for wallets and Link

All real payments are processed through **Stripe**. Apple Pay, Google Pay, and Link are enabled in the **Stripe Dashboard**, not by changing server code.

### Required Stripe settings (test mode)

1. Log into Stripe and switch to **Test mode**.
2. Go to **Settings → Payment methods**.
3. Under **Wallets**, enable:
   - **Apple Pay**
   - **Google Pay**
4. Under **Link**, enable:
   - **Link by Stripe**
5. If prompted, verify your domain (your Vercel URL), for example:
   - `https://line-crew-sigma.vercel.app`

Once enabled, these options are available automatically on Stripe Checkout:

- **Apple Pay** on Safari / iOS / macOS with Wallet cards.
- **Google Pay** on Chrome / Android.
- **Link** on supported browsers with a Link account.

No additional backend code changes are required beyond this configuration.

---

## 3. Payment method tagging in the app

The application uses a unified **payment method code** to describe how each booking intends to pay. This is stored:

- In Stripe metadata (`payment_method_code`).
- Alongside job/booking data in your database.

Supported codes:

- `stripe_card` – Card on file (Stripe).
- `stripe_apple_pay` – Apple Pay (via Stripe).
- `stripe_google_pay` – Google Pay (via Stripe).
- `stripe_link` – Link (Stripe saved payment).
- `stripe_wallet_qr` – QR code to a Stripe‑hosted page (future use).
- `external_paypal` – PayPal (manual / future integration).
- `external_cash_app` – Cash App (manual / future integration).
- `external_zelle` – Zelle (manual / future integration).
- `external_other` – Other manual payment method.

In the **customer post‑job form**:

- A test‑only dropdown appears under **Review & pay** (non‑production builds):
  - Label: **“Payment method (test planning)”**.
  - Selecting a value sets `payment_method_code` for that booking’s payment.
  - All selections still use **Stripe test Checkout** for the actual charge.

---

## 4. End‑to‑end checkout testing

### A. Card / Apple Pay / Google Pay / Link

1. Sign in as a **customer** and go to **Dashboard → Customer → Post job**.
2. Fill out the booking form (airport, line type, price, etc.).
3. (In test builds) choose a payment method in **Payment method (test planning)**:
   - `stripe_card`
   - `stripe_apple_pay`
   - `stripe_google_pay`
   - `stripe_link`
4. Click **Continue to checkout**.
5. On Stripe Checkout:
   - Use a **test card** for `stripe_card` and Link.
   - Use Apple Pay or Google Pay on compatible devices if enabled in Stripe.
6. After successful payment, confirm:
   - You are redirected back to the app.
   - A new job appears under customer and Line Holder dashboards.

### B. Simulated PayPal / Cash App / Zelle / Other

1. Repeat the flow above, but in the payment method dropdown choose:
   - `external_paypal`
   - `external_cash_app`
   - `external_zelle`
   - `external_other`
2. Stripe Checkout still processes the payment in **test mode**, but:
   - The booking is tagged with your selected `payment_method_code`.
   - This lets you validate how flows and reporting behave before real API integrations.

---

## 5. Troubleshooting checklist

### Wallets don’t appear on Stripe Checkout

- **Apple Pay**
  - Test on Safari (macOS/iOS) with at least one card in Apple Wallet.
  - Verify Apple Pay is enabled in Stripe and domain verification is complete.
- **Google Pay**
  - Test on Chrome (Android).
  - Confirm Google Pay is enabled in Stripe.
- **Link**
  - Ensure Link is enabled in Stripe Payment methods.
  - Use a supported email address and follow Stripe’s Link test instructions.

### Checkout errors before redirect

- Ensure `STRIPE_SECRET_KEY` is set in Vercel for Production.
- Check the error message shown under the **Review & pay** section:
  - Price too low.
  - Over‑time rate invalid.
  - Missing required form fields.

### Payment succeeded but job not created

1. Confirm the PaymentIntent in Stripe is **succeeded**.
2. Check Stripe metadata for:
   - `customer_id`, `airport`, `terminal`, `line_type`, `estimated_wait`.
3. Verify Supabase service role is configured in Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY` should be present.
4. The `/api/confirm-checkout` route:
   - Reads Checkout `session_id`.
   - Retrieves the PaymentIntent.
   - Inserts a row into `jobs` (using the service role client).

If the route returns errors, they will appear as JSON with a message and error code.

---

## 6. Line Holder payout bypass for testing

To allow Line Holders to accept bookings before Stripe Connect is fully configured, there is a **test‑only payout bypass**:

- Env var: `NEXT_PUBLIC_ALLOW_TEST_PAYOUT_BYPASS`
  - When set to `true`, payout checks are treated as **passing**.
  - Acceptance gating still enforces:
    - Email verification.
    - Profile completeness.
    - Airports and onboarding.

Use this only in test environments. Before real launch:

1. Disable the bypass (remove the variable or set it to `false`).
2. Enable and test Stripe Connect payouts end‑to‑end.

---

## 7. Debug: profile save API (curl-friendly)

For the same server path as **Profile → Save changes**, you can call a small debug route (no UI):

- **Route:** `GET` / `POST` **`/api/dev/profile-save`**
- **Enabled when** `NODE_ENV=development` **or** `LINECREW_PROFILE_SAVE_DEBUG=1` (e.g. a Vercel preview). Otherwise the route returns **404**.
- **Auth:** pass your **Supabase session cookies** (same browser session as the app).

### Quick check

1. `GET http://localhost:3000/api/dev/profile-save` — returns a **curl** example and env note.
2. While signed in, copy the **`Cookie`** header from DevTools (or use **Copy as cURL** on any app request and swap the URL/method).
3. `POST` with `Content-Type: application/json` and body `{}` (optional JSON overrides any `saveProfileSettingsAction` field).

Success looks like **`{"ok":true}`** with HTTP **200**. Failures return **`ok:false`** (e.g. phone validation) and a non‑200 status when appropriate.

Do **not** set `LINECREW_PROFILE_SAVE_DEBUG` on public production unless you accept that authenticated users could hit this endpoint.

---

## 8. Summary

- **Single payment rail**: All real payments in test mode are handled by Stripe (cards, Apple Pay, Google Pay, Link).
- **Method tagging**: The booking system records intended payment methods (including PayPal, Cash App, and Zelle) via `payment_method_code`.
- **Web‑first flows**: Both travelers and Line Holders can fully onboard and exercise the product via the web app before any mobile app launch.

