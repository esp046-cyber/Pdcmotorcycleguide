/* PDC Moto 2026 - Service Worker
 * Scope: /Pdcmotorcycleguide/
 * - App shell precaching (tolerant: one missing file never breaks install)
 * - Stale-While-Revalidate for same-origin assets
 * - Network-First for navigations with offline.html fallback
 * - Update flow: page posts {type:'SKIP_WAITING'} after user taps "Update now"
 * - Google TTS / third-party API calls are never cached
 */
const VERSION = 'v1.0.0';
const SHELL_CACHE = `pdc-moto-shell-${VERSION}`;
const RUNTIME_CACHE = `pdc-moto-runtime-${VERSION}`;

// Paths are resolved against the SW scope, so they work under /Pdcmotorcycleguide/
const SCOPE = self.registration.scope; // e.g. https://esp046-cyber.github.io/Pdcmotorcycleguide/
const url = (path) => new URL(path, SCOPE).toString();

const SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './favicon.svg',
  './favicon.ico',
  './apple-touch-icon.png',
  './css/styles.css',
  './js/app.js',
  './js/voice-engine.js',
  './js/pwa-handler.js',
  './js/icon-generator.js',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-16x16.png',
  './icons/favicon-32x32.png',
  './screenshots/screenshot-narrow.png',
  './screenshots/screenshot-wide.png'
].map(url);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL_ASSETS.map((asset) =>
          cache.add(new Request(asset, { cache: 'reload' })).catch((err) => {
            console.warn('[SW] Skipped precache:', asset, err && err.message);
          })
        )
      )
    )
  );
  // No skipWaiting() here: the page shows an update banner and asks first.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('pdc-moto-') && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch (e) { /* ignore */ }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'GET_VERSION' && event.source) {
    event.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const reqUrl = new URL(req.url);

  // Never intercept cross-origin calls (Google TTS API, fonts, analytics, etc.)
  if (reqUrl.origin !== self.location.origin) return;

  // Only handle requests inside our scope
  if (!reqUrl.href.startsWith(SCOPE)) return;

  // Navigations: Network-First with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  // Everything else: Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(event));
});

async function networkFirstNavigation(event) {
  const req = event.request;
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const fresh = preload || (await fetch(req));
    if (fresh && fresh.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached =
      (await caches.match(req, { ignoreSearch: true })) ||
      (await caches.match(url('./index.html'))) ||
      (await caches.match(url('./')));
    if (cached) return cached;
    const offline = await caches.match(url('./offline.html'));
    return (
      offline ||
      new Response('You are offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    );
  }
}

async function staleWhileRevalidate(event) {
  const req = event.request;
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = (await caches.match(req)) || (await cache.match(req));

  const networkFetch = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') {
        cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkFetch);
    return cached;
  }

  const fresh = await networkFetch;
  if (fresh) return fresh;

  // Last resort for images: tiny transparent SVG so layouts never break
  if (req.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  return new Response('', { status: 504, statusText: 'Offline' });
}
