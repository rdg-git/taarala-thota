// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// functional checks: node tests/func.js
const { chromium } = require('playwright');
let pass = 0, fail = 0;
function ok(c, msg) { if (c) { pass++; console.log('PASS', msg); } else { fail++; console.log('FAIL', msg); } }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|404/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8765/index.html?test=1');
  await p.waitForTimeout(600);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  const click = (sel, i) => p.evaluate(([s, k]) => document.querySelectorAll(s)[k].click(), [sel, i]);

  // ---- navigation ----
  ok(await ev(() => MM.cur === 'home-view'), 'starts on Home');
  ok(await ev(() => !!document.getElementById('home-view') && !!document.getElementById('contact-view') && !!document.getElementById('gamesContainer')), 'required IDs exist');
  await ev(() => MM.go('games')); ok(await ev(() => MM.cur === 'games'), 'Games opens');
  for (const [g, scr] of [['bubble', 'bubble-home'], ['minesweeper', 'ms-home'], ['checkers', 'ck-entry-n'], ['chess', 'chs-entry-n']]) {
    await ev(() => MM.go('games'));
    await ev((g) => document.querySelector('#gamesContainer [data-game=' + g + ']').click(), g);
    ok((await ev(() => MM.cur)) === scr, 'Games -> ' + g + ' opens ' + scr + ' (got ' + await ev(() => MM.cur) + ')');
    await ev(() => MM.goBack()); ok(await ev(() => MM.cur === 'games'), g + ' Back returns to Games');
  }
  await ev(() => MM.go('contact-view'));
  ok(await ev(() => document.querySelectorAll('#contact-view .medallion').length === 0 && !!document.querySelector('#contact-view .loved-empty')), 'Loved Ones starts empty, with a friendly message');
  await ev(() => { localStorage.setItem('tt:contacts', JSON.stringify([{ id: 'a', name: 'Test Star', phone: '+10000000001' }, { id: 'b', name: '<b>Moon</b>', phone: '+10000000002' }, { id: 'c', name: 'No Number', phone: '12' }])); MM.go('home-view'); MM.go('contact-view'); });
  ok(await ev(() => document.querySelectorAll('#contact-view .medallion').length) === 2, 'Loved Ones shows only contacts with a valid number');
  ok(await ev(() => !document.querySelector('#contact-view .med-name b') && [...document.querySelectorAll('#contact-view .med-name')].some(n => n.textContent === '<b>Moon</b>')), 'typed names are shown as plain text, never as code');
  await ev(() => { localStorage.removeItem('tt:contacts'); });
  await ev(() => MM.goBack()); ok(await ev(() => MM.cur === 'home-view'), 'Loved Ones Back -> Home');

  // ---- chess ----
  await ev(() => { CH.pendingLevel = 'easy'; chsStart('w'); });
  ok(await ev(() => MM.cur === 'chs-board'), 'chess board opens');
  await click('#chs-board .ccell', 52); await click('#chs-board .ccell', 36);   // e2-e4
  ok(await ev(() => CH.G.state.board[36] === 'wP'), 'chess: e2-e4 played');
  await wait(3500);
  ok(await ev(() => CH.G.state.turn === 'w' && CH.G.state.fullmove >= 2), 'chess: computer replied');
  ok(await ev(() => !!Saved.get('chess')), 'chess: game saved');
  // undo (easy)
  const undoVisible = await ev(() => getComputedStyle(CH.S.undoTop).display !== 'none' && !CH.S.undoTop.disabled);
  ok(undoVisible, 'chess: Undo shown on Easy');
  await ev(() => chsUndo()); ok(await ev(() => CH.G.state.board[52] === 'wP' && CH.G.state.turn === 'w'), 'chess: Undo restores last full turn');
  // forfeit after 61 minutes
  await ev(() => MM.advance(61 * 60 * 1000)); await wait(1500);
  ok(await ev(() => MM.Results.counts('chess').forfeited) === 1, 'chess: forfeit recorded after 60 min');
  ok(await ev(() => !MM.Saved.get('chess')), 'chess: saved game cleared after forfeit');
  ok(await ev(() => !!CH.S.panel), 'chess: forfeit card shown');
  await wait(1200); ok(await ev(() => MM.Results.counts('chess').forfeited) === 1, 'chess: forfeit recorded once');
  // closed-app forfeit
  await ev(() => { CH.pendingLevel = 'medium'; chsStart('w'); MM.go('chs-entry'); });
  await ev(() => MM.advance(61 * 60 * 1000)); await ev(() => MM.go('games')); await ev(() => MM.go('chs-entry'));
  ok(await ev(() => MM.Results.counts('chess').forfeited) === 2 && await ev(() => MM.cur) === 'chs-entry-n', 'chess: forfeit while away recorded on next visit');

  // ---- checkers ----
  await ev(() => { MM.advance(0); ckStart('easy'); });
  ok(await ev(() => MM.cur === 'ck-board'), 'checkers board opens');
  const mv = await ev(() => { const E = CK.E, m = E.legalMoves(CK.G.state)[0]; return { from: m.from, to: m.to, n: E.legalMoves(CK.G.state).length }; });
  ok(mv.n === 9, 'checkers: 9 opening moves');
  await click('#ck-board .kcell', mv.from); await click('#ck-board .kcell', mv.to);
  ok(await ev((m) => CK.G.state.board[m.to] === 'w', mv), 'checkers: human move played');
  await wait(3000);
  ok(await ev(() => CK.G.state.turn === 'w'), 'checkers: computer replied');
  await ev(() => ckUndo()); ok(await ev(() => CK.G.state.board.filter(x => x === 'w').length === 20 && CK.G.state.turn === 'w'), 'checkers: Undo works');

  console.log(errs.join('\n') || 'no page errors');
  console.log('RESULT', pass, 'passed', fail, 'failed');
  await b.close();
})();
