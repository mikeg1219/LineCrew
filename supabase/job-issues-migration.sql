-- PHASE 1 — Issue reporting: job_issues table + RLS
-- Run in Supabase SQL Editor (or: npm run db:job-issues if script is added).
--
-- Prerequisites: public.jobs, public.profiles exist.
-- Admin RLS requires profiles.role = 'admin'; this migration extends the role check
-- to include 'admin'. Set your admin user's profile: UPDATE profiles SET role = 'admin' WHERE id = '<uuid>';

-- ---------------------------------------------------------------------------
-- 1) Allow 'admin' on profiles.role (required for admin policies below)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'profiles'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%role%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'waiter', 'admin'));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Includes admin for ops dashboard + RLS on job_issues.';

-- ---------------------------------------------------------------------------
-- 2) job_issues
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reporter_role text NOT NULL CHECK (reporter_role IN ('customer', 'waiter')),
  reason text NOT NULL CHECK (reason IN (
    'line_holder_no_show',
    'wrong_location',
    'safety_concern',
    'payment_dispute',
    'other'
  )),
  description text NOT NULL,
  photo_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_issues_job_id_idx ON public.job_issues (job_id);
CREATE INDEX IF NOT EXISTS job_issues_reporter_id_idx ON public.job_issues (reporter_id);
CREATE INDEX IF NOT EXISTS job_issues_status_created_idx ON public.job_issues (status, created_at DESC);

ALTER TABLE public.job_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create issues for their own jobs" ON public.job_issues;
DROP POLICY IF EXISTS "Users can view their own issues" ON public.job_issues;
DROP POLICY IF EXISTS "Admins can view all issues" ON public.job_issues;
DROP POLICY IF EXISTS "Admins can update issues" ON public.job_issues;

-- Reporters can insert only for themselves and only for jobs they belong to (customer or assigned waiter).
CREATE POLICY "Users can create issues for their own jobs"
  ON public.job_issues
  FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = job_id
          AND j.customer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = job_id
          AND j.waiter_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own issues"
  ON public.job_issues
  FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can view all issues"
  ON public.job_issues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update issues"
  ON public.job_issues
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.job_issues TO authenticated;
GRANT ALL ON public.job_issues TO service_role;

COMMENT ON TABLE public.job_issues IS 'Customer/waiter issue reports tied to a job; admin resolves via role=admin.';
