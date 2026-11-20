import { createClient } from "@supabase/supabase-js";

// Service-role client — RLS ကို ကျော်ပြီး server-side ပဲ သုံးတယ်။
// API key လို လျှို့ဝှက်အချက်အလက် သိမ်းဖို့/ဖတ်ဖို့ အတွက်သာ သုံးတယ်။
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
