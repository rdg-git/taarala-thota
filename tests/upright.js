// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// "Turn Your Phone Upright" card: phones sideways only; Bubble Pop pauses underneath; disappears when upright.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  const shown = () => p.evaluate(() => getComputedStyle(document.querySelector('.upright-card')).display !== 'none');
  ok(!(await shown()), 'upright phone: no card');
  await p.evaluate(() => { localStorage.setItem('tt:bubble', JSON.stringify({ level: 3 })); MM.go('bubble-l1'); beginBubbleLevel(1); }); await p.waitForTimeout(1500);
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(300);
  ok(await shown(), 'phone turned sideways: card covers the app');
  const t1 = await p.evaluate(() => BUB.cur.t); await p.waitForTimeout(2000); const t2 = await p.evaluate(() => BUB.cur.t);
  ok(Math.abs(t2 - t1) < 0.05, 'Bubble Pop is paused while sideways (' + t1.toFixed(2) + ' -> ' + t2.toFixed(2) + ')');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(1200);
  ok(!(await shown()) && await p.evaluate(() => BUB.cur.t) > t2 + 0.5, 'upright again: card gone and the game continues');
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(300);
  ok(!(await shown()), 'tablet sideways: no card (keeps playing)');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
