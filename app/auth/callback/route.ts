import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google OAuth / Email အတည်ပြု ပြီးရင် ဒီ route ကို ပြန်လာတယ်။
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Profile ရှိပြီးသားလား စစ်တယ် — မရှိရင် Onboarding ကို ပို့တယ်။
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code မရှိတာ (သို့) error ဖြစ်ရင် login ကို ပြန်ပို့တယ်။
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
