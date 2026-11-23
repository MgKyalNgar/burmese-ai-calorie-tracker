import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Profile tab အတွက် ကိုယ့်အချက်အလက် — client cache ကနေ ခေါ်တယ်။
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ email: user.email, profile: profile ?? null });
}

// ကိုယ်ရေးအချက်အလက် + target ကို Profile ကဒ်ထဲမှာတင် ပြင်တယ် —
// PATCH /api/profile (ပေးတဲ့အကွက်တွေပဲ ပြင်တယ်၊ SQL အသစ် မလိုဘူး)။
export async function PATCH(req: Request) {
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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "ဒေတာ ဖတ်လို့ မရပါ။" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (body.display_name !== undefined) {
    const name =
      typeof body.display_name === "string" ? body.display_name.trim() : "";
    if (name.length > 100) {
      return NextResponse.json(
        { error: "နာမည် အရမ်းရှည်နေပါတယ်။" },
        { status: 400 },
      );
    }
    updates.display_name = name || null;
  }
  if (body.gender !== undefined) {
    if (
      body.gender !== "male" &&
      body.gender !== "female" &&
      body.gender !== "other"
    ) {
      return NextResponse.json(
        { error: "ကျား/မ ရွေးတာ မမှန်ပါ။" },
        { status: 400 },
      );
    }
    updates.gender = body.gender;
  }
  if (body.age !== undefined) {
    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 10 || age > 120) {
      return NextResponse.json(
        { error: "အသက် ၁၀ မှ ၁၂၀ အထိပဲ ထားလို့ ရပါတယ်။" },
        { status: 400 },
      );
    }
    updates.age = age;
  }
  if (body.height_cm !== undefined) {
    const h = Number(body.height_cm);
    if (!Number.isFinite(h) || h < 100 || h > 250) {
      return NextResponse.json(
        { error: "အရပ် ၁၀၀ မှ ၂၅၀ cm အထိပဲ ထားလို့ ရပါတယ်။" },
        { status: 400 },
      );
    }
    updates.height_cm = h;
  }
  if (body.weight_kg !== undefined) {
    const w = Number(body.weight_kg);
    if (!Number.isFinite(w) || w < 20 || w > 300) {
      return NextResponse.json(
        { error: "ဝိတ် ၂၀ မှ ၃၀၀ kg အထိပဲ ထားလို့ ရပါတယ်။" },
        { status: 400 },
      );
    }
    updates.weight_kg = w;
  }
  if (body.goal !== undefined) {
    if (
      body.goal !== "lose" &&
      body.goal !== "maintain" &&
      body.goal !== "gain"
    ) {
      return NextResponse.json(
        { error: "ပန်းတိုင် ရွေးတာ မမှန်ပါ။" },
        { status: 400 },
      );
    }
    updates.goal = body.goal;
  }
  if (body.daily_calorie_target !== undefined) {
    const target = Number(body.daily_calorie_target);
    if (!Number.isInteger(target) || target < 800 || target > 6000) {
      return NextResponse.json(
        { error: "Target ၈၀၀ မှ ၆,၀၀၀ kcal အထိပဲ ထားလို့ ရပါတယ်။" },
        { status: 400 },
      );
    }
    updates.daily_calorie_target = target;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "ပြင်စရာ ဘာမှ မပါဘူး။" },
      { status: 400 },
    );
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }
  return NextResponse.json({ profile: data ?? null });
}
