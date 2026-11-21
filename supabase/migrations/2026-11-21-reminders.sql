-- Reminder settings (Phase 4) — Supabase SQL Editor မှာ run ပေးပါ။
-- profiles ထဲ သတိပေးချိန် ၄ ခု + ဖွင့်/ပိတ် ထည့်တယ်။
alter table public.profiles
  add column if not exists reminders_enabled boolean not null default false,
  add column if not exists reminder_breakfast_time time not null default '08:00',
  add column if not exists reminder_lunch_time time not null default '12:30',
  add column if not exists reminder_dinner_time time not null default '19:00',
  add column if not exists reminder_evening_time time not null default '21:00';

-- တစ်နေ့တည်း သတိပေးစာ ထပ်မပို့အောင် မှတ်တဲ့ စာရင်း —
-- (user_id, kind, logged_date) တစ်မျိုးတည်း တစ်ခါပဲ ပို့တယ်။
create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  logged_date date not null,
  sent_at timestamptz default now(),
  unique (user_id, kind, logged_date)
);
alter table public.reminder_logs enable row level security;
create policy "own reminder logs" on public.reminder_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
