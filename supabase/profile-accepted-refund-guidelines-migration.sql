-- Store accepted Refund Policy and Community Guidelines versions on profiles (parity with terms/privacy).

alter table public.profiles
  add column if not exists accepted_refund_policy_version text,
  add column if not exists accepted_guidelines_version text,
  add column if not exists accepted_refund_policy_at timestamptz,
  add column if not exists accepted_guidelines_at timestamptz;
