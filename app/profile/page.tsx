import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import ApiKeySettings from "@/components/ApiKeySettings";

// Profile က login session (cookies) ကို ဖတ်လို့ prerender လုပ်လို့ မရဘူး —
// blocking route အဖြစ် ခွင့်ပြုတယ် (Next 16 Cache Components)။
export const instant = false;

const GOAL_LABELS: Record<string, string> = {
  lose: "ဝိတ်ချမယ်",
  maintain: "ထိန်းမယ်",
  gain: "ဝိတ်တက်မယ်",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>Profile</h1>
      <p className="caption mt-1">{user.email}</p>

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
