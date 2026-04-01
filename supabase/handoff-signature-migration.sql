alter table public.jobs
  add column if not exists handoff_nonce text;

create index if not exists jobs_handoff_nonce_idx on public.jobs (handoff_nonce);
