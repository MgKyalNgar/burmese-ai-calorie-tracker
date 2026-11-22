import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { configureWebPush, sendPush, type PushSubscriptionJson } from "@/lib/push";

// Reminder ပို့တဲ့ endpoint — Cron (ပြင်ပ scheduler) ကပဲ ခေါ်တယ်။
// POST { kind: "breakfast" | "lunch" | "dinner" | "evening" }
// Header: Authorization: Bearer <CRON_SECRET>
// Logic: reminders_enabled ဖွင့်ထားတဲ့ user တိုင်း —
// - ထမင်းချိန် (breakfast/lunch/dinner): အဲဒီ အစာ ဒီနေ့ မမှတ်ရသေးရင် ပို့တယ်။
// - ညနေ (evening): ဒီနေ့ ဘာမှ မမှတ်ရသေးရင် သတိပေးတယ်
//   (မနေ့က မှတ်ထားရင် streak ပျက်တော့မယ် လို့ ပါထည့်တယ်)၊
//   တစ်ခုခု မှတ်ထားပြီး ညစာ မမှတ်ရသေးရင် ညစာ သတိပေးတယ်။
// တစ်နေ့တည်း တစ်မျိုး တစ်ခါပဲ ပို့တယ် (reminder_logs unique)။

type Kind = "breakfast" | "lunch" | "dinner" | "evening";

const KINDS: Kind[] = ["breakfast", "lunch", "dinner", "evening"];

const MEAL_TYPE: Record<Exclude<Kind, "evening">, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
};

function todayYangon(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00+06:30`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Yangon" });
}

function inferKind(): Kind {
  const h = Number(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Yangon",
      hour: "numeric",
      hour12: false,
    }),
  );
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "evening";
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let kind: Kind = inferKind();
  try {
    const body = await req.json();
    if (typeof body?.kind === "string" && KINDS.includes(body.kind)) {
      kind = body.kind as Kind;
    }
  } catch {
    // body မပါရင် အချိန်နဲ့ ခန့်မှန်းတယ်။
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role key မရှိဘူး — Vercel env စစ်ပေးပါ။" },
      { status: 500 },
    );
  }
  if (!configureWebPush()) {
    return NextResponse.json(
      { error: "VAPID keys မရှိဘူး — Vercel env စစ်ပေးပါ။" },
      { status: 500 },
    );
  }

  const today = todayYangon();
  const yesterday = addDaysIso(today, -1);

  // Reminder ဖွင့်ထားတဲ့ user တွေ။
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, reminders_enabled")
    .eq("reminders_enabled", true);
  if (profileError) {
    return NextResponse.json(
      { error: "User တွေ ဆွဲလို့ မရပါ။" },
      { status: 500 },
    );
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;

    // ဒီနေ့ မှတ်ထားတဲ့ အစာတွေ + မနေ့က မှတ်ထားလား (streak အတွက်)။
    const [{ data: mealsToday }, { data: mealsYesterday }, { data: subs }] =
      await Promise.all([
        admin
          .from("meals")
          .select("meal_type")
          .eq("user_id", userId)
          .eq("logged_date", today)
          .eq("status", "confirmed"),
        admin
          .from("meals")
          .select("id")
          .eq("user_id", userId)
          .eq("logged_date", yesterday)
          .eq("status", "confirmed")
          .limit(1),
        admin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", userId),
      ]);

    const typesToday = new Set(
      (mealsToday ?? []).map((m) => m.meal_type as string),
    );
    const hadMealYesterday = (mealsYesterday ?? []).length > 0;
    const subscriptions = (subs ?? []) as {
      endpoint: string;
      p256dh: string;
      auth: string;
    }[];
    if (subscriptions.length === 0) {
      skipped += 1;
      continue;
    }

    // ပို့သင့်လား ဆုံးဖြတ်တယ်။
    let payload: { title: string; body: string; url: string } | null = null;
    if (kind === "evening") {
      if (typesToday.size === 0) {
        payload = {
          title: "ဒီနေ့ ဘာမှ မမှတ်ရသေးဘူး 😢",
          body: hadMealYesterday
            ? "မနက်ဖြန် streak ပျက်တော့မယ် — တစ်ခုခု မှတ်လိုက်ပါ"
            : "ဒီနေ့ တစ်ခုခု စားပြီးရင် မှတ်လိုက်ပါ 🍜",
          url: "/add",
        };
      } else if (!typesToday.has("dinner")) {
        payload = {
          title: "ညစာ မမှတ်ရသေးဘူး 🍜",
          body: "ဒီနေ့ ညစာ မမှတ်ရသေးဘူး — ပုံရိုက်ပြီး မှတ်လိုက်ပါ",
          url: "/add",
        };
      }
    } else if (!typesToday.has(MEAL_TYPE[kind])) {
      const label =
        kind === "breakfast"
          ? "မနက်စာ"
          : kind === "lunch"
            ? "နေ့လည်စာ"
            : "ညစာ";
      payload = {
        title: `${label} မမှတ်ရသေးဘူး 🍜`,
        body: `ဒီနေ့ ${label} မမှတ်ရသေးဘူး — ပုံရိုက်ပြီး မှတ်လိုက်ပါ`,
        url: "/add",
      };
    }
    if (!payload) {
      skipped += 1;
      continue;
    }

    // တစ်နေ့တည်း ထပ်မပို့အောင် အရင် မှတ်တယ် — ရှိနေရင် ကျော်တယ်။
    // title/body ကိုလည်း တစ်ခါတည်း သိမ်းထားတယ် — app ထဲက ခေါင်းလောင်းမှာ
    // ပို့ပြီးသား စာသားအတိုင်း ပြန်ပြလို့ရအောင်။
    let logError = (
      await admin.from("reminder_logs").insert({
        user_id: userId,
        kind,
        logged_date: today,
        title: payload.title,
        body: payload.body,
      })
    ).error;
    if (
      logError &&
      /title|body/.test(String(logError.message ?? "")) &&
      String(logError.code ?? "") !== "23505"
    ) {
      // title/body ကော်လံ မရှိသေးရင် (notifications SQL မရ run ရသေး) —
      // ကော်လံ အဟောင်းတွေနဲ့ပဲ မှတ်ပြီး ဆက်ပို့တယ် (ခေါင်းလောင်းက kind ကနေ
      // စာသား ပြန်ထုတ်တယ်)။ ပို့တာကို ဘယ်တော့မှ မရပ်စေနဲ့။
      logError = (
        await admin.from("reminder_logs").insert({
          user_id: userId,
          kind,
          logged_date: today,
        })
      ).error;
    }
    if (logError) {
      // 23505 = unique violation → ဒီနေ့ ပို့ပြီးသား။
      skipped += 1;
      continue;
    }

    for (const sub of subscriptions) {
      const subJson: PushSubscriptionJson = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await sendPush(subJson, payload);
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Subscription သေသွားပြီ — ဖျက်တယ်။
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", sub.endpoint);
        }
        failed += 1;
      }
    }
  }

  return NextResponse.json({ kind, date: today, sent, skipped, failed });
}
