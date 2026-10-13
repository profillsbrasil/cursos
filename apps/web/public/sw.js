// Bump this version when changing offline.html so installed apps refresh it.
const CACHE_NAME = "bts-pwa-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await self.registration.navigationPreload?.enable();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("bts-pwa-offline-") && key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })
  );
});

// Never cache authenticated HTML or API responses. Server-rendered pages need
// a connection; a precached page keeps offline navigation understandable.
// The page comes from the browser's own navigation preload: a fetch() from
// here leaves with Sec-Fetch-Dest: empty, and the Clerk handshake only runs
// for "document", so the login turns into a redirect loop.
self.addEventListener("fetch", (event) => {
  if (
    event.request.mode !== "navigate" ||
    event.request.method !== "GET" ||
    !self.registration.navigationPreload
  ) {
    return;
  }
  event.respondWith(
    event.preloadResponse
      .then((response) => response ?? fetch(event.request))
      .catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error())
  );
});
