/**
 * sw.js — PsikoTarama-Simülasyon service worker.
 * Cache-first app shell: the whole game is static, so after the first
 * visit it loads instantly and works fully offline.
 *
 * IMPORTANT: bump CACHE_NAME on every release so clients pick up new files.
 */

const CACHE_NAME = "psikotarama-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/GameEngine.js",
  "./js/sound.js",
  "./js/app.js",
  "./data/patients.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache same-origin responses on the fly (fonts/pages added later).
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
