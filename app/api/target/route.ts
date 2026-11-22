import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// တစ်နေ့တာ ကယ်လိုရီ target ကို ကိုယ်တိုင် ပြင်တယ် —
// profiles.daily_calorie_target (Onboarding က auto တွက်ပေးတဲ့ column ပဲ၊
// SQL အသစ် မလိုဘူး)။
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

  let target: number | null = null;
  try {
    const body = await req.json();
    if (body?.target != null) target = Number(body.target);
  } catch {
    // body မပါရင် error ပြန်တယ်။
  }
  if (target == null || !Number.isInteger(target) || target < 800 || target > 6000) {
    return NextResponse.json(
      { error: "Target ၈၀၀ မှ ၆,၀၀၀ kcal အထိပဲ ထားလို့ ရပါတယ်။" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ daily_calorie_target: target })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json(
      { error: "Target သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({ target });
}
