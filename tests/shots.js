// phone-size screenshots of the main screens: node tests/shots.js <outdir>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || 'test-output';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [tag, w, h] of [['android', 390, 844], ['iphone-safari', 390, 664]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(900);
    for (const id of ['home-view', 'games', 'contact-view', 'bubble-home', 'ms-home', 'chs-entry-n', 'ck-entry-n']) {
      await p.evaluate((i) => MM.go(i), id); await p.waitForTimeout(700);
      await p.screenshot({ path: `${out}/${tag}-${id}.png` });
    }
    await p.evaluate(() => { CH.pendingLevel = 'easy'; chsStart('w'); }); await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/${tag}-chess-board.png` });
    await ctx.close();
  }
  await b.close();
})();
