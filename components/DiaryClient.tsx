"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FETCH_FALLBACK, useLang } from "@/lib/i18n";
import {
  setCacheData,
  invalidateCachePrefix,
  useCachedData,
} from "@/lib/useCachedData";
import {
  MEAL_TYPES,
  addDaysIso,
  formatDateDMY,
  round1,
  todayYangon,
  type DiaryData,
  type MealItemRow,
  type MealRow,
  type MealType,
} from "@/lib/meal";

// /api/diary ကနေ ရက်တစ်ရက်ရဲ့ မှတ်တမ်းတွေ ဆွဲတယ် (module-level stable fetcher)။
async function fetchDiary(date: string): Promise<DiaryData> {
  const res = await fetch(`/api/diary?date=${date}`);
  const data = await res.json();
  if (res.status === 401) return { needsLogin: true } as DiaryData;
  if (!res.ok) throw new Error(data?.error ?? FETCH_FALLBACK);
  return data as DiaryData;
}

// Private bucket ထဲက ဓာတ်ပုံကို signed URL နဲ့ ပြတယ်။
function MealPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    createClient()
      .storage.from("meal-photos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (alive && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      className="h-16 w-16 shrink-0 rounded-xl object-cover"
    />
  );
}

// Item တစ်ခု ပြင်တဲ့ form — ဂရမ် ပြောင်းရင် အာဟာရ live ပြန်တွက်တယ်။
function EditItemForm({
  item,
  onDone,
  onCancel,
}: {
  item: MealItemRow;
  onDone: (updated: MealItemRow) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [nameMm, setNameMm] = useState(item.food_name_mm ?? "");
  const [nameEn, setNameEn] = useState(item.food_name_en ?? "");
  const [grams, setGrams] = useState(Number(item.amount ?? 100));
  const [calories, setCalories] = useState(Number(item.calories ?? 0));
  const [protein, setProtein] = useState(Number(item.protein ?? 0));
  const [carbs, setCarbs] = useState(Number(item.carbs ?? 0));
  const [fat, setFat] = useState(Number(item.fat ?? 0));
  const [rates, setRates] = useState(() => {
    const g = Number(item.amount ?? 100) || 100;
    return {
      cal: Number(item.calories ?? 0) / g,
      pro: Number(item.protein ?? 0) / g,
      carb: Number(item.carbs ?? 0) / g,
      fat: Number(item.fat ?? 0) / g,
    };
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function changeGrams(next: number) {
    const g = Math.min(2000, Math.max(10, Math.round(next)));
    setGrams(g);
    setCalories(Math.round(rates.cal * g));
    setProtein(round1(rates.pro * g));
    setCarbs(round1(rates.carb * g));
    setFat(round1(rates.fat * g));
  }

  function editNutrient(key: "cal" | "pro" | "carb" | "fat", value: number) {
    const v = Math.max(0, value || 0);
    if (key === "cal") setCalories(Math.round(v));
    if (key === "pro") setProtein(round1(v));
    if (key === "carb") setCarbs(round1(v));
    if (key === "fat") setFat(round1(v));
    setRates((r) => ({ ...r, [key]: grams > 0 ? v / grams : 0 }));
  }

  async function handleSave() {
    if (!nameMm.trim() && !nameEn.trim()) {
      setMessage(t("review.nameRequired"));
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const updated: MealItemRow = {
        ...item,
        food_name_mm: nameMm.trim(),
        food_name_en: nameEn.trim(),
        amount: grams,
        calories: Math.round(calories),
        protein: round1(protein),
        carbs: round1(carbs),
        fat: round1(fat),
      };
      const { error } = await supabase
        .from("meal_items")
        .update({
          food_name_mm: updated.food_name_mm,
          food_name_en: updated.food_name_en,
          amount: grams,
          unit: "g",
          calories: updated.calories,
          protein: updated.protein,
          carbs: updated.carbs,
          fat: updated.fat,
          user_edited: true,
        })
        .eq("id", item.id);
      if (error) throw new Error(t("common.editErrorRetry"));
      onDone(updated);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("common.editError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl bg-slate-50 p-3">
      <label className="block">
        <span className="caption">{t("diary.foodNameMy")}</span>
        <input
          type="text"
          value={nameMm}
          onChange={(e) => setNameMm(e.target.value)}
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
        />
      </label>
      <label className="mt-2 block">
        <span className="caption">Food (English)</span>
        <input
          type="text"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
        />
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => changeGrams(grams - 10)}
          className="btn-press h-9 w-9 rounded-xl border bg-white font-bold"
          aria-label={t("common.decrease")}
        >
          −
        </button>
        <input
          type="number"
          min={10}
          max={2000}
          value={grams}
          onChange={(e) => changeGrams(Number(e.target.value))}
          className="h-9 flex-1 rounded-xl border bg-white px-3 text-center"
        />
        <button
          type="button"
          onClick={() => changeGrams(grams + 10)}
          className="btn-press h-9 w-9 rounded-xl border bg-white font-bold"
          aria-label={t("common.increase")}
        >
          +
        </button>
        <span className="caption">g</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {(
          [
            ["kcal", calories, "cal"],
            ["Pro g", protein, "pro"],
            ["Carb g", carbs, "carb"],
            ["Fat g", fat, "fat"],
          ] as const
        ).map(([label, value, key]) => (
          <label key={key} className="block">
            <span className="caption">{label}</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={value}
              onChange={(e) =>
                editNutrient(key, Number(e.target.value))
              }
              className="mt-1 w-full rounded-xl border bg-white px-2 py-2 text-center"
            />
          </label>
        ))}
      </div>
      {message && <p className="caption mt-2 text-red-700">{message}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border bg-white py-2 font-semibold text-[#334155] disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="btn-press flex-1 rounded-xl bg-[var(--theme)] py-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

function sum(items: MealItemRow[], key: "calories" | "protein" | "carbs" | "fat") {
  return items.reduce((s, i) => s + Number(i[key] ?? 0), 0);
}

export default function DiaryClient() {
  const { t } = useLang();
  const router = useRouter();
  // ကြည့်နေတဲ့ ရက် — ဒီနေ့က စတယ်၊ ‹ › နဲ့ ရွှေ့လို့ရတယ် (အနာဂတ်ကို မရဘူး)။
  const [date, setDate] = useState(todayYangon());
  const today = todayYangon();
  const isToday = date === today;
  const isYesterday = date === addDaysIso(today, -1);
  const key = `diary-${date}`;
  // fetcher က date ကို closure ကနေ ယူတယ် — date ပြောင်းတိုင်း key လည်း
  // ပြောင်းတော့ hook က ပြန်ဆွဲတယ်။
  const fetcher = useCallback(() => fetchDiary(date), [date]);
  // ဒေတာကို cache နဲ့ ဆွဲတယ် — tab ပြန်ကူးတိုင်း မှတ်ထားတာကို ချက်ချင်း ပြတယ်။
  const { data, loading, error } = useCachedData<DiaryData>(key, fetcher);
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  // ထပ်ထည့်ထားတဲ့ item အသစ် — ✓ လေး ပေါ်ပြဖို့ (၂.၅ စက္ကန့်နေရင် ပျောက်တယ်)။
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // ရက်ပြောင်းရင် အရင်ရက်ရဲ့ စာရင်း မပြနေအောင် ရှင်းတယ် —
  // အသစ်ဆွဲပြီးမှ အဲဒီနေ့ရဲ့ စာရင်း ပေါ်မယ်။
  useEffect(() => {
    setMeals([]);
    setEditingId(null);
    setDeletingId(null);
    setMessage("");
    setJustAddedId(null);
  }, [date]);

  // ဆွဲလို့ရတဲ့ ဒေတာကို local state ထဲ ထည့်တယ်။
  useEffect(() => {
    if (data?.meals) setMeals(data.meals);
  }, [data]);

  useEffect(() => {
    if (data?.needsLogin) router.push("/login");
    else if (data?.needsOnboarding) router.push("/onboarding");
  }, [data, router]);

  // ပြင်ပြီးသား item ကို local state + parent meal totals + cache မှာ ပြင်တယ်။
  function applyItemUpdate(updated: MealItemRow) {
    const meal = meals.find((m) => m.id === updated.meal_id);
    const newItems = (meal?.meal_items ?? []).map((i) =>
      i.id === updated.id ? updated : i,
    );
    const newMeals = meals.map((m) =>
      m.id === updated.meal_id
        ? {
            ...m,
            meal_items: newItems,
            total_calories: Math.round(sum(newItems, "calories")),
            total_protein: round1(sum(newItems, "protein")),
            total_carbs: round1(sum(newItems, "carbs")),
            total_fat: round1(sum(newItems, "fat")),
          }
        : m,
    );
    setMeals(newMeals);
    setCacheData(key, { date, meals: newMeals });
    invalidateCachePrefix("today-");
    setEditingId(null);
    // Parent meal totals ကို DB မှာလည်း ပြင်တယ်။
    void syncMealTotals(updated.meal_id, newItems);
    router.refresh();
  }

  async function syncMealTotals(mealId: string, items?: MealItemRow[]) {
    const list =
      items ?? meals.find((m) => m.id === mealId)?.meal_items ?? [];
    const supabase = createClient();
    await supabase
      .from("meals")
      .update({
        total_calories: Math.round(sum(list, "calories")),
        total_protein: round1(sum(list, "protein")),
        total_carbs: round1(sum(list, "carbs")),
        total_fat: round1(sum(list, "fat")),
      })
      .eq("id", mealId);
  }

  async function deleteItem(item: MealItemRow) {
    setBusyId(item.id);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("meal_items")
        .delete()
        .eq("id", item.id);
      if (error) throw new Error(t("common.deleteErrorRetry"));
      const meal = meals.find((m) => m.id === item.meal_id);
      const remaining = (meal?.meal_items ?? []).filter((i) => i.id !== item.id);
      if (meal && remaining.length === 0) {
        // နောက်ဆုံး item ကို ဖျက်ရင် meal အလွတ်ပါ ဖျက်တယ်။
        await supabase.from("meals").delete().eq("id", meal.id);
        const newMeals = meals.filter((m) => m.id !== meal.id);
        setMeals(newMeals);
        setCacheData(key, { date, meals: newMeals });
        invalidateCachePrefix("today-");
      } else {
        const newMeals = meals.map((m) =>
          m.id === item.meal_id
            ? {
                ...m,
                meal_items: remaining,
                total_calories: Math.round(sum(remaining, "calories")),
                total_protein: round1(sum(remaining, "protein")),
                total_carbs: round1(sum(remaining, "carbs")),
                total_fat: round1(sum(remaining, "fat")),
              }
            : m,
        );
        setMeals(newMeals);
        setCacheData(key, { date, meals: newMeals });
        invalidateCachePrefix("today-");
        void syncMealTotals(item.meal_id, remaining);
      }
      setDeletingId(null);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("common.deleteError"));
    } finally {
      setBusyId(null);
    }
  }

  // ထပ်ထည့်မယ် — အဲဒီ item အတိုင်း ဒီနေ့ အစာအမျိုးအစားတူ ထဲကို ထပ်မှတ်တယ်။
  // အတိတ်နေ့ကို ကြည့်နေရင်လည်း ဒီနေ့ထဲကိုပဲ ထပ်ထည့်တယ် (အဲဒီနေ့ထဲကို မဟုတ်ဘူး) —
  // ဒီနေ့ ပြန်ကြည့်မှ ပေါ်မယ်။
  async function repeatItem(item: MealItemRow, meal: MealRow) {
    setBusyId(item.id);
    setMessage("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage(t("common.loginFirst"));
        return;
      }
      const { data: newMeal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          logged_date: todayYangon(),
          meal_type: meal.meal_type,
          photo_url: meal.photo_url,
          source: meal.source,
          total_calories: Number(item.calories ?? 0),
          total_protein: Number(item.protein ?? 0),
          total_carbs: Number(item.carbs ?? 0),
          total_fat: Number(item.fat ?? 0),
          status: "confirmed",
        })
        .select("id")
        .single();
      if (mealError || !newMeal) throw new Error(t("common.repeatError"));
      const { data: newItem, error: itemError } = await supabase
        .from("meal_items")
        .insert({
          meal_id: newMeal.id,
          food_id: item.food_id,
          food_name_mm: item.food_name_mm,
          food_name_en: item.food_name_en,
          amount: item.amount,
          unit: item.unit ?? "g",
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          is_ai_detected: false,
          user_edited: false,
        })
        .select("*")
        .single();
      if (itemError || !newItem) {
        await supabase.from("meals").delete().eq("id", newMeal.id);
        throw new Error(t("common.repeatError"));
      }
      setJustAddedId(newItem.id);
      setTimeout(() => {
        setJustAddedId((cur) => (cur === newItem.id ? null : cur));
      }, 2500);
      // ဒီနေ့ Diary + Home cache ကို ဖျက်တယ် — နောက်တစ်ခါ ဖွင့်ရင် အသစ် ပြမယ်။
      invalidateCachePrefix("diary-");
      invalidateCachePrefix("today-");
      if (isToday) {
        const newMeals = [
          ...meals,
          {
            id: newMeal.id,
            meal_type: meal.meal_type,
            photo_url: meal.photo_url,
            source: meal.source,
            total_calories: Number(item.calories ?? 0),
            total_protein: Number(item.protein ?? 0),
            total_carbs: Number(item.carbs ?? 0),
            total_fat: Number(item.fat ?? 0),
            created_at: new Date().toISOString(),
            meal_items: [newItem as MealItemRow],
          },
        ];
        setMeals(newMeals);
        setCacheData(key, { date, meals: newMeals });
      } else {
        setMessage(t("diary.repeatedToday"));
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("common.repeatError"));
    } finally {
      setBusyId(null);
    }
  }

  const allItems = meals.flatMap((m) => m.meal_items);
  const dayCal = Math.round(sum(allItems, "calories"));
  const dayPro = round1(sum(allItems, "protein"));
  const dayCarb = round1(sum(allItems, "carbs"));
  const dayFat = round1(sum(allItems, "fat"));

  // ပထမအကြိမ် ဒေတာ မရသေးရင် စောင့်နေတဲ့ ပုံစံ ပြတယ်။
  if (loading && meals.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center py-10">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--theme)]"
          aria-hidden
        />
        <p className="mt-4 text-[#52677f]">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <>
      {/* ရက်ရွေ့တာ — ‹ မနေ့က / နောက်နေ့ › (အနာဂတ်ကို မရဘူး) */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setDate(addDaysIso(date, -1))}
          aria-label={t("diary.prevDay")}
          className="flex h-11 w-11 -m-0.5 items-center justify-center"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-bold text-[#334155]">
            ‹
          </span>
        </button>
        <div className="text-center">
          <p className="font-semibold">
            {isToday
              ? t("diary.todayLabel", { date: formatDateDMY(date) })
              : formatDateDMY(date)}
          </p>
          {!isToday && (
            <p className="caption">
              {isYesterday ? t("diary.yesterdayPrefix") : ""}
              <button
                type="button"
                onClick={() => setDate(today)}
                className="font-semibold text-[var(--theme-dark)] underline"
              >
                {t("diary.backToToday")}
              </button>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDate(addDaysIso(date, 1))}
          disabled={isToday}
          aria-label={t("diary.nextDay")}
          className="flex h-11 w-11 -m-0.5 items-center justify-center disabled:opacity-30"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-bold text-[#334155]">
            ›
          </span>
        </button>
      </div>

      <section className="mt-4 rounded-2xl bg-white shadow-sm p-5 text-center">
        <p className="caption">
          {isToday
            ? t("diary.todayTotal")
            : t("diary.dateTotal", { date: formatDateDMY(date) })}
        </p>
        <p className="hero-num text-[var(--theme-dark)]">{dayCal.toLocaleString()}</p>
        <p className="caption">
          kcal · Protein {dayPro}g · Carbs {dayCarb}g · Fat {dayFat}g
        </p>
      </section>

      {message && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{message}</p>
      )}
      {error && meals.length === 0 && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error === FETCH_FALLBACK ? t("common.loadError") : error}
        </p>
      )}

      {meals.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white shadow-sm p-5 text-center">
          <p className="text-[#52677f]">
            {isToday
              ? t("diary.emptyToday")
              : t("diary.emptyDate", { date: formatDateDMY(date) })}
          </p>
          <Link
            href="/add"
            className="mt-3 inline-block rounded-xl bg-[var(--theme)] px-5 py-2.5 font-semibold text-white"
          >
            {t("common.addFood")}
          </Link>
        </div>
      ) : (
        MEAL_TYPES.map(({ value }) => {
          const group = meals.filter((m) => m.meal_type === value);
          if (group.length === 0) return null;
          const items = group.flatMap((m) => m.meal_items);
          return (
            <section key={value} className="mt-4 rounded-2xl bg-white shadow-sm p-5">
              <div className="flex items-baseline justify-between">
                <h2>{t(`meal.${value}`)}</h2>
                <span className="caption">
                  {Math.round(sum(items, "calories"))} kcal
                </span>
              </div>
              <ul className="mt-3 space-y-3">
                {group
                  .flatMap((meal) =>
                    meal.meal_items.map((item) => ({ meal, item })),
                  )
                  .map(({ meal, item }, i) => (
                    <li
                      key={item.id}
                      style={{ animationDelay: `${Math.min(i, 9) * 30}ms` }}
                      className="anim-in rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <div className="flex items-start gap-3">
                        {meal.photo_url && (
                          <MealPhoto path={meal.photo_url} />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {item.food_name_mm ??
                              item.food_name_en ??
                              t("diary.unnamedFood")}
                            {justAddedId === item.id && (
                              <span className="anim-check-pop ml-1 inline-block text-[var(--theme-dark)]" aria-hidden>
                                ✓
                              </span>
                            )}
                          </p>
                          {item.food_name_en && item.food_name_mm && (
                            <p className="caption">{item.food_name_en}</p>
                          )}
                          <p className="caption">
                            {item.amount ? `${Number(item.amount)}g` : ""} ·{" "}
                            {Math.round(Number(item.calories ?? 0))} kcal · P{" "}
                            {round1(Number(item.protein ?? 0))}g · C{" "}
                            {round1(Number(item.carbs ?? 0))}g · F{" "}
                            {round1(Number(item.fat ?? 0))}g
                          </p>
                        </div>
                      </div>

                      {editingId === item.id ? (
                        <EditItemForm
                          item={item}
                          onDone={applyItemUpdate}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(item.id)}
                            className="flex-1 rounded-lg border bg-white px-2 py-1.5"
                          >
                            {t("diary.editFood")}
                          </button>
                          <button
                            type="button"
                            onClick={() => repeatItem(item, meal)}
                            disabled={busyId === item.id}
                            className="flex-1 rounded-lg border bg-white px-2 py-1.5 disabled:opacity-50"
                          >
                            {t("diary.repeat")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            disabled={busyId === item.id}
                            className="flex-1 rounded-lg border border-red-300 bg-white px-2 py-1.5 text-red-600 disabled:opacity-50"
                          >
                            {t("diary.delete")}
                          </button>
                        </div>
                      )}

                      {deletingId === item.id && (
                        <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-3">
                          <p>{t("diary.deleteConfirm")}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="flex-1 rounded-lg border bg-white py-1.5"
                            >
                              {t("common.dontDelete")}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteItem(item)}
                              disabled={busyId === item.id}
                              className="flex-1 rounded-lg bg-red-600 py-1.5 font-semibold text-white disabled:opacity-50"
                            >
                              {busyId === item.id ? t("common.deleting") : t("common.delete")}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
