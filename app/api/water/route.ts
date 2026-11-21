import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ရေမှတ်တယ် — ဒီနေ့ (ရန်ကုန်) ဒါမှမဟုတ် ပေးတဲ့ ရက်အတွက်။
// POST { cups } → ရေထည့်တယ် (1–10 ခွက်)
// POST { action: "undo", logged_date? } → အဲဒီနေ့ရဲ့ နောက်ဆုံး မှတ်တမ်းကနေ ၁ ခွက် လျှော့တယ်
// (မှားနှိပ်တာ ပြန်ဖျက်တာ)။
function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

function parseDate(requested: unknown): string | null {
  if (typeof requested !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) return null;
  const d = new Date(`${requested}T12:00:00+06:30`);
  if (Number.isNaN(d.getTime())) return null;
  // အနာဂတ်ရက် မှတ်လို့ မရဘူး။
  if (requested > todayYangon()) return null;
  return requested;
}

async function cupsForDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
): Promise<number> {
  const { data: rows } = await supabase
    .from("water_logs")
    .select("cups")
    .eq("user_id", userId)
    .eq("logged_date", date);
  return (rows ?? []).reduce((s, r) => s + Number(r.cups ?? 0), 0);
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

  let body: { cups?: unknown; logged_date?: unknown; action?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // body မပါရင် ၁ ခွက် အဖြစ် မှတ်တယ်။
  }

  const date = parseDate(body.logged_date) ?? todayYangon();

  // Undo — အဲဒီနေ့ရဲ့ နောက်ဆုံး ရေမှတ်တမ်းကနေ ၁ ခွက် လျှော့တယ်။
  if (body.action === "undo") {
    const { data: latest } = await supabase
      .from("water_logs")
      .select("id, cups")
      .eq("user_id", user.id)
      .eq("logged_date", date)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) {
      return NextResponse.json(
        { error: "ဖျက်စရာ ရေမှတ်တမ်း မရှိဘူး။" },
        { status: 400 },
      );
    }
    const cups = Number(latest.cups ?? 0);
    if (cups > 1) {
      const { error } = await supabase
        .from("water_logs")
        .update({ cups: cups - 1 })
        .eq("id", latest.id);
      if (error) {
        return NextResponse.json(
          { error: "ဖျက်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
          { status: 500 },
        );
      }
    } else {
      const { error } = await supabase
        .from("water_logs")
        .delete()
        .eq("id", latest.id);
      if (error) {
        return NextResponse.json(
          { error: "ဖျက်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({
      date,
      cupsToday: await cupsForDate(supabase, user.id, date),
    });
  }

  let cups = 1;
  if (body?.cups != null) cups = Number(body.cups);
  if (!Number.isInteger(cups) || cups < 1 || cups > 10) {
    return NextResponse.json(
      { error: "ရေခွက် ၁ မှ ၁၀ အထိပဲ မှတ်လို့ ရပါတယ်။" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("water_logs").insert({
    user_id: user.id,
    logged_date: date,
    cups,
  });
  if (error) {
    return NextResponse.json(
      { error: "ရေ မှတ်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    date,
    cupsToday: await cupsForDate(supabase, user.id, date),
  });
}
