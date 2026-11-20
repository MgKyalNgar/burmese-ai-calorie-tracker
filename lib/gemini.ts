// Gemini API ကို server-side ကနေ ခေါ်တဲ့ helper — key ကို frontend ကို ဘယ်တော့မှ မပေးဘူး။
const MODEL = "gemini-2.5-flash";

export async function callGemini(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
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
    throw new Error(detail);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini ကနေ အဖြေ ပြန်မလာပါ။");
  return text as string;
}

// API key အလုပ်လုပ်မလုပ် စမ်းဖို့ — စကားလုံးတစ်လုံးတည်း ပြန်ခိုင်းတယ်။
export async function testGeminiKey(apiKey: string): Promise<string> {
  return callGemini(apiKey, "Reply with the word OK and nothing else.");
}
