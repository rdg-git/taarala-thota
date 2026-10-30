// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Bubble Pop: every level open from the start; reaching a level's accuracy goal earns its gold star;
// Continue plays the level after the last one completed (level 1 again after level 3); older saves keep their progress.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ev = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
  await p.goto('http://localhost:8765/index.html?test=1'); await wait(700);
  await ev(() => { Object.keys(localStorage).filter(k => k.startsWith('tt:')).forEach(k => localStorage.removeItem(k)); localStorage.setItem('tt:noticeDay', JSON.stringify('x')); });
  await p.reload(); await wait(700);
  const stars = () => ev(() => { MM.go('bubble-home'); return [...document.querySelectorAll('#bubble-home .bub-star')].map(s => s.classList.contains('on')); });
  ok(JSON.stringify(await stars()) === '[false,false,false]', 'new player: no stars yet');
  // tap the level 3 tile straight away (a real tap on the painted plaque)
  await wait(500); const box = await p.locator('#bubble-home [aria-label="Level 3"]').boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await wait(600);
  ok(await ev(() => MM.cur === 'bubble-l3' && BUB.cur && BUB.cur.n === 3), 'level 3 opens for a new player (no lock)');
  const finish = (lvl, po, mi) => ev(([l, a, m]) => { MM.go('bubble-l' + l); const G = BUB.cur; G.popped = a; G.missed = m; G.bubbles.forEach(x => x.el.remove()); G.bubbles = []; finishBubbleLevel(); }, [lvl, po, mi]);
  await finish(2, 90, 10);
  ok(JSON.stringify(await stars()) === '[false,false,false]' && await ev(() => bubProgress()) === 1, 'missing the goal: no star, Continue unchanged');
  await finish(1, 100, 0);
  ok(JSON.stringify(await stars()) === '[true,false,false]' && await ev(() => bubProgress()) === 2, 'level 1 goal reached: star on 1, Continue plays level 2');
  await finish(3, 50, 0);
  ok(JSON.stringify(await stars()) === '[true,false,true]' && await ev(() => bubProgress()) === 1, 'level 3 goal reached: star on 3, Continue back to level 1');
  await finish(1, 100, 0);
  ok(JSON.stringify(await stars()) === '[true,false,true]', 'stars are kept when a level is completed again');
  // an older save ("level 3 unlocked") still shows levels 1 and 2 as completed
  await ev(() => localStorage.setItem('tt:bubble', JSON.stringify({ level: 3 })));
  ok(JSON.stringify(await stars()) === '[true,true,false]' && await ev(() => bubProgress()) === 3, 'older save: levels 1 and 2 starred, Continue plays level 3');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
