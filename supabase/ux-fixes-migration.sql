-- LineCrew UX safety fixes — run in Supabase SQL Editor after stripe-migration + overage schema.

-- ─── Jobs: new statuses, timestamps ───────────────────────────────────────
alter table public.jobs drop constraint if exists jobs_status_check;

alter table public.jobs add constraint jobs_status_check check (
  status in (
    'open',
    'accepted',
    'at_airport',
    'in_line',
    'near_front',
    'pending_confirmation',
    'completed',
    'cancelled',
    'disputed',
    'refunded'
  )
);

alter table public.jobs add column if not exists accepted_at timestamptz;
alter table public.jobs add column if not exists completed_at timestamptz;
alter table public.jobs add column if not exists cancelled_at timestamptz;
alter table public.jobs add column if not exists cancellation_reason text;

comment on column public.jobs.accepted_at is 'When a waiter accepted the job.';
comment on column public.jobs.completed_at is 'When waiter marked job complete (pending customer confirmation).';
comment on column public.jobs.cancelled_at is 'When the job was cancelled.';
comment on column public.jobs.cancellation_reason is 'Optional note when cancelling.';

create index if not exists jobs_status_accepted_at_idx
  on public.jobs (status, accepted_at)
  where status = 'accepted';

create index if not exists jobs_status_completed_at_idx
  on public.jobs (status, completed_at)
  where status = 'pending_confirmation';

-- ─── Profiles: airports + SMS ───────────────────────────────────────────────
alter table public.profiles add column if not exists serving_airports text[] not null default array[]::text[];

alter table public.profiles add column if not exists phone text;

comment on column public.profiles.serving_airports is 'Airport codes (from US_AIRPORTS_TOP_20) this waiter serves.';
comment on column public.profiles.phone is 'E.164 phone for SMS notifications (optional).';

-- ─── RLS: customers may update their own jobs (cancel, confirm, dispute) ─────
drop policy if exists "Customers update own jobs" on public.jobs;

create policy "Customers update own jobs"
  on public.jobs for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
