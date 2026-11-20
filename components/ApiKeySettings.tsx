"use client";

import { useEffect, useState } from "react";

// API Key Settings — ကိုယ့် Gemini API key ကို server-side encrypted သိမ်းတယ်။
type Status = {
  configured: boolean;
  key_hint: string | null;
  last_tested_at: string | null;
  test_status: string | null;
};

export default function ApiKeySettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadStatus() {
    try {
      const res = await fetch("/api/api-key");
      const data = await res.json();
      if (res.ok) setStatus(data);
      else setMessage(data?.error ?? "Key အခြေအနေ စစ်လို့ မရပါ။");
    } catch {
      setMessage("Server ကို ဆက်သွယ်လို့ မရပါ။");
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleSave() {
    if (!key.trim()) {
      setMessage("API key ကို အရင် ထည့်ပေးပါ။");
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
      if (!res.ok) throw new Error(data?.error ?? "သိမ်းလို့ မရပါ။");
      setKey("");
      setMessage("API key သိမ်းပြီးပြီ ✅");
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "သိမ်းလို့ မရပါ။");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/api-key/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "စမ်းလို့ မရပါ။");
      setMessage(`Key အလုပ်လုပ်ပါတယ် ✅ (${data.reply ?? "OK"})`);
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "စမ်းလို့ မရပါ။");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("API key ကို ဖျက်မှာလား?")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/api-key", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "ဖျက်လို့ မရပါ။");
      setMessage("API key ဖျက်ပြီးပြီ။");
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "ဖျက်လို့ မရပါ။");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border p-5">
      <h2>Gemini API Key</h2>
      <p className="caption mt-1">
        ကိုယ့် Gemini API key ကို ထည့်ပါ — server မှာပဲ encrypted သိမ်းတယ်၊
        ဘယ်သူမှ မြင်လို့ မရဘူး။
      </p>

      {status?.configured ? (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-[#15803d]">
          Key ရှိပြီးသား: {status.key_hint}
          {status.last_tested_at && (
            <span className="caption block">
              နောက်ဆုံး စမ်းတာ:{" "}
              {new Date(status.last_tested_at).toLocaleString("my-MM")} ·{" "}
              {status.test_status ?? ""}
            </span>
          )}
        </p>
      ) : (
        <p className="caption mt-3">API key မထည့်ရသေးဘူး။</p>
      )}

      <label className="mt-4 block">
        <span className="caption">API key အသစ်</span>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza..."
          autoComplete="off"
          className="mt-1 w-full rounded-xl border px-3 py-2.5"
        />
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="flex-1 rounded-xl bg-[#16a34a] py-2.5 font-semibold text-white disabled:opacity-50"
        >
          သိမ်းမယ်
        </button>
        {status?.configured && (
          <>
            <button
              type="button"
              onClick={handleTest}
              disabled={busy}
              className="flex-1 rounded-xl border border-[#16a34a] py-2.5 font-semibold text-[#15803d] disabled:opacity-50"
            >
              စမ်းမယ်
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-xl border border-red-300 px-4 py-2.5 font-semibold text-red-600 disabled:opacity-50"
            >
              ဖျက်မယ်
            </button>
          </>
        )}
      </div>

      <p className="caption mt-3">
        Key ထုတ်ဖို့:{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[#15803d] underline"
        >
          Google AI Studio
        </a>{" "}
        မှာ Create API key နှိပ်ပါ။
      </p>

      {message && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2">{message}</p>}
    </section>
  );
}
