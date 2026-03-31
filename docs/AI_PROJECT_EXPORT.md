# LineCrew Project Export (AI Handoff)

Last updated: 2026-03-31

## Project overview
- App: `linecrew`
- Stack: Next.js 16, React 19, TypeScript, Supabase, Stripe
- Key scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run deploy:prod`

## Dependencies snapshot
- `next@16.2.1`
- `react@19.2.4`
- `@supabase/supabase-js@^2.100.1`
- `stripe@^21.0.1`

## Current issue being fixed
- Symptom: Line Holder ("waiter") clicks "Set up payouts" and cannot complete Stripe Connect onboarding reliably.
- Impact: Waiter cannot unlock booking acceptance due to payout gating.

## Root cause found
- In `app/dashboard/waiter/connect/actions.ts`, server action accepted `_formData` but code used `formData`.
- Runtime result: submit path can throw `ReferenceError` before Stripe redirect.

## Fixes applied
1. `app/dashboard/waiter/connect/actions.ts`
   - Renamed action arg to `formData` so `formData.get("returnTo")` is valid.
   - Improved link-type input by merging latest `stripe_account_id` into the profile object before `stripeAccountLinkType(...)`.
2. Existing payout flow remains backward compatible:
   - Express account creation still requests `transfers` capability.
   - Uses service-role fallback for writing `stripe_account_id`.
   - Redirect errors (`NEXT_REDIRECT`) are rethrown correctly.

## Related recent stability changes
- `app/dashboard/profile/page.tsx`
  - Removed server-render Stripe sync to avoid profile route server errors/timeouts.
- `app/profile/stripe-refresh-actions.ts`
  - Added client-triggered server action to refresh Stripe connect flags after page load.
- `app/profile/profile-settings-form.tsx`
  - Added `stripeSyncForce` flow for `?connect=return|refresh`.

## Environment requirements for payout flow
- `STRIPE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## Database requirements
- Ensure Stripe connect status columns exist in `profiles`:
  - `stripe_account_id`
  - `stripe_details_submitted`
  - `stripe_payouts_enabled`
- Migration reference:
  - `supabase/stripe-connect-status-migration.sql`

## Known local execution blocker (important)
- Cursor terminal intermittently returns:
  - `Error: Command failed to spawn: This operation was aborted`
- This can block automated `git`, `lint`, `build`, and `deploy` commands.

## Risk / compatibility assessment
- Change scope is narrow to waiter payout onboarding submit path.
- No schema-breaking code introduced by this specific fix.
- Low risk to previous deployments if required env + DB columns already exist.
- Warning: If migrations/env vars are missing, payout flow can still fail even with code fix.

## What external reviewers should check
1. Confirm server action payload path:
   - `formData.get("returnTo")` executes in production.
2. Confirm Stripe account link creation:
   - `type` transitions correctly (`account_onboarding` vs `account_update`).
3. Confirm post-return sync:
   - `?connect=return|refresh` updates profile flags and unlocks booking acceptance.
4. Confirm no profile page 500 regressions from Stripe sync.

## Copy/paste prompt for Claude/ChatGPT
Please review this Next.js + Supabase + Stripe Connect flow for Line Holder payouts.

Focus files:
- app/dashboard/waiter/connect/actions.ts
- app/dashboard/waiter/waiter-payout-connect-form.tsx
- app/dashboard/waiter/waiter-payout-setup.tsx
- lib/stripe-account-sync.ts
- app/dashboard/profile/page.tsx
- app/profile/stripe-refresh-actions.ts
- app/profile/profile-settings-form.tsx

Tasks:
1) Identify any remaining reasons a waiter cannot complete payout setup.
2) Check for server action/runtime bugs, redirect handling issues, and Stripe accountLink type logic.
3) Check for Supabase RLS/write-path issues on stripe fields.
4) Propose minimal safe patch set with low deployment risk.
5) Provide explicit test checklist for local + production validation.

Constraints:
- Keep backwards compatibility.
- Do not break existing customer booking flows.
- Prefer targeted fixes over refactors.

## Current status
- Code fix for the main payout setup bug is present in workspace.
- Commit/deploy may still require terminal recovery if spawn-abort persists.
