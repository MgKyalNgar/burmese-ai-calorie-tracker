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

  return (
    <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 border-t bg-white">
      <ul className="flex">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 ${
                  active ? "font-bold text-[#15803d]" : "text-[#52677f]"
                }`}
              >
                <span aria-hidden>{tab.icon}</span>
                <span className="caption">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
