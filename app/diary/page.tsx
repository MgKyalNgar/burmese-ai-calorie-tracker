import BottomNav from "@/components/BottomNav";

// Phase 2 မှာ Diary အပြည့်အစုံ လာမယ်။
export default function DiaryPage() {
  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>Diary</h1>
      <p className="mt-4 text-[#52677f]">
        မနက်စာ / နေ့လည်စာ / ညစာ / အဆာပြေ — တစ်နေ့တာ မှတ်တမ်းတွေကို ဒီမှာ
        ပြမယ်။ Phase 2 မှာ လာမယ်။
      </p>
      <BottomNav />
    </main>
  );
}
