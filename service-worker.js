const CACHE_NAME = "jarvis-starter-v1";
const FILES = ["./","./index.html","./style.css","./app.js","./manifest.json","./icon.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached=>cached || fetch(event.request)));
});