-- Booking-scoped outbound contact log (masked SMS MVP; phones never stored here)
-- Run after public.jobs exists.

create table if not exists public.booking_contact_outbound (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  initiated_by uuid not null references auth.users (id) on delete cascade,
  recipient_role text not null check (recipient_role in ('customer', 'waiter')),
  body_excerpt text not null,
  twilio_message_sid text,
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'sent', 'skipped', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists booking_contact_outbound_job_id_idx
  on public.booking_contact_outbound (job_id, created_at desc);

create index if not exists booking_contact_outbound_initiated_idx
  on public.booking_contact_outbound (initiated_by, created_at desc);

alter table public.booking_contact_outbound enable row level security;

create policy "booking_contact_select_participants"
  on public.booking_contact_outbound for select
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (j.customer_id = auth.uid() or j.waiter_id = auth.uid())
    )
  );

create policy "booking_contact_insert_participant"
  on public.booking_contact_outbound for insert
  with check (
    initiated_by = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (j.customer_id = auth.uid() or j.waiter_id = auth.uid())
    )
  );

grant select, insert on public.booking_contact_outbound to authenticated;
