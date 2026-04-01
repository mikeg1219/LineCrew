-- Seed active policy_documents rows to match lib/legal.ts POLICY_VERSIONS (core policies only).
-- Safe to re-run: skips if (type, version) already exists.
-- Run after: legal-foundation-migration.sql

insert into public.policy_documents (type, version, effective_date, content_reference, is_active)
values
  ('terms', '2026-03-31.1', timestamptz '2026-03-31 00:00:00+00', '/legal/terms', true),
  ('privacy', '2026-03-31.1', timestamptz '2026-03-31 00:00:00+00', '/legal/privacy', true),
  ('refund_policy', '2026-03-31.1', timestamptz '2026-03-31 00:00:00+00', '/legal/cancellation-refunds', true),
  ('guidelines', '2026-03-31.1', timestamptz '2026-03-31 00:00:00+00', '/legal/community-guidelines', true),
  ('worker_agreement', '2026-03-31.1', timestamptz '2026-03-31 00:00:00+00', '/legal/line-holder-agreement', true)
on conflict (type, version) do nothing;
