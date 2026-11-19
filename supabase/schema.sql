# Burmese AI Calorie Tracker — Supabase schema (Phase 0)
# Run this in the NEW Supabase project's SQL Editor (Dashboard > SQL Editor).
# Do NOT run against the StarFish project. RLS: every row belongs to its user.

-- 1. profiles (one row per auth user)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  gender text check (gender in ('male', 'female', 'other')),
  age int,
  height_cm numeric,
  weight_kg numeric,
  goal text check (goal in ('lose', 'maintain', 'gain')),
  activity_level text,
  daily_calorie_target int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2. user_api_keys (BYO Gemini key, ENCRYPTED server-side only)
create table if not exists user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  encrypted_key text not null,
  key_hint text,
  is_active boolean default true,
  last_tested_at timestamptz,
  test_status text,
  created_at timestamptz default now(),
  unique (user_id, is_active)
);
alter table user_api_keys enable row level security;
create policy "own keys" on user_api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. meals
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url text,
  source text check (source in ('photo', 'text', 'search')),
  total_calories numeric default 0,
  total_protein numeric default 0,
  total_carbs numeric default 0,
  total_fat numeric default 0,
  ai_confidence text check (ai_confidence in ('high', 'medium', 'low')),
  status text default 'confirmed' check (status in ('draft', 'confirmed')),
  ai_result jsonb,
  created_at timestamptz default now()
);
alter table meals enable row level security;
create policy "own meals" on meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. meal_items
create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals (id) on delete cascade,
  food_id uuid references foods (id),
  food_name_mm text,
  food_name_en text,
  amount numeric,
  unit text,
  calories numeric default 0,
  protein numeric default 0,
  carbs numeric default 0,
  fat numeric default 0,
  fiber numeric default 0,
  sugar numeric default 0,
  sodium numeric default 0,
  is_ai_detected boolean default true,
  user_edited boolean default false
);
alter table meal_items enable row level security;
create policy "own meal items" on meal_items
  for all using (
    exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid())
  );

-- 5. foods (user_id null = global shared food)
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name_mm text not null,
  name_en text,
  barcode text,
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  serving_desc text,
  created_at timestamptz default now()
);
alter table foods enable row level security;
create policy "read global or own foods" on foods
  for select using (user_id is null or auth.uid() = user_id);
create policy "insert own foods" on foods
  for insert with check (auth.uid() = user_id);

-- 6. weight_logs
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_date date not null,
  weight_kg numeric not null,
  created_at timestamptz default now()
);
alter table weight_logs enable row level security;
create policy "own weight" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. water_logs
create table if not exists water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_date date not null,
  cups int not null default 1,
  created_at timestamptz default now()
);
alter table water_logs enable row level security;
create policy "own water" on water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. push_subscriptions (Web Push reminders, MVP Phase 4)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text,
  auth text,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);
alter table push_subscriptions enable row level security;
create policy "own push subs" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for meal photos (create in Dashboard > Storage if SQL cannot):
-- insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', false);
