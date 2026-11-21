// Burmese AI Calorie Tracker — service worker (Phase 4).
// Push notification တွေကို ပြတယ် + notification နှိပ်ရင် app ကို ဖွင့်တယ်။
// Fetch caching မလုပ်ဘူး — app က Online Only ဖြစ်ပြီး ဒေတာကို
// client cache နဲ့ စီမံထားပြီးသားမို့ SW က push အတွက်ပဲ။

self.addEventListener("push", (event) => {
  let data = {
    title: "Burmese AI Calorie Tracker",
    body: "ထမင်းစားချိန် ရောက်ပြီ 🍜",
    url: "/",
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload JSON မဟုတ်ရင် default စာသား သုံးတယ်။
  }
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
