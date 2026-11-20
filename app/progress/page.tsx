import BottomNav from "@/components/BottomNav";

// Phase 3 မှာ Progress chart အပြည့်အစုံ လာမယ်။
export default function ProgressPage() {
  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>Progress</h1>
      <p className="mt-4 text-[#52677f]">
        အပတ်စာ ကယ်လိုရီ chart, ဝိတ် trend, Calendar — Phase 3 မှာ လာမယ်။
      </p>
      <BottomNav />
    </main>
  );
}
