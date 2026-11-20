"use client";

import { useEffect, useState } from "react";

// Tab ကူးတိုင်း server ကို ပြန်မဆွဲရအောင် ဒေတာကို ဖုန်းထဲမှာ မှတ်ထားတဲ့ cache —
// ပထမအကြိမ် ဆွဲပြီးရင် နောက်တစ်ခါ tab ပြန်လာတိုင်း မှတ်ထားတာကို ချက်ချင်း
// ပြပြီး နောက်ကွယ်မှာ အသစ်ကို တိတ်တိတ်လေး ပြန်ဆွဲတယ်။
const store = new Map<string, unknown>();

export function setCacheData(key: string, data: unknown) {
  store.set(key, data);
}

export function invalidateCache(key: string) {
  store.delete(key);
}

export function invalidateCachePrefix(prefix: string) {
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function useCachedData<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(
    () => (store.get(key) as T | undefined) ?? null,
  );
  const [loading, setLoading] = useState(() => !store.has(key));
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setError("");
    fetcher()
      .then((d) => {
        if (!alive) return;
        store.set(key, d);
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "ဒေတာ ဆွဲလို့ မရပါ။");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // fetcher ကို module-level stable function အဖြစ် ပေးရမယ် — key ပြောင်းမှပဲ ပြန်ဆွဲတယ်။
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, error };
}
