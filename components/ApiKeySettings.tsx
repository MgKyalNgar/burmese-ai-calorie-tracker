"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { formatDateTimeDMY } from "@/lib/meal";

// API Key Settings — ကိုယ့် Gemini API key ကို server-side encrypted သိမ်းတယ်။
type Status = {
  configured: boolean;
  key_hint: string | null;
  last_tested_at: string | null;
  test_status: string | null;
};

export default function ApiKeySettings() {
  const { t } = useLang();
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // ပုံမှန် ပိတ်ထား — ခေါင်းစဉ်ကိုနှိပ်မှ ဖွင့်တယ်။
  const [open, setOpen] = useState(false);

  async function loadStatus() {
    try {
      const res = await fetch("/api/api-key");
      const data = await res.json();
      if (res.ok) setStatus(data);
      else setMessage(data?.error ?? t("apiKey.statusError"));
    } catch {
      setMessage(t("apiKey.serverError"));
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleSave() {
    if (!key.trim()) {
      setMessage(t("apiKey.enterFirst"));
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("common.saveError"));
      setKey("");
      setMessage(t("apiKey.saved"));
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("common.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    // input မှာ key ရိုက်ထားရင် အဲဒီ key ကို မသိမ်းဘဲ စမ်းတယ် —
    // ရိုက်မထားရင် သိမ်းထားတဲ့ key ကို စမ်းတယ်။
    const typedKey = key.trim();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/api-key/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typedKey ? { key: typedKey } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("apiKey.testError"));
      setMessage(
        typedKey
          ? t("apiKey.worksSave", { reply: data.reply ?? "OK" })
          : t("apiKey.works", { reply: data.reply ?? "OK" }),
      );
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("apiKey.testError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("apiKey.confirmDelete"))) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/api-key", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("common.deleteError"));
      setMessage(t("apiKey.deleted"));
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("common.deleteError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-2xl bg-white shadow-sm p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[18px] font-bold leading-[1.3]">
          Gemini API Key
        </span>
        <span className="caption shrink-0">
          {status
            ? status.configured
              ? t("apiKey.configuredShort")
              : t("apiKey.notConfigured")
            : ""}
          {open ? " ▴" : " ▾"}
        </span>
      </button>

      {open && (
        <div className="anim-in">
          <p className="caption mt-1">
            {t("apiKey.intro")}
          </p>

          {status?.configured ? (
            <p className="mt-2 rounded-lg bg-[var(--theme-soft)] px-3 py-2 text-[var(--theme-dark)]">
              {t("apiKey.configured", { hint: status.key_hint ?? "" })}
              {status.last_tested_at && (
                <span className="caption block">
                  {t("apiKey.lastTested")}{" "}
                  {formatDateTimeDMY(status.last_tested_at)} ·{" "}
                  {status.test_status ?? ""}
                </span>
              )}
            </p>
          ) : (
            <p className="caption mt-2">{t("apiKey.notConfigured")}</p>
          )}

          <label className="mt-3 block">
            <span className="caption">{t("apiKey.newKey")}</span>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza... / AQ...."
              autoComplete="off"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </label>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="flex-1 rounded-xl bg-[var(--theme)] py-2 font-semibold text-white disabled:opacity-50"
            >
              {t("common.save")}
            </button>
            {/* စမ်းမယ် — key ရိုက်ထားရင် (မသိမ်းခင် စမ်းတာ) (သို့)
                သိမ်းထားတဲ့ key ရှိရင် ပေါ်တယ်။ */}
            {(status?.configured || key.trim()) && (
              <button
                type="button"
                onClick={handleTest}
                disabled={busy}
                className="flex-1 rounded-xl border border-[var(--theme)] py-2 font-semibold text-[var(--theme-dark)] disabled:opacity-50"
              >
                {t("apiKey.test")}
              </button>
            )}
            {status?.configured && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-600 disabled:opacity-50"
              >
                {t("common.delete")}
              </button>
            )}
          </div>

          <p className="caption mt-2">
            {t("apiKey.getKeyPrefix")}{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--theme-dark)] underline"
            >
              Google AI Studio
            </a>{" "}
            {t("apiKey.getKeySuffix")}
          </p>

          {message && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2">{message}</p>
          )}
        </div>
      )}
    </section>
  );
}
