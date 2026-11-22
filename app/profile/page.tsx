"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import ApiKeySettings from "@/components/ApiKeySettings";
import ReminderSettings from "@/components/ReminderSettings";
import ThemeSettings from "@/components/ThemeSettings";
import {
  invalidateCache,
  invalidateCachePrefix,
  useCachedData,
} from "@/lib/useCachedData";
import type { ProfileData } from "@/lib/meal";

// Profile ကို client component အဖြစ် ပြောင်းထားတယ် —
// ဒေတာကို ဖုန်းထဲ cache ထားတော့ tab ပြန်ကူးတိုင်း ချက်ချင်း ပြတယ်။
async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch("/api/profile");
  const data = await res.json();
  if (res.status === 401) return { needsLogin: true } as ProfileData;
  if (!res.ok) throw new Error(data?.error ?? "ဒေတာ ဆွဲလို့ မရပါ။");
  return data as ProfileData;
}

const GOAL_LABELS: Record<string, string> = {
  lose: "ဝိတ်ချမယ်",
  maintain: "ထိန်းမယ်",
  gain: "ဝိတ်တက်မယ်",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data, loading, error } = useCachedData<ProfileData>(
    "profile",
    fetchProfile,
  );

  // Target ပြင်တဲ့ form state။
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [targetMsg, setTargetMsg] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  // သိမ်းပြီးသား target အသစ် — cache ပြန်မဆွဲခင် မျက်နှာပြင်မှာ တန်းပြဖို့။
  const [savedTarget, setSavedTarget] = useState<number | null>(null);

  const saveTarget = async () => {
    const value = Number(targetInput);
    setTargetMsg("");
    setSavingTarget(true);
    try {
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: value }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "သိမ်းလို့ မရပါ။");
      setSavedTarget(body.target);
      setEditingTarget(false);
      setTargetMsg("✅ Target သိမ်းပြီးပါပြီ။");
      // Home / Progress က target အဟောင်း မပြစေဖို့ cache ဖျက်တယ် —
      // tab ပြန်ကူးတိုင်း အသစ် ပြန်ဆွဲတယ်။
      invalidateCache("profile");
      invalidateCachePrefix("today-");
      invalidateCachePrefix("progress-");
    } catch (e) {
      setTargetMsg(e instanceof Error ? e.message : "သိမ်းလို့ မရပါ။");
    } finally {
      setSavingTarget(false);
    }
  };

  useEffect(() => {
    if (data?.needsLogin) router.push("/login");
  }, [data, router]);

  if (loading || !data || data.needsLogin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 pb-24">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--theme)]"
          aria-hidden
        />
        <p className="mt-4 text-[#52677f]">ခနစောင့်ပါ…</p>
        <BottomNav />
      </main>
    );
  }

  const profile = data.profile;

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pb-24 pt-8">
      <h1>Profile</h1>
      <p className="caption mt-1">{data.email}</p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>
      )}

      <section className="mt-4 rounded-2xl bg-white shadow-sm p-5">
        <h2>ကိုယ့်အချက်အလက်</h2>
        {profile ? (
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between">
              <dt>နာမည်</dt>
              <dd className="font-semibold">{profile.display_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>ကျား / မ</dt>
              <dd className="font-semibold">
                {profile.gender === "male" ? "ကျား" : "မ"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>အသက်</dt>
              <dd className="font-semibold">{profile.age ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>အရပ်</dt>
              <dd className="font-semibold">{profile.height_cm ?? "—"} cm</dd>
            </div>
            <div className="flex justify-between">
              <dt>ဝိတ်</dt>
              <dd className="font-semibold">{profile.weight_kg ?? "—"} kg</dd>
            </div>
            <div className="flex justify-between">
              <dt>ပန်းတိုင်</dt>
              <dd className="font-semibold">
                {GOAL_LABELS[profile.goal as string] ?? profile.goal ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>တစ်နေ့တာ target</dt>
              <dd className="font-semibold text-[var(--theme-dark)]">
                {(savedTarget ?? profile.daily_calorie_target ?? 0).toLocaleString()} kcal
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-[#52677f]">
            Profile မရှိသေးဘူး — Onboarding ဖြည့်ပေးပါ။
          </p>
        )}
        {profile &&
          (editingTarget ? (
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder="ဥပမာ 2000"
                  className="w-full rounded-xl border bg-white px-3 py-2.5"
                />
                <button
                  type="button"
                  onClick={saveTarget}
                  disabled={savingTarget}
                  className="shrink-0 rounded-xl bg-[var(--theme)] px-4 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {savingTarget ? "သိမ်းနေတယ်…" : "သိမ်းမယ်"}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="caption">၈၀၀ မှ ၆,၀၀၀ kcal အထိ ထားလို့ ရပါတယ်။</p>
                <button
                  type="button"
                  onClick={() => setEditingTarget(false)}
                  className="caption shrink-0 underline"
                >
                  မပြင်တော့ဘူး
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTargetInput(
                  String(savedTarget ?? profile.daily_calorie_target ?? ""),
                );
                setTargetMsg("");
                setEditingTarget(true);
              }}
              className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 font-semibold"
            >
              Target ပြင်မယ်
            </button>
          ))}
        {targetMsg && <p className="caption mt-2">{targetMsg}</p>}
        {profile && (
          <p className="caption mt-2">
            Onboarding ပြန်ဖြည့်ရင် target အသစ် auto တွက်ပေးမယ်။
          </p>
        )}
        <Link
          href="/onboarding"
          className="mt-4 block rounded-xl bg-[var(--theme)] py-2.5 text-center font-semibold text-white"
        >
          Profile ပြင်မယ်
        </Link>
      </section>

      <ThemeSettings />

      <ApiKeySettings />

      <ReminderSettings />

      <div className="mt-4">
        <LogoutButton />
      </div>

      <BottomNav />
    </main>
  );
}
