# LineCrew.ai — Developer Handoff
**Last Updated:** April 3, 2026
**Project:** LineCrew.ai — On-demand line holding marketplace
**Owner:** AIM Consulting Service Inc.
**Goal:** Best-in-class Uber-for-waiting-in-line app. Every 
decision must match what Uber, DoorDash, and Airbnb would do.

## Production URLs
- Live site: https://linecrew.ai
- Admin: https://linecrew.ai/admin
- GitHub: https://github.com/mikeg1219/LineCrew
- Local: C:\Users\mikeg\OneDrive\Desktop\linecrew
- Supabase: iphcvzsgakbsadoekbrj
- Stripe: AIM Consulting Service Inc (acct_1TFt0xGkwAiSYfqs)
- Vercel: mikes-projects-65f34962/line-crew

## Test Accounts
- Customer + Admin: mikeg1219@yahoo.com
- Line Holder: ct_lehmann@hotmail.com (Stripe Connect complete)

## Changes Made April 3, 2026
1. Fixed logo — replaced broken 70-byte PNG with SVG icon 
   in components/home-header-nav.tsx and 
   components/authenticated-app-header.tsx
2. Fixed theme — confirmed bg-slate-50 on all dashboard pages:
   - app/dashboard/waiter/service-areas/page.tsx
   - app/profile/profile-route-view.tsx
   - app/dashboard/waiter/waiter-dashboard.tsx
3. Fixed Gate 2 label — waiter-onboarding-progress.tsx now 
   shows "Profile complete — set up payouts to accept" when 
   gate3 is incomplete
4. Fixed accept button — disabled state now uses gray styling 
   for ALL disabled cases in accept-job-form.tsx
5. Fixed payout UI — waiter-payout-setup.tsx now shows clean 
   "You're all set to earn!" banner when Stripe is active,
   matching Uber/DoorDash industry standard
6. Fixed Stripe keys — corrected mixed live/test keys and 
   doubled publishable key in Vercel production environment
7. Cleared bad payout data — removed wrong PayPal handle 
   from ct_lehmann@hotmail.com profile in Supabase
8. Completed Stripe Connect onboarding for ct_lehmann test 
   account — Gate 3 now complete for this account

## Testing Status
- Block 1 (Public pages): PASS
- Block 2 (Customer flow): PASS — booking, payment, tracking
- Block 3 (Line Holder flow): IN PROGRESS
  - Sign in: PASS
  - Browse jobs: PASS
  - Capacity gate: PASS
  - Payout gate: PASS
  - Stripe Connect setup: PASS
  - NEXT: Test status updates + QR handoff flow
- Block 4 (Issue reporting): PENDING
- Block 5 (Profile testing): PENDING
- Block 6 (Admin portal): PENDING — map not rendering
- Block 7 (Edge cases): PENDING

## Exact Next Step
Resume Block 3 testing:
1. Open incognito browser
2. Go to https://linecrew.ai/auth
3. Sign in as ct_lehmann@hotmail.com
4. Go to https://linecrew.ai/dashboard/waiter
5. Scroll to "Your active bookings"
6. Click "Open booking" on ATL Security $31.00
7. Walk the job through all status steps:
   - At airport → In line → Near front → Ready for handoff
8. Test QR handoff flow
9. Confirm completion from customer side 
   (sign in as mikeg1219@yahoo.com in regular browser)
10. Verify payout triggered in Stripe dashboard

## Known Issues (Fix Before Go-Live)
1. Admin portal map not rendering — needs Maps API key
2. Resend API key is placeholder — update in Vercel:
   RESEND_API_KEY=skip_for_now needs real key
3. Stripe in test mode — switch to live keys before launch
4. Stripe Connect needs live mode for real payouts
5. 5 additional test accounts need manual creation at 
   https://linecrew.ai/onboarding

## Go-Live Checklist
- [ ] Complete UX testing Blocks 3-7
- [ ] Fix Resend API key
- [ ] Fix admin map
- [ ] Legal review of all /legal/* pages
- [ ] Switch Stripe to live mode in Vercel
- [ ] Enable Stripe Connect live mode
- [ ] Final E2E test with real money
- [ ] Create 5 QA test accounts
- [ ] Wrap app with Capacitor for iOS/Android
- [ ] Submit to Apple App Store
- [ ] Submit to Google Play Store

## Engineering Rules (Do Not Violate)
1. Read actual files before writing any code
2. Combine multiple commands with &&
3. Validate logic end to end before any prompt
4. Never give prompts based on assumptions
5. Run npm run build before every deploy
6. Apply industry best practices proactively
7. Think 3-4 steps ahead
8. Money/payout gates must be server-side enforced
9. Canonical customer dashboard: 
   app/dashboard/customer/customer-dashboard.tsx
10. Canonical Line Holder dashboard: 
    app/dashboard/waiter/waiter-dashboard.tsx

## Brand Design System
- Zone 1 (public): gradient from-blue-600 to-teal-500
- Zone 2 (dashboard): bg-slate-50, white cards, blue accents
- Zone 3 (admin): bg-slate-900 dark theme
- Cards: bg-white rounded-2xl border border-slate-200 shadow-sm
- Primary button: bg-blue-600 text-white rounded-xl min-h-[44px]

## Tech Stack
- Next.js 16.2.1 (App Router, Turbopack)
- React 19, TypeScript
- Supabase (auth + database)
- Stripe (payments + Connect for payouts)
- Twilio (SMS), Resend (email)
- Vercel (deployment), Tailwind CSS

## Pick up after shutdown (use this every session)

1. **Repo (source of truth):** https://github.com/mikeg1219/LineCrew — branch `main`.
2. **On this machine:** `cd C:\Users\mikeg\OneDrive\Desktop\linecrew` then `git pull origin main`.
3. **In Cursor:** open the folder, start a chat, type `@CLAUDE_HANDOFF.md` and ask to continue from **Exact Next Step** / **Testing Status** above.
4. **Bookmark:** https://github.com/mikeg1219/LineCrew/blob/main/CLAUDE_HANDOFF.md — same handoff, always matches `main` after you push.
