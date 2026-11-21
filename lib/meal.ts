// Meal / food အမျိုးအစားနဲ့ ဘုံသုံးတဲ့ helper တွေ —
// Add, Review, Diary စာမျက်နှာတွေမှာ တူညီတဲ့ ပုံစံသုံးဖို့။

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "မနက်စာ" },
  { value: "lunch", label: "နေ့လည်စာ" },
  { value: "dinner", label: "ညစာ" },
  { value: "snack", label: "အဆာပြေ" },
];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "မနက်စာ",
  lunch: "နေ့လည်စာ",
  dinner: "ညစာ",
  snack: "အဆာပြေ",
};

// Gemini / Search က ပြန်တဲ့ အစားအစာ တစ်ခု။
export interface AnalyzedFood {
  name_mm: string;
  name_en: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string;
}

// Supabase က ပြန်လာတဲ့ meals + meal_items row ပုံစံ။
export interface MealItemRow {
  id: string;
  meal_id: string;
  food_id: string | null;
  food_name_mm: string | null;
  food_name_en: string | null;
  amount: number | null;
  unit: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface MealRow {
  id: string;
  meal_type: string;
  photo_url: string | null;
  source: string | null;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  created_at: string;
  meal_items: MealItemRow[];
}

// /api/profile က ပြန်တဲ့ Profile ဒေတာ ပုံစံ။
export interface ProfileData {
  email: string | null;
  profile: {
    display_name: string | null;
    gender: string | null;
    age: number | null;
    height_cm: number | null;
    weight_kg: number | null;
    goal: string | null;
    daily_calorie_target: number | null;
  } | null;
  needsLogin?: boolean;
}

// /api/today က ပြန်တဲ့ Home ဒေတာ ပုံစံ။
export interface TodayData {
  date: string;
  displayName: string;
  target: number;
  eaten: number;
  protein: number;
  carbs: number;
  fat: number;
  cups: number;
  waterGoal: number;
  latestWeightKg: number | null;
  streak: number;
  meals: {
    id: string;
    meal_type: string;
    total_calories: number | null;
    name_mm: string | null;
  }[];
  needsLogin?: boolean;
  needsOnboarding?: boolean;
}

// /api/diary က ပြန်တဲ့ Diary ဒေတာ ပုံစံ။
export interface DiaryData {
  date: string;
  meals: MealRow[];
  needsLogin?: boolean;
  needsOnboarding?: boolean;
}

// /api/progress က ပြန်တဲ့ Progress ဒေတာ ပုံစံ။
export interface ProgressData {
  week: { date: string; eaten: number; target: number }[];
  weights: { date: string; kg: number }[];
  waterWeek: { date: string; cups: number }[];
  waterGoal: number;
  loggedDays: string[];
  needsLogin?: boolean;
  needsOnboarding?: boolean;
}

// ရက်စွဲကို မြန်မာ Date-Month-Year ပုံစံနဲ့ ပြတယ် — "20 Nov 2026"။
// (အရင် en-CA "2026-11-20" / my-MM "11/20/2026" တွေ မှားနေလို့
// ဒီ helper တစ်ခုတည်းကို နေရာတိုင်းမှာ သုံးတယ်။)
export function formatDateDMY(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+06:30`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Yangon",
  }).format(d);
}

// "20 Nov" (ရက် + လ အတို) — chart label တွေအတွက်။
export function formatDayMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+06:30`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Yangon",
  }).format(d);
}

// ISO timestamp ကို "20 Nov 2026, 21:14" (24-hour) ပုံစံနဲ့ ပြတယ်။
export function formatDateTimeDMY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Yangon",
  }).format(d);
}

// ရန်ကုန်စံတော်ချိန်နဲ့ ဒီနေ့ ရက်စွဲ (YYYY-MM-DD) —
// DB key / cache key အတွက်ပဲ သုံးတယ်၊ မျက်နှာပြင်မှာ မပြဘူး။
export function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

// YYYY-MM-DD ရက်စွဲကို ရက် n ရက် ရွှေ့တယ် (အနှုတ်ဆိုရင် နောက်ပြန်ရွှေ့တယ်) —
// Diary ရက်ရွေ့တာမှာ သုံးတယ်။
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00+06:30`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

// ရန်ကုန်စံတော်ချိန် နာရီ (0–23)။
export function yangonHour(): number {
  return Number(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Yangon",
      hour: "numeric",
      hour12: false,
    }),
  );
}

// အချိန်ပေါ်မူတည်ပြီး ဘယ်အစာ အမျိုးအစား ဖြစ်နိုင်လဲ — Review မှာ default ရွေးဖို့.
// ညစာ 22:00 အထိ ထားတယ် (အရင် 21:00 နောက်ပိုင်း snack ဖြစ်သွားလို့
// ည ၉ နာရီကျော် တစ်ပွဲလုံး စားရင်တောင် အဆာပြေ ဖြစ်နေတယ်)။
export function defaultMealType(): MealType {
  const h = yangonHour();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 22) return "dinner";
  return "snack";
}

// အနှုတ် (သို့) မမှန်တဲ့ ဂဏန်းကို 0 အဖြစ် ပြင်တယ်။
export function clampNonNegative(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return v;
}

// 1 ဒသမ အထိ လှည့်တယ်။
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ဂရမ်ပေါ် မူတည်ပြီး အာဟာရ ပြန်တွက်တယ် —
// base = မူလ ဂရမ် (ဥပမာ AI ခန့်မှန်းတဲ့ 250g) နဲ့ အာဟာရ၊
// grams = အသစ် ပြောင်းတဲ့ ဂရမ်။
export function scaleNutrients(
  base: { grams: number; calories: number; protein: number; carbs: number; fat: number },
  grams: number,
): { calories: number; protein: number; carbs: number; fat: number } {
  const baseGrams = base.grams > 0 ? base.grams : 100;
  const ratio = Math.max(0, grams) / baseGrams;
  return {
    calories: Math.round(base.calories * ratio),
    protein: round1(base.protein * ratio),
    carbs: round1(base.carbs * ratio),
    fat: round1(base.fat * ratio),
  };
}
