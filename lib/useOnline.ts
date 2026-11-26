"use client";

import { useCallback, useEffect, useState } from "react";

// အင်တာနက် တကယ် ရှိမရှိ — navigator.onLine တစ်ခုတည်း အားမကိုးဘူး။
// Airplane Mode မှာတော့ onLine က false ဖြစ်တယ်၊ ဒါပေမဲ့ ရိုးရိုး data/WiFi
// ပိတ်ချိန် (ဥပမာ VPN ဖွင့်ထားပြီး data ပိတ်ထားချိန်) မှာ interface က
// တက်နေသေးလို့ onLine က true လို့ မှားပြတတ်တယ် — အဲဒီချိန် fetch က
// ဟန်းနေပြီး banner လည်း မပေါ်ဘူး။ ဒါကြောင့် /api/ping ကို ၃ စက္ကန့်
// timeout နဲ့ တကယ် ခေါ်စစ်တယ်။ စစ်တာ မအောင်ရင် offline လို့ သတ်မှတ်တယ်။
async function probe(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch("/api/ping", {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [browserOnline, setBrowserOnline] = useState(true);
  const [probeOk, setProbeOk] = useState(true);

  const check = useCallback(() => {
    setBrowserOnline(navigator.onLine);
    void probe().then(setProbeOk);
  }, []);

  useEffect(() => {
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    document.addEventListener("visibilitychange", check);
    // Add စာမျက်နှာ ဖွင့်ထားတိုင်း စက္ကန့် ၂၀ တိုင်း ပြန်စစ်တယ် —
    // လိုင်းပြတ်သွားရင် banner ချက်ချင်း ပေါ်ဖို့။
    const timer = setInterval(check, 20000);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    };
  }, [check]);

  return browserOnline && probeOk;
}
