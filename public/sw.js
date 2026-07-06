/* Service Worker für Alien Perimeter (PWA) */
const VERSION = 'v2';
const SHELL_CACHE = `ap-shell-${VERSION}`;
const RUNTIME_CACHE = `ap-runtime-${VERSION}`;
const TILE_CACHE = 'ap-tiles';
const MAX_TILES = 400;

/**
 * Basis-Pfad aus dem Registration-Scope ableiten, damit die PWA sowohl
 * unter "/" als auch unter einem Unterpfad (GitHub Pages:
 * "/Alien-Perimeter/") funktioniert.
 */
const BASE = new URL(self.registration.scope).pathname;

const SHELL_URLS = [
  BASE,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
  `${BASE}icons/apple-touch-icon.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = [SHELL_CACHE, RUNTIME_CACHE, TILE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxEntries);
  }
}

/** Karten-Tiles: cache-first mit Obergrenze, damit die Karte offline bleibt */
async function tileStrategy(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    cache.put(request, response.clone());
    trimCache(TILE_CACHE, MAX_TILES);
  }
  return response;
}

/** App-Shell-Navigation: network-first, offline aus dem Cache */
async function navigationStrategy(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(BASE, response.clone());
    return response;
  } catch {
    const cached = await caches.match(BASE);
    if (cached) return cached;
    throw new Error('offline');
  }
}

/** Statische Assets (JS-Bundles, Bilder): stale-while-revalidate */
async function assetStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }
  if (url.hostname.endsWith('basemaps.cartocdn.com')) {
    event.respondWith(tileStrategy(request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(assetStrategy(request));
  }
});
