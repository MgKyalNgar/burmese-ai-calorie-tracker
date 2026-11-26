"use client";

import { useEffect, useState } from "react";

// အင်တာနက် ရှိမရှိ — navigator.onLine + online/offline events။
// လိုင်းပြတ်သွားရင် Add စာမျက်နှာမှာ "အင်တာနက်မရှိပါ" ပြဖို့ သုံးတယ်။
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
