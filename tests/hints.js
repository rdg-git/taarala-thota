// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Move hints: shown on Easy only; Medium and Hard highlight just the selected piece.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  const ev = (fn, a) => p.evaluate(fn, a);
  for (const lv of ['easy', 'medium', 'hard']) {
    await ev((l) => { CH.pendingLevel = l; chsStart('w'); }, lv); await p.waitForTimeout(400);
    await ev(() => document.querySelectorAll('#chs-board .ccell')[52].click()); await p.waitForTimeout(150);   // tap the e2 pawn
    const r = await ev(() => ({ sel: document.querySelectorAll('#chs-board .ccell.sel').length, dest: document.querySelectorAll('#chs-board .ccell.dest, #chs-board .ccell.destcap').length }));
    ok(r.sel === 1 && (lv === 'easy' ? r.dest === 2 : r.dest === 0), 'chess ' + lv + ': selected piece highlighted, ' + (lv === 'easy' ? 'moves shown' : 'no move hints') + ' (' + r.dest + ')');
    await ev(() => document.querySelectorAll('#chs-board .ccell')[36].click()); await p.waitForTimeout(200);
    ok(await ev(() => CH.G.state.board[36] === 'wP'), 'chess ' + lv + ': the move still works without hints');
  }
  for (const lv of ['easy', 'medium', 'hard']) {
    await ev((l) => { ckStart(l); }, lv); await p.waitForTimeout(500);
    const i = await ev(() => { const m = CK.E.legalMoves(CK.G.state)[0]; return m.from; });
    await ev((k) => document.querySelectorAll('#ck-board .kcell')[k].click(), i); await p.waitForTimeout(150);
    const r = await ev(() => ({ sel: document.querySelectorAll('#ck-board .kcell.sel').length, dest: document.querySelectorAll('#ck-board .kcell.dest').length }));
    ok(r.sel === 1 && (lv === 'easy' ? r.dest >= 1 : r.dest === 0), 'checkers ' + lv + ': selected piece highlighted, ' + (lv === 'easy' ? 'landing squares shown' : 'no move hints') + ' (' + r.dest + ')');
  }
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
