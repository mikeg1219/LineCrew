-- Phase 1: Stripe webhook idempotency + explicit payment_status on jobs.
-- Run in Supabase SQL Editor (or supabase db push) after reviewing.
-- Prerequisites order + env + Stripe webhook events: docs/PAYMENT_PREREQUISITES.md

-- 1) Deduplicate Stripe webhook deliveries (Stripe retries on non-2xx).
create table if not exists public.processed_stripe_events (
  id text primary key,
  event_type text not null,
  api_version text,
  livemode boolean not null default false,
  created_at_stripe timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

comment on table public.processed_stripe_events is
  'Stripe webhook event ids (evt_...) — insert-before-process for idempotency.';

create index if not exists processed_stripe_events_processed_at_idx
  on public.processed_stripe_events (processed_at desc);

alter table public.processed_stripe_events enable row level security;

-- No policies: anon/authenticated cannot access; service role bypasses RLS.

-- 2) Jobs: payment lifecycle + Stripe object traceability (Phase 1 minimum).
alter table public.jobs
  add column if not exists payment_status text;

alter table public.jobs
  add column if not exists stripe_checkout_session_id text;

alter table public.jobs
  add column if not exists stripe_charge_id text;

-- Backfill before NOT NULL / CHECK
update public.jobs
set payment_status = 'captured'
where payment_status is null
  and stripe_payment_intent_id is not null;

update public.jobs
set payment_status = 'none'
where payment_status is null;

alter table public.jobs
  alter column payment_status set default 'none';

alter table public.jobs
  alter column payment_status set not null;

do $$
begin
  alter table public.jobs
    add constraint jobs_payment_status_check
    check (
      payment_status in (
        'none',
        'pending_checkout',
        'authorized',
        'captured',
        'failed',
        'refund_pending',
        'refunded',
        'disputed'
      )
    );
exception
  when duplicate_object then null;
end $$;

create unique index if not exists jobs_stripe_checkout_session_id_key
  on public.jobs (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

comment on column public.jobs.payment_status is
  'Payment lifecycle (booking status is separate). Phase 1: captured when paid job row is created.';
comment on column public.jobs.stripe_checkout_session_id is
  'Stripe Checkout Session id when checkout completed.';
comment on column public.jobs.stripe_charge_id is
  'Stripe Charge id (from PaymentIntent.latest_charge) for disputes/refunds.';
