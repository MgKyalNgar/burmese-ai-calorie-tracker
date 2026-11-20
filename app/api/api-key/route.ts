import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptApiKey, makeKeyHint } from "@/lib/crypto";

// Env var နှစ်ခု လိုတယ် — မရှိရင် မြန်မာလို ရှင်းပြတယ်။
const MISSING_ENV_ERROR =
  "SUPABASE_SERVICE_ROLE_KEY (သို့) API_KEY_ENCRYPTION_SECRET မရှိသေးပါ — Vercel → Settings → Environment Variables မှာ နှစ်ခုလုံး ထည့်ပြီး Redeploy လုပ်ပေးပါ။";

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// GET /api/api-key — key ရှိမရှိ + hint ပဲ ပြန်ပေးတယ် (key အစစ် ဘယ်တော့မှ မပေးဘူး)။
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Login အရင် ဝင်ပေးပါ။" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 503 });
  }
  const { data, error } = await admin
    .from("user_api_keys")
    .select("key_hint, last_tested_at, test_status")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Key အခြေအနေ စစ်လို့ မရပါ။" }, { status: 500 });
  }
  return NextResponse.json({
    configured: !!data,
    key_hint: data?.key_hint ?? null,
    last_tested_at: data?.last_tested_at ?? null,
    test_status: data?.test_status ?? null,
  });
}

// POST /api/api-key — key အသစ် encrypt လုပ်ပြီး သိမ်းတယ်။
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Login အရင် ဝင်ပေးပါ။" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 503 });
  }
  let key: string;
  try {
    const body = await request.json();
    key = String(body?.key ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Key ကို ဖတ်လို့ မရပါ။" }, { status: 400 });
  }
  if (key.length < 20 || !key.startsWith("AIza")) {
    return NextResponse.json(
      { error: "Gemini API key ပုံစံ မမှန်ပါ — AIza နဲ့ စတဲ့ key ထည့်ပေးပါ။" },
      { status: 400 },
    );
  }
  let encrypted: string;
  try {
    encrypted = encryptApiKey(key);
  } catch {
    return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 503 });
  }
  // အဟောင်း key တွေကို ပိတ်ပြီး အသစ်ပဲ active ထားတယ်။
  await admin
    .from("user_api_keys")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
  const { error } = await admin.from("user_api_keys").insert({
    user_id: userId,
    encrypted_key: encrypted,
    key_hint: makeKeyHint(key),
    is_active: true,
  });
  if (error) {
    return NextResponse.json({ error: "Key သိမ်းလို့ မရပါ။" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, key_hint: makeKeyHint(key) });
}

// DELETE /api/api-key — key ကို ဖျက်တယ်။
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Login အရင် ဝင်ပေးပါ။" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 503 });
  }
  const { error } = await admin
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: "Key ဖျက်လို့ မရပါ။" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
