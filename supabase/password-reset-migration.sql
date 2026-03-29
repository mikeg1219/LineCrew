-- Password reset tokens (hashed). Run in Supabase SQL Editor after reviewing.

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  code_expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_token_hash_idx
  on public.password_reset_tokens (token_hash)
  where used_at is null;

create index if not exists password_reset_tokens_user_created_idx
  on public.password_reset_tokens (user_id, created_at desc);

alter table public.password_reset_tokens enable row level security;

create table if not exists public.password_reset_rate_limits (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_rate_limits_email_created_idx
  on public.password_reset_rate_limits (email_hash, created_at desc);

alter table public.password_reset_rate_limits enable row level security;

-- Service role only (PostgREST uses anon/authenticated; server uses service_role for inserts).
-- No policies: anon/authenticated cannot access via API.

create or replace function public.auth_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth
stable
as $$
  select id from users
  where lower(trim(email)) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.auth_user_id_by_email(text) from public;
grant execute on function public.auth_user_id_by_email(text) to service_role;
