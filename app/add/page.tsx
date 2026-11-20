import BottomNav from "@/components/BottomNav";

// Phase 2 မှာ Photo / Text / Search Add အပြည့်အစုံ လာမယ်။
export default function AddPage() {
  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 pb-24 pt-8">
      <h1>+ Add</h1>
      <p className="mt-4 text-[#52677f]">
        ဓာတ်ပုံရိုက် / စာရိုက် / ရှာဖွေ — အစားအစာ ထည့်ဖို့ ဒီမှာ လုပ်မယ်။
        Phase 2 မှာ လာမယ်။
      </p>
      <BottomNav />
    </main>
  );
}
