const CACHE_NAME = "carlocation-v2";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/dashboard",
  "/fleet",
  "/customers",
  "/rentals",
  "/maintenance",
  "/notifications",
  "/invoices",
  "/reports",
  "/settings",
  "/tracking",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }),
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.url.includes("/api/") || request.url.includes("supabase")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503 });
        });
      }),
  );
});

// Push Notification Handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || "CarLocation";
  const options = {
    body: data.body || "لديك تنبيه جديد",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    tag: data.tag || "carlocation-notification",
    data: data.url || "/notifications",
    vibrate: [100, 50, 100],
    actions: [
      { action: "open", title: "فتح" },
      { action: "dismiss", title: "تجاهل" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
