"use client";

import { useLang, type Lang } from "@/lib/i18n";

// ဘာသာစကား ရွေးတာ — မြန်မာ / English။
// Theme setting လိုပဲ localStorage (ct-lang) မှာ မှတ်ထားတယ် —
// ဖုန်း/browser တစ်လုံးချင်းစီမှာ သီးသန့် မှတ်တာ (အကောင့်နဲ့ မချိတ်ထားဘူး)။
const LANGS: { value: Lang; label: string }[] = [
  { value: "my", label: "မြန်မာ" },
  { value: "en", label: "English" },
];

export default function LanguageSettings() {
  const { lang, setLang, t } = useLang();

  return (
    <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2>{t("lang.title")}</h2>
      <div className="mt-3 flex gap-3">
        {LANGS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLang(l.value)}
            className={`flex-1 rounded-xl py-3 font-semibold ${
              lang === l.value
                ? "bg-[var(--theme-soft)] ring-2 ring-[var(--theme)]"
                : "bg-slate-50"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </section>
  );
}
