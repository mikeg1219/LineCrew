# Cursor session handoff (LineCrew)

Use this file so a **new chat** (or a fresh context window) can align quickly with where you left off. Cursor does not automatically read it—you **bring it into context** on purpose.

## How to use with Cursor

1. **Next session:** Open this repo in Cursor, start a chat, and either:
   - Type **`@`** → attach **`docs/CURSOR_SESSION_HANDOFF.md`**, then ask your question; or  
   - Paste the **“Quick paste block”** below into the first message.
2. **Before you stop for the day:** Scroll to **Session snapshot** and update the bullets (goal, blockers, commands run). Paste `git status -sb` output into **Git** if you had uncommitted work.
3. **Optional:** Add this file to Cursor **Rules** for the workspace only if you want it always considered (heavy-handed; usually `@` is enough).

---

## Quick paste block (copy into chat)

```
@docs/CURSOR_SESSION_HANDOFF.md

Continue from the handoff doc. Read Session snapshot and Next actions first.
```

---

## Project essentials

| Item | Value |
|------|--------|
| Dev server | `npm run dev` (from repo root) |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Stack | Next.js (App Router), React, Supabase, Stripe — see `AGENTS.md` / `package.json` |

---

## Session snapshot *(update before you leave)*

**Last updated:** 2026-04-02

### Current goal

- *(What you’re trying to ship or debug next.)*

### Done recently (this thread / memory)

- Waiter payout UI: when `stripePayoutReady` is true, section title/subtext hidden via `{!profileTab && !stripePayoutReady ? (` in `app/dashboard/waiter/waiter-payout-setup.tsx`.
- Audit pass: FIX 1–4 (payout heading, `bg-slate-50` wrappers, Gate 2 copy in `components/waiter-onboarding-progress.tsx`, disabled button styles in `accept-job-form.tsx`) — **no further code changes were required**; tree already matched spec.
- `npx tsc --noEmit` completed successfully after the payout change.

### Blockers / open questions

- *(None, or list them.)*

### Git *(paste short status when dirty)*

```text
# Run: git status -sb
# Paste output below:

```

### Next actions

- [ ] *(e.g. run manual test on waiter dashboard payouts)*
- [ ] *(e.g. apply pending SQL migration)*

---

## Files often relevant *(optional notes)*

| Area | Paths |
|------|--------|
| Line Holder dashboard | `app/dashboard/waiter/` |
| Onboarding | `app/onboarding/`, `lib/onboarding-progress.ts` |
| Profile | `app/profile/` |
| Supabase SQL | `supabase/*.sql` |

---

## Limitations

- **Chats don’t persist** across machines the way files do; this doc is the durable “bookmark.”
- **Secrets** (API keys, `.env`) must not be pasted here—only describe *which* env vars matter, not values.
