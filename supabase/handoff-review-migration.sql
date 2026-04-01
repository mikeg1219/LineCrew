alter table public.jobs
  add column if not exists handoff_escalated_at timestamptz,
  add column if not exists handoff_reviewed_at timestamptz,
  add column if not exists handoff_reviewed_by text,
  add column if not exists handoff_review_notes text;

create index if not exists jobs_handoff_escalated_at_idx on public.jobs (handoff_escalated_at);
create index if not exists jobs_handoff_reviewed_at_idx on public.jobs (handoff_reviewed_at);
