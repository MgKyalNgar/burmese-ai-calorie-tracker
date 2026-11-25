"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import ReviewForm, { type ReviewInitial } from "@/components/ReviewForm";
import { createClient } from "@/lib/supabase/client";
import { scaleNutrients, type AnalyzedFood } from "@/lib/meal";
import { useLang } from "@/lib/i18n";

type Mode = "photo" | "text" | "search" | "manual";

type FoodRow = {
  id: string;
  name_mm: string;
  name_en: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  serving_desc: string | null;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Hick's Law — ဘာမှ မရိုက်သေးရင် အကြိုက်ဆုံး အစားအစာ ၁၀ မျိုး အရင်ပြတယ်
// (အက္ခရာစဉ်အတိုင်းဆို မုန့်ဟင်းခါးတို့ ပထမ စာမျက်နှာမှာ မပါဘူး)။
// serving_desc "၁ ပွဲ (~500g)" / "၁ ခွက် (~200ml)" ကနေ { label, grams } ခွဲထုတ်တယ် —
// ၁ ပွဲ / တစ်ဝက် ခလုတ်တွေအတွက်။ ml ကို g နဲ့ အတူတူ ယူတယ် (အချိုရည်က 100ml အခြေခံ)။
// ပုံစံမကိုက်ရင် null (ခလုတ်မပြဘူး)။
function parseServing(desc: string | null): {
  label: string;
  grams: number;
  unit: "g" | "ml";
} | null {
  if (!desc) return null;
  const m = desc.match(/^(.+?)\s*\(~?(\d+)\s*(g|ml)\)/);
  if (!m) return null;
  const grams = Number(m[2]);
  // unit ကို ဆက်ထိန်းထားတယ် — အရည်ဆို chip မှာ "200g" လို့ မှားမပြဘဲ
  // "200ml" လို့ ပြဖို့ (လက်ဖက်ရည်၊ ကော်ဖီ… ၇ မျိုး)။
  return grams > 0
    ? { label: m[1].trim(), grams, unit: m[3] as "g" | "ml" }
    : null;
}

const POPULAR_FOOD_ORDER = ["မုန့်ဟင်းခါး", "ရှမ်းခေါက်ဆွဲ", "ထမင်း", "ကြက်ဆီထမင်း", "အုန်းနို့ခေါက်ဆွဲ", "နန်းကြီးသုပ်", "လက်ဖက်ရည်", "ကြက်သားဟင်း", "ပလာတာ", "စမူဆာ"];

export default function AddPage() {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>("photo");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // key မရှိလို့ AI စစ်မရတဲ့ error — Profile သွားတဲ့ link ပြဖို့။
  const [noKeyError, setNoKeyError] = useState(false);

  // Photo mode
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoHint, setPhotoHint] = useState("");

  // Text mode
  const [textInput, setTextInput] = useState("");

  // Search mode
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickedFood, setPickedFood] = useState<FoodRow | null>(null);
  const [searchGrams, setSearchGrams] = useState(100);
  // ဘယ် chip ကို နှိပ်ခဲ့လဲ — gram တူရုံနဲ့ chip ကို အလိုအလျောက်
  // ရွေးပြလို့ မရဘူး (ဥပမာ လက်ဖက်ရည် 200ml ရဲ့ တစ်ဝက် 100ml က
  // default 100 နဲ့ တိုက်ဆိုင်နေလို့ ဖွင့်တာနဲ့ "တစ်ဝက်" စိမ်းနေတာ)။
  // နှိပ်မှသာ စိမ်းမယ်; လက်နဲ့ ရိုက်ရင် ပြန်ဖြူမယ်။
  const [pickedChip, setPickedChip] = useState<"full" | "half" | null>(null);

  // Review အဆင့် — AI စစ်ပြီးသား (သို့) Search က ရွေးထားတဲ့ အစားအစာ။
  const [review, setReview] = useState<ReviewInitial | null>(null);

  // Preview URL ကို ပုံလဲမှ (သို့) ဖျက်မှ ပဲ revoke လုပ်တယ် —
  // အရင် unmount မှာ revoke လုပ်ထားလို့ Back နှိပ်ပြီး ပြန်လာရင်
  // ပုံက broken ဖြစ်နေတယ် (App Router က ပြန်လာတဲ့ စာမျက်နှာကို
  // cache ကနေ ပြန်ပြပေမဲ့ URL ကို အရင် ဖျက်ပြီးသား ဖြစ်နေလို့)။
  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setMessage("");
  }

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage(t("add.notImage"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setMessage(t("add.tooBig"));
      return;
    }
    setMessage("");
    setPhotoFile(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function analyzePhoto() {
    if (!photoFile) {
      setMessage(t("add.pickPhotoFirst"));
      return;
    }
    setBusy(true);
    setMessage("");
    setNoKeyError(false);
    try {
      const form = new FormData();
      form.append("photo", photoFile);
      if (photoHint.trim()) form.append("text", photoHint.trim());
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "NO_API_KEY") setNoKeyError(true);
        throw new Error(data?.error ?? t("add.analyzeError"));
      }
      setReview({
        food: data.result as AnalyzedFood,
        source: "photo",
        photoFile,
        photoPreviewUrl: photoPreview,
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("add.analyzeError"));
    } finally {
      setBusy(false);
    }
  }

  async function analyzeText() {
    if (!textInput.trim()) {
      setMessage(t("add.typeFirst"));
      return;
    }
    setBusy(true);
    setMessage("");
    setNoKeyError(false);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "NO_API_KEY") setNoKeyError(true);
        throw new Error(data?.error ?? t("add.analyzeError"));
      }
      setReview({ food: data.result as AnalyzedFood, source: "text" });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("add.analyzeError"));
    } finally {
      setBusy(false);
    }
  }

  // Search — မြန်မာ/အင်္ဂလိပ် နာမည်နဲ့ foods table ကို ရှာတယ် (AI မသုံးဘူး)။
  // ဘာမှ မရိုက်သေးရင် ရှိတဲ့ အစားအစာ ၂၀ ကို ရွေးစရာ list အဖြစ် ပြတယ် —
  // tab ဖွင့်ဖွင့်ချင်း ဗလာကြီး မဖြစ်တော့ဘူး။
  useEffect(() => {
    const q = query.trim();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const supabase = createClient();
        let req = supabase
          .from("foods")
          .select(
            "id, name_mm, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_desc",
          )
          .order("name_mm")
          // Browse mode: အကုန် ဆွဲမှ popular-first sort အလုပ်လုပ်တယ်
          // (60 ဆိုရင် မုန့်ဟင်းခါးတို့ အက္ခရာစဉ်နောက်မှာ ကျန်နေလို့ မပါဘူး —
          // 88 မျိုး ဖြစ်သွားတော့ 60 မလုံလောက်တော့ဘူး)။
          .limit(q.length >= 2 ? 20 : 200);
        if (q.length >= 2) {
          const safe = q.replace(/[%_]/g, "");
          req = req.or(`name_mm.ilike.%${safe}%,name_en.ilike.%${safe}%`);
        }
        const { data, error } = await req;
        if (!error) {
          const rows = (data ?? []) as FoodRow[];
          if (q.length < 2) {
            // အကြိုက်ဆုံးအရင်၊ ကျန် အက္ခရာစဉ်အတိုင်း — ၂၀ လုံးပဲ ပြတယ်။
            const rank = new Map(POPULAR_FOOD_ORDER.map((n, i) => [n, i]));
            rows.sort(
              (a, b) =>
                (rank.get(a.name_mm) ?? 999) - (rank.get(b.name_mm) ?? 999) ||
                a.name_mm.localeCompare(b.name_mm),
            );
            setResults(rows.slice(0, 20));
          } else {
            setResults(rows);
          }
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function pickSearchFood(food: FoodRow) {
    setPickedFood(food);
    // ရွေးတာနဲ့ ၁ ပွဲ / ၁ ခွက် ပမာဏကို အော်တို ဖြည့်ထားတယ် (100g ကနေ
    // စမထားဘူး) — အများစုက တစ်ပွဲလုံး စားတာမို့ နှိပ်ပြီး တန်းသိမ်းရုံပဲ။
    // နည်းချင်ရင် တစ်ဝက် chip နှိပ်တာ (သို့) လက်နဲ့ ရိုက်တာ လုပ်လို့ရတယ်။
    const serving = parseServing(food.serving_desc);
    setSearchGrams(serving?.grams ?? 100);
    setPickedChip(serving ? "full" : null);
    setMessage("");
  }

  function confirmSearchFood() {
    if (!pickedFood) return;
    // သိမ်းခါနီးမှ 10–2000 ထဲ ညှိတယ် (ရိုက်နေတုန်း clamp မလုပ်ဘူး)။
    const g = Math.min(2000, Math.max(10, searchGrams || 100));
    const scaled = scaleNutrients(
      {
        grams: 100,
        calories: pickedFood.calories_per_100g ?? 0,
        protein: pickedFood.protein_per_100g ?? 0,
        carbs: pickedFood.carbs_per_100g ?? 0,
        fat: pickedFood.fat_per_100g ?? 0,
      },
      g,
    );
    setReview({
      food: {
        name_mm: pickedFood.name_mm,
        name_en: pickedFood.name_en ?? pickedFood.name_mm,
        grams: g,
        ...scaled,
        note: pickedFood.serving_desc ?? "",
        unit: parseServing(pickedFood.serving_desc)?.unit ?? "g",
      },
      source: "search",
      foodId: pickedFood.id,
    });
  }

  function resetReview() {
    setReview(null);
    setMessage("");
    setNoKeyError(false);
  }

  const tabs: { value: Mode; label: string }[] = [
    { value: "photo", label: t("add.tabPhoto") },
    { value: "text", label: t("add.tabText") },
    { value: "search", label: t("add.tabSearch") },
    { value: "manual", label: t("add.tabManual") },
  ];

  // လက်နဲ့ ဖြည့်တဲ့ အစာ — နာမည်/ဂရမ်/ကယ်လိုရီ/macro ကို ကိုယ်တိုင် ဖြည့်တယ်။
  // (Gemini key မရှိတဲ့ user အသစ်လည်း ဒီနည်းနဲ့ မှတ်လို့ရတယ်။)
  const manualInitial: ReviewInitial = {
    food: {
      name_mm: "",
      name_en: "",
      grams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      note: "",
    },
    source: "manual",
  };

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-8">
      <h1>{t("add.title")}</h1>

      {review ? (
        <ReviewForm initial={review} onCancel={resetReview} />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setMode(t.value);
                  setMessage("");
                  setNoKeyError(false);
                }}
                className={`btn-press rounded-xl border px-2 py-2.5 text-sm ${
                  mode === t.value
                    ? "border-[var(--theme)] bg-[var(--theme)] font-semibold text-white"
                    : "text-[#334155]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {mode === "manual" && (
            <div className="mt-4">
              <p className="caption">{t("add.manualNote")}</p>
              <ReviewForm
                initial={manualInitial}
                onCancel={() => setMode("photo")}
              />
            </div>
          )}

          {mode === "photo" && (
            <section className="mt-4 rounded-2xl bg-white shadow-sm p-5">
              <h2>{t("add.photoTitle")}</h2>
              <p className="caption mt-1">{t("add.photoNote")}</p>
              {photoPreview ? (
                <div className="relative mt-3">
                  <img
                    src={photoPreview}
                    alt={t("add.photoAlt")}
                    className="h-56 w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={busy}
                    aria-label={t("add.photoRemove")}
                    className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg font-bold text-white">
                      ✕
                    </span>
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-slate-100 text-5xl">
                  🍜
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {t("add.camera")}
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  disabled={busy}
                  className="flex-1 rounded-xl border border-[var(--theme)] py-2.5 font-semibold text-[var(--theme-dark)] disabled:opacity-50"
                >
                  🖼️ Gallery
                </button>
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
              <label className="mt-3 block">
                <span className="caption">{t("add.hintLabel")}</span>
                <input
                  type="text"
                  value={photoHint}
                  onChange={(e) => setPhotoHint(e.target.value)}
                  placeholder={t("add.hintPlaceholder")}
                  disabled={busy}
                  className="mt-1 w-full rounded-xl border px-3 py-2.5"
                />
              </label>
              <button
                type="button"
                onClick={analyzePhoto}
                disabled={busy || !photoFile}
                className="mt-3 w-full rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("add.analyzing") : t("add.analyze")}
              </button>
            </section>
          )}

          {mode === "text" && (
            <section className="mt-4 rounded-2xl bg-white shadow-sm p-5">
              <h2>{t("add.textTitle")}</h2>
              <p className="caption mt-1">{t("add.textNote")}</p>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
                placeholder={t("add.textPlaceholder")}
                disabled={busy}
                className="mt-3 w-full rounded-xl border px-3 py-2.5"
              />
              <button
                type="button"
                onClick={analyzeText}
                disabled={busy || !textInput.trim()}
                className="mt-3 w-full rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("add.analyzing") : t("add.analyze")}
              </button>
            </section>
          )}

          {mode === "search" && (
            <section className="mt-4">
              <h2>{t("add.searchTitle")}</h2>
              <p className="caption mt-1">{t("add.searchNote")}</p>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPickedFood(null);
                }}
                placeholder={t("add.searchPlaceholder")}
                className="mt-3 w-full rounded-xl border bg-white px-3 py-2.5"
              />
              {searching && <p className="caption mt-2">{t("add.searching")}</p>}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="mt-3 text-[#52677f]">
                  {t("add.notFound")}
                </p>
              )}
              {/* ရွေးထားတဲ့ အစာ — search box အောက်၊ list အပေါ်မှာ ချက်ချင်းပေါ်တယ်
                  (အရင် list အောက်ဆုံးမှာ ပေါ်နေလို့ ပြင်ထားတာ)။ */}
              {pickedFood && (
                <div className="anim-in mt-3 rounded-xl bg-[var(--theme-soft)] p-4 ring-1 ring-[var(--theme-ring)]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{pickedFood.name_mm}</p>
                    <button
                      type="button"
                      onClick={() => setPickedFood(null)}
                      aria-label={t("common.close")}
                      className="flex h-11 w-11 shrink-0 -m-2 items-center justify-center rounded-full"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-bold text-[#52677f] shadow-sm">
                        ✕
                      </span>
                    </button>
                  </div>
                  <label className="mt-2 block">
                    <span className="caption">
                      {parseServing(pickedFood.serving_desc)?.unit === "ml"
                        ? t("add.amountMl")
                        : t("add.amount")}
                    </span>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={searchGrams}
                      // စာရိုက်နေတုန်း clamp မလုပ်ဘူး — 700 ရိုက်ချင်ရင် 7 ကနေ
                      // စရိုက်လို့ရအောင် (အရင် Math.max(10, …) က ရိုက်လိုက်တိုင်း
                      // 10 ဖြစ်သွားလို့ 700 ရိုက်မရဘူး)။ blur ကျမှ 10–2000 ထဲ ပြန်ညှိတယ်။
                      // လက်နဲ့ ရိုက်ရင် chip ရွေးထားတာ ပြန်ဖြူတယ်။
                      onChange={(e) => {
                        setSearchGrams(Number(e.target.value) || 0);
                        setPickedChip(null);
                      }}
                      onBlur={() =>
                        setSearchGrams((g) => Math.min(2000, Math.max(10, g || 100)))
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
                    />
                  </label>
                  {/* ၁ ပွဲ / တစ်ဝက် — ရွေးတာနဲ့ ၁ ပွဲ ပမာဏ အော်တို ဖြည့်ထားပြီးသား
                      (pickSearchFood) — chip နှိပ်ရင် တစ်ဝက် ပြောင်းတယ်။ */}
                  {(() => {
                    const serving = parseServing(pickedFood.serving_desc);
                    if (!serving) return null;
                    const half = Math.round(serving.grams / 2);
                    const chip = (active: boolean) =>
                      `btn-press rounded-full px-3 py-1.5 text-sm font-semibold ${
                        active
                          ? "bg-[var(--theme)] text-white"
                          : "bg-white text-[var(--theme-dark)] shadow-sm ring-1 ring-[var(--theme-ring)]"
                      }`;
                    return (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchGrams(serving.grams);
                            setPickedChip("full");
                          }}
                          className={chip(pickedChip === "full")}
                        >
                          {serving.label} · {serving.grams}
                          {serving.unit}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchGrams(half);
                            setPickedChip("half");
                          }}
                          className={chip(pickedChip === "half")}
                        >
                          {t("add.servingHalf")} · {half}
                          {serving.unit}
                        </button>
                      </div>
                    );
                  })()}
                  <p className="caption mt-2">
                    {(() => {
                      const s = scaleNutrients(
                        {
                          grams: 100,
                          calories: pickedFood.calories_per_100g ?? 0,
                          protein: pickedFood.protein_per_100g ?? 0,
                          carbs: pickedFood.carbs_per_100g ?? 0,
                          fat: pickedFood.fat_per_100g ?? 0,
                        },
                        searchGrams,
                      );
                      return `${searchGrams}${parseServing(pickedFood.serving_desc)?.unit ?? "g"} ≈ ${s.calories} kcal · Protein ${s.protein}g · Carbs ${s.carbs}g · Fat ${s.fat}g`;
                    })()}
                  </p>
                  <button
                    type="button"
                    onClick={confirmSearchFood}
                    className="btn-press mt-3 w-full rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white"
                  >
                    {t("add.reviewSave")}
                  </button>
                </div>
              )}
              {query.trim().length < 2 && results.length > 0 && (
                <p className="caption mt-3 font-semibold">
                  {t("add.browseTitle")}
                </p>
              )}
              {/* list ကို ကဒ် သပ်သပ် ခွဲထားတယ် — တစ်ခုချင်း အဖြူကဒ်လေး၊
                  အကြားမှာ နေရာခြားထားတယ်။ အကြောင်းအရာက ကျစ်ကျစ်လေးပဲ
                  (နာမည် ဘယ် + kcal ညာ) — အကွက်ကြီးတွေ မဟုတ်ဘူး။ */}
              <ul className="mt-2 space-y-2">
                {results.map((f, i) => (
                  <li key={f.id} style={{ animationDelay: `${Math.min(i, 9) * 30}ms` }} className="anim-in">
                    <button
                      type="button"
                      onClick={() => pickSearchFood(f)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-left shadow-sm ${
                        pickedFood?.id === f.id
                          ? "font-semibold text-[var(--theme-dark)] ring-1 ring-[var(--theme)]"
                          : ""
                      }`}
                    >
                      <span className="font-semibold">
                        {f.name_mm}
                        {pickedFood?.id === f.id && " ✓"}
                      </span>
                      <span className="caption shrink-0">
                        {Math.round(f.calories_per_100g ?? 0)} kcal / 100
                        {parseServing(f.serving_desc)?.unit ?? "g"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {message && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-red-700">
              {message}
              {noKeyError && (
                <Link
                  href="/profile"
                  className="mt-1 block font-semibold text-[var(--theme-dark)] underline"
                >
                  {t("add.noKeyLink")}
                </Link>
              )}
            </p>
          )}
        </>
      )}

      <BottomNav />
    </main>
  );
}
