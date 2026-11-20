"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MEAL_LABELS,
  MEAL_TYPES,
  round1,
  type MealItemRow,
  type MealRow,
  type MealType,
} from "@/lib/meal";

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
      setMessage("အစားအစာ နာမည် ထည့်ပေးပါ။");
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
      if (error) throw new Error("ပြင်လို့ မရပါ — ပြန်စမ်းပေးပါ။");
      onDone(updated);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "ပြင်လို့ မရပါ။");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl bg-slate-50 p-3">
      <label className="block">
        <span className="caption">အစားအစာ (မြန်မာ)</span>
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
          className="h-9 w-9 rounded-xl border bg-white font-bold"
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
          className="h-9 flex-1 rounded-xl border bg-white px-3 text-center"
        />
        <button
          type="button"
          onClick={() => changeGrams(grams + 10)}
          className="h-9 w-9 rounded-xl border bg-white font-bold"
          aria-label="တိုးမယ်"
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
          မပြင်တော့ဘူး
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="flex-1 rounded-xl bg-[#16a34a] py-2 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "သိမ်းနေတယ်…" : "သိမ်းမယ်"}
        </button>
      </div>
    </div>
  );
}

function sum(items: MealItemRow[], key: "calories" | "protein" | "carbs" | "fat") {
  return items.reduce((s, i) => s + Number(i[key] ?? 0), 0);
}

export default function DiaryClient({
  initialMeals,
  date,
}: {
  initialMeals: MealRow[];
  date: string;
}) {
  const router = useRouter();
  const [meals, setMeals] = useState<MealRow[]>(initialMeals);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // ပြင်ပြီးသား item ကို local state + parent meal totals မှာ ပြင်တယ်။
  function applyItemUpdate(updated: MealItemRow) {
    const meal = meals.find((m) => m.id === updated.meal_id);
    const newItems = (meal?.meal_items ?? []).map((i) =>
      i.id === updated.id ? updated : i,
    );
    setMeals((prev) =>
      prev.map((m) =>
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
      ),
    );
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
      if (error) throw new Error("ဖျက်လို့ မရပါ — ပြန်စမ်းပေးပါ။");
      const meal = meals.find((m) => m.id === item.meal_id);
      const remaining = (meal?.meal_items ?? []).filter((i) => i.id !== item.id);
      if (meal && remaining.length === 0) {
        // နောက်ဆုံး item ကို ဖျက်ရင် meal အလွတ်ပါ ဖျက်တယ်။
        await supabase.from("meals").delete().eq("id", meal.id);
        setMeals((prev) => prev.filter((m) => m.id !== meal.id));
      } else {
        setMeals((prev) =>
          prev.map((m) =>
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
          ),
        );
        void syncMealTotals(item.meal_id, remaining);
      }
      setDeletingId(null);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "ဖျက်လို့ မရပါ။");
    } finally {
      setBusyId(null);
    }
  }

  // ထပ်ထည့်မယ် — အဲဒီ item အတိုင်း ဒီနေ့ အစာအမျိုးအစားတူ ထဲကို ထပ်မှတ်တယ်။
  async function repeatItem(item: MealItemRow, meal: MealRow) {
    setBusyId(item.id);
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
      const { data: newMeal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          logged_date: date,
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
      if (mealError || !newMeal) throw new Error("ထပ်ထည့်လို့ မရပါ။");
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
        throw new Error("ထပ်ထည့်လို့ မရပါ။");
      }
      setMeals((prev) => [
        ...prev,
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
      ]);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "ထပ်ထည့်လို့ မရပါ။");
    } finally {
      setBusyId(null);
    }
  }

  const allItems = meals.flatMap((m) => m.meal_items);
  const dayCal = Math.round(sum(allItems, "calories"));
  const dayPro = round1(sum(allItems, "protein"));
  const dayCarb = round1(sum(allItems, "carbs"));
  const dayFat = round1(sum(allItems, "fat"));

  return (
    <>
      <section className="mt-4 rounded-2xl border p-5 text-center">
        <p className="caption">ဒီနေ့ စုစုပေါင်း</p>
        <p className="hero-num text-[#15803d]">{dayCal.toLocaleString()}</p>
        <p className="caption">
          kcal · Protein {dayPro}g · Carbs {dayCarb}g · Fat {dayFat}g
        </p>
      </section>

      {message && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{message}</p>
      )}

      {meals.length === 0 ? (
        <div className="mt-6 rounded-2xl border p-5 text-center">
          <p className="text-[#52677f]">ဒီနေ့ ဘာမှ မမှတ်ရသေးဘူး။</p>
          <Link
            href="/add"
            className="mt-3 inline-block rounded-xl bg-[#16a34a] px-5 py-2.5 font-semibold text-white"
          >
            + အစားအစာ ထည့်မယ်
          </Link>
        </div>
      ) : (
        MEAL_TYPES.map(({ value, label }) => {
          const group = meals.filter((m) => m.meal_type === value);
          if (group.length === 0) return null;
          const items = group.flatMap((m) => m.meal_items);
          return (
            <section key={value} className="mt-4 rounded-2xl border p-5">
              <div className="flex items-baseline justify-between">
                <h2>{label}</h2>
                <span className="caption">
                  {Math.round(sum(items, "calories"))} kcal
                </span>
              </div>
              <ul className="mt-3 space-y-3">
                {group.map((meal) =>
                  meal.meal_items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <div className="flex items-start gap-3">
                        {meal.photo_url && (
                          <MealPhoto path={meal.photo_url} />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {item.food_name_mm ?? item.food_name_en ?? "အစားအစာ"}
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
                            ✏️ ပြင်မယ်
                          </button>
                          <button
                            type="button"
                            onClick={() => repeatItem(item, meal)}
                            disabled={busyId === item.id}
                            className="flex-1 rounded-lg border bg-white px-2 py-1.5 disabled:opacity-50"
                          >
                            🔁 ထပ်ထည့်မယ်
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            disabled={busyId === item.id}
                            className="flex-1 rounded-lg border border-red-300 bg-white px-2 py-1.5 text-red-600 disabled:opacity-50"
                          >
                            🗑️ ဖျက်မယ်
                          </button>
                        </div>
                      )}

                      {deletingId === item.id && (
                        <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-3">
                          <p>ဒီမှတ်တမ်းကို ဖျက်မှာလား?</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="flex-1 rounded-lg border bg-white py-1.5"
                            >
                              မဖျက်ဘူး
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteItem(item)}
                              disabled={busyId === item.id}
                              className="flex-1 rounded-lg bg-red-600 py-1.5 font-semibold text-white disabled:opacity-50"
                            >
                              {busyId === item.id ? "ဖျက်နေတယ်…" : "ဖျက်မယ်"}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  )),
                )}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
