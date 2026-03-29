-- Shared profile fields for customers and waiters (run after schema + email-verification + ux-fixes).
-- id references auth.users and is the account user id.

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists last_initial text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists profile_completed boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- phone may already exist (ux-fixes-migration.sql)
alter table public.profiles add column if not exists phone text;

update public.profiles
set display_name = coalesce(display_name, full_name)
where display_name is null and full_name is not null;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

comment on column public.profiles.display_name is 'Shown in UI; may mirror full_name.';
comment on column public.profiles.profile_completed is 'Core identity/contact filled for the user.';
