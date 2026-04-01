alter table public.jobs
  add column if not exists handoff_method text,
  add column if not exists handoff_qr_token text,
  add column if not exists handoff_qr_expires_at timestamptz,
  add column if not exists handoff_code text,
  add column if not exists worker_ready_at timestamptz,
  add column if not exists customer_arrived_at timestamptz,
  add column if not exists qr_scanned_at timestamptz,
  add column if not exists worker_confirmed_at timestamptz,
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists completion_location text,
  add column if not exists proximity_passed boolean default false,
  add column if not exists handoff_issue_flag boolean default false,
  add column if not exists handoff_issue_reason text,
  add column if not exists handoff_notes text;

create index if not exists jobs_handoff_qr_token_idx on public.jobs (handoff_qr_token);
