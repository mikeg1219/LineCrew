-- LineCrew: jobs table + RLS (full schema for new projects — includes acceptance flow)
-- Run after public.profiles exists. If you already ran an older jobs-schema, use jobs-acceptance-migration.sql instead.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  waiter_id uuid references auth.users (id) on delete set null,
  customer_email text,
  waiter_email text,
  airport text not null,
  terminal text not null,
  line_type text not null check (
    line_type in ('Security', 'Check-In', 'Bag Drop', 'Customs', 'TSA PreCheck')
  ),
  description text not null default '',
  offered_price numeric(10, 2) not null check (offered_price >= 10),
  overage_rate numeric(10, 2) not null default 10 check (overage_rate >= 5),
  overage_agreed boolean not null default false,
  estimated_wait text not null,
  status text not null default 'open' check (
    status in (
      'open',
      'accepted',
      'at_airport',
      'in_line',
      'near_front',
      'completed',
      'cancelled'
    )
  ),
  created_at timestamptz not null default now(),
  stripe_payment_intent_id text,
  payout_transfer_id text
);

create unique index if not exists jobs_stripe_payment_intent_id_key
  on public.jobs (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists jobs_payout_transfer_id_key
  on public.jobs (payout_transfer_id)
  where payout_transfer_id is not null;

create index jobs_customer_id_idx on public.jobs (customer_id);
create index jobs_waiter_id_idx on public.jobs (waiter_id);
create index jobs_status_created_idx on public.jobs (status, created_at desc);

alter table public.jobs enable row level security;

-- Inserts: jobs are created by the backend after Stripe Checkout (service role), not by clients.

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
