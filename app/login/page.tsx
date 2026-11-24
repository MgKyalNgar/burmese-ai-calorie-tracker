"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang, type TFn } from "@/lib/i18n";

// Supabase error ကို မြန်မာလို ပြန်ပြောတယ်။
function toMyanmarError(message: string, t: TFn): string {
  if (message.includes("Invalid login credentials")) {
    return t("auth.invalidCredentials");
  }
  if (message.includes("Email not confirmed")) {
    return t("auth.emailNotConfirmed");
  }
  if (message.includes("Too many requests")) {
    return t("auth.tooManyRequests");
  }
  return message;
}

export default function LoginPage() {
  const { t } = useLang();
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
      setError(toMyanmarError(error.message, t));
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
    if (error) setError(toMyanmarError(error.message, t));
  }

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 py-10">
      <h1>Burmese AI Calorie Tracker</h1>
      <p className="caption mt-1">{t("auth.tagline")}</p>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <label className="block">
          <span className="caption">{t("auth.email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="caption">{t("auth.password")}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"
          />
        </label>

        {error && (
          <p key={error} className="anim-shake rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--theme)] py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-3 w-full rounded-xl border bg-white py-3 font-semibold"
      >
        {t("auth.googleSignIn")}
      </button>

      <p className="mt-6 text-center">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-[var(--theme-dark)] underline">
          {t("auth.createAccount")}
        </Link>
      </p>
    </main>
  );
}
