"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase error ကို မြန်မာလို ပြန်ပြောတယ်။
function toMyanmarError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "အီးမေးလ် (သို့) စကားဝှက် မှားနေပါတယ်။";
  }
  if (message.includes("Email not confirmed")) {
    return "အီးမေးလ်ကို အရင် အတည်ပြုပေးပါ — inbox ထဲက link ကို နှိပ်ပါ။";
  }
  if (message.includes("Too many requests")) {
    return "ခဏစောင့်ပြီး ပြန်ကြိုးစားပေးပါ။";
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(toMyanmarError(error.message));
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleGoogle() {
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(toMyanmarError(error.message));
  }

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 py-10">
      <h1>Burmese AI Calorie Tracker</h1>
      <p className="caption mt-1">မြန်မာအစားအစာ ပုံရိုက်လိုက်၊ ကယ်လိုရီသိလိုက်</p>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
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
          <span className="caption">စကားဝှက်</span>
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

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--theme)] py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "ဝင်နေပါတယ်…" : "ဝင်မယ်"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-3 w-full rounded-xl border py-3 font-semibold"
      >
        Google နဲ့ ဝင်မယ်
      </button>

      <p className="mt-6 text-center">
        အကောင့် မရှိသေးဘူးလား?{" "}
        <Link href="/signup" className="font-semibold text-[var(--theme-dark)] underline">
          အကောင့် ဖွင့်မယ်
        </Link>
      </p>
    </main>
  );
}
