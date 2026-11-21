-- ရေ ပန်းတိုင် (တစ်နေ့ ဘယ်နှစ်ခွက် သောက်မလဲ) —
-- Supabase SQL Editor မှာ run ပေးပါ။ profiles ထဲ daily_water_goal
-- ကော်လံ ထပ်ထည့်တယ် (မရှိသေးရင်)။ default 8 ခွက်။
alter table public.profiles
  add column if not exists daily_water_goal integer not null default 8
  check (daily_water_goal between 1 and 20);
