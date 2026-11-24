"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

export default function SignupPage() {
  const { t } = useLang();
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
      setError(t("auth.passwordShort"));
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
        setError(t("auth.alreadyRegistered"));
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
    setDone(t("auth.signupDone"));
  }

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 py-10">
      <h1>{t("auth.signupTitle")}</h1>
      <p className="caption mt-1">
        {t("auth.signupSubtitle")}
      </p>

      <form onSubmit={handleSignup} className="mt-8 space-y-4">
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
          <span className="caption">{t("auth.passwordMin")}</span>
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
        {done && (
          <p className="rounded-lg bg-[var(--theme-soft)] px-3 py-2 text-[var(--theme-dark)]">{done}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--theme)] py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("auth.creating") : t("auth.signupTitle")}
        </button>
      </form>

      <p className="mt-6 text-center">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-[var(--theme-dark)] underline">
          {t("auth.loginLink")}
        </Link>
      </p>
    </main>
  );
}
