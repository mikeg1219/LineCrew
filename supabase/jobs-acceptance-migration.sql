-- LineCrew: job acceptance + status progression (run in Supabase SQL Editor)
-- Use this if you already applied the original jobs-schema.sql

-- 1) Columns
alter table public.jobs add column if not exists waiter_id uuid references auth.users (id) on delete set null;
alter table public.jobs add column if not exists customer_email text;
alter table public.jobs add column if not exists waiter_email text;

create index if not exists jobs_waiter_id_idx on public.jobs (waiter_id);

-- 2) Replace status check (drop legacy values, add progression + accepted)
alter table public.jobs drop constraint if exists jobs_status_check;

update public.jobs
set status = 'accepted'
where status = 'assigned';

alter table public.jobs add constraint jobs_status_check check (
  status in (
    'open',
    'accepted',
    'at_airport',
    'in_line',
    'near_front',
    'completed',
    'cancelled'
  )
);

-- 3) RLS: replace read + insert policies; add waiter UPDATE policies
drop policy if exists "Jobs readable by owner or waiters for open listings" on public.jobs;
drop policy if exists "jobs_select_policy" on public.jobs;

create policy "jobs_select_policy"
  on public.jobs for select
  using (
    customer_id = auth.uid()
    or (
      status = 'open'
      and waiter_id is null
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'waiter'
      )
    )
    or (
      waiter_id = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'waiter'
      )
    )
  );

drop policy if exists "Waiters accept open jobs" on public.jobs;
drop policy if exists "Waiters update assigned jobs" on public.jobs;

create policy "Waiters accept open jobs"
  on public.jobs for update
  using (status = 'open' and waiter_id is null)
  with check (
    auth.uid() = waiter_id
    and status = 'accepted'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'waiter'
    )
  );

create policy "Waiters update assigned jobs"
  on public.jobs for update
  using (waiter_id = auth.uid())
  with check (waiter_id = auth.uid());
