/*
 * STBS Admin service worker (scope /admin).
 *
 * Deliberately small: admin pages are private and must always be live, so nothing is cached except
 * the offline page, which is shown only when a page navigation cannot reach the network. It also
 * receives enquiry notifications and opens the enquiry when one is tapped.
 */
const CACHE = "stbs-admin-v2";
const OFFLINE_URL = "/admin-offline.html";
const OFFLINE_ASSETS = [OFFLINE_URL, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("stbs-admin-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  } else if (request.method === "GET" && OFFLINE_ASSETS.includes(new URL(request.url).pathname)) {
    // The offline page's own logo, from the cache when there is no network.
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
  // Everything else goes straight to the network, untouched.
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "STBS Admin", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "STBS Admin", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).pathname.startsWith("/admin") && "focus" in client) {
          return client.focus().then((focused) => ("navigate" in focused ? focused.navigate(target) : focused));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
