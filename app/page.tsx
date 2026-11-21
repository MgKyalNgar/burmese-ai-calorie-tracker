"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { useCachedData } from "@/lib/useCachedData";
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
      throw new Error(retryData?.error ?? "ဒေတာ ဆွဲလို့ မရပါ။");
    return retryData as TodayData;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "ဒေတာ ဆွဲလို့ မရပါ။");
  return data as TodayData;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "မနက်စာ",
  lunch: "နေ့လည်စာ",
  dinner: "ညစာ",
  snack: "အဆာပြေ",
};

// ကယ်လိုရီ Ring — စားပြီးသား / target။
function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const remaining = Math.max(0, target - eaten);
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const r = 56;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#16a34a"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="caption">ကျန်တာ</p>
        <p className="hero-num text-[#15803d]">{remaining.toLocaleString()}</p>
        <p className="caption">kcal</p>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const key = `today-${todayYangon()}`;
  const { data, loading, refreshing, error } = useCachedData<TodayData>(
    key,
    fetchToday,
  );

  useEffect(() => {
    if (data?.needsLogin) router.push("/login");
    else if (data?.needsOnboarding) router.push("/onboarding");
  }, [data, router]);

  // ပထမအကြိမ် ဒေတာ မရသေးရင် စောင့်နေတဲ့ ပုံစံ ပြတယ်။
  if (loading || !data || data.needsLogin || data.needsOnboarding) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-5 pb-24">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#16a34a]"
          aria-hidden
        />
        <p className="mt-4 text-[#52677f]">ခနစောင့်ပါ…</p>
        <BottomNav />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-white px-5 pb-24 pt-8">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-[#16a34a] px-5 py-2.5 font-semibold text-white"
        >
          ပြန်စမ်းမယ်
        </button>
        <BottomNav />
      </main>
    );
  }

  const { target, eaten, protein, carbs, fat, cups, latestWeightKg, streak } =
    data;
  // ရေ ပန်းတိုင် — cache အဟောင်းမှာ မပါရင် default 8။
  const waterGoal = data.waterGoal ?? 8;

  // Macro target (ခန့်မှန်း) — protein 20%, carbs 50%, fat 30%။
  const macroTargets = {
    protein: Math.round((target * 0.2) / 4),
    carbs: Math.round((target * 0.5) / 4),
    fat: Math.round((target * 0.3) / 9),
  };

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>
        မင်္ဂလာပါ{data.displayName ? `၊ ${data.displayName}` : ""} 👋
      </h1>
      <p className="caption mt-1">
        ဒီနေ့ {formatDateDMY(data.date)} · 🔥 Streak {streak} ရက်
      </p>
      <p className="caption mt-1">
        Streak ဆိုတာ အစာမှတ်တဲ့ ရက် ဆက်တိုက်ပါ — ရေသောက်/ဝိတ်မှတ်တာ မပါဘူး။
      </p>
      {refreshing && <p className="caption mt-1">အသစ်ဆွဲနေတယ်…</p>}

      <section className="mt-6 rounded-2xl border p-5 text-center">
        <CalorieRing eaten={eaten} target={target} />
        <p className="caption mt-2">
          စားပြီး {eaten.toLocaleString()} kcal · Target{" "}
          {target.toLocaleString()} kcal
        </p>
      </section>

      <section className="mt-4 rounded-2xl border p-5">
        <h2>Macro</h2>
        {(
          [
            ["Protein", protein, macroTargets.protein, "g"],
            ["Carbs", carbs, macroTargets.carbs, "g"],
            ["Fat", fat, macroTargets.fat, "g"],
          ] as const
        ).map(([label, value, goal, unit]) => (
          <div key={label} className="mt-3">
            <div className="flex justify-between">
              <span>{label}</span>
              <span className="caption">
                {round1(value)}
                {unit} / {goal}
                {unit}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#16a34a]"
                style={{ width: `${goal > 0 ? Math.min(100, (value / goal) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-4 flex gap-3">
        <div className="flex-1 rounded-2xl border p-4 text-center">
          <p className="caption">💧 ရေ</p>
          <p className="hero-num text-[#15803d]">
            {cups}
            <span className="text-base text-[#52677f]">/{waterGoal}</span>
          </p>
          <p className="caption">ခွက်</p>
        </div>
        <div className="flex-1 rounded-2xl border p-4 text-center">
          <p className="caption">⚖️ ဝိတ်</p>
          <p className="hero-num text-[#15803d]">
            {latestWeightKg !== null ? latestWeightKg : "—"}
          </p>
          <p className="caption">kg</p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border p-5">
        <h2>ဒီနေ့ စားပြီးသား</h2>
        {data.meals.length === 0 ? (
          <div className="mt-3 text-center">
            <p className="text-[#52677f]">ဒီနေ့ ဘာမှ မမှတ်ရသေးဘူး။</p>
            <Link
              href="/add"
              className="mt-3 inline-block rounded-xl bg-[#16a34a] px-5 py-2.5 font-semibold text-white"
            >
              + အစားအစာ ထည့်မယ်
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.meals.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <div>
                  <p className="font-semibold">
                    {m.name_mm ?? MEAL_LABELS[m.meal_type as string] ?? m.meal_type}
                  </p>
                  <p className="caption">
                    {MEAL_LABELS[m.meal_type as string] ?? m.meal_type}
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
