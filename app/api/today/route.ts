import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Home tab အတွက် ဒီနေ့ ဒေတာ အစုအဝေး — client cache ကနေ ခေါ်တယ်
// (server page ကနေ တိုက်ရိုက် ဆွဲတာထက် tab ကူးတာ မြန်အောင်)။
function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
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

  const today = todayYangon();
  const [{ data: profile }, { data: meals }, { data: water }, { data: latestWeight }, { data: mealDays }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("meals")
        .select(
          "id, meal_type, total_calories, total_protein, total_carbs, total_fat, created_at",
        )
        .eq("user_id", user.id)
        .eq("logged_date", today)
        .eq("status", "confirmed")
        .order("created_at", { ascending: true }),
      supabase
        .from("water_logs")
        .select("cups")
        .eq("user_id", user.id)
        .eq("logged_date", today),
      supabase
        .from("weight_logs")
        .select("weight_kg, logged_date")
        .eq("user_id", user.id)
        .order("logged_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("meals")
        .select("logged_date")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .order("logged_date", { ascending: false })
        .limit(60),
    ]);

  if (!profile) {
    return NextResponse.json({ needsOnboarding: true });
  }

  const target = profile.daily_calorie_target ?? 1800;
  const list = meals ?? [];
  const eaten = list.reduce((s, m) => s + Number(m.total_calories ?? 0), 0);
  const protein = list.reduce((s, m) => s + Number(m.total_protein ?? 0), 0);
  const carbs = list.reduce((s, m) => s + Number(m.total_carbs ?? 0), 0);
  const fat = list.reduce((s, m) => s + Number(m.total_fat ?? 0), 0);
  const cups = (water ?? []).reduce((s, w) => s + Number(w.cups ?? 0), 0);

  // Streak — ထမင်းမှတ်တဲ့ ရက် ဆက်တိုက် ဘယ်နှစ်ရက် ရှိပြီလဲ။
  const daySet = new Set((mealDays ?? []).map((m) => m.logged_date as string));
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00+06:30`);
  if (!daySet.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (
    daySet.has(cursor.toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" }))
  ) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return NextResponse.json({
    date: today,
    displayName: profile.display_name ?? "",
    target,
    eaten,
    protein,
    carbs,
    fat,
    cups,
    latestWeightKg: latestWeight ? Number(latestWeight.weight_kg) : null,
    streak,
    meals: list.map((m) => ({
      id: m.id,
      meal_type: m.meal_type,
      total_calories: m.total_calories,
    })),
  });
}
