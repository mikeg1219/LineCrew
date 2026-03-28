-- LineCrew: profiles + automatic row on signup (run once in Supabase SQL Editor)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'waiter')),
  created_at timestamptz not null default now(),
  stripe_account_id text
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'customer');
  if r not in ('customer', 'waiter') then
    r := 'customer';
  end if;
  insert into public.profiles (id, role) values (new.id, r);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
