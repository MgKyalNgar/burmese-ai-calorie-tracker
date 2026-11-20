import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";

// Home က login session (cookies) ကို ဖတ်လို့ prerender လုပ်လို့ မရဘူး —
// blocking route အဖြစ် ခွင့်ပြုတယ် (Next 16 Cache Components)။
export const instant = false;

// ရန်ကုန်စံတော်ချိန်နဲ့ ဒီနေ့ ရက်စွဲ (YYYY-MM-DD)။
function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
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

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  const today = todayYangon();
  const target = profile.daily_calorie_target ?? 1800;

  // ဒီနေ့ စားပြီးသား meals။
  const { data: meals } = await supabase
    .from("meals")
    .select("id, meal_type, total_calories, total_protein, total_carbs, total_fat, created_at")
    .eq("user_id", user.id)
    .eq("logged_date", today)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  const eaten = (meals ?? []).reduce((s, m) => s + Number(m.total_calories ?? 0), 0);
  const protein = (meals ?? []).reduce((s, m) => s + Number(m.total_protein ?? 0), 0);
  const carbs = (meals ?? []).reduce((s, m) => s + Number(m.total_carbs ?? 0), 0);
  const fat = (meals ?? []).reduce((s, m) => s + Number(m.total_fat ?? 0), 0);

  // ဒီနေ့ ရေသောက်ပြီးသား ခွက်။
  const { data: water } = await supabase
    .from("water_logs")
    .select("cups")
    .eq("user_id", user.id)
    .eq("logged_date", today);
  const cups = (water ?? []).reduce((s, w) => s + Number(w.cups ?? 0), 0);

  // နောက်ဆုံး ဝိတ်။
  const { data: latestWeight } = await supabase
    .from("weight_logs")
    .select("weight_kg, logged_date")
    .eq("user_id", user.id)
    .order("logged_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Streak — ထမင်းမှတ်တဲ့ ရက် ဆက်တိုက် ဘယ်နှစ်ရက် ရှိပြီလဲ။
  const { data: mealDays } = await supabase
    .from("meals")
    .select("logged_date")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("logged_date", { ascending: false })
    .limit(60);
  const daySet = new Set((mealDays ?? []).map((m) => m.logged_date as string));
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00+06:30`);
  // ဒီနေ့ မမှတ်ရသေးရင် မနေ့က စပြီး ရေတွက်တယ်။
  if (!daySet.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" }))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Macro target (ခန့်မှန်း) — protein 20%, carbs 50%, fat 30%။
  const macroTargets = {
    protein: Math.round((target * 0.2) / 4),
    carbs: Math.round((target * 0.5) / 4),
    fat: Math.round((target * 0.3) / 9),
  };

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>
        မင်္ဂလာပါ{profile.display_name ? `၊ ${profile.display_name}` : ""} 👋
      </h1>
      <p className="caption mt-1">ဒီနေ့ {today} · 🔥 Streak {streak} ရက်</p>

      <section className="mt-6 rounded-2xl border p-5 text-center">
        <CalorieRing eaten={eaten} target={target} />
        <p className="caption mt-2">
          စားပြီး {eaten.toLocaleString()} kcal · Target {target.toLocaleString()} kcal
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
                {Math.round(value)}
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
          <p className="hero-num text-[#15803d]">{cups}</p>
          <p className="caption">ခွက်</p>
        </div>
        <div className="flex-1 rounded-2xl border p-4 text-center">
          <p className="caption">⚖️ ဝိတ်</p>
          <p className="hero-num text-[#15803d]">
            {latestWeight ? Number(latestWeight.weight_kg) : "—"}
          </p>
          <p className="caption">kg</p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border p-5">
        <h2>ဒီနေ့ စားပြီးသား</h2>
        {(meals ?? []).length === 0 ? (
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
            {(meals ?? []).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <span>{MEAL_LABELS[m.meal_type as string] ?? m.meal_type}</span>
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
