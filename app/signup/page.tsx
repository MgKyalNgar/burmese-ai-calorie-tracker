"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    if (password.length < 6) {
      setError("စကားဝှက်က အနည်းဆုံး ၆ လုံး ရှိရမယ်။");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      if (error.message.includes("already registered")) {
        setError("ဒီအီးမေးလ်နဲ့ အကောင့် ရှိပြီးသားပါ — login ဝင်ကြည့်ပါ။");
      } else {
        setError(error.message);
      }
      return;
    }
    // Email အတည်ပြု ပိတ်ထားရင် session တန်းရတယ်။
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    setDone(
      "အကောင့် ဖွင့်ပြီးပြီ ✅ အီးမေးလ်ထဲက အတည်ပြုလင့်ခ်ကို နှိပ်ပြီး login ဝင်ပေးပါ။",
    );
  }

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 py-10">
      <h1>အကောင့် ဖွင့်မယ်</h1>
      <p className="caption mt-1">
        အီးမေးလ်နဲ့ စကားဝှက် ထည့်ပြီး အကောင့် ဖွင့်ပါ။
      </p>

      <form onSubmit={handleSignup} className="mt-8 space-y-4">
        <label className="block">
          <span className="caption">အီးမေးလ်</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="caption">စကားဝှက် (အနည်းဆုံး ၆ လုံး)</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl border px-3 py-2.5"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>
        )}
        {done && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-[#15803d]">{done}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#16a34a] py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "ဖွင့်နေပါတယ်…" : "အကောင့် ဖွင့်မယ်"}
        </button>
      </form>

      <p className="mt-6 text-center">
        အကောင့် ရှိပြီးသားလား?{" "}
        <Link href="/login" className="font-semibold text-[#15803d] underline">
          Login ဝင်မယ်
        </Link>
      </p>
    </main>
  );
}
