import crypto from "node:crypto";

// Gemini API key ကို AES-256-GCM နဲ့ encrypt/decrypt လုပ်တယ်။
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET မရှိသေးပါ — Vercel env var မှာ ထည့်ပေးပါ။",
    );
  }
  // Secret ကို 32-byte key အဖြစ် ပြောင်းတယ်။
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptApiKey(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // iv (12) + tag (16) + ciphertext ကို base64 တစ်ကြောင်းတည်း သိမ်းတယ်။
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptApiKey(encrypted: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encrypted, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

// Key hint — frontend မှာ ပြဖို့သာ (အစအဆုံး စာလုံးအနည်းငယ်ပဲ)။
export function makeKeyHint(key: string): string {
  if (key.length < 12) return "AIza...****";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}
