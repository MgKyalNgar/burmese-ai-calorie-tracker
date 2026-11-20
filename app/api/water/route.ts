import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ရေ ၁ ခွက် (ဒါမှမဟုတ် ပေးတဲ့ အရေအတွက်) မှတ်တယ် — ဒီနေ့ (ရန်ကုန်) အတွက်။
function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

export async function POST(req: Request) {
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

  let cups = 1;
  try {
    const body = await req.json();
    if (body?.cups != null) cups = Number(body.cups);
  } catch {
    // body မပါရင် ၁ ခွက် အဖြစ် မှတ်တယ်။
  }
  if (!Number.isInteger(cups) || cups < 1 || cups > 10) {
    return NextResponse.json(
      { error: "ရေခွက် ၁ မှ ၁၀ အထိပဲ မှတ်လို့ ရပါတယ်။" },
      { status: 400 },
    );
  }

  const today = todayYangon();
  const { error } = await supabase.from("water_logs").insert({
    user_id: user.id,
    logged_date: today,
    cups,
  });
  if (error) {
    return NextResponse.json(
      { error: "ရေ မှတ်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  const { data: rows } = await supabase
    .from("water_logs")
    .select("cups")
    .eq("user_id", user.id)
    .eq("logged_date", today);
  const cupsToday = (rows ?? []).reduce((s, r) => s + Number(r.cups ?? 0), 0);

  return NextResponse.json({ cupsToday });
}
