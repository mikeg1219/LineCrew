-- Legal foundation (versioned policy docs + acceptance logging + profile/job legal fields)

create table if not exists public.policy_documents (
  id bigserial primary key,
  type text not null check (type in ('terms', 'privacy', 'worker_agreement', 'refund_policy', 'guidelines')),
  version text not null,
  effective_date timestamptz not null default now(),
  content_reference text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists policy_documents_type_version_idx
  on public.policy_documents(type, version);

create table if not exists public.policy_acceptances (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid null references public.jobs(id) on delete set null,
  policy_type text not null check (policy_type in ('terms', 'privacy', 'worker_agreement', 'refund_policy', 'guidelines', 'booking_disclaimer')),
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text null,
  user_agent text null,
  role text null check (role in ('customer', 'waiter')),
  acceptance_context text not null default 'unknown'
);

create index if not exists policy_acceptances_user_idx
  on public.policy_acceptances(user_id, accepted_at desc);

create index if not exists policy_acceptances_booking_idx
  on public.policy_acceptances(booking_id);

alter table public.profiles
  add column if not exists accepted_terms_version text,
  add column if not exists accepted_privacy_version text,
  add column if not exists accepted_worker_agreement_version text,
  add column if not exists accepted_terms_at timestamptz,
  add column if not exists accepted_privacy_at timestamptz,
  add column if not exists independent_contractor_acknowledged_at timestamptz,
  add column if not exists tax_responsibility_acknowledged_at timestamptz;

alter table public.jobs
  add column if not exists booking_terms_acknowledged_at timestamptz,
  add column if not exists booking_disclaimer_acknowledged_at timestamptz,
  add column if not exists category_specific_disclaimer_version text,
  add column if not exists refund_policy_version text;
