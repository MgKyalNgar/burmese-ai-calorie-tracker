// Home ဖွင့်တာနဲ့ ကျန်တဲ့ Tab တွေရဲ့ data ကို နောက်ကွယ်မှာ ကြိုဆွဲထားတယ် (B) —
// Tab ပြောင်းတဲ့အခါ cache ထဲမှာ အဆင်သင့်ဖြစ်နေပြီး spinner မပေါ်တော့ဘူး။
// Session တစ်ခါမှာ တစ်ခါပဲ ကြိုဆွဲတယ် (warmed flag)။ Error ဖြစ်ရင်
// တိတ်တိတ်လေး ထားလိုက်တယ် — Home ကို လုံးဝ မထိခိုက်စေဘူး။
import { setCacheData } from "./useCachedData";
import { todayYangon } from "./meal";

let warmed = false;

export function warmOtherTabs() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const today = todayYangon();
  // key တွေက စာမျက်နှာတိုင်း useCachedData မှာ သုံးတဲ့ key အတိုင်းပဲ ဖြစ်ရမယ် —
  // မဟုတ်ရင် Tab ဖွင့်တဲ့အခါ cache ကို ရှာမတွေ့ဘူး။
  // progress က tick=0 (ပထမ အကြိမ် ဖွင့်တဲ့ key) — POST လုပ်ပြီးရင် tick
  // တက်သွားလို့ အဲဒီနောက် ဖွင့်ရင် အသစ်ပြန်ဆွဲတယ်။
  const jobs: Array<[string, string]> = [
    [`diary-${today}`, `/api/diary?date=${today}`],
    ["progress-0", "/api/progress"],
    ["profile", "/api/profile"],
  ];
  void Promise.allSettled(
    jobs.map(async ([key, url]) => {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      // login/onboarding လိုအပ်တဲ့ အဖြေကို cache မထည့်ဘူး။
      if (data?.needsLogin || data?.needsOnboarding) return;
      setCacheData(key, data);
    }),
  );
}
