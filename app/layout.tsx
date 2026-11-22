import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NotificationBell from "@/components/NotificationBell";

export const metadata: Metadata = {
  title: "Burmese AI Calorie Tracker",
  description:
    "မြန်မာအစားအစာ ပုံရိုက်လိုက်၊ ကယ်လိုရီသိလိုက် — Gemini AI နဲ့ ကယ်လိုရီတွက်တဲ့ tracker",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="my">
      <body>
        {/* Theme အရောင် (localStorage ct-theme) ကို paint မဖြစ်ခင် အရင်
            ဖတ်ပြီး <html> မှာ data-theme တပ်တယ် — မဟုတ်ရင် အစိမ်းနဲ့
            တစ်ချက်လက် ပြီးမှ ပြောင်းသွားမယ်။ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("ct-theme");if(t&&t!=="green"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
        <ServiceWorkerRegister />
        <NotificationBell />
        {children}
      </body>
    </html>
  );
}
