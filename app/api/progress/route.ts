import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Progress tab အတွက် ဒေတာ အစုအဝေး — client cache ကနေ ခေါ်တယ်။
function yangonDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

// "YYYY-MM-DD" ရက်စွဲမှာ ရက်ပေါင်းတယ်။
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00+06:30`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

// ဒီအပတ် တနင်္လာ (ပြက္ခဒိန်က တနင်္လာစ လို့ weekly chart လည်း
// တနင်္လာ–တနင်္ဂနွေ သတ်မှတ်တယ် — အရင် နောက် ၇ ရက် rolling ဖြစ်နေလို့
// ပြက္ခဒိန်နဲ့ မကိုက်ဘူး)။
function mondayOfThisWeek(): string {
  const today = yangonDate(0);
  const dow = new Date(`${today}T12:00:00+06:30`).getDay(); // 0=နွေ
  const back = (dow + 6) % 7; // တနင်္လာအထိ နောက်ပြန်ရက်
  return addDays(today, -back);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Login အရင် ဝင်ပေးပါ။" },
      { status: 401 },
    );
  }

  const today = yangonDate(0);
  const weekStart = mondayOfThisWeek();
  const sixtyDaysAgo = yangonDate(-59);

  const [{ data: profile }, { data: meals }, { data: weights }, { data: water }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("daily_calorie_target")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("meals")
        .select("logged_date, total_calories")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .gte("logged_date", sixtyDaysAgo)
        .lte("logged_date", today)
        .order("logged_date", { ascending: true })
        .limit(1000),
      supabase
        .from("weight_logs")
        .select("logged_date, weight_kg")
        .eq("user_id", user.id)
        .gte("logged_date", sixtyDaysAgo)
        .order("logged_date", { ascending: true })
        .limit(500),
      supabase
        .from("water_logs")
        .select("logged_date, cups")
        .eq("user_id", user.id)
        .gte("logged_date", weekStart)
        .lte("logged_date", today)
        .order("logged_date", { ascending: true })
        .limit(200),
    ]);

  if (!profile) {
    return NextResponse.json({ needsOnboarding: true });
  }

  const target = profile.daily_calorie_target ?? 1800;

  // ဒီအပတ် တနင်္လာ–တနင်္ဂနွေ — ရက်တိုင်း စားပြီးသား ကယ်လိုရီ ပေါင်းတယ်။
  const eatenByDate = new Map<string, number>();
  const loggedSet = new Set<string>();
  for (const m of meals ?? []) {
    const d = m.logged_date as string;
    eatenByDate.set(d, (eatenByDate.get(d) ?? 0) + Number(m.total_calories ?? 0));
    loggedSet.add(d);
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date, eaten: eatenByDate.get(date) ?? 0, target };
  });

  // ရေသောက်တာ — ဒီအပတ် တနင်္လာ–တနင်္ဂနွေ၊ ရက်တိုင်း ခွက်ပေါင်းတယ်။
  const cupsByDate = new Map<string, number>();
  for (const w of water ?? []) {
    const d = w.logged_date as string;
    cupsByDate.set(d, (cupsByDate.get(d) ?? 0) + Number(w.cups ?? 0));
  }
  const waterWeek = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date, cups: cupsByDate.get(date) ?? 0 };
  });

  return NextResponse.json({
    week,
    weights: (weights ?? []).map((w) => ({
      date: w.logged_date as string,
      kg: Number(w.weight_kg),
    })),
    waterWeek,
    loggedDays: [...loggedSet].sort(),
  });
}
