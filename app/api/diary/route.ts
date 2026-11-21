import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Diary tab အတွက် မှတ်တမ်းတွေ — client cache ကနေ ခေါ်တယ်။
// ?date=YYYY-MM-DD ပေးရင် အဲဒီနေ့ကို ပြတယ် (မပေးရင် ဒီနေ့) —
// အနာဂတ်ရက် တောင်းရင် ဒီနေ့ကို ပြန်ချတယ်။
function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

export async function GET(request: Request) {
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
  const requested = new URL(request.url).searchParams.get("date") ?? "";
  let date = today;
  if (/^\d{4}-\d{2}-\d{2}$/.test(requested)) {
    const d = new Date(`${requested}T12:00:00+06:30`);
    if (!Number.isNaN(d.getTime()) && requested <= today) date = requested;
  }

  const [{ data: profile }, { data: meals }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    supabase
      .from("meals")
      .select("*, meal_items(*)")
      .eq("user_id", user.id)
      .eq("logged_date", date)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true }),
  ]);

  if (!profile) {
    return NextResponse.json({ needsOnboarding: true });
  }

  return NextResponse.json({ date, meals: meals ?? [] });
}
