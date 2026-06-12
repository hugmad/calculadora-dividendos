// Service Worker — Calculadora Dividendos BEST
const CACHE_NAME = 'dividendos-best-v7';

const LOCAL_ASSETS = [
  '/calculadora-dividendos/',
  '/calculadora-dividendos/index.html',
  '/calculadora-dividendos/style.css',
  '/calculadora-dividendos/app.js',
  '/calculadora-dividendos/manifest.json',
  '/calculadora-dividendos/icon-192.png',
  '/calculadora-dividendos/icon-512.png'
];

const EXT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// ── Instalação ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(LOCAL_ASSETS).then(() =>
        Promise.allSettled(
          EXT_ASSETS.map(url =>
            fetch(url).then(r => cache.put(url, r)).catch(() => {})
          )
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// ── Ativação: limpa caches antigos ───────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignora esquemas não suportados (chrome-extension, etc)
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Ignora APIs externas de dados — nunca cachear
  if (url.hostname.includes('anthropic') || url.hostname.includes('brapi.dev')) return;

  // Cache-first para fontes e libs externas
  if (url.hostname.includes('googleapis') || url.hostname.includes('cloudflare') || url.hostname.includes('gstatic')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Network-first para assets locais
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
