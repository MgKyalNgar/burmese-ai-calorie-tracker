-- Burmese AI Calorie Tracker — Myanmar foods seed (60 items)
-- Run this in the Supabase Dashboard > SQL Editor of the NEW project
-- (https://flcecrvwnhrgduvdzxgu.supabase.co) — SQL Editor runs as
-- postgres and bypasses RLS, so global rows (user_id NULL) can be
-- inserted here. Do NOT run against the StarFish project.
--
-- Values are per 100g (100ml for drinks) and are ESTIMATES from common
-- nutrition tables, rounded for a food-logging app — not lab values.
-- serving_desc is a typical single serving for the Review stepper.
-- Safe to re-run: rows are skipped when a food with the same Myanmar
-- name already exists.

insert into foods (user_id, name_mm, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_desc)
select null, v.name_mm, v.name_en, v.kcal, v.pro, v.carb, v.fat, v.serving
from (values
  ('မုန့်ဟင်းခါး', 'Mohinga', 85, 4, 13, 2, '၁ ပွဲ (~500g)'),
  ('ရှမ်းခေါက်ဆွဲ', 'Shan Noodles', 110, 5, 18, 2, '၁ ပွဲ (~400g)'),
  ('အုန်းနို့ခေါက်ဆွဲ', 'Coconut Noodles', 120, 4, 15, 5, '၁ ပွဲ (~400g)'),
  ('နန်းကြီးသုပ်', 'Nangyi Salad', 130, 5, 20, 3, '၁ ပွဲ (~350g)'),
  ('နန်းပြားသုပ်', 'Nanpya Salad', 125, 4, 19, 3, '၁ ပွဲ (~350g)'),
  ('တို့ဟူးနွေး', 'Tofu Nway', 95, 5, 10, 4, '၁ ပွဲ (~350g)'),
  ('မုန့်တီ', 'Mont Ti', 90, 4, 14, 2, '၁ ပွဲ (~400g)'),
  ('ရခိုင်မုန့်တီ', 'Rakhine Mont Ti', 95, 5, 14, 2, '၁ ပွဲ (~400g)'),
  ('ကြာဇံဟင်းခါး', 'Glass Noodle Soup', 60, 3, 10, 1, '၁ ပွဲ (~400g)'),
  ('ဆီချက်', 'Fried Noodles (Si Chat)', 180, 5, 25, 7, '၁ ပွဲ (~350g)'),
  ('ကြက်ဆီထမင်း', 'Chicken Rice', 150, 7, 20, 5, '၁ ပွဲ (~400g)'),
  ('ထမင်း', 'Cooked Rice', 130, 2.7, 28, 0.3, '၁ ပန်းကန် (~200g)'),
  ('ထမင်းကြော်', 'Fried Rice', 170, 4, 26, 6, '၁ ပွဲ (~350g)'),
  ('ငါးထမင်းနယ်', 'Fish Rice Mix', 140, 6, 22, 3, '၁ ပွဲ (~350g)'),
  ('အုန်းထမင်း', 'Coconut Rice', 180, 3, 30, 6, '၁ ပန်းကန် (~200g)'),
  ('ဒန်ပေါက်', 'Danpauk (Biryani)', 170, 6, 24, 6, '၁ ပွဲ (~400g)'),
  ('လက်ဖက်သုပ်', 'Tea Leaf Salad', 120, 3, 8, 9, '၁ ပန်းကန် (~150g)'),
  ('ဂျင်းသုပ်', 'Ginger Salad', 110, 2, 10, 7, '၁ ပန်းကန် (~150g)'),
  ('ပဲပြုတ်သုပ်', 'Boiled Pea Salad', 130, 7, 18, 3, '၁ ပန်းကန် (~200g)'),
  ('တို့ဟူးသုပ်', 'Tofu Salad', 100, 6, 6, 6, '၁ ပန်းကန် (~150g)'),
  ('ခရမ်းချဉ်သီးသုပ်', 'Tomato Salad', 50, 1, 8, 2, '၁ ပန်းကန် (~150g)'),
  ('သရက်သီးသုပ်', 'Mango Salad', 70, 1, 15, 1, '၁ ပန်းကန် (~150g)'),
  ('ငါးဖယ်သုပ်', 'Fish Cake Salad', 90, 8, 8, 3, '၁ ပန်းကန် (~150g)'),
  ('ပုစွန်သုပ်', 'Shrimp Salad', 85, 10, 6, 2, '၁ ပန်းကန် (~150g)'),
  ('ကြက်သားသုပ်', 'Chicken Salad', 120, 15, 4, 5, '၁ ပန်းကန် (~150g)'),
  ('အမဲသားသုပ်', 'Beef Salad', 140, 16, 3, 7, '၁ ပန်းကန် (~150g)'),
  ('ဝက်သားသုပ်', 'Pork Salad', 160, 14, 3, 10, '၁ ပန်းကန် (~150g)'),
  ('ကြက်သားဟင်း', 'Chicken Curry', 140, 12, 4, 9, '၁ ခွက် (~150g)'),
  ('ဝက်သားဟင်း', 'Pork Curry', 200, 12, 3, 16, '၁ ခွက် (~150g)'),
  ('အမဲသားဟင်း', 'Beef Curry', 180, 15, 3, 12, '၁ ခွက် (~150g)'),
  ('ငါးဟင်း', 'Fish Curry', 110, 12, 3, 6, '၁ ခွက် (~150g)'),
  ('ပုစွန်ဟင်း', 'Shrimp Curry', 100, 11, 3, 5, '၁ ခွက် (~150g)'),
  ('ဟင်းချို', 'Clear Soup', 30, 2, 4, 1, '၁ ခွက် (~200ml)'),
  ('ကြက်ဥပြုတ်', 'Boiled Egg', 155, 13, 1, 11, '၁ လုံး (~50g)'),
  ('ကြက်ဥကြော်', 'Fried Egg', 200, 13, 1, 16, '၁ လုံး (~50g)'),
  ('ဘဲဥ', 'Duck Egg', 185, 13, 1, 14, '၁ လုံး (~70g)'),
  ('ငချိပ်ပေါင်း', 'Steamed Sticky Rice', 150, 3, 33, 0.5, '၁ ထုပ် (~150g)'),
  ('စမူဆာ', 'Samosa', 280, 6, 32, 14, '၁ ခု (~80g)'),
  ('ပလာတာ', 'Paratha', 300, 6, 40, 13, '၁ ချပ် (~100g)'),
  ('နံပြား', 'Nan Bread', 290, 8, 55, 5, '၁ ချပ် (~100g)'),
  ('ချာပါတီ', 'Chapati', 270, 8, 50, 5, '၁ ချပ် (~80g)'),
  ('ဗမာကြက်ကြော်', 'Burmese Fried Chicken', 260, 18, 8, 17, '၁ တုံး (~150g)'),
  ('ငါးကြော်', 'Fried Fish', 200, 18, 5, 12, '၁ တုံး (~150g)'),
  ('ပုစွန်ကြော်', 'Fried Shrimp', 180, 16, 8, 9, '၁ ပန်းကန် (~150g)'),
  ('တို့ဟူးကြော်', 'Fried Tofu', 180, 10, 8, 13, '၁ ပန်းကန် (~150g)'),
  ('ငါးခြောက်', 'Dried Fish', 250, 45, 0, 7, '၁ ပန်းကန် (~50g)'),
  ('မြေပဲပြုတ်', 'Boiled Peanuts', 300, 13, 20, 22, '၁ ခွက် (~100g)'),
  ('ငှက်ပျောသီး', 'Banana', 89, 1, 23, 0.3, '၁ လုံး (~100g)'),
  ('သရက်သီး', 'Mango', 60, 0.8, 15, 0.4, '၁ လုံး (~150g)'),
  ('ဖရဲသီး', 'Watermelon', 30, 0.6, 8, 0.2, '၁ စိတ် (~200g)'),
  ('လိမ္မော်', 'Orange', 47, 0.9, 12, 0.1, '၁ လုံး (~130g)'),
  ('ပန်းသီး', 'Apple', 52, 0.3, 14, 0.2, '၁ လုံး (~150g)'),
  ('နွားနို့', 'Milk', 60, 3.2, 4.8, 3.3, '၁ ခွက် (~200ml)'),
  ('လက်ဖက်ရည်', 'Milk Tea', 80, 2, 10, 4, '၁ ခွက် (~200ml)'),
  ('ကော်ဖီ', 'Coffee (milk + sugar)', 45, 1, 7, 1.5, '၁ ခွက် (~200ml)'),
  ('သံပရာရည်', 'Lemon Juice', 40, 0.2, 10, 0.1, '၁ ခွက် (~200ml)'),
  ('ကြံခဲရည်', 'Sugarcane Juice', 45, 0.2, 11, 0, '၁ ခွက် (~200ml)'),
  ('မုန့်လက်ဆောင်း', 'Mont Lat Saung', 110, 2, 22, 2, '၁ ခွက် (~200g)'),
  ('ရွှေရင်အေး', 'Shwe Yin Aye', 120, 2, 24, 2, '၁ ခွက် (~200g)'),
  ('မုန့်လုံးရေပေါ်', 'Mont Lone Yay Paw', 150, 2, 32, 1, '၁ ပွဲ (~150g)')
) as v(name_mm, name_en, kcal, pro, carb, fat, serving)
where not exists (
  select 1 from foods f where f.name_mm = v.name_mm and f.user_id is null
);

-- စစ်ရန်: select count(*) from foods where user_id is null;  -- 60 ဖြစ်ရမယ်
