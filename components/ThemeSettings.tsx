"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

// App အရောင် ရွေးတာ — အစိမ်း (default) / ခရမ်း / အနီ။
// အရောင်တွေက app/globals.css မှာ [data-theme] variable အဖြစ် အသင့်ရှိပြီးသား —
// ဒီ setting က <html> မှာ data-theme ထားပေးပြီး localStorage (ct-theme) မှာ
// မှတ်ထားတယ်။ ဖုန်း/ browser တစ်လုံးချင်းစီမှာ သီးသန့် မှတ်တာ (အကောင့်နဲ့
// မချိတ်ထားဘူး) — app ကို ပြန်ဖွင့်တိုင်း layout က script က အရင် ဖတ်ပြီး
// အရောင် တပ်ပေးတယ်။
const THEMES = [
  { value: "green", key: "theme.green", dot: "#16a34a" },
  { value: "purple", key: "theme.purple", dot: "#9333ea" },
  { value: "red", key: "theme.red", dot: "#dc2626" },
] as const;

export default function ThemeSettings({ bare = false }: { bare?: boolean }) {
  const { t } = useLang();
  const [theme, setTheme] = useState<string>("green");
  // App ကဒ်ထဲမှာ accordion — ခေါင်းစဉ်ကိုနှိပ်မှ အရောင်တွေ ပွင့်တယ်။
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setTheme(localStorage.getItem("ct-theme") ?? "green");
    } catch {
      // localStorage မရရင် အစိမ်းအတိုင်း ထားတယ်။
    }
  }, []);

  const pick = (value: string) => {
    setTheme(value);
    setOpen(false);
    try {
      if (value === "green") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", value);
      }
      localStorage.setItem("ct-theme", value);
    } catch {
      // သိမ်းမရရင် ဒီ session မှာပဲ အရောင်ပြောင်းတယ်။
    }
  };

  const current = THEMES.find((th) => th.value === theme) ?? THEMES[0];

  const picker = (
    <div className="mt-2 flex gap-2">
      {THEMES.map((th) => (
        <button
          key={th.value}
          type="button"
          onClick={() => pick(th.value)}
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 font-semibold ${
            theme === th.value
              ? "bg-[var(--theme-soft)] ring-2 ring-[var(--theme)]"
              : "bg-slate-50"
          }`}
        >
          <span
            className="h-6 w-6 rounded-full"
            style={{ background: th.dot }}
            aria-hidden
          />
          {t(th.key)}
        </button>
      ))}
    </div>
  );

  if (bare) {
    return (
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-5 w-5 shrink-0 rounded-full"
              style={{ background: current.dot }}
              aria-hidden
            />
            <span className="truncate font-semibold">{t("theme.title")}</span>
          </span>
          <span className="caption shrink-0">
            {t(current.key)} {open ? "▴" : "▾"}
          </span>
        </button>
        {open && picker}
      </div>
    );
  }

  return (
    <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2>{t("theme.title")}</h2>
      {picker}
    </section>
  );
}
