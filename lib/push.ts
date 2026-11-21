import * as webpush from "web-push";
import { createECDH } from "crypto";

// Web Push (VAPID) အတွက် — send လုပ်တဲ့ server route တွေက သုံးတယ်။
// VAPID keys မရှိရင် false ပြန်တယ် — Vercel env မှာ key ထည့်ဖို့ လိုတယ်။

export function configureWebPush(): boolean {
  // env ထဲက တန်ဖိုးမှာ paste လုပ်ရင်း ပါလာတဲ့ space/newline တွေကို ဖယ်တယ် —
  // Vercel မှာ public key 88 လုံး (87 + newline) ဖြစ်နေလို့ setVapidDetails က throw လုပ်ခဲ့တယ်။
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ?? "mailto:mkko32@gmail.com";
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    // key ပုံစံ မမှန်ရင် setVapidDetails က throw လုပ်တယ် — empty 500 မဖြစ်အောင် ဖမ်းတယ်။
    return false;
  }
  return true;
}

export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function sendPush(
  sub: PushSubscriptionJson,
  payload: { title: string; body: string; url?: string },
) {
  return webpush.sendNotification(
    sub as unknown as webpush.PushSubscription,
    JSON.stringify(payload),
  );
}

// Live env ထဲက VAPID key တွေ မှန်/မမှန် စစ်တာ —
// တန်ဖိုးအမှန်ကို လုံးဝ မပြဘူး (အရှည်နဲ့ အတွဲမှန်/မမှန်ပဲ ပြတယ်)။
export function checkVapidKeys(): {
  hasPublicKey: boolean;
  publicKeyLen: number;
  hasPrivateKey: boolean;
  privateKeyLen: number;
  pairValid: boolean;
  error: string | null;
} {
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const result = {
    hasPublicKey: publicKey.length > 0,
    publicKeyLen: publicKey.length,
    hasPrivateKey: privateKey.length > 0,
    privateKeyLen: privateKey.length,
    pairValid: false,
    error: null as string | null,
  };
  try {
    const priv = Buffer.from(privateKey, "base64url");
    const pub = Buffer.from(publicKey, "base64url");
    if (priv.length !== 32 || pub.length !== 65) {
      result.error = `bad lengths (priv ${priv.length}B, pub ${pub.length}B)`;
      return result;
    }
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(priv);
    result.pairValid = ecdh.getPublicKey(null, "uncompressed").equals(pub);
    if (!result.pairValid) result.error = "public/private pair mismatch";
  } catch (e) {
    result.error = e instanceof Error ? e.message : "key check failed";
  }
  return result;
}
