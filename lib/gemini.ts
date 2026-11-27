// Gemini API ကို server-side ကနေ ခေါ်တဲ့ helper — key ကို frontend ကို ဘယ်တော့မှ မပေးဘူး။
// 2.5-flash က key အသစ်တွေမှာ မရတော့ဘူး (Google: "no longer available to new
// users") — အဓိကကို 3.8-flash ပြောင်းတယ်။ တစ်ခုခု မရရင် အသစ်ကနေ အဟောင်းအတိုင်း
// တစ်ဆင့်ချင်း ပြန်စမ်းတယ် — 3.7 → 3.6 → 3.5 → 3-flash-preview → 2.5-flash
// (အဟောင်းတွေအတွက် နောက်ဆုံး)။
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];
// Fallback စမ်းတဲ့ error တွေ — 404 (model မရှိ)၊ 429 (quota)၊ 503 (overload)။
// Key မှား (400/401) ကတော့ fallback နဲ့လည်း တူတူပဲ မှားမှာမို့ ချက်ချင်း ပြန်ပေးတယ်။
const RETRYABLE_STATUSES = [404, 429, 503];
// Model တစ်ခု ၆၀ စက္ကန့် မပြန်ရင် timeout — ဟန်းပြီး ခလုတ် ပိတ်နေတာမျိုး မဖြစ်အောင်။
const FETCH_TIMEOUT_MS = 60000;

// Gemini က ပြန်တဲ့ HTTP status ပါတဲ့ error —
// 400/401 = key မှားတာ၊ 429 = quota/rate limit ဆိုပြီး ခွဲသိဖို့။
export class GeminiApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function callModel(
  apiKey: string,
  model: string,
  parts: GeminiPart[],
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
        signal: ctrl.signal,
      },
    );

    if (!res.ok) {
      let detail = `Gemini API error (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error?.message) detail = data.error.message;
      } catch {
        // JSON မဟုတ်ရင် status ပဲ သုံးတယ်။
      }
      throw new GeminiApiError(res.status, detail);
    }

    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? "")
      .join("");
    if (!text) throw new Error("Gemini ကနေ အဖြေ ပြန်မလာပါ။");
    return text;
  } catch (err) {
    // ၆၀ စက္ကန့် မပြန်ရင် timeout — 503 လို သဘောထားပြီး
    // fallback စမ်းလို့ရအောင် status ပါတဲ့ error အဖြစ် ပြောင်းပေးတယ်။
    if (err instanceof Error && err.name === "AbortError") {
      throw new GeminiApiError(
        503,
        "Gemini က ခဏကြာနေတယ် — အချိန်ကုန်သွားတယ်။",
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function callGeminiParts(
  apiKey: string,
  parts: GeminiPart[],
): Promise<string> {
  const LAST_MODEL = MODELS[MODELS.length - 1];
  for (const model of MODELS) {
    try {
      return await callModel(apiKey, model, parts);
    } catch (err) {
      const retryable =
        err instanceof GeminiApiError &&
        RETRYABLE_STATUSES.includes(err.status);
      // နောက်ဆုံး model ပါ မှားပြီ (သို့) retry မလုပ်တဲ့ error ဆို ချက်ချင်း ပြန်ပေးတယ်။
      if (!retryable || model === LAST_MODEL) throw err;
      // မဟုတ်ရင် နောက် model နဲ့ တစ်ခါ ပြန်စမ်းတယ်။
    }
  }
  // ရောက်ဖို့ မရှိပေမဲ့ TypeScript အတွက် —
  throw new Error("Gemini ကနေ အဖြေ ပြန်မလာပါ။");
}

export async function callGemini(
  apiKey: string,
  prompt: string,
): Promise<string> {
  return callGeminiParts(apiKey, [{ text: prompt }]);
}

// API key အလုပ်လုပ်မလုပ် စမ်းဖို့ — စကားလုံးတစ်လုံးတည်း ပြန်ခိုင်းတယ်။
export async function testGeminiKey(apiKey: string): Promise<string> {
  return callGemini(apiKey, "Reply with the word OK and nothing else.");
}
