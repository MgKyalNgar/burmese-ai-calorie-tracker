import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import DiaryClient from "@/components/DiaryClient";
import { todayYangon, type MealRow } from "@/lib/meal";

// Diary က login session (cookies) ကို ဖတ်လို့ prerender လုပ်လို့ မရဘူး —
// blocking route အဖြစ် ခွင့်ပြုတယ် (Next 16 Cache Components)။
export const instant = false;

export default async function DiaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayYangon();

  // profile + ဒီနေ့ မှတ်တမ်းတွေ တစ်ပြိုင်တည်း ဆွဲတယ် (တစ်ခုချင်း
  // စောင့်နေရင် tab ကူးတိုင်း ကြာလို့)။
  const [{ data: profile }, { data: meals }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    supabase
      .from("meals")
      .select("*, meal_items(*)")
      .eq("user_id", user.id)
      .eq("logged_date", today)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true }),
  ]);
  if (!profile) redirect("/onboarding");

  // meal_items ကို created_at အတိုင်း စီတယ် (meal တစ်ခုမှာ item များရင်)။
  const sorted = ((meals ?? []) as MealRow[]).map((m) => ({
    ...m,
    meal_items: [...(m.meal_items ?? [])],
  }));

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white px-5 pb-24 pt-8">
      <h1>Diary</h1>
      <p className="caption mt-1">ဒီနေ့ {today}</p>
      <DiaryClient initialMeals={sorted} date={today} />
      <BottomNav />
    </main>
  );
}
