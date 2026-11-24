"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// အောက်ခြေ tab bar — login/signup/onboarding မှာ မပြဘူး။
const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/diary", label: "Diary", icon: "📖" },
  { href: "/add", label: "+ Add", icon: "＋" },
  { href: "/progress", label: "Progress", icon: "📊" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const HIDDEN_PREFIXES = ["/login", "/signup", "/onboarding", "/auth"];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Tab တစ်ခုချင်းစီကို အသုံးမပြုခင် ကြိုဆွဲထားတယ် (prefetch) —
  // server ကို နှိုးထားပြီးသား ဖြစ်တော့ tab နှိပ်တဲ့အခါ ပိုမြန်တယ်။
  useEffect(() => {
    TABS.forEach((t) => router.prefetch(t.href));
  }, [router]);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  // အောက်ခြေ tab bar — login/signup/onboarding မှာ မပြဘူး။
  // ပုံ ၃ (Liquid Glass) ပုံစံနဲ့ ရေပေါ်မှန် pill — နောက်ခံကို မှုန်ပြပြီး
  // အပေါ်က စာတွေ မြင်ရတယ်။ အလယ် + Add ကတော့ theme အရောင် စက်ဝိုင်းခလုတ်။
  return (
    <nav className="fixed bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border-white/60 bg-white/70 shadow-lg shadow-slate-900/10 backdrop-blur-xl">
      <ul className="flex">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const isAdd = tab.href === "/add";
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`btn-press flex flex-col items-center gap-0.5 py-2 ${
                  active ? "font-bold text-[var(--theme-dark)]" : "text-[#52677f]"
                }`}
              >
                {isAdd ? (
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-[var(--theme)] text-xl text-white shadow-md ${
                      active ? "ring-2 ring-[var(--theme-ring)]" : ""
                    }`}
                  >
                    {tab.icon}
                  </span>
                ) : (
                  <>
                    <span aria-hidden>{tab.icon}</span>
                    <span className="caption">{tab.label}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
