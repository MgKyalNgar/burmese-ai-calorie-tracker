"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { invalidateCache, invalidateCachePrefix } from "@/lib/useCachedData";

// Mifflin-St Jeor နဲ့ တစ်နေ့တာ ကယ်လိုရီ target တွက်တယ်။
const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2, // လှုပ်ရှားမှု နည်းတယ်
  light: 1.375, // ပေါ့ပေါ့ပါးပါး
  moderate: 1.55, // အလယ်အလတ်
  active: 1.725, // များများ လှုပ်ရှားတယ်
};

const GOAL_ADJUST: Record<string, number> = {
  lose: -500, // ဝိတ်ချမယ်
  maintain: 0, // ထိန်းမယ်
  gain: 300, // ဝိတ်တက်မယ်
};

function calcTarget(
  gender: string,
  age: number,
  heightCm: number,
  weightKg: number,
  activity: string,
  goal: string,
): number {
  const bmr =
    10 * weightKg + 6.25 * heightCm - 5 * age + (gender === "male" ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTORS[activity] ?? 1.2);
  const target = tdee + (GOAL_ADJUST[goal] ?? 0);
  return Math.max(1200, Math.round(target / 10) * 10);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("maintain");
  const [activity, setActivity] = useState("light");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ရှိပြီးသား profile ကို ဖြည့်ပေးတယ် (ပြင်ဖို့လာရင်)။
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setGender(data.gender ?? "female");
        setAge(data.age != null ? String(data.age) : "");
        setHeight(data.height_cm != null ? String(data.height_cm) : "");
        setWeight(data.weight_kg != null ? String(data.weight_kg) : "");
        setGoal(data.goal ?? "maintain");
        setActivity(data.activity_level ?? "light");
        setDisplayName(data.display_name ?? "");
      }
      setLoaded(true);
    })();
  }, [router]);

  const ageNum = Number(age);
  const heightNum = Number(height);
  const weightNum = Number(weight);
  const valid =
    ageNum > 0 && heightNum > 0 && weightNum > 0 && ageNum < 120;
  const target = valid
    ? calcTarget(gender, ageNum, heightNum, weightNum, activity, goal)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || target == null) {
      setError("အသက်၊ အရပ်၊ ဝိတ် မှန်မှန်ကန်ကန် ထည့်ပေးပါ။");
      return;
    }
    setError("");
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName.trim() || null,
      gender,
      age: ageNum,
      height_cm: heightNum,
      weight_kg: weightNum,
      goal,
      activity_level: activity,
      daily_calorie_target: target,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      setError("သိမ်းလို့ မရပါ — " + error.message);
      return;
    }
    // Profile ပြင်ပြီးပြီ — Profile/Home cache ကို ဖျက်တယ်
    // (target ပြောင်းနိုင်လို့ Home cache လည်း ဖျက်တယ်)။
    invalidateCache("profile");
    invalidateCachePrefix("today-");
    router.push("/");
    router.refresh();
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-md min-h-screen bg-white px-5 py-10">
        <p>ဖွင့်နေပါတယ်…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 py-10">
      <h1>ကိုယ့်အကြောင်း ပြောပြပါ</h1>
      <p className="caption mt-1">
        တစ်နေ့တာ ကယ်လိုရီ target ကို တွက်ပေးဖို့ လိုပါတယ်။
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="caption">နာမည် (မထည့်လဲ ရတယ်)</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ဥပမာ — ကိုကြယ်ငါး"
            className="mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>

        <div>
          <span className="caption">ကျား / မ</span>
          <div className="mt-1 flex gap-2">
            {[
              { value: "female", label: "မ" },
              { value: "male", label: "ကျား" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`flex-1 rounded-xl border py-2.5 font-semibold ${
                  gender === opt.value
                    ? "border-[#16a34a] bg-green-50 text-[#15803d]"
                    : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <label className="flex-1">
            <span className="caption">အသက်</span>
            <input
              type="number"
              inputMode="numeric"
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
            />
          </label>
          <label className="flex-1">
            <span className="caption">အရပ် (cm)</span>
            <input
              type="number"
              inputMode="decimal"
              required
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="165"
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
            />
          </label>
          <label className="flex-1">
            <span className="caption">ဝိတ် (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="60"
              className="mt-1 w-full rounded-xl border px-3 py-2.5"
            />
          </label>
        </div>

        <div>
          <span className="caption">ပန်းတိုင်</span>
          <div className="mt-1 flex gap-2">
            {[
              { value: "lose", label: "ဝိတ်ချမယ်" },
              { value: "maintain", label: "ထိန်းမယ်" },
              { value: "gain", label: "ဝိတ်တက်မယ်" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGoal(opt.value)}
                className={`flex-1 rounded-xl border py-2.5 font-semibold ${
                  goal === opt.value
                    ? "border-[#16a34a] bg-green-50 text-[#15803d]"
                    : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="caption">တစ်နေ့တာ လှုပ်ရှားမှု</span>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
          >
            <option value="sedentary">ထိုင်များတယ် (လှုပ်ရှားမှု နည်းတယ်)</option>
            <option value="light">ပေါ့ပေါ့ပါးပါး လှုပ်ရှားတယ်</option>
            <option value="moderate">အလယ်အလတ် လှုပ်ရှားတယ်</option>
            <option value="active">များများ လှုပ်ရှားတယ်</option>
          </select>
        </label>

        {target != null && (
          <div className="rounded-2xl bg-green-50 p-5 text-center">
            <p className="caption">တစ်နေ့တာ ကယ်လိုရီ target</p>
            <p className="hero-num text-[#15803d]">
              {target.toLocaleString()} kcal
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#16a34a] py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "သိမ်းနေပါတယ်…" : "သိမ်းပြီး စမယ်"}
        </button>
      </form>
    </main>
  );
}
