import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Profile tab အတွက် ကိုယ့်အချက်အလက် — client cache ကနေ ခေါ်တယ်။
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Login အရင် ဝင်ပေးပါ။" },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ email: user.email, profile: profile ?? null });
}
