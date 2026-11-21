"use client";

import BottomNav from "@/components/BottomNav";
import DiaryClient from "@/components/DiaryClient";
import { formatDateDMY, todayYangon } from "@/lib/meal";

// Diary စာမျက်နှာကို client shell အဖြစ် ထားတယ် —
// ဒေတာကို DiaryClient က cache နဲ့ ဆွဲတော့ tab ပြန်ကူးတိုင်း ချက်ချင်း ပြတယ်။
// ရက်ရွေ့တဲ့ ခလုတ်တွေက DiaryClient ထဲမှာ ပါတယ်။
export default function DiaryPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-white px-5 pb-24 pt-8">
      <h1>Diary</h1>
      <DiaryClient />
      <BottomNav />
    </main>
  );
}
