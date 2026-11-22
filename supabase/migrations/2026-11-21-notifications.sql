-- Noti ခေါင်းလောင်း (in-app) — reminder_logs ထဲ စာသား + ဖတ်ပြီးမှတ်ချက် ထည့်တယ်။
-- Supabase SQL Editor မှာ run ပေးပါ။ (ပို့ပြီးသား noti တွေကို app ထဲမှာ ပြန်ပြဖို့)
alter table public.reminder_logs
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists read_at timestamptz;
