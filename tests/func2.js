// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Main flows, part 2 (with func.js): Bubble Pop levels and accuracy goals, Hidden Comets, Chess special rules through the screen,
// Checkers result screens, and no hidden admin screen.
const { chromium } = require('playwright');
let pass = 0, fail = 0;
function ok(c, msg) { if (c) { pass++; console.log('PASS', msg); } else { fail++; console.log('FAIL', msg); } }
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|404/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8765/index.html?test=1');
  await p.waitForTimeout(600);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);

  // ---- Bubble Pop: perfect run passes level 1 and unlocks level 2 ----
  await ev(() => { BUB.LEN = 12; window.__minD = 9999; window.__minY = 9999; window.__maxN = 0;
    setInterval(() => { const G = BUB.cur; if (!G || G.over) return;
      const pts = G.bubbles.map(b => bubPos(b, (G.t - b.born) / b.dur));
      window.__maxN = Math.max(window.__maxN, pts.length);
      pts.forEach(q => { window.__minY = Math.min(window.__minY, q[1]); });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) window.__minD = Math.min(window.__minD, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
      G.bubbles.slice().forEach(b => { if (G.t - b.born > 5) popBub(G, b); }); }, 40); });
  await ev(() => startBubbleLevel(1)); await wait(13500);
  ok(await ev(() => BUB.cur.popped >= 4 && BUB.cur.missed === 0), 'bubble: popped ' + await ev(() => BUB.cur.popped) + ', missed 0');
  ok(await ev(() => window.__minD >= BUB.R * 2 - 1), 'bubble: bubbles never overlap (min gap ' + Math.round(await ev(() => window.__minD)) + 'px >= ' + 2 * await ev(() => BUB.R) + ')');
  ok(await ev(() => window.__minY >= 440), 'bubble: HUD area stays clear (lowest y ' + Math.round(await ev(() => window.__minY)) + ')');
  ok(await ev(() => bubProgress()) === 2, 'bubble: level 2 unlocked after 100% on level 1');
  ok(await ev(() => !!SCREENS['bubble-l1'].panel), 'bubble: level-end card shown');
  // failing run: no popping
  await ev(() => { BUB.LEN = 11; window.__noPop = true; });
  await ev(() => { clearInterval(0); });
  await ev(() => startBubbleLevel(2)); await ev(() => { BUB.cur.bubbles = []; });
  await wait(300);
  // ---- gate check by direct evaluation of finishBubbleLevel with set counters ----
  for (const [lvl, popped, missed, passExpected] of [[1, 95, 5, true], [1, 94, 6, false], [2, 98, 2, true], [2, 97, 3, false], [3, 100, 0, true], [3, 99, 1, false]]) {
    await ev(() => bubSetProgress(1));
    await ev(([l, po, mi]) => { go('bubble-l' + l); const G = BUB.cur; G.popped = po; G.missed = mi; G.bubbles.forEach(b => b.el.remove()); G.bubbles = []; finishBubbleLevel(); }, [lvl, popped, missed]);
    const title = await ev((l) => { const pn = SCREENS['bubble-l' + l].panel; return pn ? pn.querySelector('.panel-title').textContent : ''; }, lvl);
    const exp = passExpected ? (lvl === 3 ? 'Bubble Pop Complete!' : 'Level ' + lvl + ' Complete!') : 'So Close!';
    ok(title === exp, `bubble: level ${lvl} ${popped}/${popped + missed} -> "${title}"`);
  }
  ok(await ev(() => bubProgress()) === 1, 'bubble: finishing level 3 resets progress to level 1');

  // ---- Minesweeper ----
  await ev(() => go('ms-medium'));
  ok(await ev(() => MS.medium.mines === 10 && SCREENS['ms-medium'].G.cells.filter(c => c.mine).length === 10 && SCREENS['ms-medium'].G.n === 9), 'minesweeper: Medium 9x9 with 10 mines');
  await ev(() => go('ms-hard'));
  ok(await ev(() => SCREENS['ms-hard'].G.cells.filter(c => c.mine).length === 22 && SCREENS['ms-hard'].G.n === 12), 'minesweeper: Hard 12x12 with 22 mines');
  await ev(() => go('ms-gentle'));
  ok(await ev(() => SCREENS['ms-gentle'].G.cells.filter(c => c.mine).length === 2 && SCREENS['ms-gentle'].G.n === 4), 'minesweeper: Gentle 4x4 with 2 hazards');
  // gentle: hazard does not end the game; opening all safe cells wins
  await ev(() => { const S = SCREENS['ms-gentle']; const hz = S.G.cells.findIndex(c => c.mine); mineOpen(S, hz); });
  ok(await ev(() => !SCREENS['ms-gentle'].G.over), 'minesweeper: Gentle hazard does not end the game');
  await wait(1000);
  await ev(() => { const S = SCREENS['ms-gentle']; S.G.cells.forEach((c, i) => { if (!c.mine) mineOpen(S, i); }); });
  ok(await ev(() => !!SCREENS['ms-gentle'].panel && SCREENS['ms-gentle'].panel.textContent.includes('Sticker')), 'minesweeper: Gentle win shows sticker');
  // medium: first tap can hit a mine; board retained
  await ev(() => go('ms-medium'));
  await ev(() => { const S = SCREENS['ms-medium']; const i = S.G.cells.findIndex(c => c.mine); mineOpen(S, i); });
  await wait(900);
  ok(await ev(() => SCREENS['ms-medium'].G.over && !!SCREENS['ms-medium'].panel && SCREENS['ms-medium'].panel.textContent.includes('Try Again') && !!SCREENS['ms-medium'].boardEl.querySelector('.hit')), 'minesweeper: first tap can hit a mine; board kept, copper outline, gentle Try Again');
  // long-press flag
  await ev(() => go('ms-medium'));
  await p.evaluate(() => { const c = SCREENS['ms-medium'].boardEl.children[5]; c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 })); });
  await wait(600);
  ok(await ev(() => SCREENS['ms-medium'].G.cells[5].flag && SCREENS['ms-medium'].flagEl.textContent === '9'), 'minesweeper: long-press flags, flag counter 9');
  // win medium by opening all safe
  await ev(() => { const S = SCREENS['ms-medium']; S.G.cells.forEach((c, i) => { if (!c.mine) { if (c.flag) mineFlag(S, i); mineOpen(S, i); } }); });
  ok(await ev(() => SCREENS['ms-medium'].panel && SCREENS['ms-medium'].panel.textContent.includes('Well done')), 'minesweeper: Medium win card');

  // ---- Chess special rules through the UI ----
  await ev(() => { CH.pendingLevel = 'easy'; chsStart('w'); });
  // promotion: white pawn on a7, black king h8... build state
  await ev(() => { const E = CH.E; const st = E.initialState(); const bd = Array(64).fill(null); bd[0 * 8 + 7] = 'bK'; bd[7 * 8 + 4] = 'wK'; bd[1 * 8 + 0] = 'wP'; st.board = bd; st.castling = { wK: false, wQ: false, bK: false, bQ: false }; st.ep = null; st.turn = 'w'; st.keys = []; st.halfmove = 0; st.lastMove = null; CH.G.state = st; CH.G.undo = []; chsRender(); });
  await ev(() => document.querySelectorAll('#chs-board .ccell')[8].click()); await ev(() => document.querySelectorAll('#chs-board .ccell')[0].click());
  ok(await ev(() => !!CH.S.panel && CH.S.panel.querySelectorAll('.promo-btn').length === 4), 'chess: promotion panel offers Q R B N');
  await ev(() => CH.S.panel.querySelectorAll('.promo-btn')[3].click());
  ok(await ev(() => CH.G.state.board[0] === 'wN'), 'chess: promoted to knight');
  await wait(2500);
  // claimable draw
  await ev(() => { const E = CH.E; let st = E.initialState(); const seq = [[62 - 0, 45], [6, 21], [45, 62], [21, 6]]; /* g1f3 g8f6 f3g1 f6g8 */
    const mv = (s, f, t) => E.legalMoves(s).find(m => m.from === f && m.to === t);
    const g1 = 7 * 8 + 6, f3 = 5 * 8 + 5, g8 = 0 * 8 + 6, f6 = 2 * 8 + 5;
    for (let i = 0; i < 2; i++) { st = E.applyMove(st, mv(st, g1, f3)); st = E.applyMove(st, mv(st, g8, f6)); st = E.applyMove(st, mv(st, f3, g1)); st = E.applyMove(st, mv(st, f6, g8)); }
    CH.G.state = st; CH.G.over = false; CH.G.level = 'easy'; CH.declined = null; Saved.set('chess', CH.G); closePanel(CH.S); chsRender(); chsAfterMove(); });
  ok(await ev(() => !!CH.S.panel && CH.S.panel.textContent.includes('Claim')), 'chess: threefold repetition offers Claim Draw / Keep Playing');
  await ev(() => [...CH.S.panel.querySelectorAll('.panel-btn')].find(b => b.textContent === 'Claim Draw').click());
  ok(await ev(() => MM.Results.counts('chess').draw === 2), 'chess: claimed draw recorded (K+N v K earlier counted as automatic draw too)');

  // ---- Checkers: result screens ----
  for (const [k, state] of [['won', null]]) { }
  await ev(() => { ckStart('hard'); });
  await ev(() => { const E = CK.E; const bd = Array(100).fill(0); bd[9 * 10 + 0] = 'w'; const st = E.stateFrom(bd, 'b'); CK.G.state = st; ckRender(); ckAfterMove(); });
  await wait(2500);
  ok(await ev(() => MM.cur) === 'ck-result-won' || await ev(() => MM.cur) === 'ck-result-lost', 'checkers: ending reaches a result card (' + await ev(() => MM.cur) + ')');
  ok(await ev(() => MM.Results.counts('checkers').won + MM.Results.counts('checkers').lost === 1), 'checkers: result recorded');

  // ---- no hidden admin any more ----
  await ev(() => MM.go('home-view'));
  ok(await ev(() => !document.getElementById('greeting') && !document.getElementById('admin')), 'no hidden admin: greeting taps do nothing');
  console.log(errs.join('\n') || 'no page errors');
  console.log('RESULT', pass, 'passed', fail, 'failed');
  await b.close();
})();
