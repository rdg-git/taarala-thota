// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(600);
  await p.evaluate(() => { CH.pendingLevel='easy'; chsStart('w'); });
  await p.waitForTimeout(800);
  for (let i=0;i<3;i++){
    await p.evaluate(() => { const m=CH.E.legalMoves(CH.G.state).sort((a,b)=>a.from-b.from)[3]; chsHumanMove(m); });
    await p.waitForFunction(() => !CH.busy && CH.G.state.turn===CH.G.side, null, {timeout:8000}); await p.waitForTimeout(100);
  }
  console.log('stack', await p.evaluate(()=>CH.G.undo.length));
  for (let i=0;i<4;i++){ await p.evaluate(()=>chsUndoTap()); console.log('after undo', await p.evaluate(()=>CH.G.undo.length+' ply='+(CH.G.state.keys?CH.G.state.keys.length:'?'))); }
  console.log(await p.evaluate(()=>JSON.stringify(CH.G.state)===JSON.stringify(CH.E.initialState())));
  // checkers
  await p.evaluate(() => { ckStart('easy'); }); await p.waitForTimeout(800);
  for (let i=0;i<2;i++){
    await p.evaluate(() => { const m=CK.E.legalMoves(CK.G.state)[0]; ckHumanMove(m); });
    await p.waitForFunction(() => !CK.busy && CK.G.state.turn==='w', null, {timeout:8000}); await p.waitForTimeout(100);
  }
  console.log('ck stack', await p.evaluate(()=>CK.G.undo.length));
  await p.evaluate(()=>ckUndo()); await p.evaluate(()=>ckUndo()); await p.evaluate(()=>ckUndo());
  console.log('ck after', await p.evaluate(()=>CK.G.undo.length+' '+(JSON.stringify(CK.G.state)===JSON.stringify(CK.E.initialState()))), errs);
  await b.close();
})();
