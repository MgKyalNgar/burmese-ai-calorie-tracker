"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import ApiKeySettings from "@/components/ApiKeySettings";
import ReminderSettings from "@/components/ReminderSettings";
import ThemeSettings from "@/components/ThemeSettings";
import LanguageSettings from "@/components/LanguageSettings";
import UnitSettings from "@/components/UnitSettings";
import {
  invalidateCache,
  invalidateCachePrefix,
  useCachedData,
} from "@/lib/useCachedData";
import { FETCH_FALLBACK, useLang } from "@/lib/i18n";
import { formatWeight, lbToKg, useWeightUnit } from "@/lib/units";
import type { ProfileData } from "@/lib/meal";

// Profile ကို client component အဖြစ် ပြောင်းထားတယ် —
// ဒေတာကို ဖုန်းထဲ cache ထားတော့ tab ပြန်ကူးတိုင်း ချက်ချင်း ပြတယ်။
async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch("/api/profile");
  const data = await res.json();
  if (res.status === 401) return { needsLogin: true } as ProfileData;
  if (!res.ok) throw new Error(data?.error ?? FETCH_FALLBACK);
  return data as ProfileData;
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLang();
  const { unit } = useWeightUnit();
  const { data, loading, error } = useCachedData<ProfileData>(
    "profile",
    fetchProfile,
  );

  // ကိုယ်ရေးအချက် ပြင်တဲ့ form state — ခလုတ်တစ်ခုတည်း ("ပြင်မယ်") က
  // အချက်အလက်အကုန် + Target ကို ကဒ်ထဲမှာတင် ပြင်ခိုင်းတယ်။
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gender: "male",
    age: "",
    height: "",
    weight: "",
    goal: "maintain",
    target: "",
  });
  const [editMsg, setEditMsg] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  // သိမ်းပြီးသား profile အသစ် — cache ပြန်မဆွဲခင် မျက်နှာပြင်မှာ တန်းပြဖို့။
  const [savedProfile, setSavedProfile] = useState<
    ProfileData["profile"] | null
  >(null);

  const GOAL_LABELS: Record<string, string> = {
    lose: t("profile.goalLose"),
    maintain: t("profile.goalMaintain"),
    gain: t("profile.goalGain"),
  };

  const startEdit = (p: NonNullable<ProfileData["profile"]>) => {
    setForm({
      name: p.display_name ?? "",
      gender: p.gender ?? "male",
      age: p.age != null ? String(p.age) : "",
      height: p.height_cm != null ? String(p.height_cm) : "",
      weight: p.weight_kg != null ? String(formatWeight(p.weight_kg, unit)) : "",
      goal: p.goal ?? "maintain",
      target:
        p.daily_calorie_target != null
          ? String(p.daily_calorie_target)
          : "",
    });
    setEditMsg("");
    setEditing(true);
  };

  const saveEdit = async (p: NonNullable<ProfileData["profile"]>) => {
    setEditMsg("");
    setSavingEdit(true);
    // ဝိတ်ကို ပြနေတဲ့ unit အတိုင်း အရင် စစ်တယ် — kg 20–300၊ lb 44–661။
    // မကိုက်ရင် မသိမ်းဘဲ ပြန်ထွက်တယ်။
    if (form.weight.trim()) {
      const typed = Number(form.weight);
      const min = unit === "lb" ? 44 : 20;
      const max = unit === "lb" ? 661 : 300;
      if (!Number.isFinite(typed) || typed < min || typed > max) {
        setEditMsg(
          unit === "lb"
            ? t("progress.weightRangeLb")
            : t("progress.weightRange"),
        );
        setSavingEdit(false);
        return;
      }
    }
    try {
      // အကွက်လွတ်နေရင် အဟောင်းအတိုင်း ထားတယ် (နာမည်ကလွဲရင် —
      // နာမည် ဖျက်ရင် null ဖြစ်သွားတယ်)။ အဟောင်းလည်း မရှိရင်
      // အဲဒီအကွက်ကို မပို့ဘူး။
      const body: Record<string, unknown> = {
        display_name: form.name.trim(),
        gender: form.gender,
        goal: form.goal,
      };
      const numOrOld = (v: string, old: number | null) =>
        v.trim() ? Number(v) : old;
      const age = numOrOld(form.age, p.age);
      if (age != null) body.age = age;
      const height = numOrOld(form.height, p.height_cm);
      if (height != null) body.height_cm = height;
      // ရိုက်ထားတဲ့ ဝိတ်ကို kg ပြန်ပြောင်းပြီး သိမ်းတယ် (DB က kg ပဲ) —
      // အကွက်လွတ်နေရင် အဟောင်းအတိုင်း ထားတယ်။
      const weight = form.weight.trim()
        ? unit === "lb"
          ? lbToKg(Number(form.weight))
          : Math.round(Number(form.weight) * 10) / 10
        : p.weight_kg;
      if (weight != null) body.weight_kg = weight;
      const target = numOrOld(form.target, p.daily_calorie_target);
      if (target != null) body.daily_calorie_target = target;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("common.saveError"));
      setSavedProfile(data.profile ?? null);
      setEditing(false);
      setEditMsg(t("profile.saved"));
      // Home / Progress က target/ဝိတ် အဟောင်း မပြစေဖို့ cache ဖျက်တယ် —
      // tab ပြန်ကူးတိုင်း အသစ် ပြန်ဆွဲတယ်။
      invalidateCache("profile");
      invalidateCachePrefix("today-");
      invalidateCachePrefix("progress-");
    } catch (e) {
      setEditMsg(e instanceof Error ? e.message : t("common.saveError"));
    } finally {
      setSavingEdit(false);
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
        <p className="mt-4 text-[#52677f]">{t("common.loading")}</p>
        <BottomNav />
      </main>
    );
  }

  const profile = savedProfile ?? data.profile;

  return (
    <main className="mx-auto max-w-md min-h-screen px-5 pb-24 pt-5">
      <h1>Profile</h1>
      <p className="caption mt-1">{data.email}</p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">
          {error === FETCH_FALLBACK ? t("common.loadError") : error}
        </p>
      )}

      <section className="mt-3 rounded-2xl bg-white shadow-sm p-4">
        <h2>{t("profile.myInfo")}</h2>
        {profile ? (
          editing ? (
            <div className="mt-2 space-y-2">
              <label className="flex items-center justify-between gap-2">
                <span>{t("profile.name")}</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-44 rounded-xl border bg-white px-3 py-1.5 text-right"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>{t("profile.gender")}</span>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm({ ...form, gender: e.target.value })
                  }
                  className="w-44 rounded-xl border bg-white px-3 py-1.5 text-right"
                >
                  <option value="male">{t("profile.male")}</option>
                  <option value="female">{t("profile.female")}</option>
                  <option value="other">{t("profile.other")}</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>{t("profile.age")}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={120}
                  value={form.age}
                  onChange={(e) =>
                    setForm({ ...form, age: e.target.value })
                  }
                  className="w-44 rounded-xl border bg-white px-3 py-1.5 text-right"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>{t("profile.height")}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={100}
                  max={250}
                  value={form.height}
                  onChange={(e) =>
                    setForm({ ...form, height: e.target.value })
                  }
                  className="w-44 rounded-xl border bg-white px-3 py-1.5 text-right"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>{t("profile.weight")} ({unit})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={unit === "lb" ? 44 : 20}
                  max={unit === "lb" ? 661 : 300}
                  step="0.1"
                  value={form.weight}
                  onChange={(e) =>
                    setForm({ ...form, weight: e.target.value })
                  }
                  className="w-44 rounded-xl border bg-white px-3 py-1.5 text-right"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>{t("profile.goal")}</span>
                <select
                  value={form.goal}
                  onChange={(e) =>
                    setForm({ ...form, goal: e.target.value })
                  }
                  className="w-44 rounded-xl border bg-white px-3 py-1.5 text-right"
                >
                  <option value="lose">{GOAL_LABELS.lose}</option>
                  <option value="maintain">{GOAL_LABELS.maintain}</option>
                  <option value="gain">{GOAL_LABELS.gain}</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>{t("profile.dailyTarget")}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={800}
                  max={6000}
                  value={form.target}
                  onChange={(e) =>
                    setForm({ ...form, target: e.target.value })
                  }
                  placeholder={t("profile.targetPlaceholder")}
                  className="w-44 rounded-xl border bg-white px-3 py-1.5 text-right"
                />
              </label>
              <p className="caption text-right">{t("profile.targetRange")}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={savingEdit}
                  className="flex-1 rounded-xl border bg-white py-2.5 font-semibold disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit(profile)}
                  disabled={savingEdit}
                  className="flex-1 rounded-xl bg-[var(--theme)] py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {savingEdit ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between">
                  <dt>{t("profile.name")}</dt>
                  <dd className="font-semibold">{profile.display_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("profile.gender")}</dt>
                  <dd className="font-semibold">
                    {profile.gender === "male"
                      ? t("profile.male")
                      : profile.gender === "female"
                        ? t("profile.female")
                        : t("profile.other")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("profile.age")}</dt>
                  <dd className="font-semibold">{profile.age ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("profile.height")}</dt>
                  <dd className="font-semibold">{profile.height_cm ?? "—"} cm</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("profile.weight")}</dt>
                  <dd className="font-semibold">{profile.weight_kg != null ? formatWeight(profile.weight_kg, unit) : "—"} {unit}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("profile.goal")}</dt>
                  <dd className="font-semibold">
                    {GOAL_LABELS[profile.goal as string] ?? profile.goal ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("profile.dailyTarget")}</dt>
                  <dd className="font-semibold text-[var(--theme-dark)]">
                    {(profile.daily_calorie_target ?? 0).toLocaleString()} kcal
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => startEdit(profile)}
                className="mt-3 w-full rounded-xl bg-slate-100 py-2.5 font-semibold"
              >
                {t("profile.edit")}
              </button>
            </>
          )
        ) : (
          <p className="mt-3 text-[#52677f]">
            {t("profile.noProfile")}
          </p>
        )}
        {editMsg && <p className="caption mt-2">{editMsg}</p>}
      </section>

      <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2>{t("appSettings.title")}</h2>
        <div className="mt-3 flex items-center gap-2">
          <ThemeSettings bare />
          <LanguageSettings bare />
        </div>
      </section>

      <UnitSettings />

      <ApiKeySettings />

      <ReminderSettings />

      <div className="mt-3">
        <LogoutButton />
      </div>

      <BottomNav />
    </main>
  );
}
