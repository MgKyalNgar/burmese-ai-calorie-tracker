"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Tab ကူးတိုင်း server ကို ပြန်မဆွဲရအောင် ဒေတာကို ဖုန်းထဲမှာ မှတ်ထားတဲ့ cache —
// ပထမအကြိမ် ဆွဲပြီးရင် နောက်တစ်ခါ tab ပြန်လာတိုင်း မှတ်ထားတာကို ချက်ချင်း
// ပြပြီး နောက်ကွယ်မှာ အသစ်ကို တိတ်တိတ်လေး ပြန်ဆွဲတယ်။
// (ပြင်ထားချက် 20 Nov 2026: အရင် mount ဖြစ်မှပဲ ပြန်ဆွဲလို့ Home က
// နှိပ်မှ update ဖြစ်တယ် — အခု app ကို ပြန်လာတိုင်း (focus /
// visibilitychange) လည်း အသစ်ပြန်ဆွဲတယ်။)
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
  // cache ရှိရင်း နောက်ကွယ်မှာ ပြန်ဆွဲနေတဲ့ အချိန် — UI မှာ
  // "အသစ်ဆွဲနေတယ်…" လို့ ပြလို့ရအောင်။
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const hadCache = store.has(key);
    if (hadCache) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const d = await fetcherRef.current();
      store.set(key, d);
      if (!mountedRef.current) return;
      setData(d);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "ဒေတာ ဆွဲလို့ မရပါ။");
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [key]);

  useEffect(() => {
    mountedRef.current = true;
    // mount ဖြစ်တိုင်း ပြန်ဆွဲတယ် — cache အဟောင်း ရှိရင် အဲဒါကို အရင်ပြ
    // ပြီး နောက်ကွယ်မှာ အသစ်ကို ဆွဲတယ်။
    void refresh();
    // App ကို ပြန်လာတိုင်း (တခြား app က ပြန်လာ / ဖုန်း ပြန်ဖွင့်) လည်း
    // အသစ်ပြန်ဆွဲတယ် — tab နှိပ်မှ update ဖြစ်တဲ့ ပြဿနာကို ပြင်တာ။
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // fetcher ကို module-level stable function အဖြစ် ပေးရမယ် — key ပြောင်းမှပဲ ပြန်ဆွဲတယ်။
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh]);

  return { data, loading, refreshing, error };
}
