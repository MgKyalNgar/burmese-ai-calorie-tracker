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

  useEffect(() => {
    try {
      setTheme(localStorage.getItem("ct-theme") ?? "green");
    } catch {
      // localStorage မရရင် အစိမ်းအတိုင်း ထားတယ်။
    }
  }, []);

  const pick = (value: string) => {
    setTheme(value);
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

  const content = (
    <>
      {bare ? (
        <p className="caption">{t("theme.title")}</p>
      ) : (
        <h2>{t("theme.title")}</h2>
      )}
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
    </>
  );

  if (bare) return content;

  return (
    <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
      {content}
    </section>
  );
}
