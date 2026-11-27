import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/crypto";
import { testGeminiKey } from "@/lib/gemini";

// POST /api/api-key/test — key ကို Gemini နဲ့ စမ်းခေါ်တယ်။
// body မှာ { key } ပါရင် အဲဒီ key ကို မသိမ်းဘဲ စမ်းတယ်
// (key မသိမ်းခင် စစ်လို့ရအောင်)။ body မပါရင် သိမ်းထားတဲ့ key ကို စမ်းတယ်။
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login အရင် ဝင်ပေးပါ။" }, { status: 401 });
  }

  // မသိမ်းရသေးတဲ့ key ကို စမ်းချင်ရင် body မှာ ပို့တယ် —
  // DB ကို လုံးဝ မထိဘူး (စမ်းတာသက်သက်)။
  let typedKey = "";
  try {
    const body = await request.json().catch(() => null);
    typedKey = String(body?.key ?? "").trim();
  } catch {
    typedKey = "";
  }
  if (typedKey) {
    if (
      typedKey.length < 20 ||
      !(typedKey.startsWith("AIza") || typedKey.startsWith("AQ."))
    ) {
      return NextResponse.json(
        { error: "Gemini API key ပုံစံ မမှန်ပါ — AIza နဲ့ (သို့) AQ. နဲ့ စတဲ့ key ထည့်ပေးပါ။" },
        { status: 400 },
      );
    }
    try {
      const reply = await testGeminiKey(typedKey);
      return NextResponse.json({ ok: true, reply: reply.trim() });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gemini ကို စမ်းလို့ မရပါ။";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY (သို့) API_KEY_ENCRYPTION_SECRET မရှိသေးပါ — Vercel → Settings → Environment Variables မှာ နှစ်ခုလုံး ထည့်ပြီး Redeploy လုပ်ပေးပါ။",
      },
      { status: 503 },
    );
  }

  const { data: row, error } = await admin
    .from("user_api_keys")
    .select("id, encrypted_key")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json(
      { error: "API key မထည့်ရသေးဘူး — အရင် သိမ်းပေးပါ။" },
      { status: 404 },
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(row.encrypted_key);
  } catch {
    return NextResponse.json(
      { error: "Key ကို ဖတ်လို့ မရပါ — encryption secret မှားနေနိုင်တယ်။" },
      { status: 500 },
    );
  }

  try {
    const reply = await testGeminiKey(apiKey);
    await admin
      .from("user_api_keys")
      .update({ last_tested_at: new Date().toISOString(), test_status: "ok" })
      .eq("id", row.id);
    return NextResponse.json({ ok: true, reply: reply.trim() });
  } catch (err) {
    await admin
      .from("user_api_keys")
      .update({ last_tested_at: new Date().toISOString(), test_status: "failed" })
      .eq("id", row.id);
    const message =
      err instanceof Error ? err.message : "Gemini ကို စမ်းလို့ မရပါ။";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
