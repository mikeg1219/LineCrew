-- Email verification for new accounts. Run once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists email_verified_at timestamptz;

-- Existing accounts: treat as already verified (backward compatibility).
update public.profiles
set email_verified_at = coalesce(email_verified_at, created_at)
where email_verified_at is null;

create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  code_expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_tokens_token_hash_idx
  on public.email_verification_tokens (token_hash)
  where used_at is null;

create index if not exists email_verification_tokens_user_created_idx
  on public.email_verification_tokens (user_id, created_at desc);

alter table public.email_verification_tokens enable row level security;

create table if not exists public.email_verification_rate_limits (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_rate_limits_email_created_idx
  on public.email_verification_rate_limits (email_hash, created_at desc);

alter table public.email_verification_rate_limits enable row level security;
