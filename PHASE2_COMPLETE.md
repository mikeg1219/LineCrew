# Phase 2 — Complete

This document summarizes Phase 2 delivery for LineCrew: progressive **Line Holder onboarding**, **profile UX** (tabs, saves), and related **server/client** fixes.

## What was built

### Waiter onboarding & dashboard

- **Progressive gates** (`gate1_unlocked`, `gate2_unlocked`, `gate3_unlocked`) with UI in `WaiterOnboardingProgress` (dismiss when all gates complete).
- **Waiter dashboard** (`/dashboard/waiter`): onboarding progress placement, welcome banner for early onboarding steps, steps-remaining copy, payout readiness wiring, **Browse jobs** accept CTA gated when profile/gate2 is incomplete (tooltip + disabled state).
- **Browse jobs** (`/dashboard/waiter/browse-jobs`): Accept booking respects **gate2** + existing setup rules.

### Profile settings (tabs)

- **Tabbed profile** (`/profile`, `/dashboard/profile`): **Your info** | **Line Holder settings** / **Travel preferences** | **Get paid** (waiters) | **Legal & policies**.
- URL state: `?tab=info|settings|payment|legal` (customers: no payment tab).
- Independent save actions per tab; green **Profile saved ✓** (auto-dismiss ~3s).
- **Get paid** uses payout cards (Stripe + manual) with profile-oriented layout where applicable.

### Profile save reliability (`app/profile/actions.ts`)

- Uses **`createAdminClient()`** (via `tryCreateAdminClient`) when service role is available; falls back to session client.
- Structured **logging** on auth, select, payload build, update, zero-row handling, manual payout.
- **Ensure profile row** when missing; **insert** path when update affects zero rows but row should exist; **retry** on transient connection errors (500ms backoff).
- **Typed client errors**: phone validation, session (“sign in again”), database (“try again”).

### Supporting assets

- Onboarding progress helpers, migrations (as applicable in repo), UX notes in `UX_*.md` if present.

## Known issues / follow-ups

1. **`next lint` CLI**: This repo’s `package.json` uses **`npm run lint`** (ESLint). If `npx next lint` fails with “Invalid project directory …/lint”, use `npm run lint` instead.
2. **Production verification**: Public URLs may **redirect to `/auth`** when not signed in — that is expected; “loads without errors” means no 5xx and no build/runtime crash on the route.
3. **Stripe / Supabase env**: Payout flows require `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys, and linked Vercel env — misconfiguration surfaces as save or Connect errors (see server logs: `[profile/save]`).
4. **Legacy file**: `app/dashboard/waiter/waiter-dashboard.tsx` may exist alongside `page.tsx`; canonical route is **`page.tsx`** unless routing is changed.

## QA test checklist

### Automated (local / CI)

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] Optional: `npm run build`

### Authenticated QA (staging / production)

**As a Line Holder (waiter)**

- [ ] Open `/dashboard/waiter` — dashboard loads; onboarding progress hidden when all gates complete.
- [ ] Open `/dashboard/waiter/browse-jobs` — list loads; with **gate2** incomplete, **Accept booking** is disabled with tooltip; completes when eligible.
- [ ] Open `/profile?tab=info` — edit **Your info**, **Save** — **Profile saved ✓**.
- [ ] `/profile?tab=settings` — Line Holder fields save; validation messages inline.
- [ ] `/profile?tab=payment` — Stripe / manual sections render; manual save shows success path.
- [ ] `/profile?tab=legal` — policy links open in new tab; versions/dates display as implemented.

**As a customer (if applicable)**

- [ ] `/profile` — **Travel preferences** tab saves.

### Smoke URLs (unauthenticated)

- [ ] `GET /onboarding` — 200 or redirect, not 5xx.
- [ ] `GET /dashboard/waiter` — redirect to auth or 200 as configured.
- [ ] `GET /profile` — redirect to auth or 200 as configured.

## Deployment record (Phase 2 close-out)

| Step | Result |
|------|--------|
| `npx tsc --noEmit` | Pass (exit 0) |
| `npm run lint` | Pass — *Note: `npx next lint` is not used in this repo; ESLint is `npm run lint`.* |
| `git push origin main` | Pushed commit: `Phase 2: Line Holder onboarding gates, profile tabs, save fix` |
| `npx vercel deploy --prod --yes` | **Ready** — production alias **https://linecrew.ai** |

### Post-deploy URL checks (anonymous)

Fetched after deploy; pages rendered without 5xx:

| URL | Observed behavior |
|-----|-------------------|
| https://linecrew.ai/onboarding | Onboarding shell and role choice (expected when not signed in). |
| https://linecrew.ai/dashboard/waiter | Middleware routed to onboarding flow for anonymous session (expected). |
| https://linecrew.ai/profile | Sign-in page (expected when not signed in). |

Re-verify while **signed in** as waiter for true dashboard/profile content.

---

*Generated as part of Phase 2 close-out. Update known issues as bugs are filed.*
