// Burmese AI Calorie Tracker — service worker (Phase 4 + offline shell, 26 Nov 2026).
// Push notification တွေကို ပြတယ် + notification နှိပ်ရင် app ကို ဖွင့်တယ်။
// Offline slice (26 Nov 2026): app shell ကို cache လုပ်တယ် — လိုင်းမရှိရင်
// app ကိုယ်တိုင် ဖွင့်လို့ရအောင်။ /api/* တွေကိုတော့ cache မလုပ်ဘူး —
// လိုင်းမရှိရင် fetch ပျက်ပြီး app က localStorage cache ထဲက ဒေတာအဟောင်းကို ပြတယ်။

const CACHE_NAME = "ct-shell-v1";
const PRECACHE = ["/", "/icon-192.png", "/icon-512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {
        // precache တစ်ခုခု ပျက်ရင် install ပဲ ဆက်လုပ်တယ် — runtime cache က ဖြည့်ပေးမယ်။
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("ct-shell-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls — network only (cache မလုပ်ဘူး)။
  if (url.pathname.startsWith("/api/")) return;

  // Hashed build assets — cache-first (URL တိုင်း version ပါပြီးသား)။
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        });
      }),
    );
    return;
  }

  // စာမျက်နှာ navigation — network first, ပျက်ရင် cache က ဖွင့်ပေးတယ်။
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // ကျန်တဲ့ static ဖိုင် (icon / manifest) — cache-first။
  if (/\.(png|jpg|jpeg|svg|ico|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});

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
