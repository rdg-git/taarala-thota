const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/TUNNEL|404/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => {
    PACE_MS.easy = PACE_MS.medium = PACE_MS.hard = 0;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const out = {};
    for (const [lvl, side] of [['easy', 'w'], ['medium', 'b'], ['hard', 'w']]) {
      CH.pendingLevel = lvl; chsStart(side);
      let n = 0, t0 = Date.now();
      while (!CH.G.over && n < 70 && Date.now() - t0 < 60000) {
        await sleep(30);
        if (CH.busy || CH.G.state.turn !== side || CH.S.panel) { if (CH.S.panel && !CH.G.over) { const bt = CH.S.panel.querySelector('.panel-btn.secondary'); if (bt) bt.click(); } continue; }
        const mv = CH.E.legalMoves(CH.G.state); const m = mv[Math.floor(Math.random() * mv.length)];
        chsHumanMove(m); n++;
      }
      out['chess-' + lvl] = { plies: CH.G.state.fullmove, over: CH.G.over, human: n };
    }
    for (const lvl of ['easy', 'medium', 'hard']) {
      ckStart(lvl); let n = 0, t0 = Date.now();
      while (!CK.G.over && n < 60 && Date.now() - t0 < 90000) {
        await sleep(30);
        if (CK.busy || CK.G.state.turn !== 'w') continue;
        const mv = CK.E.legalMoves(CK.G.state); if (!mv.length) break;
        ckHumanMove(mv[Math.floor(Math.random() * mv.length)]); n++;
      }
      out['checkers-' + lvl] = { human: n, over: CK.G.over, cur: MM.cur };
      MM.go('games');
    }
    out.results = { chess: Results.counts('chess'), checkers: Results.counts('checkers') };
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log(errs.join('\n') || 'no errors'); await b.close();
})();
