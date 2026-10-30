// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// "What's New" with a long list, on a small phone: the list scrolls by finger on the Home card,
// the Settings panel scrolls to show everything, and the buttons stay reachable.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const notes = Array.from({ length: 8 }, (_, i) => 'Note ' + (i + 1) + ': a longer line of text to make sure the list needs scrolling on a small phone screen.');
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(900);
  await p.evaluate((nt) => {
    localStorage.setItem('tt:noticeDay', JSON.stringify('x'));
    Object.defineProperty(navigator.serviceWorker, 'controller', { get: () => ({}) });
    MM.PWA.reg = { waiting: { postMessage: (m, ports) => ports && ports[0].postMessage({ notes: nt }) } };
    document.querySelectorAll('.panel-ov').forEach(x => x.remove()); SCREENS['home-view'].panel = null; showUpdateCard();
  }, notes);
  await p.waitForTimeout(300);
  await p.locator('#home-view .panel-btn', { hasText: 'What' }).click(); await p.waitForTimeout(500);
  const swipe = async (sel) => {
    const r = await p.locator(sel).boundingBox(), x = r.x + r.width / 2, y1 = r.y + r.height * 0.8, y2 = r.y + r.height * 0.2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y1 }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y1 + (y2 - y1) * i / 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500);
  };
  const box = '#home-view .wn-box';
  ok(await p.evaluate((s) => { const e = document.querySelector(s); return e.scrollHeight > e.clientHeight; }, box), 'Home card: long list is taller than its box');
  await swipe(box);
  ok(await p.evaluate((s) => document.querySelector(s).scrollTop > 20, box), 'Home card: finger swipe scrolls the list');
  ok(await p.evaluate(() => [...document.querySelectorAll('#home-view .panel-btn')].every(bt => { const r = bt.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })), 'Home card: Later and Update Now stay on screen');
  await p.evaluate(() => { document.querySelectorAll('.panel-ov').forEach(x => x.remove()); SCREENS['home-view'].panel = null; MM.go('settings'); }); await p.waitForTimeout(400);
  await p.evaluate(() => { const s = document.querySelector('#settings .sheet'); s.scrollTop = 1e6; }); await p.waitForTimeout(200);
  await p.locator('#settings .supd .sbtn', { hasText: 'What' }).click(); await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelector('#settings .sheet').scrollTop = 0; }); await p.waitForTimeout(200);
  for (let i = 0; i < 6; i++) await swipe('#settings .sheet');
  ok(await p.evaluate(() => { const s = document.querySelector('#settings .sheet'); return s.scrollTop > 100 && s.scrollTop + s.clientHeight >= s.scrollHeight - 4; }), 'Settings: finger swipes scroll the panel to the end');
  ok(await p.evaluate(() => { const li = [...document.querySelectorAll('#settings .supd .wn-list li')], last = li[li.length - 1].getBoundingClientRect(), s = document.querySelector('#settings .sheet').getBoundingClientRect(); return li.length === 8 && last.bottom <= s.bottom + 1; }), 'Settings: all 8 notes can be reached by scrolling');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
