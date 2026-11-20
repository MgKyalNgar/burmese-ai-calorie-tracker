"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
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
