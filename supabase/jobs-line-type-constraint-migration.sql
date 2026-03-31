-- LineCrew: align jobs.line_type check constraint with current app options
-- Run in Supabase SQL Editor (production-safe; repeatable)

alter table public.jobs drop constraint if exists jobs_line_type_check;

alter table public.jobs add constraint jobs_line_type_check check (
  line_type in (
    -- Current app values (lib/jobs/options.ts)
    'Check-In (Ticket Counter)',
    'Bag Drop (Checked Bags)',
    'Flight Changes / Customer Service',
    'Security Line (Standard)',
    'Security Line (PreCheck / CLEAR)',
    'Gate Agent (Seat / Upgrade / Standby)',
    'Gate Agent (Delay / Cancellation Help)',
    'Rental Car Pickup',
    'Taxi / Rideshare Line',
    'Food / Coffee Line',
    'Lounge Entry Waitlist',
    'Other (Describe your line)',
    -- Legacy values kept for backward compatibility with older rows/forms
    'Security',
    'Check-In',
    'Bag Drop',
    'Customs',
    'TSA PreCheck'
  )
);
