# Go-live checklist (LineCrew.ai)

Use this before pointing production traffic at **https://linecrew.ai** or enabling paid volume. Treat every box as **blocking** until your team explicitly accepts the risk of skipping it.

**Suggested ownership:** one engineering owner (technical items), one business/legal owner (Stripe, legal, marketing), and a single **go-live date** recorded below.

| Field            | Value |
| ---------------- | ----- |
| Target go-live   |       |
| Engineering lead |       |
| Sign-off         |       |

---

## Stripe (switch to live mode)

- [ ] Replace `STRIPE_SECRET_KEY` with live key (`sk_live_`) in Vercel
- [ ] Replace `STRIPE_PUBLISHABLE_KEY` with live key (`pk_live_`) in Vercel
- [ ] Replace `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with live key in Vercel
- [ ] Create new webhook in Stripe **live** mode dashboard (match your app’s events; point to production URL)
- [ ] Update `STRIPE_WEBHOOK_SECRET` with live webhook signing secret in Vercel
- [ ] Enable Stripe Connect on live account at [dashboard.stripe.com/connect](https://dashboard.stripe.com/connect) (Express/Custom per your integration)
- [ ] Test **$1 real transaction** end to end (create payment → capture/confirm → refund or void as appropriate)
- [ ] Verify payout flow to a **real bank account** (micro-deposit or first payout as applicable)
- [ ] Set up Stripe Radar fraud rules (3DS, risk levels, blocklists as needed)

**Verify:** Live mode toggle in Dashboard shows **Live**; test keys are not present in production env.

---

## Supabase

- [ ] Confirm all RLS policies are **enabled** on user-facing tables (no `USING true` on sensitive data without justification)
- [ ] Enable **point-in-time recovery** (PITR) on the production project if your plan supports it
- [ ] Set up **daily database backups** (Supabase scheduled backups + confirm retention meets compliance needs)
- [ ] Confirm **all migrations** applied to production (`supabase db push` / migration history matches repo)
- [ ] Review and restrict any **overly permissive** policies (broad `SELECT`/`UPDATE`, service role usage documented)

**Verify:** Run through Supabase **Security Advisor** (or SQL policy audit) on production.

---

## Domain & SSL

- [ ] **linecrew.ai** DNS pointing to Vercel production (A/ALIAS/CNAME per Vercel docs)
- [ ] **SSL certificate** active in Vercel and **auto-renewing** (HTTPS only)
- [ ] **www.linecrew.ai** redirects to **https://linecrew.ai** (301, single canonical host)
- [ ] **Email domain** verified in Resend for production sending (SPF/DKIM aligned with `linecrew.ai`)

**Verify:** SSL Labs scan optional; spot-check mail from production uses verified domain.

---

## Environment variables (Vercel production)

- [ ] `STRIPE_SECRET_KEY` (live)
- [ ] `STRIPE_PUBLISHABLE_KEY` (live)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live)
- [ ] `STRIPE_WEBHOOK_SECRET` (live)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `RESEND_API_KEY` (production key)
- [ ] `NEXT_PUBLIC_APP_URL=https://linecrew.ai`

**Notes:** Redeploy after changing env vars so runtime picks up new values. Confirm **Preview** environments do not use live Stripe keys unless intentional.

---

## Security

- [ ] Admin portal only accessible with **admin email** (or equivalent allowlist / role check server-side)
- [ ] **No secret keys** in client-side code or `NEXT_PUBLIC_*` (except publishable keys meant to be public)
- [ ] All **API routes** that mutate data or expose PII require **authentication** (and authorization where applicable)
- [ ] **Webhook signature verification** active for Stripe (and any other webhooks)
- [ ] **Security headers** configured in `next.config.ts` (e.g. HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame protections as appropriate)

**Verify:** Quick pass with browser devtools + optional securityheaders.com scan on production URL.

---

## End-to-end testing

- [ ] New **customer** signup flow works end to end
- [ ] New **Line Holder** signup flow works end to end
- [ ] Customer can **post a booking** and **pay**
- [ ] Line Holder can **see and accept** the booking
- [ ] **Status updates** work in real time (or acceptable polling latency documented)
- [ ] **QR handoff** flow completes successfully
- [ ] Customer **confirms completion**
- [ ] **Payout** processed to Line Holder (Stripe Connect path)
- [ ] **Issue reporting** works
- [ ] **Email** notifications sent at each critical step
- [ ] **SMS** notifications sent at each critical step

**Tip:** Run at least one full journey on **production** with real money at small amounts before broad launch.

---

## Legal

- [ ] **Terms of Service** reviewed and finalized
- [ ] **Privacy Policy** CCPA compliant (and GDPR if EU users are in scope)
- [ ] **Line Holder Agreement** reviewed by attorney
- [ ] **Cancellation/refund policy** visible at checkout and linked from booking flows
- [ ] **Cookie consent** banner if needed for EU users (and analytics configured accordingly)

---

## Marketing & analytics

- [ ] **Google Analytics** or **Vercel Analytics** enabled (and privacy policy updated if required)
- [ ] **Meta tags** on all public pages
- [ ] **OG image** for social sharing (`/og-image.png` and metadata in app)
- [ ] **Sitemap** accessible at [https://linecrew.ai/sitemap.xml](https://linecrew.ai/sitemap.xml)
- [ ] **robots.txt** configured correctly
- [ ] **Google Search Console** set up (property for `linecrew.ai`, sitemap submitted)

---

## Monitoring

- [ ] **Vercel deployment** notifications enabled (Slack/email on failure)
- [ ] **Stripe webhook** monitoring active (Dashboard → Webhooks → success rates; alerts on spikes)
- [ ] **Error alerting** configured (Sentry, Vercel Observability, or equivalent)
- [ ] **Uptime monitoring** set up (UptimeRobot, Better Stack, or similar) for `https://linecrew.ai` and critical API paths

---

## Post-launch (first 48 hours)

Optional but recommended:

- [ ] On-call or primary owner available for payment and auth incidents
- [ ] Rollback plan documented (previous Vercel deployment + env snapshot)
- [ ] Support channel (email/in-app) monitored for user-reported failures

---

*Last updated: align this document with repo and infrastructure changes at each major release.*
