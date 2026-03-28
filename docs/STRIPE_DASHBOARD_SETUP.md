# Stripe dashboard setup for LineCrew

Follow these steps in the [Stripe Dashboard](https://dashboard.stripe.com/) (use **Test mode** until you go live).

## 1. API keys

1. Open **Developers → API keys**.
2. Copy **Secret key** → set `STRIPE_SECRET_KEY` in `.env.local`.
3. Copy **Publishable key** → set both `STRIPE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (same value; the `NEXT_PUBLIC_` name is for any future client-side Stripe.js usage).

## 2. Connect (Express accounts for waiters)

1. Open **Connect → Settings** (or **Settings → Connect**).
2. Complete **Connect** onboarding for your platform (business details, branding, etc.).
3. Under **Connect → Settings**, choose **Express** accounts (LineCrew creates Express connected accounts in code).
4. Add your **Redirect / refresh URIs** if Stripe asks for allowed URLs:
   - Local: `http://localhost:3000/dashboard/waiter`
   - Production: `https://your-domain.com/dashboard/waiter`

## 3. Webhook endpoint

1. Open **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL**:  
   - Local testing: use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events (`stripe listen --forward-to localhost:3000/api/stripe/webhook`) and paste the **webhook signing secret** the CLI prints into `STRIPE_WEBHOOK_SECRET`.  
   - Production: `https://your-domain.com/api/stripe/webhook`
3. **Events to send**, add at least:
   - `payment_intent.succeeded`
   - `account.updated`
4. After creating the endpoint, open it and copy **Signing secret** → set `STRIPE_WEBHOOK_SECRET` in `.env.local` (use the CLI secret for local dev, the dashboard secret for production).

### Connect-related webhooks

If `account.updated` does not fire for connected accounts, edit the webhook endpoint and enable **Connect** so events can be sent for connected accounts (options vary by Stripe version; look for “Listen to events on Connected accounts” or include Connect events in the endpoint).

## 4. Application URL (local)

In `.env.local`, set:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`  
  so Stripe Checkout success/cancel and Connect return URLs resolve correctly.

For production, set `NEXT_PUBLIC_APP_URL` to your public `https://` origin.

## 5. Supabase service role

The webhook inserts jobs using the Supabase **service role** key (bypasses RLS). In Supabase: **Project Settings → API → service_role** (secret). Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Never expose this key to the browser or commit it.

## 6. Database

Run `supabase/stripe-migration.sql` in the Supabase SQL Editor (adds `profiles.stripe_account_id`, `jobs.stripe_payment_intent_id`, `jobs.payout_transfer_id`, and removes the old customer insert policy).

## 7. Going live

1. Switch Stripe to **Live mode**, create live API keys and a live webhook endpoint.
2. Replace test keys and webhook secret in production environment variables.
3. Complete Connect platform verification if Stripe requires it for live payouts.

## 8. Payout testing

- Use [test cards](https://stripe.com/docs/testing#cards) for Checkout.
- Create a **test** connected account via waiter **Set up payouts**; use [test bank account numbers](https://stripe.com/docs/connect/testing#account-numbers) in Connect onboarding.
- Confirm **Transfers** appear under **Connect → Payments** (or **Balances**) after marking a job complete.
