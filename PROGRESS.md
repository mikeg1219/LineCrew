# LineCrew Progress Log

## Phase 4 — Complete (April 2, 2026)

**Status:** Shipped to production — https://linecrew.ai

### Delivered
- **Admin & access:** Admin routes gated; non-admins redirected to dashboard; unauthenticated `/admin` → `/auth`
- **Email notifications:** Transactional flows (booking confirmed, Line Holder assigned, new job to waiters, completion / payout) via unified email layer
- **SMS notifications:** Twilio-backed customer + Line Holder texts on accept, status milestones, new job alerts, and payout completion; failures never block core flows
- **Security hardening:** Supabase RLS migration (`security-hardening-rls-migration.sql`), server-side input validation (UUID, email, positive amounts, bio/description limits), security headers in `next.config.ts`, `server-only` on secret-adjacent modules

### Deployment
- **Commit message:** `Phase 4: Admin security, email notifications, SMS, security hardening`
- **Post-deploy checks (manual):** Sign-in redirects for customer vs Line Holder test accounts; `/admin` when logged out vs non-admin; test booking → confirmation email; accept booking → customer email + SMS (requires Twilio + profiles phone + env)

### Ops note
- Run `supabase/security-hardening-rls-migration.sql` in Supabase when applying DB policy updates to the linked project.

---

## Phase 3 — Complete (April 2, 2026)

**Status:** Shipped to production — https://linecrew.ai

### Delivered
- **Navigation redesign:** Authenticated app shell, mobile bottom navigation, role-aware headers and entry points
- **Visual theme system:** CSS design tokens (`globals.css`), marketing / dashboard / admin zone utilities, shared card patterns
- **Marketing homepage:** Hero (blue→teal gradient), how it works, category grid, Line Holder earn CTA, global footer
- **Auth:** Sign-in-only page; registration via `/onboarding`; inline errors for invalid credentials and unverified email; redirects for customer, Line Holder, and admin
- **Shared UI:** `AppFooter`, `DashboardPageHeader`, consistent dashboard layout (`max-w-5xl`)

### Deployment
- **Commit message:** `Phase 3: Navigation redesign, visual theme, homepage, auth page`
- **Post-deploy checks (HTTP):** `/` (homepage), `/auth`, `/onboarding`, `/dashboard/customer`, `/dashboard/waiter` — routes respond (dashboard paths may redirect to sign-in when unauthenticated)

---

## April 1, 2026 — Prior session

### Stripe & Payments
- Fixed Stripe webhook signature mismatch (was returning 400, now returns 200)
- Fixed STRIPE_SECRET_KEY in Vercel (was using publishable key as secret)
- Switched from live Stripe keys back to test keys for development
- Updated confirm-checkout/route.ts to create jobs directly without relying solely on webhook
- Fixed webhook URL: /api/stripe/webhook

### Database Migrations (Supabase)
- Added missing columns to profiles table: stripe_details_submitted, stripe_payouts_enabled, stripe_account_id, manual_payout_method, manual_payout_handle, contact_preference, onboarding_completed, independent_contractor_acknowledged_at, tax_responsibility_acknowledged_at, accepted_worker_agreement_version
- Added missing columns to jobs table: payment_status, stripe_checkout_session_id, stripe_charge_id, stripe_dispute_id, payout_transfer_id, handoff columns, booking acknowledgment columns
- Dropped jobs_line_type_check constraint that was blocking inserts

### Line Holder Dashboard
- Manual payout (PayPal) save working correctly
- Payout section redesigned with two clear options: Stripe vs Manual
- Browse jobs page showing open bookings correctly

## Working End-to-End Flow
1. Customer posts booking ✅
2. Stripe payment processes ✅
3. Job appears in Line Holder browse page ✅
4. Line Holder accepts booking ✅
5. 7-step status workflow visible ✅
6. Customer tracking page updates ✅

## Remaining Work
- Stripe Connect Express account setup (for automatic payouts to Line Holders)
- Profile save error fix (if any regressions)
- Ongoing UX polish

## Environment
- Production URL: https://linecrew.ai
- Vercel Project: mikes-projects-65f34962/line-crew
- Supabase Project: iphcvzsgakbsadoekbrj
- Stripe Account: AIM Consulting Service, Inc. (acct_1TFt0xGkwAiSYfqs)
- GitHub: https://github.com/mikeg1219/LineCrew
