import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reminder settings — profiles ထဲက သတိပေးချိန် ၄ ခု + ဖွင့်/ပိတ်။
// GET → { enabled, breakfast, lunch, dinner, evening } (HH:MM)
// POST { enabled, breakfast, lunch, dinner, evening }

const DEFAULTS = {
  enabled: false,
  breakfast: "08:00",
  lunch: "12:30",
  dinner: "19:00",
  evening: "21:00",
};

function toHHMM(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const m = v.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : fallback;
}

function isHHMM(v: unknown): v is string {
  return (
    typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
  );
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "reminders_enabled, reminder_breakfast_time, reminder_lunch_time, reminder_dinner_time, reminder_evening_time",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error || !profile) {
    // Migration SQL မထည့်ရသေးရင် ကော်လံ မရှိလို့ error ဖြစ်တယ် —
    // default အတိုင်း ပြန်ပေးတယ်။
    return NextResponse.json(DEFAULTS);
  }

  return NextResponse.json({
    enabled: profile.reminders_enabled ?? false,
    breakfast: toHHMM(profile.reminder_breakfast_time, "08:00"),
    lunch: toHHMM(profile.reminder_lunch_time, "12:30"),
    dinner: toHHMM(profile.reminder_dinner_time, "19:00"),
    evening: toHHMM(profile.reminder_evening_time, "21:00"),
  });
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

  let body: {
    enabled?: unknown;
    breakfast?: unknown;
    lunch?: unknown;
    dinner?: unknown;
    evening?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Setting မပါဘူး။" },
      { status: 400 },
    );
  }

  const enabled = body.enabled === true;
  const breakfast = isHHMM(body.breakfast) ? body.breakfast : "08:00";
  const lunch = isHHMM(body.lunch) ? body.lunch : "12:30";
  const dinner = isHHMM(body.dinner) ? body.dinner : "19:00";
  const evening = isHHMM(body.evening) ? body.evening : "21:00";

  const { error } = await supabase
    .from("profiles")
    .update({
      reminders_enabled: enabled,
      reminder_breakfast_time: breakfast,
      reminder_lunch_time: lunch,
      reminder_dinner_time: dinner,
      reminder_evening_time: evening,
    })
    .eq("id", user.id);
  if (error) {
    if (String(error.message ?? "").includes("reminder")) {
      return NextResponse.json(
        {
          error:
            "Reminder သိမ်းလို့ မရသေးဘူး — Supabase မှာ reminders SQL ကို အရင် run ပေးပါ။",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Reminder သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({ enabled, breakfast, lunch, dinner, evening });
}
