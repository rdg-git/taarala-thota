// Steady screen: back gesture stays inside the app, no long-press menus or dragging, faster bubbles.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  const ev = (fn, a) => p.evaluate(fn, a), url = p.url();
  await ev(() => MM.go('games')); await ev(() => MM.go('chs-entry-n'));
  await p.goBack({ waitUntil: 'commit' }).catch(() => {}); await p.waitForTimeout(400);
  ok(await ev(() => MM.cur) === 'games' && p.url() === url, 'back swipe from Chess goes back one screen, inside the app');
  await p.goBack({ waitUntil: 'commit' }).catch(() => {}); await p.waitForTimeout(400);
  ok(await ev(() => MM.cur) === 'home-view' && p.url() === url, 'back again: Home, still inside the app');
  await p.goBack({ waitUntil: 'commit' }).catch(() => {}); await p.waitForTimeout(400);
  ok(p.url() === url && await ev(() => /Leave Taarala Thota/.test((document.querySelector('#home-view .panel-card') || {}).textContent || '')), 'back on Home asks before leaving');
  await p.locator('#home-view .panel-btn', { hasText: 'Stay' }).click(); await p.waitForTimeout(200);
  ok(await ev(() => !document.querySelector('#home-view .panel-card')) && p.url() === url, 'Stay keeps the app open');
  await ev(() => MM.go('settings')); await p.waitForTimeout(200);
  const prevented = await ev(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('#home-view .art').dispatchEvent(e); return e.defaultPrevented; });
  const inputOk = await ev(() => { const i = document.querySelector('#settings input'); const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); i.dispatchEvent(e); return !e.defaultPrevented; });
  ok(prevented && inputOk, 'long-press menus are blocked, except inside typing boxes');
  ok(await ev(() => getComputedStyle(document.querySelector('.scr')).touchAction === 'none' && getComputedStyle(document.querySelector('#settings .sheet')).touchAction === 'pan-y'), 'screens cannot be dragged or pinched; panels can still scroll');
  ok(await ev(() => MM.BUB.L[1].dur === 6 && MM.BUB.L[2].dur === 4.8 && MM.BUB.L[3].dur === 3.7 && MM.BUB.SPAWN === 0.75), 'bubbles are about 50% faster on every level');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
