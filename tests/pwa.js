// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Step 5 checks: installable app, offline play, "new version" card (Home only, never forced), data kept, button sizes.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
const SW = path.join(__dirname, '..', 'public', 'sw.js');
(async () => {
  const orig = fs.readFileSync(SW, 'utf8');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const ev = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
    await p.goto('http://localhost:8765/index.html?test=1'); await wait(1500);
    ok(await ev(() => !!document.querySelector('link[rel=manifest]') && !!document.querySelector('link[rel=apple-touch-icon]')), 'page offers the app description and icon');
    const man = await ev(async () => (await fetch('manifest.webmanifest')).json());
    ok(man.short_name === 'Taarala Thota' && man.display === 'standalone' && man.icons.length === 3, 'app description: name, full-screen, icons');
    ok(await ev(async () => (await fetch('icons/icon-512.png')).ok), 'icons are reachable');
    ok(await ev(async () => !!(await navigator.serviceWorker.ready).active), 'offline helper installed');
    await p.reload(); await wait(1500);
    ok(await ev(() => !!navigator.serviceWorker.controller), 'offline helper looks after the app');
    await ev(() => { localStorage.setItem('tt:contacts', JSON.stringify([{ id: 'a', name: 'Test Star', phone: '+10000000001' }])); localStorage.setItem('tt:chess:totals', JSON.stringify({ won: 2 })); });
    await wait(5000);                                  // pictures are kept quietly in the background
    const cached = await ev(async () => { const c = await caches.open('tt-assets'); return (await c.keys()).length; });
    ok(cached >= 20, 'pictures kept for offline play (' + cached + ')');
    // offline
    await ctx.setOffline(true);
    await p.reload(); await wait(1200);
    ok(await ev(() => MM.cur === 'home-view'), 'with no internet, the app still opens');
    for (const id of ['games', 'chs-entry-n', 'bubble-home', 'ms-home', 'contact-view']) { await ev((i) => MM.go(i), id); await wait(500); }
    const broken = await ev(() => Object.values(SCREENS).filter(S => S.loaded).map(S => S.art.querySelector('img.pic')).filter(i => i && !(i.complete && i.naturalWidth > 0)).length);
    ok(broken === 0, 'with no internet, every visited picture shows');
    ok(await ev(() => document.querySelectorAll('#contact-view .medallion').length === 1), 'with no internet, saved contacts are there');
    await ctx.setOffline(false);
    await ev(() => MM.go('settings')); await wait(300);
    ok(await ev(() => /up to date/.test(document.querySelector('#settings .supd').textContent) && !document.querySelector('#settings .supd button') && document.querySelector('#settings .sheet').firstChild.classList.contains('supd')), 'Settings: "up to date" line at the top, nothing to press');
    await ev(() => MM.go('home-view'));
    // a new version is published
    fs.writeFileSync(SW, orig.replace(/const VERSION = '[^']+'/, "const VERSION = 'test-new-version'")
      .replace('const NOTES = [', 'const NOTES = [{"release": "2099-01-01", "notes": ["Test note for a newer release."]}, '));
    await ev(() => MM.go('chs-entry-n')); await wait(300);
    await ev(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); }); await wait(2500);
    ok(await ev(() => MM.PWA.updateReady), 'new version found and downloaded in the background');
    ok(await ev(() => !document.querySelector('.panel-card')), 'no update card on a game screen');
    await ev(() => MM.go('home-view')); await wait(1200);
    ok(await ev(() => /new version is ready/.test((document.querySelector('#home-view .panel-card') || {}).textContent || '')), 'update card shows on Home');
    await ev(() => MM.go('settings')); await wait(300);
    ok(await ev(() => !!document.querySelector('#settings .supd') && /New update available/.test(document.querySelector('#settings .supd').textContent) && document.querySelector('#settings .sheet').firstChild.classList.contains('supd') && ![...document.querySelectorAll('#settings .supd .sbtn')].find(b => b.textContent === 'Update now').disabled), 'Settings: Update now at the top, before the passcode');
    ok(await ev(() => [...document.querySelectorAll('#settings .supd .sbtn')].some(b => b.textContent === 'Update later')), 'Settings: Update later is offered too');
    await ev(() => MM.go('home-view')); await wait(1200);
    await p.locator('#home-view .panel-btn', { hasText: 'Later' }).click(); await wait(300);
    ok(await ev(() => /update anytime from Settings/.test((document.querySelector('#home-view .toast') || {}).textContent || '')), 'Later: says you can update anytime from Settings');
    await ev(() => { MM.go('games'); MM.go('home-view'); }); await wait(1200);
    ok(await ev(() => !document.querySelector('#home-view .panel-card')), 'Later: not shown again in this visit');
    ok(await ev(async () => (await caches.keys()).some(k => !/test-new-version/.test(k) && k.startsWith('tt-core-'))), 'old version keeps running until the person chooses');
    await p.reload(); await wait(1500);
    await p.locator('#home-view .panel-btn', { hasText: 'What' }).click(); await wait(600);
    const wn = await ev(() => [...document.querySelectorAll('#home-view .wn-list li')].map(li => li.textContent));
    const expected = ['Test note for a newer release.'];   // only releases newer than the one running
    ok(wn.length === expected.length && wn.every((t, i) => t === expected[i]), "What's New lists the new version's notes (" + wn.length + ')');
    ok(await ev(() => !!document.querySelector('#home-view .panel-card') && ![...document.querySelectorAll('#home-view .panel-btn')].some(b => /new/.test(b.textContent))), "after reading What's New, the card stays open with Later and Update now");
    await p.locator('#home-view .panel-btn', { hasText: 'Update now' }).click();
    await p.waitForLoadState('load'); await wait(2000);
    ok(await ev(async () => (await caches.keys()).includes('tt-core-test-new-version')), 'Update now: the new version is running');
    ok(await ev(() => JSON.parse(localStorage.getItem('tt:contacts')).length === 1 && JSON.parse(localStorage.getItem('tt:chess:totals')).won === 2), 'after updating, contacts and stats are untouched');
    ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
    await ctx.close();
    // finger-sized buttons on a short screen (iPhone Safari with address bar)
    const c2 = await b.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true }); const q = await c2.newPage();
    await q.goto('http://localhost:8765/index.html?test=1'); await q.waitForTimeout(800);
    await q.evaluate(() => MM.go('games')); await q.waitForTimeout(300);
    const r = await q.evaluate(() => ['.wbtn.home', '.wbtn.back', '.music-btn'].map(s => document.querySelector('#games ' + s).getBoundingClientRect()).map(x => ({ l: x.left, r: x.right, w: x.width })));
    ok(r.every(x => x.w >= 44), 'Home, Back and music buttons are at least 44 px on short screens (' + r.map(x => Math.round(x.w)).join(', ') + ')');
    ok(r[0].r <= r[1].l, 'Home and Back do not overlap');
    await c2.close();
  } finally { fs.writeFileSync(SW, orig); await b.close(); }
  console.log('RESULT', n - f, 'passed', f, 'failed');
})();
