-- LineCrew: overage_requests table + RLS (run after public.jobs exists)
-- For new installs you can run this after jobs-schema + overage-migration.

create table public.overage_requests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  waiter_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now()
);

create index overage_requests_job_id_idx on public.overage_requests (job_id);
create index overage_requests_status_idx on public.overage_requests (status);

alter table public.overage_requests enable row level security;

-- Customers see requests tied to their jobs
create policy "Customers select requests for own jobs"
  on public.overage_requests for select
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.customer_id = auth.uid()
    )
  );

-- Waiters see requests they created
create policy "Waiters select own overage requests"
  on public.overage_requests for select
  using (waiter_id = auth.uid());

-- Waiters insert for jobs they hold, once in line or further (not completed)
create policy "Waiters insert overage on active line jobs"
  on public.overage_requests for insert
  with check (
    waiter_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
      and j.waiter_id = auth.uid()
      and j.status in ('in_line', 'near_front')
    )
  );

-- Customers approve or decline pending requests
create policy "Customers update pending overage requests"
  on public.overage_requests for update
  using (
    status = 'pending'
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.customer_id = auth.uid()
    )
  )
  with check (
    status in ('approved', 'declined')
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.customer_id = auth.uid()
    )
  );
