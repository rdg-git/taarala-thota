// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Anonymous visit counting: switch on the Privacy page and in Settings (one setting, every change confirmed),
// Global Privacy Control = never counted and the switch stays off, choice kept in backups and through "Forgot passcode",
// reset by "Erase all data", and the counting code is never loaded away from the official address.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  const errs = [], outside = []; p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { if (/cloudflareinsights/.test(r.url())) outside.push(r.url()); });
  const ev = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
  await p.goto('http://localhost:8765/index.html?test=1'); await wait(700);
  await ev(() => { Object.keys(localStorage).filter(k => k.startsWith('tt:')).forEach(k => localStorage.removeItem(k)); localStorage.setItem('tt:noticeDay', JSON.stringify('x')); });
  await p.reload(); await wait(700);
  const state = () => ev(() => [...document.querySelectorAll('.vswitch .vs-sw')].map(s => s.getAttribute('aria-checked')));
  await ev(() => MM.go('privacy')); await wait(300);
  ok(await ev(() => !!document.querySelector('#privacy .plist li:nth-child(2) .vswitch')), 'Privacy page: switch sits right under the point that explains counting');
  ok((await state()).every(x => x === 'true'), 'on by default (no Global Privacy Control)');
  await p.locator('#privacy .vs-sw').click(); await wait(200);
  ok(await ev(() => /Stop Counting/.test((document.querySelector('#privacy .panel-card') || {}).textContent || '')), 'tapping the switch asks for confirmation first');
  await p.locator('#privacy .panel-btn', { hasText: 'Cancel' }).click(); await wait(200);
  ok(await ev(() => Visits.counting()), 'Cancel changes nothing');
  await p.locator('#privacy .vs-sw').click(); await wait(200); await p.locator('#privacy .panel-btn', { hasText: 'Turn Off' }).click(); await wait(200);
  ok(await ev(() => !Visits.counting() && localStorage.getItem('tt:count') === '"off"'), 'Turn off: saved on the phone as tt:count');
  await ev(() => MM.go('settings')); await wait(300);
  ok(await ev(() => { const sh = document.querySelector('#settings .sheet'); return sh.children[0].classList.contains('supd') && sh.children[1].classList.contains('tour-card') && sh.children[2].classList.contains('vswitch'); }), 'Settings: switch under App update and the tour card, before the passcode');
  ok(await ev(() => document.querySelector('#settings .vs-sw').getAttribute('aria-checked') === 'false'), 'Settings shows the same choice (off)');
  ok(await ev(() => BACKUP_KEYS.test('tt:count')), 'the choice is included in backups');
  await ev(() => MM.Pass.forget()); ok(await ev(() => !Visits.counting()), '"Forgot passcode" keeps the choice');
  await ev(() => eraseEverything()); ok(await ev(() => Visits.counting()), '"Erase all data" resets it (counting on again)');
  ok(await ev(() => { Visits.start(); return !document.querySelector('script[src*="cloudflareinsights"]'); }) && outside.length === 0, 'never loads the counting code away from the official address');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  // Global Privacy Control
  const g = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  await g.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
  await g.goto('http://localhost:8765/index.html?test=1'); await g.waitForTimeout(700);
  const r = await g.evaluate(() => { MM.go('privacy'); const sw = document.querySelector('#privacy .vs-sw'); sw.click(); return { off: !Visits.counting(), checked: sw.getAttribute('aria-checked'), dis: sw.disabled, note: document.querySelector('#privacy .vs-note').textContent, card: !!document.querySelector('#privacy .panel-card') }; });
  ok(r.off && r.checked === 'false' && r.dis && /Global Privacy Control/.test(r.note) && !r.card, 'Global Privacy Control: never counted; switch stays off and cannot be turned on');
  // one-time welcome note
  const w = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  await w.goto('http://localhost:8765/index.html?test=1&welcome=1'); await w.waitForTimeout(400);
  await w.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('tt:')).forEach(k => localStorage.removeItem(k)); localStorage.setItem('tt:noticeDay', JSON.stringify('x')); });
  await w.reload(); await w.waitForTimeout(1200);
  const card = () => w.evaluate(() => (document.querySelector('#home-view .panel-ov.welcome .panel-card') || {}).textContent || '');
  ok(/Welcome To Taarala Thota/.test(await card()) && /count visits anonymously/.test(await card()), 'first visit: welcome note on Home explains anonymous counting');
  ok(await w.evaluate(() => !Store.get('welcome', false)), 'nothing is counted before the note is seen');
  await w.locator('#home-view .panel-btn', { hasText: 'Got It' }).click(); await w.waitForTimeout(200);
  ok(await w.evaluate(() => Store.get('welcome', false) === true && !document.querySelector('.panel-ov.welcome')), 'Got it closes it and remembers');
  await w.reload(); await w.waitForTimeout(1200);
  ok(!(await card()), 'never shown again');
  await w.evaluate(() => { eraseEverything(); localStorage.setItem('tt:noticeDay', JSON.stringify('x')); }); await w.reload(); await w.waitForTimeout(1200);
  ok(!!(await card()), 'shown again after "Erase all data"');
  await w.locator('#home-view .panel-btn', { hasText: 'Read Privacy' }).click(); await w.waitForTimeout(300);
  ok(await w.evaluate(() => MM.cur === 'privacy' && Store.get('welcome', false) === true), '"Read Privacy & Safety" opens the page and counts as seen');
  // laptop: waits for the "Best On Your Phone" card
  const l = await (await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })).newPage();
  await l.goto('http://localhost:8765/index.html?test=1&welcome=1&desk=1'); await l.waitForTimeout(1500);
  ok(await l.evaluate(() => !!document.querySelector('.desk-card') && !document.querySelector('.panel-ov.welcome')), 'laptop: phone card first, welcome waits');
  await l.locator('.desk-btn').click(); await l.waitForTimeout(1500);
  ok(await l.evaluate(() => !!document.querySelector('.panel-ov.welcome')), 'laptop: welcome appears after Continue');
  // Global Privacy Control wording
  const g2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  await g2.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
  await g2.goto('http://localhost:8765/index.html?test=1&welcome=1'); await g2.waitForTimeout(1200);
  ok(await g2.evaluate(() => /never counted/.test((document.querySelector('.panel-ov.welcome') || {}).textContent || '')), 'Global Privacy Control: welcome note says visits are never counted');
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
