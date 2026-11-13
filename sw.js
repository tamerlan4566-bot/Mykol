const CACHE_NAME = "calc-vault-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./calc.css",
  "./vault.css",
  "./crypto.js",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((res) => res || fetch(e.request))
  );
});
