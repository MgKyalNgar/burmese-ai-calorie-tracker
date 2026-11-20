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

// ရန်ကုန်စံတော်ချိန်နဲ့ ဒီနေ့ ရက်စွဲ (YYYY-MM-DD)။
export function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
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

// အချိန်ပေါ်မူတည်ပြီး ဘယ်အစာ အမျိုးအစား ဖြစ်နိုင်လဲ — Review မှာ default ရွေးဖို့။
export function defaultMealType(): MealType {
  const h = yangonHour();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
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
