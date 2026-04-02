# LineCrew UX Audit

Date: April 2, 2026  
Scope: `app/` routes + `components/` and app-local UI modules

## 1) Page Inventory

| Route | Page title (inferred) | Role | Current state / actions | Known bugs or issues | Components used |
|---|---|---|---|---|---|
| `/` | LineCrew Home | public | Marketing hero, categories, how-it-works, CTAs for booking or becoming line holder | Marketing copy can feel inconsistent with upfront checkout flow | `HomeHeaderNav` |
| `/auth` | Sign in / Sign up | public | Combined auth screen with intent switch (customer/waiter), legal acknowledgments | High form density, legal friction on first conversion | `AuthForm` |
| `/auth/reset-password` | Reset password | public | Password reset form and return-to-auth link | No major issue observed | `ResetPasswordForm` |
| `/auth/verify-email` | Verify email | public/unverified | Verify token flow + resend/enter-code states | Many query-state branches can confuse failure recovery | `VerifyEmailClient` |
| `/dashboard` | Dashboard router | authenticated | Role-based redirect to customer/waiter dashboards; setup fallback | Profile row timing can show temporary setup fallback | `DashboardFinishingSetup` |
| `/dashboard/customer` | Customer dashboard | customer | Book CTA + booking list + status/track links | No list filters/sorting controls visible | `CustomerDashboard`, `ProfileRequiredForBookingsGate`, `DashboardFinishingSetup` |
| `/dashboard/customer/post-job` | Post booking | customer | Multi-section booking form, legal links, checkout kickoff | Long mobile form increases drop-off risk | `PostJobForm`, `LegalLinksInline`, `AirportCombobox`, `TerminalSelect` |
| `/dashboard/customer/job-posted/success` | Checkout confirmation | customer | Polls for checkout/job confirmation and redirects | Timeout path is uncertain for users and needs clearer retry options | `JobPostSuccessClient` |
| `/dashboard/customer/job-posted/[jobId]` | Booking posted | customer | Confirmation summary and next-step CTAs | Copy suggests partial matching UX maturity | route-local UI |
| `/dashboard/customer/jobs/[jobId]` | Track booking | customer | Status tracker, line holder card, handoff, completion/dispute actions, timeline | "Report issue" is still disabled/coming soon in action area | `BookingTrackingLive`, `BookingProgressTracker`, `BookingLineHolderCard`, `CustomerHandoffPanel`, `CompletionConfirmationPanel`, `OverageCustomerAlert`, `CustomerBookingExtraActions`, `BookingActivityTimeline`, `BookingContactPanel`, `MobileBookingStickyBar` |
| `/dashboard/waiter` | Waiter dashboard | waiter | Setup checklist, payout setup, active jobs and browse CTA | Heavy onboarding dependencies before first acceptance | `WaiterDashboard`, `LineHolderSetupChecklist`, `WaiterPayoutSetup`, `WaiterStripeSyncErrorBanner`, `ProfileRequiredForBookingsGate` |
| `/dashboard/waiter/browse-jobs` | Browse open bookings | waiter | Open jobs list + accept action and readiness warnings | Users can browse while blocked from accept; can feel broken | `AcceptJobForm`, `WaiterStripeSyncErrorBanner` |
| `/dashboard/waiter/jobs/[jobId]` | Waiter job detail | waiter | Status workflow, customer card, handoff steps, timeline, extra-time request | "Report issue" and some escalation UX still incomplete | `LineHolderStatusPanel`, `ProviderCustomerCard`, `ProviderBookingDetailsCard`, `WaiterHandoffPanel`, `HandoffAuditPanel`, `LineHolderHandoffGuidance`, `RequestExtraTimeForm`, `ProviderExecutionNote`, `ProviderBookingTimeline`, `HandoffSuccessCard`, `MobileBookingStickyBar` |
| `/dashboard/waiter/service-areas` | Service areas | waiter | Airport/service-area selection and save | No major issue observed | `ServiceAreasForm` |
| `/dashboard/waiter/airports` | Airports redirect | waiter | Redirects to service-areas route | Legacy path retained; okay but redundant | redirect only |
| `/dashboard/profile` | Profile settings | authenticated | Alias route to shared profile route view | Duplicate profile entry route may create IA ambiguity | `ProfileRouteView` |
| `/profile` | Profile settings | authenticated | Same profile editing surface as dashboard profile | Duplicate route can fragment navigation expectations | `ProfileRouteView`, `ProfileSettingsForm`, `ProfileCompletionStatus`, `AvatarCropModal` |
| `/legal` | Legal center | public | Link hub for legal/support pages | No major issue observed | `PolicyShell` |
| `/legal/terms` | Terms of Service | public | Terms content | Concise policy may not answer all edge cases | `PolicyShell` |
| `/legal/privacy` | Privacy policy | public | Privacy content | No major issue observed | `PolicyShell` |
| `/legal/cancellation-refunds` | Cancellation & refunds | public | Cancellation/refund rules | No major issue observed | `PolicyShell` |
| `/legal/community-guidelines` | Community guidelines | public | Conduct and platform rules | No major issue observed | `PolicyShell` |
| `/legal/line-holder-agreement` | Line holder agreement | public/waiter | Independent contractor agreement content | Dense legal copy; readability depends on formatting | `PolicyShell` |
| `/legal/contact-support` | Contact & support | public | Contact/support details and channels | No major issue observed | `PolicyShell` |
| `/admin` | Owner dashboard | admin | Ops KPIs, map, fraud review queue, dispute/refund/pay actions | Powerful actions with limited inline guardrails/confirmations | `OwnerOperationsMap`, `OwnerDashboardControls`, `FraudReviewQueueCard`, `FraudReviewActionButton`, `JobActionButtons` |

## 2) User Flows

### A. Public -> signup customer -> first booking -> payment -> posted confirmation
1. User enters `/`.
2. Clicks `Book` or `Sign in` and lands on `/auth` (customer intent).
3. Completes signup/sign-in and verification flow (`/auth/verify-email` if needed).
4. Redirects to `/dashboard/customer`.
5. Starts booking at `/dashboard/customer/post-job`.
6. Submits form and is redirected to Stripe checkout.
7. Returns to `/dashboard/customer/job-posted/success`.
8. Success page confirms session/job and redirects to `/dashboard/customer/job-posted/[jobId]`.
9. User continues to `/dashboard/customer/jobs/[jobId]` for tracking.

### B. Public -> signup Line Holder -> profile -> payout -> browse -> accept
1. User enters `/`.
2. Clicks `Become a Line Holder` and lands on `/auth?intent=waiter`.
3. Completes signup and verification.
4. Lands on `/dashboard/waiter`.
5. Completes setup checklist in profile (`/dashboard/profile`), service areas, onboarding fields.
6. Completes payout setup via `WaiterPayoutSetup` (Stripe/manual state).
7. Opens `/dashboard/waiter/browse-jobs`.
8. Accepts eligible booking via `AcceptJobForm`.

### C. Customer tracking + waiter status + QR handoff + customer completion
1. Customer opens `/dashboard/customer/jobs/[jobId]`.
2. Waiter updates status at `/dashboard/waiter/jobs/[jobId]`.
3. Customer tracking UI updates via live refresh components.
4. Handoff starts with `WaiterHandoffPanel` + `CustomerHandoffPanel`.
5. QR/token verification step uses scanner/manual parse flow.
6. Customer confirms completion in `CompletionConfirmationPanel` (or timer path).

### D. Line Holder completes job -> payout
1. Waiter advances workflow to handoff/completion.
2. Completion confirmation finalizes job lifecycle.
3. Payout state is shown in success/status cards and waiter dashboard payout area.
4. Depending on payout mode, transfer/release state is visible to waiter.

### E. Admin views jobs and disputes
1. Admin enters `/admin` (allowlist + verified email required).
2. Reviews fraud queue and disputed bookings.
3. Uses `JobActionButtons` / fraud actions for refunds, approvals, payouts.
4. Exits after queue cleanup and issue resolution.

## 3) Component Inventory

Note: includes major shared components and route-local app components used by core UX.

### Shared components (`components/`)
- `components/authenticated-app-shell.tsx`  
  - Appears on: dashboard/profile authenticated areas via layouts  
  - State/issues: strong auth/profile gating can feel abrupt during setup lag  
  - Props: `{ children }`
- `components/authenticated-app-header.tsx`  
  - Appears on: authenticated shell header  
  - State/issues: duplicate nav labels to same destination for some roles  
  - Props: `email`, `role`, `avatarUrl`, `displayName`, `breadcrumbCurrent?`
- `components/home-header-nav.tsx`  
  - Appears on: `/`  
  - State/issues: direct `Book` link into authenticated route may bounce unauthenticated users  
  - Props: none (async server component)
- `components/profile-required-for-bookings-gate.tsx`  
  - Appears on: customer/waiter dashboards  
  - State/issues: gating friction but protects booking quality  
  - Props: role/user metadata for completeness gate
- `components/mobile-booking-sticky-bar.tsx`  
  - Appears on: customer/waiter booking detail pages  
  - State/issues: helpful mobile affordance; depends on action clarity  
  - Props: action list + labels
- `components/booking-contact-panel.tsx`  
  - Appears on: booking detail cards  
  - State/issues: constrained contact mode; no rich in-app messaging  
  - Props: `jobId`, `contactTarget`, `eligible`, `ineligibleHint`
- `components/avatar-crop-modal.tsx`  
  - Appears on: profile settings  
  - State/issues: modal UX depends on upload failures  
  - Props: image/crop callbacks
- `components/legal-links.tsx`  
  - Appears on: global footer / legal CTA areas  
  - State/issues: none major  
  - Props: variant/style options
- `components/NavBar.tsx`  
  - Appears on: legacy/limited usage (not primary shell)  
  - State/issues: visual/system mismatch risk if rendered in active paths  
  - Props: route/nav props

### Auth / legal / profile / dashboard route-local components (`app/**`)
- `app/auth/auth-form.tsx` - `/auth`; props: `initialIntent`; issue: high cognitive load on one screen.
- `app/auth/reset-password/reset-password-form.tsx` - `/auth/reset-password`; props: action/form state props.
- `app/auth/verify-email/verify-email-client.tsx` - `/auth/verify-email`; props: query/token derived states.
- `app/legal/policy-shell.tsx` - all `/legal/*`; props: title/content wrapper props.
- `app/profile/profile-route-view.tsx` - `/profile`, `/dashboard/profile`; props: role/profile hydration values.
- `app/profile/profile-settings-form.tsx` - profile pages; props: extensive profile + payout + save action props; issue: very large form surface.
- `app/profile/profile-completion-status.tsx` - profile pages; props: completion booleans/details.
- `app/dashboard/finishing-setup.tsx` - `/dashboard` and gated views; props: loading/fallback text props.

### Customer journey components
- `app/dashboard/customer/customer-dashboard.tsx` - `/dashboard/customer`; props: bookings/profile state.
- `app/dashboard/customer/post-job/post-job-form.tsx` - post booking; props: checkout and defaults.
- `app/dashboard/customer/post-job/airport-combobox.tsx` - post booking; props: airport options/value handlers.
- `app/dashboard/customer/post-job/terminal-select.tsx` - post booking; props: terminal options/value handlers.
- `app/dashboard/customer/job-posted/success/job-post-success-client.tsx` - success poll page; props: session/job identifiers; issue: timeout ambiguity.
- `app/dashboard/customer/jobs/booking-tracking-live.tsx` - customer detail; props: job snapshot/live refresh config.
- `app/dashboard/customer/jobs/booking-progress-tracker.tsx` - customer detail; props: status/timeline.
- `app/dashboard/customer/jobs/booking-line-holder-card.tsx` - customer detail; props: waiter/contact details.
- `app/dashboard/customer/jobs/customer-handoff-guidance.tsx` - customer detail; props: handoff state.
- `app/dashboard/customer/jobs/completion-confirmation-panel.tsx` - customer detail; props: `jobId`, completion timing.
- `app/dashboard/customer/jobs/overage-customer-alert.tsx` - customer detail; props: overage request ids/amount/timer.
- `app/dashboard/customer/jobs/customer-booking-extra-actions.tsx` - customer detail; props: `jobId`, `canCancel`; issue: report issue disabled.
- `app/dashboard/customer/jobs/cancel-job-button.tsx` - customer detail; props: `jobId`.
- `app/dashboard/customer/jobs/booking-activity-timeline.tsx` - customer detail; props: event list/status history.

### Waiter journey components
- `app/dashboard/waiter/waiter-dashboard.tsx` - `/dashboard/waiter`; props: readiness/jobs metrics.
- `app/dashboard/waiter/line-holder-setup-checklist.tsx` - waiter dashboard; props: setup completion booleans.
- `app/dashboard/waiter/waiter-payout-setup.tsx` - waiter dashboard/profile; props: payout and stripe/manual states.
- `app/dashboard/waiter/waiter-payout-connect-form.tsx` - payout setup; props: connect/start actions.
- `app/dashboard/waiter/stripe-sync-error-banner.tsx` - waiter screens; props: stripe sync error details.
- `app/dashboard/waiter/setup-resend-verification.tsx` - waiter onboarding; props: resend action state.
- `app/dashboard/waiter/browse-jobs/accept-job-form.tsx` - browse jobs; props: job id + readiness constraints.
- `app/dashboard/waiter/jobs/line-holder-status-panel.tsx` - waiter job detail; props: status/current step; issue: escalation/reporting not fully enabled.
- `app/dashboard/waiter/jobs/provider-customer-card.tsx` - waiter job detail; props: customer/contact/job summary.
- `app/dashboard/waiter/jobs/provider-booking-details-card.tsx` - waiter job detail; props: booking metadata.
- `app/dashboard/waiter/jobs/provider-booking-timeline.tsx` - waiter job detail; props: timeline events.
- `app/dashboard/waiter/jobs/provider-execution-note.tsx` - waiter job detail; props: execution guidance text.
- `app/dashboard/waiter/jobs/request-extra-time-form.tsx` - waiter job detail; props: job id/request state.
- `app/dashboard/waiter/jobs/line-holder-handoff-guidance.tsx` - waiter job detail; props: handoff state.
- `app/dashboard/waiter/service-areas/service-areas-form.tsx` - service-areas page; props: selected airports and save handler.

### Shared handoff components
- `app/dashboard/handoff/customer-handoff-panel.tsx` - customer job detail; props: `jobId`, token/verification state.
- `app/dashboard/handoff/waiter-handoff-panel.tsx` - waiter job detail; props: `jobId`, token/verification state.
- `app/dashboard/handoff/handoff-audit-panel.tsx` - both job detail contexts; props: audit events/handoff records.
- `app/dashboard/handoff/handoff-success-card.tsx` - post-handoff success sections; props: completion and payout summary.
- `app/dashboard/handoff/qr-scanner-placeholder.tsx` - handoff scan flow; props: `onParsed`; issue: labeled placeholder, still transition-state UX.

### Admin components
- `app/admin/owner-operations-map.tsx` - `/admin`; props: operational location/coverage data.
- `app/admin/owner-dashboard-controls.tsx` - `/admin`; props: filters/time windows.
- `app/admin/fraud-review-queue-card.tsx` - `/admin`; props: queue items/action handlers.
- `app/admin/fraud-review-action-button.tsx` - `/admin`; props: item id/action type.
- `app/admin/job-action-buttons.tsx` - `/admin`; props: `jobId`; issue: high-impact actions need stronger confirmation UX.

## 4) Navigation Audit

### Public nav
- Primary: `Categories`, `How It Works`, `Book`, `Become a Line Holder`, `Sign in`/`Dashboard`.
- Entry source: `components/home-header-nav.tsx`.

### Customer dashboard nav
- Drawer: `Dashboard`, `Book Now`, `My bookings`, `Profile`.
- Account menu: `Profile`, `Dashboard`, `Book Now`, `Sign out`.
- Issue: `Dashboard` and `My bookings` share destination (`/dashboard/customer`), causing redundancy.

### Line Holder dashboard nav
- Drawer: `Dashboard`, `Available bookings`, `My assignments`, `Profile`.
- Account menu: `Profile`, `Dashboard`, `Available bookings`, `Sign out`.
- Issue: `Dashboard` and `My assignments` both route to `/dashboard/waiter`.

### Admin nav
- No dedicated admin shell/menu; route is protected and rendered directly at `/admin`.
- Opportunity: add explicit admin IA with queue tabs and safer action hierarchy.

### Mobile nav
- Authenticated header uses menu drawer + account popover.
- Booking detail pages use sticky action bar for quick navigation/actions.
- Opportunity: reduce option duplication and clarify primary action on small screens.

## 5) Error States

| Error/message | Where it appears | Typical cause | Fix status |
|---|---|---|---|
| "We couldn’t load your profile (...). Try again in a moment." | dashboard customer/waiter/setup pages | profile query failure or stale auth/profile sync | pending/partial mitigation |
| "Your profile row isn’t ready yet..." | setup fallback states (`DashboardFinishingSetup`) | profile row creation lag after auth | pending (fallback exists) |
| "This link is invalid..." / "This link has expired..." | verify email flow | expired/incorrect token | partial (messaging present, still friction) |
| "We couldn't send the verification email just now..." | verify email resend flow | email resend API failure | unknown |
| "Could not confirm payment." | job-post success bridge page | session missing or delayed confirmation path | high-priority pending |
| "Missing checkout session." | job-post success bridge page | malformed return params/session | pending |
| "Your payment is processing..." | job-post success bridge page | webhook/confirm delay | partial (status text only) |
| "No active bookings yet" | customer dashboard | zero current jobs | expected |
| "No open bookings match..." | waiter browse jobs | filters/service-area mismatch | expected |
| "Select your service areas" / onboarding prompts | waiter dashboard/browse | setup incomplete | expected but high-friction |
| "Report issue" + "Soon/Coming soon" | customer and waiter booking action surfaces | feature not implemented | pending (critical UX gap) |

## 6) UX Issues List (Prioritized)

### Critical
1. **Issue reporting/escalation is not fully live** in customer/waiter booking flows, but these are trust-critical states.
2. **Handoff scan UX still transitional** (`qr-scanner-placeholder`) in a high-risk completion moment.

### High
1. **Checkout confirmation uncertainty** on timeout/failed polling in `/dashboard/customer/job-posted/success`.
2. **Waiter onboarding friction** (verification + profile + service areas + payout) before first acceptance.
3. **Profile form complexity** in `profile-settings-form` raises cognitive load and error probability.

### Medium
1. **Navigation redundancy** (duplicate destinations with different labels).
2. **Messaging mismatch risk** between home-page payment copy and booking/payment mechanics.
3. **Admin action affordance** could be safer with stronger guardrails and confirmation patterns.

### Low
1. **Legacy component risk** (`components/NavBar.tsx`) if reintroduced inconsistently.
2. **Legal readability polish** opportunities across dense policy pages.

---

This document is intended as the baseline source of truth for UX redesign planning and prioritization.
