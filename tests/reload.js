// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Once the offline helper is installed, opening the app again must work, online and offline,
// even though the host redirects index.html to / (this once showed "can't reach this page").
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await c.newPage();
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'offline helper installed');
  const home = () => p.evaluate(() => !!document.querySelector('.gear-btn'));
  for (const u of ['http://localhost:8765/', 'http://localhost:8765/index.html']) {
    let good = false; try { await p.goto(u); await p.waitForTimeout(600); good = await home(); } catch (e) {}
    ok(good, 'opens again from ' + u.replace('http://localhost:8765', ''));
  }
  await c.setOffline(true);
  let good = false; try { await p.reload(); await p.waitForTimeout(600); good = await home(); } catch (e) {}
  ok(good, 'opens again with no internet');
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
