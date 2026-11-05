/* Mango Mame — mode hors ligne.
   Au premier chargement (avec Internet), l'application est copiée dans l'appareil.
   Ensuite elle s'ouvre sans Internet. Pour publier une nouvelle version de l'application,
   changez le numéro dans VERSION ci-dessous : les appareils se mettent alors à jour à leur prochaine connexion. */
const VERSION = "v5";
const CACHE = "mango-mame-atelier-" + VERSION;
const FICHIERS = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n.startsWith("mango-mame-atelier-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // la page elle-même : toujours depuis la copie de l'appareil si elle existe (démarrage instantané, sans Internet)
  if (req.mode === "navigate") {
    e.respondWith(caches.match("./index.html").then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((rep) => {
      if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
      return rep;
    }))
  );
});
