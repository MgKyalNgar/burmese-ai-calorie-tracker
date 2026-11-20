import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Diary tab အတွက် ဒီနေ့ မှတ်တမ်းတွေ — client cache ကနေ ခေါ်တယ်။
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

  if (!profile) {
    return NextResponse.json({ needsOnboarding: true });
  }

  return NextResponse.json({ date: today, meals: meals ?? [] });
}
