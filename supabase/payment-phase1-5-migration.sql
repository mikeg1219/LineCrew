-- Phase 1.5: Stripe chargeback id on jobs (dispute webhook links here).
-- Run after payment-phase1-migration.sql.
-- Full checklist: docs/PAYMENT_PREREQUISITES.md

alter table public.jobs
  add column if not exists stripe_dispute_id text;

create unique index if not exists jobs_stripe_dispute_id_key
  on public.jobs (stripe_dispute_id)
  where stripe_dispute_id is not null;

comment on column public.jobs.stripe_dispute_id is
  'Stripe Dispute id (dp_...) when a card chargeback opens; set by charge.dispute.created webhook.';
