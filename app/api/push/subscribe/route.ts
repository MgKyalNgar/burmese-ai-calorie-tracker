import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Push subscription သိမ်းတာ / ဖျက်တာ —
// Browser က subscribe လုပ်ပြီးမှ ဒီ route ကို ခေါ်တယ်။
// POST { subscription: { endpoint, keys: { p256dh, auth } } }
// DELETE { endpoint }

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
    subscription?: {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Subscription မပါဘူး။" },
      { status: 400 },
    );
  }

  const sub = body.subscription;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Subscription မမှန်ဘူး။" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint, p256dh, auth },
    { onConflict: "user_id,endpoint" },
  );
  if (error) {
    return NextResponse.json(
      { error: "Reminder သိမ်းလို့ မရပါ — ပြန်စမ်းပေးပါ။" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
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

  let body: { endpoint?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (endpoint) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
  }

  return NextResponse.json({ ok: true });
}
