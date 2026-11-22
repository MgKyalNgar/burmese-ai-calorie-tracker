"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { formatDateTimeDMY } from "@/lib/meal";

// In-app noti ခေါင်းလောင်း 🔔 — စာမျက်နှာတိုင်းရဲ့ အပေါ် ညာဘက်မှာ ပေါ်တယ်
// (login/signup/onboarding မှာ မပြဘူး)။ မဖတ်ရသေးတဲ့ noti အရေအတွက်ကို
// အနီရောင် နံပါတ်နဲ့ ပြတယ်။ နှိပ်ရင် စာရင်း ပေါ်ပြီး ဖတ်ပြီးသား မှတ်တယ် —
// push noti ကို လွတ်သွားရင်တောင် app ထဲမှာ ပြန်မြင်ရတဲ့ double check ပါ။

const HIDDEN_PREFIXES = ["/login", "/signup", "/onboarding", "/auth"];

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  sent_at: string;
  read: boolean;
};

export default function NotificationBell() {
  const pathname = usePathname();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      // login မဝင်သေးရင် ခေါင်းလောင်း မပြဘူး။
      if (res.status === 401) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Noti ဆွဲလို့ မရပါ။");
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noti ဆွဲလို့ မရပါ။");
    }
  }, []);

  useEffect(() => {
    void load();
    // App ကို ပြန်လာတိုင်း အသစ်ပြန်ဆွဲတယ်။
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // ခေါင်းလောင်း ဖွင့်ရင် ဖတ်ပြီးသား မှတ်တယ် — နံပါတ် ပျောက်သွားတယ်။
  const toggleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError("");
    if (unread > 0) {
      try {
        const res = await fetch("/api/notifications", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "ဖတ်ပြီးသား မှတ်လို့ မရပါ။");
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "ဖတ်ပြီးသား မှတ်လို့ မရပါ။");
      }
    }
  };

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="ပိတ်မယ်"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 cursor-default bg-black/10"
        />
      )}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 mx-auto flex max-w-md justify-end px-5 pt-4">
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={toggleOpen}
            aria-label="သတိပေးချက်များ"
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-xl shadow-md"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="font-bold">သတိပေးချက်များ</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="ပိတ်မယ်"
                  className="rounded-full px-2 py-0.5 text-lg text-[#52677f]"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {error && (
                  <p className="px-4 py-3 text-red-700">{error}</p>
                )}
                {!error && items.length === 0 && (
                  <p className="px-4 py-6 text-center text-[#52677f]">
                    သတိပေးစာ မရှိသေးဘူး 🔔
                  </p>
                )}
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b px-4 py-3 last:border-b-0 ${
                      n.read ? "" : "bg-[var(--theme-soft)]"
                    }`}
                  >
                    <p className="font-semibold">{n.title}</p>
                    {n.body && <p className="caption mt-0.5">{n.body}</p>}
                    <p className="caption mt-1 text-[#52677f]">
                      {formatDateTimeDMY(n.sent_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
