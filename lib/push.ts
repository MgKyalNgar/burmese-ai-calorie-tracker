import * as webpush from "web-push";

// Web Push (VAPID) အတွက် — send လုပ်တဲ့ server route တွေက သုံးတယ်။
// VAPID keys မရှိရင် false ပြန်တယ် — Vercel env မှာ key ထည့်ဖို့ လိုတယ်။

export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:mkko32@gmail.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
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
