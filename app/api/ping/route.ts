import { NextResponse } from "next/server";

// လိုင်းရှိမရှိ စစ်တဲ့ အသေးစား endpoint — auth မလို၊ ဒေတာ မဆွဲဘူး။
// useOnlineStatus က ဒါကို ၃ စက္ကန့် timeout နဲ့ ခေါ်ပြီး တကယ် လိုင်းရှိမရှိ
// ဆုံးဖြတ်တယ် (navigator.onLine က VPN / အားနည်းတဲ့ signal ချိန်မှာ
// လိုင်းရှိတယ်လို့ မှားပြတတ်လို့)။
export async function GET() {
  return NextResponse.json({ ok: true });
}
