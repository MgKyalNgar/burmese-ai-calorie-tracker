import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ဝိတ် မှတ်တယ် — ရက်စွဲ မပေးရင် ဒီနေ့ (ရန်ကုန်) အတွက်။
// PATCH { id, weight_kg } → မှတ်ထားတဲ့ ဝိတ် ပြင်တယ်။
// DELETE { id } → မှတ်ထားတဲ့ ဝိတ် ဖျက်တယ်။
function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Login အရင် ဝင်ပေးပါ။" },
      { status: 401 },
    );
  }

  let body: { id?: unknown; weight_kg?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "ဝိတ် ထည့်ပေးပါ။" },
      { status: 400 },
    );
  }

  const id = String(body.id ?? "").trim();
  const weightKg = Number(body.weight_kg);
  if (!id) {
    return NextResponse.json({ error: "မှတ်တမ်း မတွေ့ပါ။" }, { status: 400 });
  }
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
    return NextResponse.json(
      { error: "ဝိတ် ၂၀ မှ ၃၀၀ kg အတွင်း ထည့်ပေးပါ။" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("weight_logs")
    .update({ weight_kg: weightKg })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json(
      { error: "ပြင်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Login အရင် ဝင်ပေးပါ။" },
      { status: 401 },
    );
  }

  let body: { id?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "မှတ်တမ်း မတွေ့ပါ။" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "မှတ်တမ်း မတွေ့ပါ။" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("weight_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json(
      { error: "ဖျက်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
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

  let body: { weight_kg?: unknown; logged_date?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "ဝိတ် ထည့်ပေးပါ။" },
      { status: 400 },
    );
  }

  const weightKg = Number(body.weight_kg);
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
    return NextResponse.json(
      { error: "ဝိတ် ၂၀ မှ ၃၀၀ kg အတွင်း ထည့်ပေးပါ။" },
      { status: 400 },
    );
  }

  const today = todayYangon();
  let loggedDate = today;
  if (body.logged_date != null && String(body.logged_date).trim() !== "") {
    const d = String(body.logged_date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today) {
      return NextResponse.json(
        { error: "ရက်စွဲ မှားနေပါတယ် — ဒီနေ့ထက် နောက်မကျရဘူး။" },
        { status: 400 },
      );
    }
    loggedDate = d;
  }

  const { error } = await supabase.from("weight_logs").insert({
    user_id: user.id,
    logged_date: loggedDate,
    weight_kg: weightKg,
  });
  if (error) {
    return NextResponse.json(
      { error: "ဝိတ် မှတ်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
