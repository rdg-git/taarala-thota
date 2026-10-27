// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Real finger taps on Hidden Comets tiles (every difficulty): tap opens, press-and-hold flags (not Gentle).
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  for (const mode of ['gentle', 'medium', 'hard']) {
    await p.evaluate((m) => MM.go('ms-' + m), mode); await p.waitForTimeout(400);
    const box = await p.evaluate((m) => { const S = SCREENS['ms-' + m]; const i = S.G.cells.findIndex(c => !c.mine); const r = S.boardEl.children[i].getBoundingClientRect(); return { i, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, mode);
    await p.touchscreen.tap(box.x, box.y); await p.waitForTimeout(300);
    ok(await p.evaluate(([m, i]) => SCREENS['ms-' + m].G.cells[i].open, [mode, box.i]), mode + ': a finger tap opens the tile');
    if (mode !== 'gentle') {
      const j = await p.evaluate((m) => SCREENS['ms-' + m].G.cells.findIndex(c => !c.open), mode);
      const r = await p.evaluate(([m, k]) => { const e = SCREENS['ms-' + m].boardEl.children[k].getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; }, [mode, j]);
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await p.waitForTimeout(650);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(200);
      ok(await p.evaluate(([m, k]) => SCREENS['ms-' + m].G.cells[k].flag && !SCREENS['ms-' + m].G.cells[k].open, [mode, j]), mode + ': press and hold flags the tile');
    }
  }
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
