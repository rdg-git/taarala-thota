// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// OFFLINE HELPER (service worker) for Taarala Thota · Garden of Stars
// - Keeps a copy of the app's own files on the phone so games work without internet.
// - Never stores or sends anything personal: it only handles this app's own public files.
// - A new version is downloaded quietly but only starts when the person taps "Update now".
// - Carries this version's "What's new" notes and hands them to the page when asked.
// (build.py fills in VERSION, CORE, ASSETS and NOTES)
// ============================================================
const VERSION = '8262bab942f7';
const CORE = ["./", "app.css?v=90dcf4e2", "app.js?v=1d370219", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png", "fonts/caveat.woff?v=a49450ff", "fonts/fraunces.woff?v=451247d5", "fonts/fraunces-italic.woff?v=ade54699"];          // the page, styles, code, fonts, icons, manifest
const ASSETS = ["img/bubble-home.avif?v=3f549fc7", "img/bubble-home.webp?v=d113975c", "img/bubble-l1.avif?v=5508c812", "img/bubble-l1.webp?v=ac253054", "img/bubble-l2.avif?v=648c8635", "img/bubble-l2.webp?v=bb3a7435", "img/bubble-l3.avif?v=1f2ca55d", "img/bubble-l3.webp?v=09cf1fcb", "img/bubble-stats.avif?v=d5b31da3", "img/bubble-stats.webp?v=de6d6abf", "img/checkers-board.avif?v=f98ba8bc", "img/checkers-board.webp?v=84129473", "img/checkers-draw.avif?v=37c1ff94", "img/checkers-draw.webp?v=1e7817c6", "img/checkers-forfeit.avif?v=9ed47b73", "img/checkers-forfeit.webp?v=0408982b", "img/checkers-lost.avif?v=b2669767", "img/checkers-lost.webp?v=3e8fd28c", "img/checkers-replace.avif?v=c660f4bc", "img/checkers-replace.webp?v=be2d5b2f", "img/checkers-stats.avif?v=ce4d0755", "img/checkers-stats.webp?v=593e1c5b", "img/checkers-won.avif?v=92f8b085", "img/checkers-won.webp?v=246f5020", "img/chess-board.avif?v=8b78d3be", "img/chess-board.webp?v=69248f23", "img/chess-entry-noresume.avif?v=e567d01f", "img/chess-entry-noresume.webp?v=d2104577", "img/chess-entry-resume.avif?v=78bcc9c0", "img/chess-entry-resume.webp?v=e712fb23", "img/chess-side.avif?v=560cc06e", "img/chess-side.webp?v=2210eff0", "img/chess-stats.avif?v=96e9ef0c", "img/chess-stats.webp?v=07a558c4", "img/games.avif?v=de966ab8", "img/games.webp?v=d19d8c12", "img/home.avif?v=e56907c0", "img/home.webp?v=aab1c2e4", "img/loved.avif?v=e9dab910", "img/loved.webp?v=12a30f2a", "img/ms-board.avif?v=77e09ac9", "img/ms-board.webp?v=59d3ec71", "img/ms-home.avif?v=2bef222e", "img/ms-home.webp?v=e6988136", "img/ms-stats.avif?v=ad3bbc63", "img/ms-stats.webp?v=e3ca83b5"];      // every picture address (both formats), each with a fingerprint
const NOTES = [{"release": "2026-10-28c", "notes": ["Clearer advice on the Privacy & safety page about keeping your data safe.", "The Privacy & safety page now explains the one-time picture download that lets games work offline.", "You can zoom with two fingers on the Settings and Privacy & safety pages."]}, {"release": "2026-10-28b", "notes": ["Settings now locks itself as soon as you leave it."]}, {"release": "2026-10-28", "notes": ["All Bubble Pop levels are open. Earn a gold star for each level you complete.", "See what's new before you update.", "When an update is ready, a small gold “Update” button appears at the top of the screen.", "Update anytime from Settings, even after tapping Later.", "The app now reopens reliably every time.", "On a laptop, a card offers a QR code to open the app on your phone.", "Small wording updates on the Privacy & safety page."]}, {"release": "2026-10-27", "notes": ["A maker's seal on Home and a signature on the Privacy & safety page.", "The phone turned sideways shows a calm 'turn upright' card, and Bubble Pop pauses.", "Hidden Comets: tiles on the Gentle level now open with a single tap."]}, {"release": "2026-10-23", "notes": ["First complete version: Bubble Pop, Hidden Comets, Chess and International Checkers, with beginner levels.", "Loved Ones: one tap opens WhatsApp to the people you choose. Settings protected by a passcode.", "Password-locked backups, offline play, and no sign-in, ads or tracking."]}];        // "What's new" for every release, newest first (from src/whats_new.json)
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
  if (m.type === 'notes' && e.ports && e.ports[0]) e.ports[0].postMessage({ notes: NOTES });   // "What's new" for the update card
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
