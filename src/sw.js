// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// OFFLINE HELPER (service worker) for Taarala Thota · Garden of Stars
// - Keeps a copy of the app's own files on the phone so games work without internet.
// - Never stores or sends anything personal: it only handles this app's own public files.
// - A new version is downloaded quietly but only starts when the person taps "Update now".
// (build.py fills in VERSION, CORE and ASSETS)
// ============================================================
const VERSION = '__VERSION__';
const CORE = __CORE__;          // the page, styles, code, fonts, icons, manifest
const ASSETS = __ASSETS__;      // every picture address (both formats), each with a fingerprint
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
    e.respondWith((async () => {
      try {
        let r = await (await caches.open(CORE_CACHE)).match('./');
        // browsers refuse to show a page that came through a redirect, so hand over a clean copy of it
        if (r && r.redirected) r = new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers });
        return r || await fetch(req);
      } catch (err) { return fetch(req); }
    })());
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
