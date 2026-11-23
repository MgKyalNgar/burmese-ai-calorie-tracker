"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

// Reminder (Web Push) settings — Profile စာမျက်နှာမှာ ပြတယ်။
// "ဖွင့်မယ်" နှိပ်ရင် browser notification ခွင့်တောင်းပြီး
// push subscription ကို server မှာ သိမ်းတယ်။

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface Settings {
  enabled: boolean;
  breakfast: string;
  lunch: string;
  dinner: string;
  evening: string;
}

const DEFAULTS: Settings = {
  enabled: false,
  breakfast: "08:00",
  lunch: "12:30",
  dinner: "19:00",
  evening: "21:00",
};

export default function ReminderSettings() {
  const { t } = useLang();
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    // လက်ရှိ subscription ရှိမရှိ + setting တွေ ဆွဲတယ်။
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch {
        // SW မရှိသေးရင် subscribed=false အတိုင်း ထားတယ်။
      }
      try {
        const res = await fetch("/api/reminders/settings");
        const d = await res.json();
        if (res.ok) setSettings({ ...DEFAULTS, ...d });
      } catch {
        // setting ဆွဲမရရင် default အတိုင်း ထားတယ်။
      }
    })();
  }, []);

  async function saveSettings(next: Settings) {
    const res = await fetch("/api/reminders/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d?.error ?? t("common.saveError"));
    setSettings({ ...DEFAULTS, ...d });
  }

  async function handleEnable() {
    if (!PUBLIC_KEY) {
      setMessage(t("reminder.noVapid"));
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (Notification.permission === "denied") {
        setMessage(t("reminder.denied"));
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(t("reminder.notGranted"));
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? t("reminder.enableError"));
      await saveSettings({ ...settings, enabled: true });
      setSubscribed(true);
      setMessage(t("reminder.enabled"));
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : t("reminder.enableError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setMessage("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      await saveSettings({ ...settings, enabled: false });
      setSubscribed(false);
      setMessage(t("reminder.disabled"));
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : t("reminder.disableError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleTimeChange(
    key: "breakfast" | "lunch" | "dinner" | "evening",
    value: string,
  ) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await saveSettings(next);
      setMessage(t("reminder.timesSaved"));
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : t("common.saveError"),
      );
    }
  }

  if (!supported) {
    return (
      <section className="mt-3 rounded-2xl bg-white shadow-sm p-4">
        <h2>🔔 Reminder</h2>
        <p className="caption mt-2">
          {t("reminder.unsupported")}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-3 rounded-2xl bg-white shadow-sm p-4">
      <h2>🔔 Reminder</h2>
      <p className="caption mt-1">
        {t("reminder.intro")}
      </p>

      {subscribed ? (
        <button
          type="button"
          onClick={handleDisable}
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-red-300 py-2.5 font-semibold text-red-600 disabled:opacity-50"
        >
          {busy ? t("reminder.disabling") : t("reminder.disable")}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("reminder.enabling") : t("reminder.enable")}
        </button>
      )}

      {subscribed && (
        <div className="mt-3 space-y-2">
          {(
            [
              ["breakfast", t("reminder.breakfastTime")],
              ["lunch", t("reminder.lunchTime")],
              ["dinner", t("reminder.dinnerTime")],
              ["evening", t("reminder.eveningTime")],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-2">
              <span>{label}</span>
              <input
                type="time"
                value={settings[key]}
                onChange={(e) => handleTimeChange(key, e.target.value)}
                className="rounded-xl border bg-white px-3 py-2"
              />
            </label>
          ))}
        </div>
      )}

      {message && <p className="caption mt-2">{message}</p>}
    </section>
  );
}
