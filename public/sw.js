/*
 * Cardinal OS service worker — intentionally minimal.
 *
 * Its job is to make the app installable (Chrome/Android require a SW with a
 * fetch handler before they offer the install prompt) WITHOUT caching app
 * pages. Cardinal is an authenticated, data-heavy app, so precaching server
 * HTML would serve stale data and leak one user's view to the next. We stay
 * strictly network-first and only fall back to a tiny offline notice when the
 * network is genuinely unreachable for a navigation.
 */

const OFFLINE_URL = "/offline.html";
const CACHE = "cardinal-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle top-level navigations; everything else (API calls, assets,
  // auth) goes straight to the network untouched.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL)),
  );
});
