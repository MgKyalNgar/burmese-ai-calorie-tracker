"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { invalidateCachePrefix } from "@/lib/useCachedData";
import {
  MEAL_TYPES,
  defaultMealType,
  round1,
  todayYangon,
  type AnalyzedFood,
  type MealType,
} from "@/lib/meal";

// Add flow ရဲ့ Review အဆင့် — သိမ်းခင် အတည်ပြုရမယ် (မဖြစ်မနေ)။
// ဂရမ် stepper က အာဟာရ အားလုံးကို live ပြန်တွက်ပေးတယ်။
export interface ReviewInitial {
  food: AnalyzedFood;
  source: "photo" | "text" | "search" | "manual";
  foodId?: string | null;
  photoFile?: File | null;
  photoPreviewUrl?: string | null;
}

export default function ReviewForm({
  initial,
  onCancel,
}: {
  initial: ReviewInitial;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [nameMm, setNameMm] = useState(initial.food.name_mm);
  const [nameEn, setNameEn] = useState(initial.food.name_en);
  const [grams, setGrams] = useState(Math.round(initial.food.grams) || 100);
  // AI က float အရှည် ပြန်ရင် ဒီမှာတင် 1 decimal လှီးထားတယ်
  // (ဥပမာ 15.300000190734863) — သိမ်းတဲ့နေရာမှာလည်း round1 သုံးတယ်။
  const [calories, setCalories] = useState(Math.round(initial.food.calories));
  const [protein, setProtein] = useState(round1(initial.food.protein));
  const [carbs, setCarbs] = useState(round1(initial.food.carbs));
  const [fat, setFat] = useState(round1(initial.food.fat));
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  // 1 ဂရမ်လျှင် အာဟာရ — stepper က ပြန်တွက်ဖို့၊ လက်နဲ့ ပြင်ရင် rate ကို ပြင်တယ်။
  const [rates, setRates] = useState({
    cal: initial.food.grams > 0 ? initial.food.calories / initial.food.grams : 0,
    pro: initial.food.grams > 0 ? initial.food.protein / initial.food.grams : 0,
    carb: initial.food.grams > 0 ? initial.food.carbs / initial.food.grams : 0,
    fat: initial.food.grams > 0 ? initial.food.fat / initial.food.grams : 0,
  });
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function changeGrams(next: number) {
    const g = Math.min(2000, Math.max(10, Math.round(next)));
    setGrams(g);
    setCalories(Math.round(rates.cal * g));
    setProtein(round1(rates.pro * g));
    setCarbs(round1(rates.carb * g));
    setFat(round1(rates.fat * g));
    setEdited(true);
  }

  // အာဟာရတစ်ခုကို လက်နဲ့ ပြင်ရင် အဲဒီအမျိုးအစားရဲ့ rate ကို ပြန်သတ်တယ်။
  function editNutrient(
    key: "cal" | "pro" | "carb" | "fat",
    value: number,
  ) {
    const v = Math.max(0, value || 0);
    if (key === "cal") setCalories(Math.round(v));
    if (key === "pro") setProtein(round1(v));
    if (key === "carb") setCarbs(round1(v));
    if (key === "fat") setFat(round1(v));
    setRates((r) => ({ ...r, [key]: grams > 0 ? v / grams : 0 }));
    setEdited(true);
  }

  async function handleSave() {
    if (!nameMm.trim() && !nameEn.trim()) {
      setMessage("အစားအစာ နာမည် ထည့်ပေးပါ။");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Login အရင် ဝင်ပေးပါ။");
        return;
      }
      const today = todayYangon();

      // ဓာတ်ပုံကို သိမ်းမထားဘူး (user ဆုံးဖြတ်ချက် 20 Nov 2026 — Data Size
      // ကြီးမှာစိုးလို့ စာရင်းပဲ သိမ်းတယ်)။ ဓာတ်ပုံက analyze + Review
      // ပြဖို့အတွက်ပဲ သုံးပြီး သိမ်းတဲ့အခါ မတင်တော့ဘူး။
      // manual ဆို DB source က 'text' (meals.source check က
      // photo/text/search ပဲ လက်ခံလို့)၊ AI နဲ့ စစ်ထားတာ မဟုတ်ကြောင်း
      // is_ai_detected=false နဲ့ ခွဲထားတယ်။
      const { data: meal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          logged_date: today,
          meal_type: mealType,
          photo_url: null, // ဓာတ်ပုံ မသိမ်းဘူး — စာရင်းပဲ
          source: initial.source === "manual" ? "text" : initial.source,
          total_calories: Math.round(calories),
          total_protein: round1(protein),
          total_carbs: round1(carbs),
          total_fat: round1(fat),
          ai_confidence:
            initial.source === "search" || initial.source === "manual"
              ? null
              : "medium",
          status: "confirmed",
          ai_result:
            initial.source === "search" || initial.source === "manual"
              ? null
              : initial.food,
        })
        .select("id")
        .single();
      if (mealError || !meal) {
        throw new Error("သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။");
      }

      // 3) meal_items row သိမ်းတယ်။
      const { error: itemError } = await supabase.from("meal_items").insert({
        meal_id: meal.id,
        food_id: initial.foodId ?? null,
        food_name_mm: nameMm.trim(),
        food_name_en: nameEn.trim(),
        amount: grams,
        unit: "g",
        calories: Math.round(calories),
        protein: round1(protein),
        carbs: round1(carbs),
        fat: round1(fat),
        is_ai_detected:
          initial.source === "photo" || initial.source === "text",
        user_edited: edited,
      });
      if (itemError) {
        // Item မသိမ်းရင် meal အလွတ်ကြီး မကျန်အောင် ပြန်ဖျက်တယ်။
        await supabase.from("meals").delete().eq("id", meal.id);
        throw new Error("သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။");
      }

      // သိမ်းပြီးပြီ — Home/Diary cache ကို ဖျက်တယ် (နောက်တစ်ခါ ဖွင့်ရင်
      // အသစ်ကို ပြန်ဆွဲမယ်)။
      invalidateCachePrefix("today-");
      invalidateCachePrefix("diary-");
      // Add form ကို အစက ပြန်စထားတယ် — မဟုတ်ရင် Back နှိပ်ပြီး + Add
      // ပြန်လာရင် Review အဟောင်း ပြန်ပေါ်နေမယ်။
      onCancel();
      router.push("/diary");
      router.refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl bg-white shadow-sm p-5">
      <h2>စစ်ဆေးပြီး သိမ်းမယ်</h2>
      {initial.photoPreviewUrl && (
        <img
          src={initial.photoPreviewUrl}
          alt={nameMm}
          className="mt-3 h-44 w-full rounded-xl object-cover"
        />
      )}
      {initial.food.note && (
        <p className="caption mt-3">🤖 AI: {initial.food.note}</p>
      )}

      <label className="mt-4 block">
        <span className="caption">အစားအစာ (မြန်မာ)</span>
        <input
          type="text"
          value={nameMm}
          onChange={(e) => {
            setNameMm(e.target.value);
            setEdited(true);
          }}
          className="mt-1 w-full rounded-xl border px-3 py-2.5"
        />
      </label>
      <label className="mt-3 block">
        <span className="caption">Food (English)</span>
        <input
          type="text"
          value={nameEn}
          onChange={(e) => {
            setNameEn(e.target.value);
            setEdited(true);
          }}
          className="mt-1 w-full rounded-xl border px-3 py-2.5"
        />
      </label>

      <div className="mt-4">
        <span className="caption">ပမာဏ (ဂရမ်)</span>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeGrams(grams - 10)}
            disabled={busy}
            className="h-10 w-10 rounded-xl border text-lg font-bold disabled:opacity-50"
            aria-label="လျှော့မယ်"
          >
            −
          </button>
          <input
            type="number"
            min={10}
            max={2000}
            value={grams}
            onChange={(e) => changeGrams(Number(e.target.value))}
            disabled={busy}
            className="h-10 flex-1 rounded-xl border px-3 text-center"
          />
          <button
            type="button"
            onClick={() => changeGrams(grams + 10)}
            disabled={busy}
            className="h-10 w-10 rounded-xl border text-lg font-bold disabled:opacity-50"
            aria-label="တိုးမယ်"
          >
            +
          </button>
          <span className="caption">g</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="caption">ကယ်လိုရီ (kcal)</span>
          <input
            type="number"
            min={0}
            value={calories}
            onChange={(e) => editNutrient("cal", Number(e.target.value))}
            disabled={busy}
            className="mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="caption">Protein (g)</span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={protein}
            onChange={(e) => editNutrient("pro", Number(e.target.value))}
            disabled={busy}
            className="mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="caption">Carbs (g)</span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={carbs}
            onChange={(e) => editNutrient("carb", Number(e.target.value))}
            disabled={busy}
            className="mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="caption">Fat (g)</span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={fat}
            onChange={(e) => editNutrient("fat", Number(e.target.value))}
            disabled={busy}
            className="mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
      </div>

      <div className="mt-4">
        <span className="caption">ဘယ်အစာ အမျိုးအစားလဲ?</span>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setMealType(t.value)}
              disabled={busy}
              className={`rounded-xl border px-2 py-2.5 ${
                mealType === t.value
                  ? "border-[var(--theme)] bg-[var(--theme)] font-semibold text-white"
                  : "text-[#334155]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{message}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border px-4 py-2.5 font-semibold text-[#334155] disabled:opacity-50"
        >
          ပြန်ပြင်မယ်
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="flex-1 rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "သိမ်းနေတယ်…" : "သိမ်းမယ် ✅"}
        </button>
      </div>
    </section>
  );
}
