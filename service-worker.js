/* Mango Mame — mode hors ligne.
   La page d'accueil est toujours redemandée à Internet en premier (pour que chaque mise à jour arrive tout de suite),
   et la copie de l'appareil ne sert que s'il n'y a pas de réseau. Les dessins et icônes sont gardés dans l'appareil.
   Pour publier une nouvelle version de l'application, changez le numéro dans VERSION ci-dessous. */
const VERSION = "v13";
const CACHE = "mango-mame-atelier-" + VERSION;
const FICHIERS = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  // cache: "reload" = on ignore la mémoire du navigateur, pour ne jamais ranger une ancienne version
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(FICHIERS.map((u) => c.add(new Request(u, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    const anciens = noms.filter((n) => n.startsWith("mango-mame-atelier-") && n !== CACHE);
    // passage unique depuis les anciennes versions (v12 et avant) : leurs pages ouvertes sont rechargées une fois
    const ancienne = anciens.some((n) => { const m = n.match(/v(\d+)$/); return m && +m[1] < 13; });
    await Promise.all(anciens.map((n) => caches.delete(n)));
    await self.clients.claim();
    if (ancienne) {
      const pages = await self.clients.matchAll({ type: "window" });
      pages.forEach((p) => { try { p.navigate(p.url); } catch (err) {} });
    }
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // la page elle-même : Internet d'abord (4 s maximum), puis la copie de l'appareil
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const rep = await Promise.race([
          fetch("./index.html", { cache: "no-cache" }),
          new Promise((_, ko) => setTimeout(() => ko(new Error("lent")), 4000))
        ]);
        if (rep && rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copie));
          return rep;
        }
      } catch (err) { /* hors ligne ou trop lent : on prend la copie */ }
      return (await caches.match("./index.html")) || fetch(req);
    })());
    return;
  }
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((rep) => {
      if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
      return rep;
    }))
  );
});
