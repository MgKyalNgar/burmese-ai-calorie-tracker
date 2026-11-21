"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // signOut မအောင်ရင် ခလုတ်ကို ပြန်ဖွင့်ပေးတယ် —
      // မဟုတ်ရင် "ထွက်နေပါတယ်…" ဆိုပြီး အမြဲ ပိတ်နေမယ်။
      setBusy(false);
      return;
    }
    // Sign out အောင်ပြီးရင် busy ကို ပြန်ပိတ်မှ သွားတယ် —
    // မဟုတ်ရင် App Router က Profile စာမျက်နှာကို cache ထဲ
    // busy=true အတိုင်း သိမ်းထားပြီး ပြန်လာရင် ခလုတ် ပိတ်နေမယ်။
    setBusy(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="w-full rounded-xl border border-red-300 py-3 font-semibold text-red-600 disabled:opacity-50"
    >
      {busy ? "ထွက်နေပါတယ်…" : "အကောင့်ကနေ ထွက်မယ်"}
    </button>
  );
}
