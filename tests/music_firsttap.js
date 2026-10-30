// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// the very first tap on a phone must start the music (real browser sound rules, no test shortcuts)
const { chromium } = require('playwright');
let f = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });   // normal autoplay rules
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  await p.touchscreen.tap(200, 300); await p.waitForTimeout(800);       // a finger tap on Home's sky
  const st = await p.evaluate(() => ({ on: MM.Music.isOn(), state: MM.Music.ctxState && MM.Music.ctxState() }));
  ok(st.on && st.state === 'running', 'first finger tap starts the music for real (sound system: ' + st.state + ')');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(f ? 'FAILED' : 'ALL PASSED'); await b.close();
})();
