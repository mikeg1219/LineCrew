alter table public.jobs
  add column if not exists handoff_qr_token_hash text,
  add column if not exists handoff_code_hash text,
  add column if not exists handoff_qr_used_at timestamptz,
  add column if not exists handoff_verification_attempts integer not null default 0,
  add column if not exists handoff_confidence_score integer;

create index if not exists jobs_handoff_qr_used_at_idx on public.jobs (handoff_qr_used_at);
