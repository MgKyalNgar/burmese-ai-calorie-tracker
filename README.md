# Burmese AI Calorie Tracker

မြန်မာအစားအစာ ပုံရိုက်လိုက်၊ ကယ်လိုရီသိလိုက် — Gemini AI နဲ့ ကယ်လိုရီတွက်တဲ့ multi-user tracker.

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4 + Supabase + Vercel
- **App form:** Web PWA (Android-first, Online Only) — link နဲ့ Add to Home Screen, Play Store မလို
- **AI:** တစ်ယောက်ချင်း ကိုယ့် Gemini API Key ကို Settings ထဲမှာ ထည့် (BYO key, server-side encrypted)
- **Pricing:** အခမဲ့ အရင် — ရောင်းဖို့ ဆုံးဖြတ်မှ pricing/payment ထည့်မယ်

## Status

- [x] Phase 0 — Scaffold (Next.js + Supabase client + schema SQL + manifest)
- [ ] Phase 1 — Auth + Onboarding + API Key Settings + Home
- [ ] Phase 2 — Photo Analyze (`/api/analyze`) + AI Review/Edit + Diary
- [ ] Phase 3 — Progress + Water/Weight + Myanmar food seed (50–100)
- [ ] Phase 4 — Reminder (Web Push) + PWA
- [ ] Phase 5 — Real Myanmar food photo testing + launch via link

## Setup

1. Supabase project အသစ် ဆောက် (StarFish project နဲ့ မရောနဲ့)
2. `supabase/schema.sql` ကို SQL Editor မှာ run, `meal-photos` bucket ဆောက်
3. `.env.example` ကို `.env.local` အဖြစ် ကူး, key တွေ ဖြည့်
4. `npm install && npm run dev`
5. Vercel project ကို GitHub repo နဲ့ ချိတ်

## Design tokens (locked 19 Nov 2026)

Font sizes 4 မျိုးပဲ — Hero 26px / Title 18px / Body 14px / Caption 12px.
Brand green `#16A34A`, dark `#15803D`.
