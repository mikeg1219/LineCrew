-- Add persisted waiter category preferences for browse-job filtering.
alter table public.profiles
  add column if not exists preferred_categories text[] not null default array[]::text[];

comment on column public.profiles.preferred_categories is
  'Line Holder preferred booking categories (labels from BOOKING_CATEGORIES).';
