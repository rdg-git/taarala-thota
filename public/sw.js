// ============================================================
// OFFLINE HELPER (service worker) for Taarala Thota · Garden of Stars
// - Keeps a copy of the app's own files on the phone so games work without internet.
// - Never stores or sends anything personal: it only handles this app's own public files.
// - A new version is downloaded quietly but only starts when the person taps "Update now".
// (build.py fills in VERSION, CORE and ASSETS)
// ============================================================
const VERSION = '45610c201455';
const CORE = ["index.html", "app.css?v=2ddc99c7", "app.js?v=a2ab286b", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png", "fonts/caveat.woff?v=a49450ff", "fonts/fraunces.woff?v=451247d5", "fonts/fraunces-italic.woff?v=ade54699"];          // the page, styles, code, fonts, icons, manifest
const ASSETS = ["img/bubble-home.avif?v=e6b994e6", "img/bubble-home.webp?v=b18aafc3", "img/bubble-l1.avif?v=14c2200b", "img/bubble-l1.webp?v=30d4ebc8", "img/bubble-l2.avif?v=f252b225", "img/bubble-l2.webp?v=da3d8aa4", "img/bubble-l3.avif?v=87e91e1a", "img/bubble-l3.webp?v=61c3f6f4", "img/bubble-stats.avif?v=c05c8992", "img/bubble-stats.webp?v=053b9bfa", "img/checkers-board.avif?v=906b253c", "img/checkers-board.webp?v=8feec79d", "img/checkers-draw.avif?v=d527563a", "img/checkers-draw.webp?v=207b2c53", "img/checkers-forfeit.avif?v=4ccbb5c8", "img/checkers-forfeit.webp?v=be67d4cd", "img/checkers-lost.avif?v=303facc3", "img/checkers-lost.webp?v=30e2da6a", "img/checkers-replace.avif?v=f176f147", "img/checkers-replace.webp?v=36848a6a", "img/checkers-stats.avif?v=e151dde7", "img/checkers-stats.webp?v=52bd0319", "img/checkers-won.avif?v=e4d34864", "img/checkers-won.webp?v=3c4397eb", "img/chess-board.avif?v=e0c3c2e4", "img/chess-board.webp?v=2f0daef1", "img/chess-entry-noresume.avif?v=f44b4599", "img/chess-entry-noresume.webp?v=1a617596", "img/chess-entry-resume.avif?v=52b7a774", "img/chess-entry-resume.webp?v=615a724b", "img/chess-side.avif?v=72730886", "img/chess-side.webp?v=376bda1b", "img/chess-stats.avif?v=d48e0f15", "img/chess-stats.webp?v=708ef9fb", "img/games.avif?v=0f5d56c9", "img/games.webp?v=fcd85c68", "img/home.avif?v=f17b7a4a", "img/home.webp?v=4341f932", "img/loved.avif?v=1ea7ccb3", "img/loved.webp?v=a7c523c4", "img/ms-board.avif?v=646531af", "img/ms-board.webp?v=3d9ce581", "img/ms-home.avif?v=5ce44206", "img/ms-home.webp?v=8c523ba1", "img/ms-stats.avif?v=ca8f86ae", "img/ms-stats.webp?v=923426e8"];      // every picture address (both formats), each with a fingerprint
const CORE_CACHE = 'tt-core-' + VERSION, ASSET_CACHE = 'tt-assets';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CORE_CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
  // no skipWaiting here: an update waits until the person taps "Update now"
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('tt-core-') && k !== CORE_CACHE) await caches.delete(k);
    const ac = await caches.open(ASSET_CACHE), keep = new Set(ASSETS.map(u => new URL(u, self.registration.scope).href));
    for (const r of await ac.keys()) if (!keep.has(r.url)) await ac.delete(r);      // drop pictures no longer used
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'skip-waiting') self.skipWaiting();
  if (m.type === 'warm' && Array.isArray(m.urls)) {        // quietly keep the pictures this phone uses, for offline play
    e.waitUntil((async () => {
      const ac = await caches.open(ASSET_CACHE);
      for (const u of m.urls.slice(0, 200)) {
        const url = new URL(u, self.registration.scope);
        if (url.origin !== self.location.origin || await ac.match(url.href)) continue;
        try { const r = await fetch(url.href); if (r.ok) await ac.put(url.href, r); } catch (err) {}
      }
    })());
  }
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;     // never touch anything outside this app
  if (req.mode === 'navigate') {                                              // the page itself: the installed copy, so updates wait for "Update now"
    e.respondWith(caches.open(CORE_CACHE).then(c => c.match('index.html')).then(r => r || fetch(req)));
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: false });
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok && url.searchParams.has('v')) { const ac = await caches.open(ASSET_CACHE); ac.put(req, r.clone()); }
    return r;
  })());
});
