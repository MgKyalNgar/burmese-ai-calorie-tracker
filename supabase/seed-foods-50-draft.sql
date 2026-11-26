-- Burmese AI Calorie Tracker — 50-food draft: 28 NEW foods (RUN 24 Nov 2026 — LIVE, 88 foods verified)
-- Prepared 24 Nov 2026 by Chopper — from ~/workspace/your_files/NotebookLM-အစားအစာ-၅၀-ကယ်လိုရီ-macros.txt
-- RUN 24 Nov 2026 by the user in the Supabase dashboard SQL Editor; count
-- verified 88 via REST (60 seed + 28 new). Safe to re-run: guarded by
-- WHERE NOT EXISTS on name_mm, so already-present foods are skipped.
-- NOT yet in the GitHub repo — the snapshot sync does not include supabase/seed files.
--
-- VALUES RE-CHECKED 24 Nov 2026 against independent sources (USDA FoodData
-- Central, nutrition databases, Burmese food tables, recipe estimates, and a
-- 2008 Myanmar lab study for ရွှေထမင်း / မုန့်ကျွဲသည်း / ထန်းသီးမုန့် /
-- မုန့်စိမ်းပေါင်း). The draft's numbers were inflated across the board and are
-- now corrected to the live seed's scale (per-100g, whole numbers;
-- kcal ≈ P×4 + C×4 + F×9). RUN 24 Nov 2026 in Supabase — live, 88 foods
-- verified; not yet pushed to GitHub. Serving sizes corrected where clearly wrong
-- (7 items — see the coordinator's report).
--
-- HISTORY — spot-checks from the first pass (24 Nov 2026), kept for reference:
--   မုန့်ဟင်းခါး: seed 85 / draft 156 / independent 80-93 kcal per 100g
--     (menutrition.app 85, dinneridea.net 80, besinanaliz.com 93.2)
--   လက်ဖက်သုပ်: seed 120 / draft 478.5 / independent ~133-230 kcal per 100g
--     (menutrition.app 230, besinanaliz.com 198.4, snapcalorie ~133)
--   The draft's 478.5 for လက်ဖက်သုပ် looks like a PER-SERVING (~200g) value
--   mislabelled as per-100g. Draft မုန့်စိမ်းပေါင်း protein 40.0g/100g was
--   confirmed implausible — the 2008 lab paper measured it at P4.13/C39.95/
--   F1.88, energy 187.21, so it is now 190/4/39/2.
--
-- WHAT WAS COMPARED (50 draft vs 60 seed, by Myanmar name):
--   12 exact overlaps — already in the seed, DO NOT re-add (seed values stay):
--     မုန့်ဟင်းခါး, အုန်းနို့ခေါက်ဆွဲ, စမူဆာ, ရခိုင်မုန့်တီ, လက်ဖက်သုပ်,
--     ဂျင်းသုပ်, တို့ဟူးသုပ်, ခရမ်းချဉ်သီးသုပ်, နန်းကြီးသုပ်,
--     ရွှေရင်အေး, မုန့်လက်ဆောင်း, မုန့်လုံးရေပေါ်
--   10 near-duplicates — same dish under a variant name, DO NOT add as new:
--     ထမင်းဖြူ (= ထမင်း), ပဲပလာတာ (= ပလာတာ),
--     ကြက်သားဆီပြန်ဟင်း (= ကြက်သားဟင်း), ဝက်သားဆီပြန်ဟင်း (= ဝက်သားဟင်း),
--     အမဲသားနှပ် (= အမဲသားဟင်း), ငါးကြင်းဆီပြန်ဟင်း (= ငါးဟင်း),
--     ပုဇွန်ဆီပြန်ဟင်း (= ပုစွန်ဟင်း), ကြက်သားဒံပေါက် (= ဒန်ပေါက်),
--     မြန်မာ့ရိုးရာ လက်ဖက်ရည် (ချိုကျ) (= လက်ဖက်ရည်), ကြံရည် (= ကြံခဲရည်)
--   28 genuinely new — listed below. serving_desc follows the same
--   "၁ ပွဲ (~500g)" format so the ၁ ပွဲ / တစ်ဝက် buttons work for them too.
--
-- Run in the Supabase Dashboard > SQL Editor of the NEW project
-- (https://flcecrvwnhrgduvdzxgu.supabase.co) — only AFTER values are verified.
-- Safe to re-run: rows are skipped when a food with the same Myanmar
-- name already exists.

insert into foods (user_id, name_mm, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_desc)
select null, v.name_mm, v.name_en, v.kcal, v.pro, v.carb, v.fat, v.serving
from (values
  ('ပဲပြုတ်ထမင်းကြော်', 'Boiled Pea Fried Rice', 180, 5, 27, 6, '၁ ပွဲ (~350g)'),
  ('အီကြာကွေး', 'Youtiao (Chinese Cruller)', 370, 8, 47, 17, '၁ ချောင်း (~60g)'),
  ('သကြားပလာတာ', 'Sweet Paratha', 350, 6, 40, 19, '၁ ချပ် (~100g)'),
  ('ဘယာကြော်', 'Burmese Fritters (Baya Kyaw)', 275, 5, 28, 16, '၁ ပန်းကန် (~100g)'),
  ('ငှက်ပျောကြော်', 'Fried Banana', 250, 2, 40, 9, '၁ ခု (~80g)'),
  ('ပဲပြုတ်နံပြား', 'Pea Nan Bread', 270, 10, 44, 6, '၁ ချပ် (~100g)'),
  ('မုန့်စိမ်းပေါင်း', 'Steamed Rice Cake (Mont Sein Paung)', 190, 4, 39, 2, '၁ ပွဲ (~200g)'),
  ('ဘိန်းမုန့်', 'Poppy Seed Cake (Bein Mont)', 220, 3, 38, 6, '၁ ခု (~80g)'),
  ('ဝက်သားပေါက်စီ', 'Pork Steamed Bun (Pauk Si)', 230, 9, 31, 7.5, '၁ လုံး (~120g)'),
  ('ကောက်ညှင်းပေါင်း', 'Steamed Sticky Rice Cake', 200, 3, 46, 1, '၁ ထုပ် (~150g)'),
  ('ချဉ်ပေါင်ကြော်', 'Stir-fried Roselle', 100, 3, 8, 7, '၁ ပန်းကန် (~150g)'),
  ('ကန်စွန်းရွက်ကြော်', 'Stir-fried Morning Glory', 85, 2.5, 5.5, 6, '၁ ပန်းကန် (~150g)'),
  ('ပဲနီလေးဟင်းချို', 'Red Lentil Soup', 75, 3.5, 11, 2, '၁ ခွက် (~200ml)'),
  ('ငပိရည်ဖျော်', 'Ngapi Dip', 45, 6, 3, 1, '၁ ခွက် (~50g)'),
  ('ဝက်သားဒုတ်ထိုး', 'Pork Skewers', 230, 20, 5, 14, '၁ ချောင်း (~45g)'),
  ('ထောပတ်ထမင်း', 'Butter Rice', 165, 3, 27, 5, '၁ ပန်းကန် (~200g)'),
  ('ကြေးအိုးအရည်', 'Kyae Oh (Noodle Soup)', 115, 7, 13, 4, '၁ ပွဲ (~400g)'),
  ('ကြေးအိုးဆီချက်', 'Kyae Oh Si Chat', 175, 8, 22, 6, '၁ ပွဲ (~350g)'),
  ('သခွားသီးသုပ်', 'Cucumber Salad', 70, 2, 6, 4, '၁ ပန်းကန် (~150g)'),
  ('သင်္ဘောသီးသုပ်', 'Papaya Salad', 85, 3, 13, 3, '၁ ပန်းကန် (~200g)'),
  ('မြင်းခွာရွက်သုပ်', 'Pennywort Salad', 115, 4, 9, 7, '၁ ပန်းကန် (~150g)'),
  ('မန္တလေးမြီးရှည်', 'Mandalay Mee Shay', 140, 7, 18, 5, '၁ ပွဲ (~400g)'),
  ('ကြာဆံသုပ်', 'Glass Noodle Salad', 130, 5, 19, 4, '၁ ပန်းကန် (~200g)'),
  ('ဆနွင်းမကင်း / ရွှေကြည်', 'Turmeric Cake (Shwe Kyi)', 320, 5, 45, 13, '၁ တုံး (~100g)'),
  ('ရွှေထမင်း', 'Shwe Htamin (Golden Sticky Rice)', 175, 3.5, 38, 1, '၁ ပွဲ (~200g)'),
  ('မုန့်ကျွဲသည်း', 'Mont Kywel Thee', 90, 2, 19, 1, '၁ ပန်းကန် (~120g)'),
  ('မုန့်ဆီကြော်', 'Mont Si Kyaw (Fried Sweet Cake)', 310, 4, 45, 13, '၁ ခု (~50g)'),
  ('ထန်းသီးမုန့်', 'Toddy Palm Cake', 145, 3, 30, 1.5, '၁ ခု (~80g)')
) as v(name_mm, name_en, kcal, pro, carb, fat, serving)
where not exists (
  select 1 from foods f where f.name_mm = v.name_mm and f.user_id is null
);

-- စစ်ရန်: select count(*) from foods where user_id is null;  -- 88 ဖြစ်ရမယ် (60 + 28)
