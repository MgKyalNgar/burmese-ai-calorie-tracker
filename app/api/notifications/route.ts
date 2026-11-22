import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// In-app noti ခေါင်းလောင်း — ပို့ပြီးသား reminder တွေကို app ထဲမှာ ပြန်ပြတယ်။
// GET → { notifications: [{ id, title, body, sent_at, read }], unreadCount }
// POST → ဖတ်ပြီးသား မှတ်တယ် (read_at ဖြည့်တယ်) — { read: n }

// SQL မရ run ရသေးတဲ့ အဟောင်း row တွေ (title/body မရှိတာ) အတွက် kind ကနေ
// စာသား ပြန်ထုတ်တယ် — send route ပို့တဲ့ စာသားနဲ့ အတူတူပဲ။
const FALLBACK_TEXT: Record<string, { title: string; body: string }> = {
  breakfast: {
    title: "မနက်စာ မမှတ်ရသေးဘူး 🍜",
    body: "ဒီနေ့ မနက်စာ မမှတ်ရသေးဘူး — ပုံရိုက်ပြီး မှတ်လိုက်ပါ",
  },
  lunch: {
    title: "နေ့လည်စာ မမှတ်ရသေးဘူး 🍜",
    body: "ဒီနေ့ နေ့လည်စာ မမှတ်ရသေးဘူး — ပုံရိုက်ပြီး မှတ်လိုက်ပါ",
  },
  dinner: {
    title: "ညစာ မမှတ်ရသေးဘူး 🍜",
    body: "ဒီနေ့ ညစာ မမှတ်ရသေးဘူး — ပုံရိုက်ပြီး မှတ်လိုက်ပါ",
  },
  evening: {
    title: "ဒီနေ့ ဘာမှ မမှတ်ရသေးဘူး 😢",
    body: "ဒီနေ့ ဘာမှ မမှတ်ရသေးဘူး — ပုံလေးရိုက်ပြီး စမှတ်လိုက်ပါ",
  },
};

type Row = {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  logged_date: string;
  sent_at: string;
  read_at: string | null;
};

function toItem(row: Row) {
  const fallback = FALLBACK_TEXT[row.kind] ?? {
    title: "သတိပေးချက် 🔔",
    body: "",
  };
  return {
    id: row.id,
    title: row.title ?? fallback.title,
    body: row.body ?? fallback.body,
    sent_at: row.sent_at,
    read: row.read_at != null,
  };
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

  // title/body/read_at ကော်လံ မရှိသေးရင် (SQL မရ run ရသေး) အဟောင်း
  // ကော်လံတွေနဲ့ပဲ ပြန်ဆွဲပြီး kind ကနေ စာသား ပြန်ထုတ်တယ်။
  let rows: Row[] | null = null;
  const { data, error } = await supabase
    .from("reminder_logs")
    .select("id, kind, title, body, logged_date, sent_at, read_at")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(30);
  if (error) {
    const { data: legacy, error: legacyError } = await supabase
      .from("reminder_logs")
      .select("id, kind, logged_date, sent_at")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(30);
    if (legacyError) {
      return NextResponse.json(
        { error: "Noti ဆွဲလို့ မရပါ — ပြန်စမ်းပေးပါ။" },
        { status: 500 },
      );
    }
    rows = (legacy ?? []).map((r) => ({
      ...r,
      title: null,
      body: null,
      read_at: null,
    }));
  } else {
    rows = data ?? [];
  }

  const notifications = rows.map(toItem);
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  });
}

export async function POST() {
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

  const { data, error } = await supabase
    .from("reminder_logs")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)
    .select("id");
  if (error) {
    // read_at ကော်လံ မရှိသေးရင် (SQL မရ run ရသေး) —
    if (String(error.message ?? "").includes("read_at")) {
      return NextResponse.json(
        { error: "SQL အရင် run ပေးပါ — notifications SQL ကို Supabase မှာ run ပေးပါ။" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "ဖတ်ပြီးသား မှတ်လို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }
  return NextResponse.json({ read: (data ?? []).length });
}
