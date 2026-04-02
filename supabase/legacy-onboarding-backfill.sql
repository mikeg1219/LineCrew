-- One-time backfill: mark accounts created before the onboarding flow as complete.
-- Run in Supabase SQL Editor after deploying app code that respects legacy users.
-- Safe to re-run: only updates rows that are still incomplete.

UPDATE public.profiles
SET
  onboarding_step = 3,
  onboarding_completed = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, now())
WHERE created_at < '2026-04-02T00:00:00+00'::timestamptz
  AND role IN ('customer', 'waiter')
  AND (
    onboarding_step IS NULL
    OR onboarding_step < 3
    OR COALESCE(onboarding_completed, false) = false
  );
