// Service Worker — Casalzão Lanches Comandas
// Cache do shell do app para funcionar offline e ser instalável como PWA

const CACHE   = 'xis-comandas-v1';
const SHELL   = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  // Fontes Google (cached na primeira visita)
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap',
];

// ── Instalação: pré-cacheia o shell ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Ativação: remove caches antigos ─────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estratégia mista ──────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase, CDN externas e APIs → sempre da rede (dados em tempo real)
  if (
    url.includes('firebasedatabase.app') ||
    url.includes('firebase.google.com') ||
    url.includes('gstatic.com/firebasejs') ||
    url.includes('googleapis.com') && url.includes('token') ||
    url.includes('rawbt://')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Fontes Google → cache-first (não mudam)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return resp;
        })
      )
    );
    return;
  }

  // App shell (index.html, ícones, manifest) → cache-first, atualiza em background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});
