import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/crypto";
import { callGeminiParts, GeminiApiError } from "@/lib/gemini";
import { clampNonNegative, round1, type AnalyzedFood } from "@/lib/meal";

// Env var နှစ်ခု လိုတယ် — မရှိရင် မြန်မာလို ရှင်းပြတယ်။
const MISSING_ENV_ERROR =
  "SUPABASE_SERVICE_ROLE_KEY (သို့) API_KEY_ENCRYPTION_SECRET မရှိသေးပါ — Vercel → Settings → Environment Variables မှာ နှစ်ခုလုံး ထည့်ပြီး Redeploy လုပ်ပေးပါ။";
const NO_KEY_ERROR =
  "API key မထည့်ရသေးဘူး — Profile မှာ Gemini API key ကို အရင် ထည့်ပေးပါ။";
const BAD_KEY_ERROR =
  "API key မှားနေပါတယ် — Profile မှာ Gemini API key ကို စစ်ပေးပါ။ (AI Studio က AIza နဲ့ (သို့) AQ. နဲ့ စတဲ့ key ဖြစ်ရမယ်)";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// AI ကို strict JSON ပဲ ပြန်ခိုင်းတဲ့ prompt — မြန်မာ + အင်္ဂလိပ် နာမည်ပါ။
// (ပြင်ထားချက် 21 Nov 2026, အဆင့် ၁: မြန်မာအစာ သိအောင် + garnish ခွဲခြားတာ
// + ကယ်လိုရီကို macro ကနေ တွက်ခိုင်းတာ — ဓာတ်ပုံက မုန့်ဟင်းခါးကို
// "ငှက်ပျောသီးဖီးကြက်သားခေါက်ဆွဲ" လို့ မှားသိတာ၊ macro ပေါင်းနဲ့ ကယ်လိုရီ
// မကိုက်တာ (427 vs 380) တွေကို ပြင်တာ။)
const ANALYZE_PROMPT = `You are a nutrition assistant for Myanmar food. Analyze the food in the photo and/or the user's text description. Identify the main dish and estimate a typical single serving.

Respond with ONLY a JSON object, no markdown fences, no other text:
{"name_mm": "<food name in Myanmar language>", "name_en": "<food name in English>", "grams": <estimated portion in grams, number>, "calories": <estimated kcal, number>, "protein": <protein grams, number>, "carbs": <carbohydrate grams, number>, "fat": <fat grams, number>, "note": "<one short sentence in Myanmar about the dish>"}

Common Myanmar dishes — recognize them by their distinctive look:
- မုန့်ဟင်းခါး (Mohinga): FISH broth (never chicken), rice noodles, banana stem slices, bean sprouts, boiled egg, fish cake. A bowl of noodles in light brown fish broth with banana stem on top IS mohinga — never call it banana noodle soup.
- ရှမ်းခေါက်ဆွဲ (Shan Noodles): rice noodles with chicken or pork, pickled mustard greens, crushed peanuts, garlic oil.
- အုန်းနို့ခေါက်ဆွဲ (Ohn No Khao Swe): coconut-milk broth, chicken, wheat egg noodles.
- လက်ဖက်သုပ် (Tea Leaf Salad): fermented tea leaves mixed with peanuts, sesame seeds, tomato, fried garlic, cabbage.
- နန်းကြီးသုပ် (Nangyi Salad): thick round rice noodles with chicken curry sauce, bean sprouts, lime.
- ကြာဇံဟင်းခါး (Glass Noodle Soup): clear broth with glass noodles, chicken, mushroom.

Rules:
- All numbers must be 0 or greater.
- Garnish is NOT the main ingredient: banana stem slices, bean sprouts, coriander, spring onion, lime, chilli flakes sprinkled on top do not make the dish a banana or bean-sprout dish. Name the dish by its broth and noodles, not by its garnish.
- Estimate macros first, then compute calories from them: calories MUST equal protein x 4 + carbs x 4 + fat x 9 (rounded to a whole number). Never give a calorie number that disagrees with your own macros.
- Estimate a typical single serving of the same dish the same way every time (a noodle soup bowl is usually about 400-500 g), so photo and text results agree.
- If several foods are visible, pick the main one and mention the others in the note.
- If you cannot identify the food at all, use name_mm "မသိရသေးတဲ့ အစားအစာ", name_en "Unknown food", grams 100, and your best rough estimate, and say so in the note.`;

// Gemini အဖြေထဲက JSON ကို ဆွဲထုတ်တယ် —
// markdown fence (```json) ပါလာရင်လည်း ဖယ်တယ်။
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON မတွေ့ပါ။");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function parseAnalyzedFood(data: unknown): AnalyzedFood {
  if (!data || typeof data !== "object") {
    throw new Error("AI အဖြေ ပုံစံ မမှန်ပါ။");
  }
  const d = data as Record<string, unknown>;
  const nameMm = String(d.name_mm ?? "").trim();
  const nameEn = String(d.name_en ?? "").trim();
  if (!nameMm && !nameEn) {
    throw new Error("အစားအစာကို ခွဲခြားလို့ မရပါ။");
  }
  const grams = clampNonNegative(d.grams);
  // macro တွေကို 1 decimal လှီးထားတယ် — AI က float အရှည်
  // (ဥပမာ 15.300000190734863) ပြန်ရင် Review/Diary မှာ အဲဒီအတိုင်း
  // ပါသွားမှာစိုးလို့။
  const protein = round1(clampNonNegative(d.protein));
  const carbs = round1(clampNonNegative(d.carbs));
  const fat = round1(clampNonNegative(d.fat));
  // ကယ်လိုရီကို macro ကနေ ပြန်တွက်တယ် (Atwater: P×4 + C×4 + F×9) —
  // AI ပြန်တဲ့ ကယ်လိုရီနဲ့ macro ပေါင်း မကိုက်တာကို ပြင်တာ
  // (ဥပမာ ဓာတ်ပုံ 380 kcal vs macro ပေါင်း 427 kcal)။
  // Prompt မှာလည်း ဒီအတိုင်း တွက်ခိုင်းထားတယ် — ဒါက safety net။
  // macro အားလုံး 0 ဆိုရင်တော့ AI ရဲ့ ကယ်လိုရီကို အတိုင်း ထားတယ်။
  const fromMacros = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const calories =
    fromMacros > 0 ? fromMacros : Math.round(clampNonNegative(d.calories));
  return {
    name_mm: nameMm || nameEn,
    name_en: nameEn || nameMm,
    grams: grams > 0 ? Math.round(grams) : 100,
    calories,
    protein,
    carbs,
    fat,
    note: String(d.note ?? "").trim(),
  };
}

type AnalyzeInput = {
  photoBase64: string | null;
  photoMime: string;
  text: string;
};

async function readInput(request: Request): Promise<AnalyzeInput> {
  const contentType = request.headers.get("content-type") ?? "";

  // 1) multipart/form-data — ဓာတ်ပုံ upload (input name: "photo", စာသား: "text")
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("photo");
    const text = String(form.get("text") ?? "").trim();
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        throw new Error("ဓာတ်ပုံဖိုင် မဟုတ်ပါ — ပုံပဲ ရွေးပေးပါ။");
      }
      if (file.size > MAX_PHOTO_BYTES) {
        throw new Error("ဓာတ်ပုံ အရမ်းကြီးနေတယ် — 5MB အောက် ပုံပဲ သုံးပေးပါ။");
      }
      const buf = Buffer.from(await file.arrayBuffer());
      return { photoBase64: buf.toString("base64"), photoMime: file.type, text };
    }
    return { photoBase64: null, photoMime: "image/jpeg", text };
  }

  // 2) JSON — base64 ပုံ (သို့) စာသားသက်သက်
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new Error("ဓာတ်ပုံ (သို့) စာသား တစ်ခုခု ထည့်ပေးပါ။");
  }
  const b = body as Record<string, unknown>;
  const text = String(b.text ?? "").trim();
  const imageBase64 = typeof b.imageBase64 === "string" ? b.imageBase64 : "";
  const mimeType =
    typeof b.mimeType === "string" && b.mimeType.startsWith("image/")
      ? b.mimeType
      : "image/jpeg";
  if (imageBase64) {
    // base64 data URL prefix ပါလာရင် ဖယ်တယ်။
    const clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const approxBytes = Math.floor((clean.length * 3) / 4);
    if (approxBytes > MAX_PHOTO_BYTES) {
      throw new Error("ဓာတ်ပုံ အရမ်းကြီးနေတယ် — 5MB အောက် ပုံပဲ သုံးပေးပါ။");
    }
    return { photoBase64: clean, photoMime: mimeType, text };
  }
  return { photoBase64: null, photoMime: mimeType, text };
}

// POST /api/analyze — ပုံ (သို့) စာသားကို Gemini နဲ့ စစ်ပြီး ကယ်လိုရီ ခန့်မှန်းတယ်။
export async function POST(request: Request) {
  // 1) Login စစ်တယ်။
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Login အရင် ဝင်ပေးပါ။" }, { status: 401 });
  }

  // 2) သိမ်းထားတဲ့ key ကို server-side decrypt လုပ်တယ် (key ကို frontend ကို မပေးဘူး)။
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 503 });
  }
  const { data: row, error: keyError } = await admin
    .from("user_api_keys")
    .select("id, encrypted_key")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (keyError || !row) {
    // code: NO_API_KEY — frontend က Profile သွားတဲ့ link ပြဖို့။
    return NextResponse.json(
      { error: NO_KEY_ERROR, code: "NO_API_KEY" },
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

  // 3) ပုံ / စာသား ဖတ်တယ်။
  let input: AnalyzeInput;
  try {
    input = await readInput(request);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ဓာတ်ပုံ (သို့) စာသား ဖတ်လို့ မရပါ။";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (!input.photoBase64 && !input.text) {
    return NextResponse.json(
      { error: "ဓာတ်ပုံ (သို့) စာသား တစ်ခုခု ထည့်ပေးပါ။" },
      { status: 400 },
    );
  }

  // 4) Gemini ကို ခေါ်တယ်။
  const prompt = input.text
    ? `${ANALYZE_PROMPT}\n\nUser's note about the food: "${input.text}"`
    : ANALYZE_PROMPT;
  const parts: (
    | { text: string }
    | { inline_data: { mime_type: string; data: string } }
  )[] = [{ text: prompt }];
  if (input.photoBase64) {
    parts.push({
      inline_data: { mime_type: input.photoMime, data: input.photoBase64 },
    });
  }

  let rawText: string;
  try {
    rawText = await callGeminiParts(apiKey, parts);
  } catch (err) {
    if (err instanceof GeminiApiError) {
      // Key မှားတာ (400/401) ဆိုရင် သိသာအောင် မြန်မာလို ရှင်းရှင်းပြောတယ်။
      if (err.status === 400 || err.status === 401) {
        return NextResponse.json({ error: BAD_KEY_ERROR }, { status: 400 });
      }
      if (err.status === 429) {
        return NextResponse.json(
          { error: "Gemini က ခဏ အသုံးများနေတယ် — ခနစောင့်ပြီး ပြန်စမ်းပေးပါ။" },
          { status: 429 },
        );
      }
    }
    return NextResponse.json(
      { error: "Gemini ကို ခေါ်လို့ မရပါ — အင်တာနက် စစ်ပြီး ပြန်စမ်းပေးပါ။" },
      { status: 502 },
    );
  }

  // 5) JSON ကို တင်းတင်းကျပ်ကျပ် စစ်တယ်။
  let result: AnalyzedFood;
  try {
    result = parseAnalyzedFood(extractJson(rawText));
  } catch {
    return NextResponse.json(
      { error: "AI အဖြေကို ဖတ်လို့ မရပါ — ပုံကို ရှင်းရှင်းလင်းလင်း ရိုက်ပြီး ပြန်စမ်းပေးပါ။" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: input.photoBase64 ? "photo" : "text",
    result,
  });
}
