-- LineCrew: Stripe Connect + job payments (run in Supabase SQL Editor after jobs + profiles exist)

-- 1) Profiles: Stripe Connect account id (Express)
alter table public.profiles
  add column if not exists stripe_account_id text;

create index if not exists profiles_stripe_account_id_idx
  on public.profiles (stripe_account_id)
  where stripe_account_id is not null;

comment on column public.profiles.stripe_account_id is
  'Stripe Connect Express account id (acct_...) for waiter payouts.';

-- 2) Jobs: payment + payout tracking
alter table public.jobs
  add column if not exists stripe_payment_intent_id text;

alter table public.jobs
  add column if not exists payout_transfer_id text;

comment on column public.jobs.stripe_payment_intent_id is
  'Stripe PaymentIntent id after customer Checkout succeeds; unique per job.';

comment on column public.jobs.payout_transfer_id is
  'Stripe Transfer id when 80% payout to waiter was released (20% platform fee).';

create unique index if not exists jobs_stripe_payment_intent_id_key
  on public.jobs (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists jobs_payout_transfer_id_key
  on public.jobs (payout_transfer_id)
  where payout_transfer_id is not null;

-- 3) Jobs must be created only after payment (server webhook with service role).
--    Remove direct customer inserts so Checkout + webhook is the only path.
drop policy if exists "Customers can insert own jobs" on public.jobs;
