"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { todayYangon } from "@/lib/meal";

// Tab ကူးတိုင်း server ကို ပြန်မဆွဲရအောင် ဒေတာကို ဖုန်းထဲမှာ မှတ်ထားတဲ့ cache —
// ပထမအကြိမ် ဆွဲပြီးရင် နောက်တစ်ခါ tab ပြန်လာတိုင်း မှတ်ထားတာကို ချက်ချင်း
// ပြပြီး နောက်ကွယ်မှာ အသစ်ကို တိတ်တိတ်လေး ပြန်ဆွဲတယ်။
// (ပြင်ထားချက် 20 Nov 2026: အရင် mount ဖြစ်မှပဲ ပြန်ဆွဲလို့ Home က
// နှိပ်မှ update ဖြစ်တယ် — အခု app ကို ပြန်လာတိုင်း (focus /
// visibilitychange) လည်း အသစ်ပြန်ဆွဲတယ်။)
// (ပြင်ထားချက် 24 Nov 2026 — A: cache ကို localStorage ထဲပါ သိမ်းတယ် —
// app ပိတ်ပြီး ပြန်ဖွင့်လည်း မနေ့က data အတိုင်း ချက်ချင်း ပြမယ်၊
// နောက်ကွယ်မှာ အသစ်ဆွဲမယ်။ ဒါကြောင့် spinner က ပထမဆုံး အကြိမ် တစ်ခါပဲ
// မြင်ရတော့မယ်။)
const store = new Map<string, unknown>();

// ---- localStorage persistence (A) ----
const LS_KEY = "ct-cache-v1";
const LS_MAX_ENTRIES = 30;
type PersistedEntry = { data: unknown; savedAt: number };

function readPersistedAll(): Record<string, PersistedEntry> {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PersistedEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readPersisted(key: string): unknown | undefined {
  const entry = readPersistedAll()[key];
  if (!entry) return undefined;
  // today- cache က ဒီနေ့ဟာပဲ ယူတယ် (မနေ့က အစာ ဒီနေ့လို့ မှားမပြအောင်);
  // diary ရက်ဟောင်း / profile / progress ကတော့ history ဖြစ်လို့ ယူလို့ရတယ်
  // (mount ဖြစ်တိုင်း နောက်ကွယ်မှာ အသစ်ပြန်ဆွဲတယ်)။
  if (key.startsWith("today-") && key !== `today-${todayYangon()}`) {
    return undefined;
  }
  // login/onboarding လိုအပ်တဲ့ အဖြေကို မယူဘူး — session ပြန်ရရင်
  // အဟောင်းက /login ကို မှားပြီး ပို့မိမယ်။
  const d = entry.data as Record<string, unknown> | null;
  if (
    d &&
    typeof d === "object" &&
    (d.needsLogin || d.needsOnboarding)
  ) {
    return undefined;
  }
  return entry.data;
}

function writePersisted(key: string, data: unknown) {
  try {
    if (typeof window === "undefined") return;
    const d = data as Record<string, unknown> | null;
    if (
      d &&
      typeof d === "object" &&
      (d.needsLogin || d.needsOnboarding)
    ) {
      return;
    }
    const all = readPersistedAll();
    // today- အဟောင်း (မနေ့က ရက်) တွေ ရှင်း — နောက်နေ့ ပြန်မဖတ်တော့ဘူး။
    const todayKey = `today-${todayYangon()}`;
    for (const k of Object.keys(all)) {
      if (k.startsWith("today-") && k !== todayKey) delete all[k];
    }
    all[key] = { data, savedAt: Date.now() };
    // အများဆုံး ၃၀ ခု — အဟောင်းဆုံး အရင် ဖျက်တယ် (quota ပြည့်မစိုးလို့)။
    const keys = Object.keys(all);
    if (keys.length > LS_MAX_ENTRIES) {
      keys.sort((a, b) => (all[a]?.savedAt ?? 0) - (all[b]?.savedAt ?? 0));
      for (const k of keys.slice(0, keys.length - LS_MAX_ENTRIES)) {
        delete all[k];
      }
    }
    window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    // localStorage ပြည့် / ပိတ်ထားရင် memory cache ပဲ သုံးတယ်။
  }
}

function deletePersisted(key: string) {
  try {
    if (typeof window === "undefined") return;
    const all = readPersistedAll();
    if (key in all) {
      delete all[key];
      window.localStorage.setItem(LS_KEY, JSON.stringify(all));
    }
  } catch {
    // မရှိမဖြစ် မဟုတ်ဘူး — memory cache က ဖျက်ပြီးသား။
  }
}

function deletePersistedPrefix(prefix: string) {
  try {
    if (typeof window === "undefined") return;
    const all = readPersistedAll();
    let changed = false;
    for (const k of Object.keys(all)) {
      if (k.startsWith(prefix)) {
        delete all[k];
        changed = true;
      }
    }
    if (changed) window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    // မရှိမဖြစ် မဟုတ်ဘူး — memory cache က ဖျက်ပြီးသား။
  }
}

export function setCacheData(key: string, data: unknown) {
  store.set(key, data);
  writePersisted(key, data);
}

export function invalidateCache(key: string) {
  store.delete(key);
  deletePersisted(key);
}

export function invalidateCachePrefix(prefix: string) {
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) store.delete(k);
  }
  deletePersistedPrefix(prefix);
}

export function useCachedData<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => {
    const mem = store.get(key) as T | undefined;
    if (mem !== undefined) return mem;
    // memory မှာ မရှိရင် localStorage က အဟောင်း (မနေ့က data) ကို ယူတယ် —
    // ချက်ချင်း ပြပြီး နောက်ကွယ်မှာ အသစ်ဆွဲမယ်။
    const saved = readPersisted(key) as T | undefined;
    if (saved !== undefined) {
      store.set(key, saved);
      return saved;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (store.has(key)) return false;
    return readPersisted(key) === undefined;
  });
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
      writePersisted(key, d);
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

  return { data, loading, refreshing, error, refresh };
}
