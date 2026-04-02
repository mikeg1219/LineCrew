-- PHASE 2 — Progressive Line Holder onboarding gates (waiter browse / accept / payout).
-- Run in Supabase SQL Editor, or: npm run db:progressive-onboarding-gates (requires supabase link).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gate1_unlocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gate2_unlocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gate3_unlocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS earnings_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_completed_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_accepted_count integer DEFAULT 0;

COMMENT ON COLUMN public.profiles.gate1_unlocked IS 'Waiter: browse jobs (basic profile + onboarding done).';
COMMENT ON COLUMN public.profiles.gate2_unlocked IS 'Waiter: accept jobs (full profile + service areas).';
COMMENT ON COLUMN public.profiles.gate3_unlocked IS 'Waiter: receive payouts (Stripe or manual payout).';
COMMENT ON COLUMN public.profiles.earnings_total IS 'Cumulative earnings (application-maintained; optional trigger updates later).';
COMMENT ON COLUMN public.profiles.jobs_completed_count IS 'Count of completed jobs as line holder.';
COMMENT ON COLUMN public.profiles.jobs_accepted_count IS 'Count of accepted jobs as line holder.';

-- Referenced by gate 3; safe if already present (see stripe-connect / profile migrations).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manual_payout_method text;

CREATE OR REPLACE FUNCTION public.update_waiter_gates()
RETURNS TRIGGER AS $$
BEGIN
  -- Gate 1: can browse (basic profile)
  NEW.gate1_unlocked := (
    NEW.first_name IS NOT NULL AND
    NEW.phone IS NOT NULL AND
    NEW.onboarding_completed_at IS NOT NULL
  );

  -- Gate 2: can accept jobs (full profile)
  NEW.gate2_unlocked := (
    NEW.gate1_unlocked AND
    NEW.bio IS NOT NULL AND
    NEW.serving_airports IS NOT NULL AND
    array_length(NEW.serving_airports, 1) > 0
  );

  -- Gate 3: can receive payment (payout setup)
  NEW.gate3_unlocked := (
    NEW.gate2_unlocked AND
    (NEW.stripe_payouts_enabled IS TRUE OR NEW.manual_payout_method IS NOT NULL)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waiter_gates_trigger ON public.profiles;
CREATE TRIGGER waiter_gates_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_waiter_gates();

-- Recompute gates for existing profiles (trigger runs on UPDATE).
UPDATE public.profiles SET updated_at = now();
