import { NextResponse } from "next/server";
import { checkVapidKeys } from "@/lib/push";

// VAPID key တွေ live env မှာ မှန်/မမှန် စစ်တဲ့ diagnostic —
// တန်ဖိုးအမှန် မပါဘူး (အရှည်နဲ့ အတွဲမှန်/မမှန်ပဲ ပြတယ်)။
// POST, Header: Authorization: Bearer <CRON_SECRET> (send route နဲ့ အတူတူ)။
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(checkVapidKeys());
}
