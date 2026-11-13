const C = "sv-2026.11.13c-f24fce71";
const FILES = ["./", "app.js", "base.css", "data/arsheya.json", "data/arsheyakalpa.json", "data/chandogya.json", "data/devatadhyaya.json", "data/index.json", "data/mantrabrahmana.json", "data/naradiya.json", "data/purvarcika.json", "data/samavidhana.json", "data/samhitopanishad.json", "data/shadvimsha.json", "data/tandya.json", "data/uttararcika.json", "data/vamsha.json", "fonts/deva.woff2", "fonts/grantha-2.woff2", "fonts/sama-deva.woff2", "fonts/tamil.woff2", "fonts/ui.woff2", "icons/favicon-64.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/icon-mono-512.png", "index.html", "manifest.webmanifest", "style.css", "translit.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES.map(f => new Request(f, {cache: "no-cache"}))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(e.request, cp)); return res; }).catch(() => caches.match("./"))));
});
