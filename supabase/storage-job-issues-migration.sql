-- Public bucket for job issue photo attachments (server uploads via service role).
-- Run in Supabase SQL Editor once.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-issues',
  'job-issues',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read job issue photos" on storage.objects;
create policy "Public read job issue photos"
  on storage.objects for select
  using (bucket_id = 'job-issues');
