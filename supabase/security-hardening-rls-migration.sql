-- PHASE 4 — Security hardening: jobs + profiles RLS (run in Supabase SQL Editor).
-- After prior migrations. Preserves waiter/customer job UPDATE policies required by the app.

-- ─── JOBS: replace SELECT + INSERT; keep UPDATE policies ─────────────────────
DROP POLICY IF EXISTS "jobs_select_policy" ON public.jobs;
DROP POLICY IF EXISTS "customers_own_jobs" ON public.jobs;
DROP POLICY IF EXISTS "Waiters accept open jobs" ON public.jobs;
DROP POLICY IF EXISTS "Waiters update assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Customers update own jobs" ON public.jobs;

CREATE POLICY "customers_own_jobs" ON public.jobs
FOR SELECT USING (
  customer_id = auth.uid()
  OR waiter_id = auth.uid()
  OR status = 'open'
);

CREATE POLICY "customers_insert_jobs" ON public.jobs
FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Waiters accept open jobs"
  ON public.jobs FOR UPDATE
  USING (status = 'open' AND waiter_id IS NULL)
  WITH CHECK (
    auth.uid() = waiter_id
    AND status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'waiter'
    )
  );

CREATE POLICY "Waiters update assigned jobs"
  ON public.jobs FOR UPDATE
  USING (waiter_id = auth.uid())
  WITH CHECK (waiter_id = auth.uid());

CREATE POLICY "Customers update own jobs"
  ON public.jobs FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ─── PROFILES: own row read/update (explicit policy names) ─────────────────────
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile" ON public.profiles;

CREATE POLICY "users_own_profile" ON public.profiles
FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_profile" ON public.profiles;

CREATE POLICY "users_update_profile" ON public.profiles
FOR UPDATE USING (id = auth.uid());

-- Note: "Users can insert own profile" (signup) is unchanged — not dropped here.
