"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import ReviewForm, { type ReviewInitial } from "@/components/ReviewForm";
import { createClient } from "@/lib/supabase/client";
import { scaleNutrients, type AnalyzedFood } from "@/lib/meal";

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

export default function AddPage() {
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
      setMessage("ဓာတ်ပုံဖိုင် မဟုတ်ပါ — ပုံပဲ ရွေးပေးပါ။");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setMessage("ဓာတ်ပုံ အရမ်းကြီးနေတယ် — 5MB အောက် ပုံပဲ သုံးပေးပါ။");
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
      setMessage("ဓာတ်ပုံ အရင် ရွေးပေးပါ။");
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
        throw new Error(data?.error ?? "AI စစ်လို့ မရပါ။");
      }
      setReview({
        food: data.result as AnalyzedFood,
        source: "photo",
        photoFile,
        photoPreviewUrl: photoPreview,
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI စစ်လို့ မရပါ။");
    } finally {
      setBusy(false);
    }
  }

  async function analyzeText() {
    if (!textInput.trim()) {
      setMessage("ဘာစားခဲ့လဲ ဆိုတာ အရင် ရိုက်ပေးပါ။");
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
        throw new Error(data?.error ?? "AI စစ်လို့ မရပါ။");
      }
      setReview({ food: data.result as AnalyzedFood, source: "text" });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI စစ်လို့ မရပါ။");
    } finally {
      setBusy(false);
    }
  }

  // Search — မြန်မာ/အင်္ဂလိပ် နာမည်နဲ့ foods table ကို ရှာတယ် (AI မသုံးဘူး)။
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const supabase = createClient();
        const safe = q.replace(/[%_]/g, "");
        const { data, error } = await supabase
          .from("foods")
          .select(
            "id, name_mm, name_en, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_desc",
          )
          .or(`name_mm.ilike.%${safe}%,name_en.ilike.%${safe}%`)
          .order("name_mm")
          .limit(20);
        if (!error) setResults((data ?? []) as FoodRow[]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function pickSearchFood(food: FoodRow) {
    setPickedFood(food);
    setSearchGrams(100);
    setMessage("");
  }

  function confirmSearchFood() {
    if (!pickedFood) return;
    const scaled = scaleNutrients(
      {
        grams: 100,
        calories: pickedFood.calories_per_100g ?? 0,
        protein: pickedFood.protein_per_100g ?? 0,
        carbs: pickedFood.carbs_per_100g ?? 0,
        fat: pickedFood.fat_per_100g ?? 0,
      },
      searchGrams,
    );
    setReview({
      food: {
        name_mm: pickedFood.name_mm,
        name_en: pickedFood.name_en ?? pickedFood.name_mm,
        grams: searchGrams,
        ...scaled,
        note: pickedFood.serving_desc ?? "",
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
    { value: "photo", label: "📷 ဓာတ်ပုံ" },
    { value: "text", label: "✍️ စာရိုက်" },
    { value: "search", label: "🔍 ရှာဖွေ" },
    { value: "manual", label: "📝 လက်နဲ့" },
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
    <main className="mx-auto min-h-screen max-w-md bg-white px-5 pb-24 pt-8">
      <h1>+ အစားအစာ ထည့်မယ်</h1>

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
                className={`rounded-xl border px-2 py-2.5 text-sm ${
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
              <p className="caption">
                AI မသုံးဘဲ ကိုယ်တိုင် ဖြည့်မယ် — နာမည်၊ ဂရမ်၊ ကယ်လိုရီနဲ့
                macro ကို ရိုက်ထည့်ပြီး သိမ်းလို့ရတယ်။
              </p>
              <ReviewForm
                initial={manualInitial}
                onCancel={() => setMode("photo")}
              />
            </div>
          )}

          {mode === "photo" && (
            <section className="mt-4 rounded-2xl border p-5">
              <h2>ဓာတ်ပုံနဲ့ ထည့်မယ်</h2>
              <p className="caption mt-1">
                ပုံရိုက်လိုက် — AI က အစားအစာကို ခွဲပြီး ကယ်လိုရီ ခန့်မှန်းပေးမယ်။
              </p>
              {photoPreview ? (
                <div className="relative mt-3">
                  <img
                    src={photoPreview}
                    alt="ရွေးထားတဲ့ ဓာတ်ပုံ"
                    className="h-56 w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={busy}
                    aria-label="ဓာတ်ပုံ ဖျက်မယ်"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg font-bold text-white disabled:opacity-50"
                  >
                    ✕
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
                  📷 ကင်မရာ
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
                <span className="caption">မှတ်ချက် (မဖြစ်မနေ မဟုတ်ပါ)</span>
                <input
                  type="text"
                  value={photoHint}
                  onChange={(e) => setPhotoHint(e.target.value)}
                  placeholder="ဥပမာ: မုန့်ဟင်းခါး၊ ငါးနဲ့"
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
                {busy ? "AI စစ်နေတယ်…" : "🤖 AI နဲ့ စစ်မယ်"}
              </button>
            </section>
          )}

          {mode === "text" && (
            <section className="mt-4 rounded-2xl border p-5">
              <h2>စာရိုက်ပြီး ထည့်မယ်</h2>
              <p className="caption mt-1">
                ဘာစားခဲ့လဲ ရိုက်ထည့်လိုက် — AI က ကယ်လိုရီ ခန့်မှန်းပေးမယ်။
              </p>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
                placeholder="ဥပမာ: မုန့်ဟင်းခါး တစ်ပွဲ၊ ကြက်ဥ တစ်လုံး"
                disabled={busy}
                className="mt-3 w-full rounded-xl border px-3 py-2.5"
              />
              <button
                type="button"
                onClick={analyzeText}
                disabled={busy || !textInput.trim()}
                className="mt-3 w-full rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {busy ? "AI စစ်နေတယ်…" : "🤖 AI နဲ့ စစ်မယ်"}
              </button>
            </section>
          )}

          {mode === "search" && (
            <section className="mt-4 rounded-2xl border p-5">
              <h2>ရှာဖွေပြီး ထည့်မယ်</h2>
              <p className="caption mt-1">
                သိမ်းထားတဲ့ အစားအစာ စာရင်းထဲက ရှာတယ် — AI မသုံးဘူး၊ မြန်တယ်။
              </p>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPickedFood(null);
                }}
                placeholder="ဥပမာ: မုန့်ဟင်းခါး / rice"
                className="mt-3 w-full rounded-xl border px-3 py-2.5"
              />
              {searching && <p className="caption mt-2">ရှာနေတယ်…</p>}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="mt-3 text-[#52677f]">
                  မတွေ့ပါ — ဓာတ်ပုံ (သို့) စာရိုက်ပြီး ထည့်ကြည့်ပါ။
                </p>
              )}
              <ul className="mt-2 space-y-2">
                {results.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => pickSearchFood(f)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left ${
                        pickedFood?.id === f.id
                          ? "border-[var(--theme)] bg-[var(--theme-soft)]"
                          : ""
                      }`}
                    >
                      <span className="font-semibold">{f.name_mm}</span>
                      {f.name_en && (
                        <span className="caption block">{f.name_en}</span>
                      )}
                      <span className="caption block">
                        {Math.round(f.calories_per_100g ?? 0)} kcal / 100g
                        {f.serving_desc ? ` · ${f.serving_desc}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {pickedFood && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold">{pickedFood.name_mm}</p>
                  <label className="mt-2 block">
                    <span className="caption">ပမာဏ (ဂရမ်)</span>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={searchGrams}
                      onChange={(e) =>
                        setSearchGrams(
                          Math.min(2000, Math.max(10, Number(e.target.value) || 100)),
                        )
                      }
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
                    />
                  </label>
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
                      return `${searchGrams}g ≈ ${s.calories} kcal · Protein ${s.protein}g · Carbs ${s.carbs}g · Fat ${s.fat}g`;
                    })()}
                  </p>
                  <button
                    type="button"
                    onClick={confirmSearchFood}
                    className="mt-3 w-full rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white"
                  >
                    စစ်ဆေးပြီး သိမ်းမယ် →
                  </button>
                </div>
              )}
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
                  Profile မှာ Gemini key ထည့်မယ် →
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
