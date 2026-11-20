"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import ApiKeySettings from "@/components/ApiKeySettings";
import { useCachedData } from "@/lib/useCachedData";
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

  useEffect(() => {
    if (data?.needsLogin) router.push("/login");
  }, [data, router]);

  if (loading || !data || data.needsLogin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-5 pb-24">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#16a34a]"
          aria-hidden
        />
        <p className="mt-4 text-[#52677f]">ခနစောင့်ပါ…</p>
        <BottomNav />
      </main>
    );
  }

  const profile = data.profile;

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>Profile</h1>
      <p className="caption mt-1">{data.email}</p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>
      )}

      <section className="mt-4 rounded-2xl border p-5">
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
              <dd className="font-semibold text-[#15803d]">
                {(profile.daily_calorie_target ?? 0).toLocaleString()} kcal
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-[#52677f]">
            Profile မရှိသေးဘူး — Onboarding ဖြည့်ပေးပါ။
          </p>
        )}
        <Link
          href="/onboarding"
          className="mt-4 block rounded-xl bg-[#16a34a] py-2.5 text-center font-semibold text-white"
        >
          Profile ပြင်မယ်
        </Link>
      </section>

      <ApiKeySettings />

      <div className="mt-4">
        <LogoutButton />
      </div>

      <BottomNav />
    </main>
  );
}
