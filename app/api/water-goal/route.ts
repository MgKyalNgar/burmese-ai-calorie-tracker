import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ရေ ပန်းတိုင် (တစ်နေ့ ဘယ်နှစ်ခွက်) ထားတယ် — profiles.daily_water_goal။
// Migration SQL (supabase/migrations/2026-11-21-water-goal.sql) ကို
// Supabase မှာ run ပြီးမှ ဒီ route အလုပ်လုပ်မယ် — မလုပ်ရသေးရင်
// "SQL ထည့်ဖို့ လိုသေးတယ်" လို့ မြန်မာလို ပြန်ပြောတယ်။
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

  let goal = 8;
  try {
    const body = await req.json();
    if (body?.goal != null) goal = Number(body.goal);
  } catch {
    // body မပါရင် 8 အဖြစ် ထားတယ်။
  }
  if (!Number.isInteger(goal) || goal < 1 || goal > 20) {
    return NextResponse.json(
      { error: "ပန်းတိုင် ၁ မှ ၂၀ ခွက် အထိပဲ ထားလို့ ရပါတယ်။" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ daily_water_goal: goal })
    .eq("id", user.id);
  if (error) {
    if (String(error.message ?? "").includes("daily_water_goal")) {
      return NextResponse.json(
        {
          error:
            "ပန်းတိုင် သိမ်းလို့ မရသေးဘူး — Supabase မှာ water-goal SQL ကို အရင် run ပေးပါ။",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "ပန်းတိုင် သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({ goal });
}
