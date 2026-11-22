"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { invalidateCachePrefix, useCachedData } from "@/lib/useCachedData";
import {
  formatDateDMY,
  formatDayMonth,
  todayYangon,
  type ProgressData,
} from "@/lib/meal";

// Progress ကို client component အဖြစ် ထားတယ် —
// ဒေတာကို ဖုန်းထဲ cache ထားတော့ tab ပြန်ကူးတိုင်း ချက်ချင်း ပြတယ်။
async function fetchProgress(): Promise<ProgressData> {
  const res = await fetch("/api/progress");
  const data = await res.json();
  if (res.status === 401) return { needsLogin: true } as ProgressData;
  if (!res.ok) throw new Error(data?.error ?? "ဒေတာ ဆွဲလို့ မရပါ။");
  return data as ProgressData;
}

const WEEKDAY_SHORT = ["နွေ", "လာ", "ဂါ", "ဟူး", "ကြာ", "သော", "နေ"];
const WEEKDAY_HEADERS_MON_FIRST = ["လာ", "ဂါ", "ဟူး", "ကြာ", "သော", "နေ", "နွေ"];
const MONTH_MM = [
  "ဇန်နဝါရီ",
  "ဖေဖော်ဝါရီ",
  "မတ်",
  "ဧပြီ",
  "မေ",
  "ဇွန်",
  "ဇူလိုင်",
  "သြဂုတ်",
  "စက်တင်ဘာ",
  "အောက်တိုဘာ",
  "နိုဝင်ဘာ",
  "ဒီဇင်ဘာ",
];

// YYYY-MM-DD ရက်စွဲကို ရန်ကုန်အချိန်နဲ့ တွက်ပြီး နေ့အမည် အတိုရတယ်။
function weekdayShort(date: string): string {
  return WEEKDAY_SHORT[new Date(`${date}T12:00:00+06:30`).getDay()];
}

// ဒီနေ့ ကယ်လိုရီ ရည်မှန်းချက် — ၇ ရက်စာ chart ထဲက target line အတွက်။
function BarChart({ week }: { week: ProgressData["week"] }) {
  const maxEaten = Math.max(...week.map((d) => d.eaten), 0);
  const target = week[0]?.target ?? 0;
  const max = Math.max(maxEaten, target, 100);
  const chartH = 144; // px — bar အမြင့် အများဆုံး
  const targetPct = target > 0 ? (target / max) * 100 : 0;
  const allZero = maxEaten === 0;

  return (
    <div>
      <div className="relative">
        {/* target line */}
        {target > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-[#f59e0b]"
            style={{ bottom: `${targetPct}%` }}
            aria-hidden
          />
        )}
        <div className="flex items-end gap-2" style={{ height: chartH }}>
          {week.map((d) => {
            const hPct = max > 0 ? (d.eaten / max) * 100 : 0;
            const over = d.eaten > target && target > 0;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end">
                <span className="caption font-semibold">
                  {d.eaten > 0 ? d.eaten.toLocaleString() : ""}
                </span>
                <div
                  className={`mt-1 w-full max-w-8 rounded-t-lg ${
                    d.eaten === 0
                      ? "bg-slate-100"
                      : over
                        ? "bg-[#f59e0b]"
                        : "bg-[var(--theme)]"
                  }`}
                  style={{ height: `${Math.max(hPct, d.eaten > 0 ? 4 : 2)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {week.map((d) => (
          <div key={d.date} className="flex-1 text-center">
            <p className="caption">
              {weekdayShort(d.date)} {Number(d.date.slice(8, 10))}
            </p>
          </div>
        ))}
      </div>
      <p className="caption mt-2 text-[#52677f]">
        <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[#f59e0b] align-middle" />{" "}
        Target {target.toLocaleString()} kcal · လိမ္မော်ရောင် = target ကျော်တယ်
      </p>
      {allZero && (
        <p className="mt-2 text-[#52677f]">ဒီအပတ် ဘာမှ မမှတ်ရသေးဘူး။</p>
      )}
    </div>
  );
}

// ဝိတ် trend — SVG line chart။
function WeightChart({ weights }: { weights: ProgressData["weights"] }) {
  if (weights.length === 0) {
    return (
      <p className="mt-3 text-[#52677f]">
        ဝိတ် မမှတ်ရသေးဘူး — အောက်က form နဲ့ ထည့်ပေးပါ။
      </p>
    );
  }
  const W = 320;
  const H = 170;
  const padL = 36;
  const padR = 10;
  const padT = 16;
  const padB = 24;
  const kgs = weights.map((w) => w.kg);
  let min = Math.floor(Math.min(...kgs) - 1);
  let max = Math.ceil(Math.max(...kgs) + 1);
  // အကွာအဝေး သေးလွန်းရင် (ဥပမာ 70kg တစ်ခုတည်း → 69–71) y-axis က
  // ထူးဆန်းနေလို့ အနည်းဆုံး 5kg အကွာ ဖြစ်အောင် ချဲ့တယ်။
  if (max - min < 5) {
    const mid = (min + max) / 2;
    min = Math.floor(mid - 2.5);
    max = min + 5;
  }
  const x = (i: number) =>
    weights.length === 1
      ? W / 2
      : padL + (i * (W - padL - padR)) / (weights.length - 1);
  const y = (kg: number) =>
    padT + (1 - (kg - min) / (max - min)) * (H - padT - padB);
  const points = weights.map((w, i) => `${x(i)},${y(w.kg)}`).join(" ");

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="ဝိတ် trend chart">
        {/* min / max axis labels */}
        <text x={4} y={y(max) + 4} fontSize="11" fill="#52677f">
          {max}
        </text>
        <text x={4} y={y(min) + 4} fontSize="11" fill="#52677f">
          {min}
        </text>
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#e2e8f0" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#e2e8f0" />
        {weights.length > 1 && (
          <polyline points={points} fill="none" style={{ stroke: "var(--theme)" }} strokeWidth="2" />
        )}
        {weights.map((w, i) => (
          <g key={w.id ?? `${w.date}-${i}`}>
            <circle cx={x(i)} cy={y(w.kg)} r="4" style={{ fill: "var(--theme)" }} />
            <text
              x={x(i)}
              y={y(w.kg) - 8}
              fontSize="11"
              style={{ fill: "var(--theme-dark)" }}
              textAnchor="middle"
            >
              {w.kg}
            </text>
          </g>
        ))}
        {/* x-axis ရက်စွဲ — point တစ်ခုတည်းဆို အလယ်မှာ တစ်ခုပဲ ပြတယ်
            (အရင် အစနဲ့ အဆုံး နှစ်ခုလုံး "11-20" လို့ ထပ်နေလို့)။ */}
        {weights.length === 1 ? (
          <text x={W / 2} y={H - 6} fontSize="11" fill="#52677f" textAnchor="middle">
            {formatDayMonth(weights[0].date)}
          </text>
        ) : (
          <>
            <text x={padL} y={H - 6} fontSize="11" fill="#52677f">
              {formatDayMonth(weights[0].date)}
            </text>
            <text x={W - padR} y={H - 6} fontSize="11" fill="#52677f" textAnchor="end">
              {formatDayMonth(weights[weights.length - 1].date)}
            </text>
          </>
        )}
      </svg>
      <p className="caption mt-1 text-[#52677f]">
        {weights.length} ခု မှတ်ထားတယ် · {formatDateDMY(weights[0].date)} →{" "}
        {formatDateDMY(weights[weights.length - 1].date)}
      </p>
    </div>
  );
}

// ဒီလ ပြက္ခဒိန် — မှတ်ထားတဲ့ ရက်တွေမှာ အစိမ်းအစက်၊ ဒီနေ့ကို အစိမ်းဝိုင်း။
function MonthCalendar({ loggedDays }: { loggedDays: string[] }) {
  const today = todayYangon();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)); // 1–12
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(
    `${today.slice(0, 7)}-01T12:00:00+06:30`,
  ).getDay();
  const offset = (firstDow + 6) % 7; // တနင်္လာနေ့က စတယ်
  const logged = new Set(loggedDays);
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const mm = String(month).padStart(2, "0");

  return (
    <div className="mt-3">
      <p className="font-semibold">
        {MONTH_MM[month - 1]} {year}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_HEADERS_MON_FIRST.map((d) => (
          <span key={d} className="caption font-semibold text-[#52677f]">
            {d}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={`empty-${i}`} />
          ) : (
            <span
              key={day}
              className={`relative flex h-9 items-center justify-center rounded-full ${
                // ဒီနေ့ကို အစိမ်းအပြည့် ဖြည့်တာမျိုး မဟုတ်ဘဲ ring ပဲ ထားတယ် —
                // အရင် solid အစိမ်းနဲ့ မှတ်ထားတဲ့နေ့ အစက်ရောင်တူပြီး
                // ရောနေလို့ (ဒီနေ့ မှတ်ပြီးရင် အစက်ပါ မမြင်ရဘူး)။
                today === `${year}-${mm}-${String(day).padStart(2, "0")}`
                  ? "font-bold text-[var(--theme-dark)] ring-2 ring-[var(--theme)]"
                  : ""
              }`}
            >
              {day}
              {logged.has(`${year}-${mm}-${String(day).padStart(2, "0")}`) && (
                <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--theme)]" />
              )}
            </span>
          ),
        )}
      </div>
      <p className="caption mt-2 text-[#52677f]">
        <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--theme)]" />
        ဒီနေ့{" "}
        <span className="ml-2 mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--theme)]" />
        မှတ်ထားတဲ့ ရက်
      </p>
    </div>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  // POST ပြီးတိုင်း tick ပြောင်းပြီး cache key အသစ်နဲ့ ပြန်ဆွဲတယ်
  // (ဒေတာ အဟောင်း ပြနေရင်း နောက်ကွယ်မှာ အသစ် ရောက်လာတယ်)။
  const [tick, setTick] = useState(0);
  const { data, loading, error } = useCachedData<ProgressData>(
    `progress-${tick}`,
    fetchProgress,
  );
  const [weightKg, setWeightKg] = useState("");
  const [weightDate, setWeightDate] = useState(todayYangon());
  const [weightBusy, setWeightBusy] = useState(false);
  const [weightMsg, setWeightMsg] = useState("");
  // ဝိတ် history ပြင်/ဖျက် — ပြင်နေတဲ့ row ရဲ့ id + ရိုက်ထားတဲ့ kg။
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editWeightKg, setEditWeightKg] = useState("");
  const [deletingWeightId, setDeletingWeightId] = useState<string | null>(
    null,
  );
  const [weightEditBusy, setWeightEditBusy] = useState(false);
  const [waterBusy, setWaterBusy] = useState(false);
  const [waterMsg, setWaterMsg] = useState("");
  // ရေမှတ်မယ့် ရက် — ဒီနေ့က စတယ်၊ အတိတ်နေ့လည်း ရွေးလို့ရတယ်။
  const [waterDate, setWaterDate] = useState(todayYangon());
  // ရေ ပန်းတိုင် — server က ရတာနဲ့ sync လုပ်တယ် (default 8)။
  const [waterGoal, setWaterGoal] = useState(8);
  const [goalBusy, setGoalBusy] = useState(false);

  useEffect(() => {
    if (data?.waterGoal) setWaterGoal(data.waterGoal);
  }, [data]);

  useEffect(() => {
    if (data?.needsLogin) router.push("/login");
    else if (data?.needsOnboarding) router.push("/onboarding");
  }, [data, router]);

  async function handleAddWeight() {
    const kg = Number(weightKg);
    if (!Number.isFinite(kg) || kg < 20 || kg > 300) {
      setWeightMsg("ဝိတ် ၂၀ မှ ၃၀၀ kg အတွင်း ထည့်ပေးပါ။");
      return;
    }
    setWeightBusy(true);
    setWeightMsg("");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_kg: kg, logged_date: weightDate }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "သိမ်းလို့ မရပါ။");
      setWeightMsg("ဝိတ် သိမ်းပြီးပြီ ✅");
      setWeightKg("");
      invalidateCachePrefix("today-");
      setTick((t) => t + 1);
    } catch (err) {
      setWeightMsg(err instanceof Error ? err.message : "သိမ်းလို့ မရပါ။");
    } finally {
      setWeightBusy(false);
    }
  }

  // မှတ်ထားတဲ့ ဝိတ် ပြင်တယ် — PATCH /api/weight။
  async function handleEditWeight(id: string) {
    const kg = Number(editWeightKg);
    if (!Number.isFinite(kg) || kg < 20 || kg > 300) {
      setWeightMsg("ဝိတ် ၂၀ မှ ၃၀၀ kg အတွင်း ထည့်ပေးပါ။");
      return;
    }
    setWeightEditBusy(true);
    setWeightMsg("");
    try {
      const res = await fetch("/api/weight", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, weight_kg: kg }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "ပြင်လို့ မရပါ။");
      setWeightMsg("ဝိတ် ပြင်ပြီးပြီ ✅");
      setEditingWeightId(null);
      invalidateCachePrefix("today-");
      setTick((t) => t + 1);
    } catch (err) {
      setWeightMsg(err instanceof Error ? err.message : "ပြင်လို့ မရပါ။");
    } finally {
      setWeightEditBusy(false);
    }
  }

  // မှတ်ထားတဲ့ ဝိတ် ဖျက်တယ် — DELETE /api/weight။
  async function handleDeleteWeight(id: string) {
    setWeightEditBusy(true);
    setWeightMsg("");
    try {
      const res = await fetch("/api/weight", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "ဖျက်လို့ မရပါ။");
      setWeightMsg("ဝိတ် ဖျက်ပြီးပြီ ✅");
      setDeletingWeightId(null);
      invalidateCachePrefix("today-");
      setTick((t) => t + 1);
    } catch (err) {
      setWeightMsg(err instanceof Error ? err.message : "ဖျက်လို့ မရပါ။");
    } finally {
      setWeightEditBusy(false);
    }
  }

  async function handleAddWater() {
    setWaterBusy(true);
    setWaterMsg("");
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cups: 1, logged_date: waterDate }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "မှတ်လို့ မရပါ။");
      const label =
        waterDate === todayYangon() ? "ဒီနေ့" : formatDateDMY(waterDate);
      setWaterMsg(`ရေမှတ်ပြီးပြီ ✅ ${label} စုစုပေါင်း ${d.cupsToday} ခွက်`);
      invalidateCachePrefix("today-");
      setTick((t) => t + 1);
    } catch (err) {
      setWaterMsg(err instanceof Error ? err.message : "မှတ်လို့ မရပါ။");
    } finally {
      setWaterBusy(false);
    }
  }

  // မှားနှိပ်တာ ပြန်ဖျက်တယ် — ရွေးထားတဲ့ ရက်ရဲ့ နောက်ဆုံး မှတ်တမ်းကနေ ၁ ခွက် လျှော့တယ်။
  async function handleUndoWater() {
    setWaterBusy(true);
    setWaterMsg("");
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo", logged_date: waterDate }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "ဖျက်လို့ မရပါ။");
      const label =
        waterDate === todayYangon() ? "ဒီနေ့" : formatDateDMY(waterDate);
      setWaterMsg(`၁ ခွက် ပြန်ဖျက်ပြီးပြီ ✅ ${label} စုစုပေါင်း ${d.cupsToday} ခွက်`);
      invalidateCachePrefix("today-");
      setTick((t) => t + 1);
    } catch (err) {
      setWaterMsg(err instanceof Error ? err.message : "ဖျက်လို့ မရပါ။");
    } finally {
      setWaterBusy(false);
    }
  }

  // ပန်းတိုင် − / + ခလုတ် — နှိပ်တာနဲ့ server မှာ သိမ်းတယ်။
  async function handleChangeGoal(delta: number) {
    const next = Math.min(20, Math.max(1, waterGoal + delta));
    if (next === waterGoal) return;
    setGoalBusy(true);
    setWaterMsg("");
    try {
      const res = await fetch("/api/water-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "သိမ်းလို့ မရပါ။");
      setWaterGoal(d.goal);
      setWaterMsg(`ပန်းတိုင် ${d.goal} ခွက် ထားပြီးပြီ ✅`);
      invalidateCachePrefix("today-");
      setTick((t) => t + 1);
    } catch (err) {
      setWaterMsg(err instanceof Error ? err.message : "သိမ်းလို့ မရပါ။");
    } finally {
      setGoalBusy(false);
    }
  }

  if (loading || !data || data.needsLogin || data.needsOnboarding) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-5 pb-24">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--theme)]"
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
          className="mt-4 rounded-xl bg-[var(--theme)] px-5 py-2.5 font-semibold text-white"
        >
          ပြန်စမ်းမယ်
        </button>
        <BottomNav />
      </main>
    );
  }

  // ဒီနေ့ ရေခွက် — ရက်စွဲနဲ့ တိုက်ရှာတယ် (waterWeek က တနင်္လာ–တနင်္ဂနွေ
  // ဖြစ်သွားလို့ [6] က ဒီနေ့ မဟုတ်တော့ဘူး)။
  const todayStr = todayYangon();
  const todayCups =
    data.waterWeek.find((d) => d.date === todayStr)?.cups ?? 0;

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>Progress</h1>
      <p className="caption mt-1">ဒီအပတ် ဘယ်လို သွားလဲ ကြည့်မယ်</p>

      {/* ၇ ရက် ကယ်လိုရီ */}
      <section className="mt-4 rounded-2xl border p-5">
        <h2>ဒီအပတ် ကယ်လိုရီ</h2>
        <div className="mt-3">
          <BarChart week={data.week} />
        </div>
      </section>

      {/* ဝိတ် trend + ထည့်မယ် */}
      <section className="mt-4 rounded-2xl border p-5">
        <h2>ဝိတ် trend</h2>
        <WeightChart weights={data.weights} />
        <div className="mt-4 flex gap-2">
          <label className="flex-1">
            <span className="caption">ဝိတ် (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              min={20}
              max={300}
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="60"
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
            />
          </label>
          <label className="flex-1">
            <span className="caption">ရက်စွဲ</span>
            <input
              type="date"
              value={weightDate}
              max={todayYangon()}
              onChange={(e) => setWeightDate(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleAddWeight}
          disabled={weightBusy}
          className="mt-3 w-full rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {weightBusy ? "သိမ်းနေတယ်…" : "သိမ်းမယ် ✅"}
        </button>
        {weightMsg && <p className="caption mt-2">{weightMsg}</p>}

        {/* ဝိတ် မှတ်တမ်း — အသစ်ဆုံး အရင်၊ ပြင်/ဖျက် လို့ရတယ် */}
        {data.weights.length > 0 && (
          <div className="mt-5">
            <h3 className="font-semibold">ဝိတ် မှတ်တမ်း</h3>
            <ul className="mt-2 space-y-2">
              {[...data.weights].reverse().map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl bg-slate-50 px-3 py-2.5"
                >
                  {editingWeightId === w.id ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="caption">{formatDateDMY(w.date)}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={20}
                          max={300}
                          step="0.1"
                          value={editWeightKg}
                          onChange={(e) => setEditWeightKg(e.target.value)}
                          className="h-9 flex-1 rounded-xl border bg-white px-3 text-center"
                        />
                        <span className="caption">kg</span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingWeightId(null)}
                          disabled={weightEditBusy}
                          className="flex-1 rounded-lg border bg-white py-1.5 disabled:opacity-50"
                        >
                          မပြင်တော့ဘူး
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditWeight(w.id)}
                          disabled={weightEditBusy}
                          className="flex-1 rounded-lg bg-[var(--theme)] py-1.5 font-semibold text-white disabled:opacity-50"
                        >
                          {weightEditBusy ? "သိမ်းနေတယ်…" : "သိမ်းမယ်"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{w.kg} kg</p>
                        <p className="caption">{formatDateDMY(w.date)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWeightId(w.id);
                            setEditWeightKg(String(w.kg));
                            setDeletingWeightId(null);
                          }}
                          className="rounded-lg border bg-white px-3 py-1.5"
                        >
                          ✏️ ပြင်မယ်
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingWeightId(w.id)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-red-600"
                        >
                          🗑️ ဖျက်မယ်
                        </button>
                      </div>
                    </div>
                  )}

                  {deletingWeightId === w.id && (
                    <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-3">
                      <p>
                        {formatDateDMY(w.date)} ရဲ့ {w.kg} kg မှတ်တမ်းကို
                        ဖျက်မှာလား?
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDeletingWeightId(null)}
                          className="flex-1 rounded-lg border bg-white py-1.5"
                        >
                          မဖျက်ဘူး
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWeight(w.id)}
                          disabled={weightEditBusy}
                          className="flex-1 rounded-lg bg-red-600 py-1.5 font-semibold text-white disabled:opacity-50"
                        >
                          {weightEditBusy ? "ဖျက်နေတယ်…" : "ဖျက်မယ်"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ပြက္ခဒိန် */}
      <section className="mt-4 rounded-2xl border p-5">
        <h2>မှတ်တမ်း ပြက္ခဒိန်</h2>
        <MonthCalendar loggedDays={data.loggedDays} />
      </section>

      {/* ရေ */}
      <section className="mt-4 rounded-2xl border p-5">
        <h2>💧 ရေ — ဒီအပတ်</h2>
        <div className="mt-3 flex items-end gap-2" style={{ height: 96 }}>
          {data.waterWeek.map((d) => {
            const maxCups = Math.max(...data.waterWeek.map((x) => x.cups), 1);
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end">
                <span className="caption font-semibold">
                  {d.cups > 0 ? d.cups : ""}
                </span>
                <div
                  className={`mt-1 w-full max-w-8 rounded-t-lg ${
                    d.cups === 0 ? "bg-slate-100" : "bg-sky-500"
                  }`}
                  style={{ height: `${Math.max((d.cups / maxCups) * 100, d.cups > 0 ? 6 : 2)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          {data.waterWeek.map((d) => (
            <div key={d.date} className="flex-1 text-center">
              <p className="caption">
                {weekdayShort(d.date)} {Number(d.date.slice(8, 10))}
              </p>
            </div>
          ))}
        </div>

        {/* ပန်းတိုင် + ဒီနေ့ အခြေအနေ */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p>
            ဒီနေ့ {todayCups} / {waterGoal} ခွက်
          </p>
          <div className="flex items-center gap-2">
            <span className="caption">ပန်းတိုင်</span>
            <button
              type="button"
              onClick={() => handleChangeGoal(-1)}
              disabled={goalBusy || waterGoal <= 1}
              aria-label="ပန်းတိုင် လျှော့မယ်"
              className="h-9 w-9 rounded-xl border bg-white font-bold disabled:opacity-30"
            >
              −
            </button>
            <span className="w-12 text-center font-semibold">{waterGoal} ခွက်</span>
            <button
              type="button"
              onClick={() => handleChangeGoal(1)}
              disabled={goalBusy || waterGoal >= 20}
              aria-label="ပန်းတိုင် တိုးမယ်"
              className="h-9 w-9 rounded-xl border bg-white font-bold disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-500"
            style={{ width: `${waterGoal > 0 ? Math.min(100, (todayCups / waterGoal) * 100) : 0}%` }}
          />
        </div>

        {/* ရက်ရွေး + မှတ်/ဖျက် */}
        <label className="mt-4 block">
          <span className="caption">မှတ်မယ့် ရက် (အတိတ်နေ့လည်း ရတယ်)</span>
          <input
            type="date"
            value={waterDate}
            max={todayYangon()}
            onChange={(e) => setWaterDate(e.target.value || todayYangon())}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
          />
        </label>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleAddWater}
            disabled={waterBusy}
            className="flex-1 rounded-xl border border-sky-500 py-2.5 font-semibold text-sky-600 disabled:opacity-50"
          >
            {waterBusy ? "မှတ်နေတယ်…" : "+1 ခွက် 💧"}
          </button>
          <button
            type="button"
            onClick={handleUndoWater}
            disabled={waterBusy}
            className="flex-1 rounded-xl border py-2.5 font-semibold text-[#334155] disabled:opacity-50"
          >
            {waterBusy ? "ဖျက်နေတယ်…" : "−1 ခွက် ↩️"}
          </button>
        </div>
        {waterMsg && <p className="caption mt-2">{waterMsg}</p>}
      </section>

      <BottomNav />
    </main>
  );
}
