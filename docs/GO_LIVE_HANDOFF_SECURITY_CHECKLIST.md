# LineCrew Go-Live Handoff Security Checklist

This runbook covers production readiness for the handoff + fraud prevention stack:

- Multi-step handoff flow
- Signed QR payloads + nonce
- Anti-replay protections
- Confidence scoring + auto-escalation
- Fraud review queue + admin review actions
- CSV export tooling

---

## 0) Current production baseline

- App URL: `https://linecrew.ai`
- Recent deployment includes:
  - Handoff security + fraud queue
  - Admin fraud filters, pagination, export
  - KPI trend chips

Before proceeding, confirm latest code on `main` is pushed.

---

## 1) Required database migrations (in order)

Run these SQL files in Supabase SQL editor, one by one:

1. `supabase/handoff-flow-migration.sql`
2. `supabase/handoff-security-hardening-migration.sql`
3. `supabase/handoff-signature-migration.sql`
4. `supabase/handoff-review-migration.sql`

Validation query after migrations:

```sql
select
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'jobs'
  and column_name like 'handoff_%'
order by column_name;
```

Expected: handoff columns for qr/code/hash/nonce/attempts/confidence/escalation/review.

---

## 2) Environment and secret checks

Confirm production env vars in Vercel:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Recommended: add dedicated signing secret (optional but preferred):

- `HANDOFF_SIGNING_SECRET=<strong random secret>`

If missing, app falls back to existing server secrets, but dedicated secret is cleaner.

After env changes, redeploy:

```bash
npm run deploy:prod
```

---

## 3) Functional verification runbook (two phones)

### Scenario

- Booking category: concert GA entry
- Worker holds place
- Customer arrives and handoff completes

### Steps

1. Create booking as customer.
2. Accept booking as waiter.
3. Progress to `near_front`.
4. Customer taps:
   - `I'm on my way`
   - `I'm here`
5. Waiter taps:
   - `Ready for handoff`
   - `Show Handoff QR`
6. Customer verifies via:
   - QR signed payload parse, or
   - fallback 4-digit code
7. Confirm both sides:
   - customer: received place
   - waiter: transferred place
8. Validate terminal state:
   - booking completes (or escalates if low confidence)
   - audit timestamps populated

---

## 4) Security verification (must pass)

### Anti-replay

1. Perform one successful QR verification.
2. Reuse same token/code.
3. Expected: blocked as used/replay.

### Signature + nonce mismatch

1. Generate new QR.
2. Attempt prior signed payload.
3. Expected: payload mismatch rejected.

### Attempt throttling

1. Enter invalid token/code repeatedly.
2. Expected: blocked after threshold.

### Auto-escalation

1. Force low-confidence handoff conditions (fallback code + weaker signals).
2. Expected:
   - `issue_flagged`
   - escalation timestamp set
   - appears in admin fraud queue

---

## 5) Admin operations verification

Open `/admin` and verify:

- Fraud Review Queue appears
- Filter presets persist after refresh
- Pagination works
- `Export CSV` works (client subset)
- `Export all matching (server)` works
- KPI strip and trend chips render
- `Mark reviewed` stores reviewer + timestamp + note
- SLA badges show:
  - Within SLA
  - SLA warning
  - SLA breached

---

## 6) Monitoring and on-call response

If incidents occur:

1. Check `/admin` fraud queue first.
2. Identify issue type:
   - confidence low
   - repeated attempts
   - issue-flagged reason
3. Mark reviewed with concise note and decision:
   - refund customer, or
   - pay line holder
4. If systemic:
   - temporarily raise manual review strictness (ops policy)
   - pause handoff completion expectations for affected window

---

## 7) Rollback plan

If release causes severe production issues:

1. Roll app deployment back in Vercel to previous healthy deployment.
2. Keep DB columns in place (additive migrations are safe to keep).
3. Disable or avoid new handoff path operationally until patched.
4. Redeploy fixed commit once validated in staging/test flow.

Do not drop handoff columns during incident response unless absolutely required.

---

## 8) Pre-go-live signoff checklist

- [ ] All 4 handoff migrations applied
- [ ] Env vars confirmed (including optional handoff signing secret)
- [ ] Replay and mismatch checks pass
- [ ] Auto-escalation path verified
- [ ] Admin review workflow verified
- [ ] CSV exports verified
- [ ] Two-device end-to-end flow verified
- [ ] Stripe payout behavior verified for complete/dispute paths
- [ ] Owner/operator trained on fraud queue handling

---

## 9) Commands quick reference

```bash
# Quality checks
npm run lint
npx tsc --noEmit

# Deploy production
npm run deploy:prod

# Optional status checks
git status
git log -1 --oneline
```

---

Owner note: Keep this file updated each time you add handoff/security behavior.
