-- Stripe Connect readiness (synced from Stripe API + account.updated webhook)
alter table public.profiles
  add column if not exists stripe_details_submitted boolean;

alter table public.profiles
  add column if not exists stripe_payouts_enabled boolean;

comment on column public.profiles.stripe_details_submitted is
  'Stripe Connect: account.details_submitted (onboarding form complete).';

comment on column public.profiles.stripe_payouts_enabled is
  'Stripe Connect: account.payouts_enabled (can receive payouts / transfers).';
