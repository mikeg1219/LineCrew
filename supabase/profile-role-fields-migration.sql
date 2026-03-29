-- Customer / waiter profile extensions on public.profiles (run after shared-profile-migration / ux-fixes).
-- Nullable except where a safe default is required for NOT NULL.

-- Customer-oriented (nullable)
alter table public.profiles add column if not exists preferred_airport text;
alter table public.profiles add column if not exists traveler_notes text;
alter table public.profiles add column if not exists contact_preference text;

-- Waiter: bio is already public.profiles.bio (shared-profile-migration)

alter table public.profiles add column if not exists home_airport text;
alter table public.profiles add column if not exists airports_served text[];

alter table public.profiles add column if not exists is_available boolean not null default true;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists jobs_completed integer not null default 0;
alter table public.profiles add column if not exists average_rating numeric(4, 2);

comment on column public.profiles.preferred_airport is 'Customer: primary airport context (e.g. IATA).';
comment on column public.profiles.traveler_notes is 'Customer: free-text preferences.';
comment on column public.profiles.contact_preference is 'Customer: e.g. email, sms.';
comment on column public.profiles.home_airport is 'Waiter: primary airport.';
comment on column public.profiles.airports_served is 'Waiter: optional list; see also serving_airports (legacy).';
comment on column public.profiles.is_available is 'Waiter: accepting job notifications.';
comment on column public.profiles.onboarding_completed is 'Waiter: finished in-app onboarding.';
comment on column public.profiles.jobs_completed is 'Waiter: completed job count cache.';
comment on column public.profiles.average_rating is 'Waiter: rolling average rating; null if none.';
