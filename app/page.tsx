export default function Home() {
  return (
    <main className="mx-auto max-w-md min-h-screen bg-white px-5 py-8">
      <h1>Burmese AI Calorie Tracker</h1>
      <p className="caption mt-1">
        မြန်မာအစားအစာ ပုံရိုက်လိုက်၊ ကယ်လိုရီသိလိုက်
      </p>

      <section className="mt-6 rounded-2xl border p-5 text-center">
        <p className="caption">ဒီနေ့ ကျန်တဲ့ ကယ်လိုရီ</p>
        <p className="hero-num text-[#15803d]">1,240</p>
        <p className="caption">Target 1,800 kcal · စားပြီး 560 kcal</p>
      </section>

      <section className="mt-4 rounded-2xl border p-5">
        <h2>ဒီနေ့ စားပြီးသား</h2>
        <p className="mt-2 text-[#52677f]">
          Phase 1 မှာ Home Ring, Diary, + Add, Progress, Profile တွေ လာမယ်။
        </p>
      </section>

      <p className="caption mt-6">
        Phase 0 Setup — Next.js + TypeScript + Tailwind + Supabase scaffold.
        Supabase project ချိတ်ပြီးရင် Auth + Onboarding စမယ်။
      </p>
    </main>
  );
}
