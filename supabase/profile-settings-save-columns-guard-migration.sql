-- Guard migration: columns written by saveProfileSettingsAction (app/profile/actions.ts)
-- via buildProfileSettingsSupabasePayload (lib/profile-settings-payload.ts).
-- Idempotent — safe if you already ran shared-profile, ux-fixes, profile-role-fields,
-- waiter-preferred-categories, and legal-foundation migrations.

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists profile_completed boolean not null default false;
alter table public.profiles add column if not exists preferred_categories text[] not null default array[]::text[];
alter table public.profiles add column if not exists contact_preference text;
alter table public.profiles add column if not exists accepted_worker_agreement_version text;
alter table public.profiles add column if not exists independent_contractor_acknowledged_at timestamptz;
alter table public.profiles add column if not exists tax_responsibility_acknowledged_at timestamptz;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
