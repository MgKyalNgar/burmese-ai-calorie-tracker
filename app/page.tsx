"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { invalidateCache, useCachedData } from "@/lib/useCachedData";
import { warmOtherTabs } from "@/lib/warmup";
import { FETCH_FALLBACK, useLang } from "@/lib/i18n";
import { formatWeight, useWeightUnit } from "@/lib/units";
import {
  formatDateDMY,
  round1,
  todayYangon,
  type TodayData,
} from "@/lib/meal";

// Home ကို client component အဖြစ် ပြောင်းထားတယ် —
// ဒေတာကို ဖုန်းထဲ cache ထားတော့ tab ပြန်ကူးတိုင်း server ကို
// ပြန်စောင့်စရာ မလိုဘူး၊ မှတ်ထားတာကို ချက်ချင်း ပြတယ်။
async function fetchToday(): Promise<TodayData> {
  const res = await fetch("/api/today");
  if (res.status === 401) {
    // Login ပြီးခါစ session cookie က server ကို မရောက်သေးတဲ့
    // ခဏတာ 401 ဖြစ်နိုင်လို့ (login → Home ကန်ထုတ်တာ 2 ခါ တွေ့ဖူးတယ် —
    // 21 Nov 2026 မနက် main အကောင့်နဲ့ keyless အကောင့် 2 ခုလုံး),
    // 1.5 စက္ကန့်စောင့်ပြီး တစ်ခါ ပြန်စမ်းတယ်။
    // ဒုတိယအကြိမ်လည်း 401 ဆိုမှ တကယ် login မဝင်သေးဘူးလို့ သတ်မှတ်တယ်။
    await new Promise((r) => setTimeout(r, 1500));
    const retry = await fetch("/api/today");
    const retryData = await retry.json();
    if (retry.status === 401) return { needsLogin: true } as TodayData;
    if (!retry.ok)
      throw new Error(retryData?.error ?? FETCH_FALLBACK);
    return retryData as TodayData;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? FETCH_FALLBACK);
  return data as TodayData;
}

// ကယ်လိုရီ Ring — အစာအမျိုးအစားအလိုက် အရောင်ခွဲ (မနက်စာ လိမ္မော်၊
// နေ့လည်စာ အစိမ်း၊ ညစာ အပြာ၊ အစာပြေ ပန်းရောင်)။
// compact=true ဆို အလယ်မှာ ဂဏန်းအစား 🔥 ပဲ ပြတယ် (Home hero က ဂဏန်းကို
// ဘယ်ဘက်မှာ ကြီးကြီးပြထားပြီးသားမို့ ring အလယ် ထပ်မပြဘူး)။
const MEAL_RING_COLORS: Record<string, string> = {
  breakfast: "#f59e0b",
  lunch: "#16a34a",
  dinner: "#3b82f6",
  snack: "#ec4899",
};

function CalorieRing({
  eaten,
  target,
  segments = [],
  size = "h-36 w-36",
  compact = false,
}: {
  eaten: number;
  target: number;
  segments?: { type: string; kcal: number }[];
  size?: string;
  compact?: boolean;
}) {
  const { t } = useLang();
  const remaining = Math.max(0, target - eaten);
  const r = 56;
  const circ = 2 * Math.PI * r;
  // target ကျော်စားရင်လည်း အပိုင်းတွေ အချိုးကျ ပေါ်အောင်
  // စားပြီးသား စုစုပေါင်းနဲ့ ခွဲတယ်။
  const denom = Math.max(target, eaten);
  let acc = 0;
  const arcs = segments
    .filter((s) => s.kcal > 0 && denom > 0)
    .map((s) => {
      const len = (s.kcal / denom) * circ;
      const arc = { ...s, len, start: acc };
      acc += len;
      return arc;
    });
  return (
    <div className={`relative mx-auto ${size}`}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        {/* အပိုင်းတွေ ထပ်တဲ့ အစဉ် — နောက်ဆုံး ဆွဲတာက အပေါ်ဆုံးမှာ ပေါ်တယ်။
            Breakfast ကို အပေါ်ဆုံး ထားချင်လို့ reverse ပြီး ဆွဲတယ် —
            lunch/dinner/snack က breakfast ရဲ့ အောက်ကနေ ထပ်ထွက်လာတဲ့ပုံ
            ဖြစ်သွားတယ် (26 Nov 2026)။ */}
        {[...arcs].reverse().map((a) => (
          <circle
            key={a.type}
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={MEAL_RING_COLORS[a.type] ?? "var(--theme)"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${a.len} ${circ - a.len}`}
            strokeDashoffset={-a.start}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {compact ? (
          <span className="text-2xl" aria-hidden>
            🔥
          </span>
        ) : (
          <>
            <p className="caption">{t("home.remaining")}</p>
            <p className="hero-num text-[var(--theme-dark)]">{remaining.toLocaleString()}</p>
            <p className="caption">kcal</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { t, lang } = useLang();
  const { unit } = useWeightUnit();
  const key = `today-${todayYangon()}`;
  const { data, loading, refreshing, error } = useCachedData<TodayData>(
    key,
    fetchToday,
  );

  useEffect(() => {
    if (data?.needsLogin) router.push("/login");
    else if (data?.needsOnboarding) router.push("/onboarding");
    else if (data) warmOtherTabs();
  }, [data, router]);

  // Home ရေ ကဒ်က +1 ခလုတ် — နှိပ်တာနဲ့ ဂဏန်း ချက်ချင်း တက်တယ်
  // (optimistic)၊ ပြီးမှ server ကို POST /api/water { cups: 1 } ပို့တယ်။
  // server ဒေတာ အသစ်ရောက်လာရင် optimistic +1 ကို ပြန်ဖျက်တယ် —
  // မဟုတ်ရင် ဆွဲထားတဲ့ ဂဏန်းနဲ့ ထပ်ပေါင်းပြီး ၂ ခါ ရေတွက်မိမယ်။
  const [waterAdded, setWaterAdded] = useState(0);
  const [waterBusy, setWaterBusy] = useState(false);
  useEffect(() => {
    setWaterAdded(0);
  }, [data?.cups]);

  async function addWater() {
    if (waterBusy) return;
    setWaterBusy(true);
    setWaterAdded((v) => v + 1);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cups: 1 }),
      });
      if (!res.ok) throw new Error("water");
      // နောက်တစ်ခါ ပြန်ဆွဲတဲ့အခါ အသစ်ရအောင် cache ကို ဖျက်တယ်။
      invalidateCache(key);
    } catch {
      setWaterAdded((v) => Math.max(0, v - 1));
    } finally {
      setWaterBusy(false);
    }
  }

  // ပထမအကြိမ် ဒေတာ မရသေးရင် စောင့်နေတဲ့ ပုံစံ ပြတယ်။
  if (loading || !data || data.needsLogin || data.needsOnboarding) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 pb-24">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--theme)]"
          aria-hidden
        />
        <p className="mt-4 text-[#52677f]">{t("common.loading")}</p>
        <BottomNav />
      </main>
    );
  }

  // cache ထဲက ဒေတာရှိရင် error တက်လည်း အဲဒါကို ဆက်ပြတယ် — လိုင်းမရှိချိန်
  // (fetch ပျက်ချိန်) ဒေတာအဟောင်းကို မြင်ရဖို့။ cache လုံးဝ မရှိမှပဲ error ပြတယ်။
  if (error && !data) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-5 pb-24 pt-8">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error === FETCH_FALLBACK ? t("common.loadError") : error}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-[var(--theme)] px-5 py-2.5 font-semibold text-white"
        >
          {t("common.retry")}
        </button>
        <BottomNav />
      </main>
    );
  }

  const { target, eaten, protein, carbs, fat, cups, latestWeightKg, streak } =
    data;
  // ရေ ပန်းတိုင် — cache အဟောင်းမှာ မပါရင် default 8။
  const waterGoal = data.waterGoal ?? 8;

  // Ring အပိုင်းတွေ — အစာအမျိုးအစားအလိုက် kcal စုစုပေါင်း။
  const mealOrder = ["breakfast", "lunch", "dinner", "snack"] as const;
  const mealKcal = mealOrder.map((type) => ({
    type,
    kcal: data.meals
      .filter((m) => m.meal_type === type)
      .reduce((sum, m) => sum + Number(m.total_calories ?? 0), 0),
  }));
  // ရေ card ဖြည့်နှုန်း — optimistic +1 လည်း ပါတယ်။
  const waterPct =
    waterGoal > 0
      ? Math.min(100, ((cups + waterAdded) / waterGoal) * 100)
      : 0;

  // Macro target (ခန့်မှန်း) — protein 20%, carbs 50%, fat 30%။
  const macroTargets = {
    protein: Math.round((target * 0.2) / 4),
    carbs: Math.round((target * 0.5) / 4),
    fat: Math.round((target * 0.3) / 9),
  };

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pb-24 pt-5">
      <h1>
        {t("home.greeting", {
          name: data.displayName
            ? `${lang === "my" ? "၊ " : ", "}${data.displayName}`
            : "",
        })}
      </h1>
      <p className="caption mt-1">
        {t("home.todayStreak", {
          date: formatDateDMY(data.date),
          streak,
        })}
      </p>
      <p className="caption">{t("home.streakNote")}</p>
      {refreshing && <p className="caption mt-1">{t("common.refreshing")}</p>}

      {/* Hero — ပုံ ၂ Home လို ဘေးတိုက်ပုံစံ: ဂဏန်း ဘယ်၊ ring ညာ။
          တစ်မျက်နှာထဲ ဝင်အောင် ring ကို သေးထားတယ်။ */}
      <section className="mt-3 rounded-3xl bg-[var(--theme-card)] p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1 text-left">
            <p className="caption">{t("home.remaining")}</p>
            <p className="hero-num text-[var(--theme-dark)]">
              {Math.max(0, target - eaten).toLocaleString()}
              <span className="text-base"> kcal</span>
            </p>
            <p className="caption mt-1">
              {t("home.eatenTarget", {
                eaten: eaten.toLocaleString(),
                target: target.toLocaleString(),
              })}
            </p>
          </div>
          <CalorieRing
            eaten={eaten}
            target={target}
            segments={mealKcal}
            size="h-24 w-24"
            compact
          />
        </div>
        {/* Ring အပိုင်းတွေရဲ့ အရောင် ရှင်းလင်းချက် */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-black/5 pt-2">
          {mealKcal.map((s) => (
            <span key={s.type} className="caption flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: MEAL_RING_COLORS[s.type] }}
              />
              {t(`meal.${s.type}`)} {Math.round(s.kcal)} kcal
            </span>
          ))}
        </div>
      </section>

      {/* Macro — ကော်လံ ၃ ခု ဘေးတိုက် (ပုံ ၂ ရဲ့ Bread/Avacada/Chicken
          ကော်လံတွေလို) — အရင် bar ၃ ခု အပြည့်ပုံစံထက် နေရာသက်သာတယ်။ */}
      <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex gap-4">
          {(
            [
              ["Protein", protein, macroTargets.protein],
              ["Carbs", carbs, macroTargets.carbs],
              ["Fat", fat, macroTargets.fat],
            ] as const
          ).map(([label, value, goal]) => (
            <div key={label} className="flex-1">
              <p className="caption">{label}</p>
              <p className="font-semibold">
                {round1(value)}g
                <span className="caption"> / {goal}g</span>
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[var(--theme)]"
                  style={{ width: `${goal > 0 ? Math.min(100, (value / goal) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 flex gap-3">
        <div className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-2xl bg-white p-3 text-center shadow-sm">
          {/* ရေ card တစ်ခုလုံး အောက်ကနေ အပြာရောင် တက်လာတယ် —
              သောက်ပြီးတဲ့ ရာခိုင်နှုန်းအလိုက်။ စာနဲ့ ခလုတ်က အပေါ်မှာ ရှိနေတယ်။ */}
          <div
            aria-hidden
            className={`absolute inset-x-0 bottom-0 bg-sky-200 transition-[height] duration-300 ease-in-out ${
              waterPct > 0 ? "border-t-2 border-sky-300" : ""
            }`}
            style={{ height: `${waterPct}%` }}
          />
          <div className="relative">
          {/* title "💧 ရေ"၊ အောက်မှာ 0/8 နဲ့ ခွက် အပေါ်အောက်၊
              ဘေးမှာ ရေစက် အဝိုင်းခလုတ် — အဝိုင်းအပေါ် ညာဘက်ထောင့်မှာ "+" badge
              (ပုံအတိုင်း)။ အဝိုင်းကို နှိပ်ရင် ရေ ၁ ခွက် တိုးတယ်။ */}
          <p className="caption">{t("home.water")}</p>
          <div className="mt-1 flex items-center justify-center gap-3">
            <div>
              <p className="hero-num text-[var(--theme-dark)]">
                {cups + waterAdded}
                <span className="text-base text-[#52677f]">/{waterGoal}</span>
              </p>
              <p className="caption">{t("home.cups")}</p>
            </div>
            <button
              type="button"
              onClick={addWater}
              disabled={waterBusy}
              aria-label="ရေ ၁ ခွက် ထည့်မယ်"
              className="btn-press relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-2xl shadow-sm disabled:opacity-50"
            >
              <span key={cups + waterAdded} aria-hidden className="anim-drop-bounce inline-block">
                💧
              </span>
              <span
                aria-hidden
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-sky-500 bg-white text-sm font-bold leading-none text-sky-600"
              >
                +
              </span>
            </button>
          </div>
          </div>
        </div>
        <div className="flex-1 rounded-2xl bg-white p-3 text-center shadow-sm">
          <p className="caption">{t("home.weight")}</p>
          <p className="hero-num text-[var(--theme-dark)]">
            {latestWeightKg !== null ? formatWeight(latestWeightKg, unit) : "—"}
          </p>
          <p className="caption">{unit}</p>
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2>{t("home.todayMeals")}</h2>
        {data.meals.length === 0 ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[#52677f]">{t("home.emptyMeals")}</p>
            <Link
              href="/add"
              className="shrink-0 rounded-xl bg-[var(--theme)] px-4 py-2 font-semibold text-white"
            >
              {t("home.addFood")}
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.meals.map((m, i) => (
              <li
                key={m.id}
                style={{ animationDelay: `${Math.min(i, 9) * 30}ms` }}
                className="anim-in flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <div>
                  <p className="font-semibold">
                    {m.name_mm ?? t(`meal.${m.meal_type}`)}
                  </p>
                  <p className="caption">
                    {t(`meal.${m.meal_type}`)}
                  </p>
                </div>
                <span className="font-semibold">
                  {Math.round(Number(m.total_calories ?? 0))} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
