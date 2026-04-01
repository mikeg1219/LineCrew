-- Backfill profile_completed for accounts that already have core fields
-- (matches app logic in saveProfileSettingsAction: first_name, display_name, phone).
-- Run once after deploying shared-profile-migration / profile gating.

update public.profiles
set profile_completed = true
where profile_completed is distinct from true
  and trim(coalesce(first_name, '')) <> ''
  and trim(coalesce(display_name, '')) <> ''
  and trim(coalesce(phone, '')) <> '';
