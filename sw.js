// Service Worker — Calculadora Dividendos BEST
// Versão do cache — incremente para forçar atualização
const CACHE_NAME = 'dividendos-best-v3';

// Arquivos para cache offline
const ASSETS = [
  '/calculadora-dividendos/',
  '/calculadora-dividendos/index.html',
  '/calculadora-dividendos/manifest.json',
  '/calculadora-dividendos/icon-192.png',
  '/calculadora-dividendos/icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// ── Instalação: faz cache de todos os assets ──────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets...');
      // Cache local assets obrigatoriamente, externos com fallback
      const localAssets = ['/calculadora-dividendos/', '/calculadora-dividendos/index.html', '/calculadora-dividendos/manifest.json', '/calculadora-dividendos/icon-192.png', '/calculadora-dividendos/icon-512.png'];
      const extAssets = [
        'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;500;600&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      ];
      return cache.addAll(localAssets).then(() =>
        Promise.allSettled(extAssets.map(url =>
          fetch(url).then(r => cache.put(url, r)).catch(() => {})
        ))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Ativação: limpa caches antigos ───────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first para assets, network-first para resto
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requests não-GET
  if (event.request.method !== 'GET') return;

const url = new URL(event.request.url);

if (url.origin !== location.origin) {
  return;
}

  // Estratégia cache-first para fontes e libs externas
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

  // Estratégia network-first para arquivos locais (sempre tenta atualizar)
  event.respondWith(
    fetch(event.request)
  .then(response => {

    if (
      event.request.url.startsWith('http') &&
      response.status === 200
    ) {
      const clone = response.clone();

      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, clone);
      });
    }

    return response;
  })
      .catch(() => caches.match(event.request))
  );
});
