"use client";

import { useEffect, useState } from "react";

// App အရောင် ရွေးတာ — အစိမ်း (default) / ခရမ်း / အနီ။
// အရောင်တွေက app/globals.css မှာ [data-theme] variable အဖြစ် အသင့်ရှိပြီးသား —
// ဒီ setting က <html> မှာ data-theme ထားပေးပြီး localStorage (ct-theme) မှာ
// မှတ်ထားတယ်။ ဖုန်း/ browser တစ်လုံးချင်းစီမှာ သီးသန့် မှတ်တာ (အကောင့်နဲ့
// မချိတ်ထားဘူး) — app ကို ပြန်ဖွင့်တိုင်း layout က script က အရင် ဖတ်ပြီး
// အရောင် တပ်ပေးတယ်။
const THEMES = [
  { value: "green", label: "အစိမ်း", dot: "#16a34a" },
  { value: "purple", label: "ခရမ်း", dot: "#9333ea" },
  { value: "red", label: "အနီ", dot: "#dc2626" },
] as const;

export default function ThemeSettings() {
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

  return (
    <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2>App အရောင်</h2>
      <div className="mt-3 flex gap-3">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => pick(t.value)}
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 font-semibold ${
              theme === t.value
                ? "bg-[var(--theme-soft)] ring-2 ring-[var(--theme)]"
                : "bg-slate-50"
            }`}
          >
            <span
              className="h-6 w-6 rounded-full"
              style={{ background: t.dot }}
              aria-hidden
            />
            {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}
