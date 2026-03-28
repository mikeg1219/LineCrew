-- LineCrew: add overage fields to jobs (run in Supabase SQL Editor on existing databases)

alter table public.jobs
  add column if not exists overage_rate numeric(10, 2) not null default 10
    check (overage_rate >= 5);

alter table public.jobs
  add column if not exists overage_agreed boolean not null default false;

comment on column public.jobs.overage_rate is 'USD charged per 30 min of extra wait time';
comment on column public.jobs.overage_agreed is 'Customer agreed to pay extra time rate when posting';
