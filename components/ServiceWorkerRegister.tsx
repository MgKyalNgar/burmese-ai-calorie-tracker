"use client";

import { useEffect } from "react";

// Service worker ကို register လုပ်တယ် — Push notification တွေအတွက် လိုတယ်。
// Browser က SW မထောက်ပံ့ရင် တိတ်တိတ်လေး ကျော်သွားတယ်။
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
