// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// "Best on your phone" card: laptops only; QR code holds this site's address; "Continue" closes it for this tab.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const url = 'http://localhost:8765/index.html?test=1&desk=1';
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForTimeout(700);
  const card = () => p.evaluate(() => !!document.querySelector('.desk-card'));
  ok(await card(), 'laptop: card shown');
  ok(await p.evaluate(() => /<svg[^>]*viewBox="0 0 \d+ \d+"/.test(document.querySelector('.desk-qr').innerHTML) && document.querySelector('.desk-qr path').getAttribute('d').length > 500), 'laptop: QR code drawn');
  ok(await p.evaluate(() => document.querySelector('.desk-addr').textContent.includes(location.host)), 'laptop: address shown in words');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('desk-btn')), 'Continue button has keyboard focus');
  await p.click('.desk-btn'); await p.waitForTimeout(200);
  ok(!(await card()), 'Continue closes the card');
  ok(await p.evaluate(() => sessionStorage.getItem('tt:deskok') === '1' && Object.keys(localStorage).every(k => k.startsWith('tt:'))), 'remembered for this tab only (session storage, tt: label)');
  await p.reload(); await p.waitForTimeout(600);
  ok(!(await card()), 'same tab after reload: not shown again');
  await p.click('.gear-btn').catch(() => {}); await p.waitForTimeout(300);
  ok(await p.evaluate(() => MM.cur !== 'home-view'), 'app usable on the laptop after Continue');
  const p2 = await (await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })).newPage();
  await p2.goto(url); await p2.waitForTimeout(600);
  await p2.keyboard.press('Escape'); await p2.waitForTimeout(200);
  ok(!(await p2.evaluate(() => !!document.querySelector('.desk-card'))), 'Escape key also closes it');
  // a touch-screen laptop: trackpad is the main pointer, and it also has a touch screen
  const tl = await (await b.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' })).newPage();
  await tl.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q) => /any-pointer:\s*coarse/.test(q) ? Object.assign(real(q), { matches: true }) : real(q);
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 10 });
  });
  await tl.goto(url); await tl.waitForTimeout(600);
  ok(await tl.evaluate(() => !!document.querySelector('.desk-card') && navigator.maxTouchPoints === 10), 'touch-screen laptop: card shown');
  for (const [name, w, h] of [['phone', 390, 844], ['tablet upright', 820, 1180], ['tablet sideways', 1180, 820]]) {
    const q = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block' })).newPage();
    await q.goto(url); await q.waitForTimeout(600);
    ok(!(await q.evaluate(() => !!document.querySelector('.desk-card'))), name + ': no card');
  }
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
