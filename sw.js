// ── Map Explorer Service Worker ─────────────────────────────────
// Caches the app shell so it installs, launches fast, and works
// (mostly) offline. Bump CACHE_NAME whenever you deploy a change
// to force clients to fetch the new version.

const CACHE_NAME = "map-explorer-v1";

const APP_SHELL = [
  "./app.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for the app shell, network-first for everything else
// (the ArcGIS JS API, basemap tiles, and your StoryMap iframe should
// always go to the network since they're large/dynamic/require auth)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    // External resources (ArcGIS CDN, StoryMaps, basemap tiles) — network only
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache a copy of newly-fetched same-origin files for next time
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      }).catch(() => cached);
    })
  );
});
