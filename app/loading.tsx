// စာမျက်နှာ ကူးပြောင်းတဲ့အခါ ချက်ချင်း ပြတဲ့ loading UI —
// Home လို server data ဆွဲရတဲ့ စာမျက်နှာတွေမှာ နှိပ်ပြီး ခဏကြာမှ
// ပြောင်းတာကို "သေနေတယ်" လို့ မထင်ရအောင်။
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-5">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#16a34a]"
        aria-hidden
      />
      <p className="mt-4 text-[#52677f]">ခနစောင့်ပါ…</p>
    </main>
  );
}
