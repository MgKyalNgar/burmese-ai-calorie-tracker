import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Burmese AI Calorie Tracker",
  description:
    "မြန်မာအစားအစာ ပုံရိုက်လိုက်၊ ကယ်လိုရီသိလိုက် — Gemini AI နဲ့ ကယ်လိုရီတွက်တဲ့ tracker",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="my">
      <body>{children}</body>
    </html>
  );
}
