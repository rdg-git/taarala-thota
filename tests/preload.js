// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Pictures download efficiently: what loads at start and per screen, no picture downloaded twice, every picture address carries
// a version fingerprint (for safe long caching). Prints results to read.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const reqs=[]; p.on('request',r=>{ if(/\/img\//.test(r.url())) reqs.push(r.url().split('/img/')[1]); });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(2500);
  console.log('after start:', reqs.join(' '));
  const n0=reqs.length;
  await p.evaluate(()=>MM.go('games')); await p.waitForTimeout(2500);
  console.log('after Games:', reqs.slice(n0).join(' '));
  const n1=reqs.length; await p.evaluate(()=>MM.go('ms-home')); await p.waitForTimeout(2000);
  console.log('open Minesweeper home, new requests:', reqs.slice(n1).join(' '));
  const dup = reqs.filter((x,i)=>reqs.indexOf(x)!==i); console.log('picture downloaded twice:', dup.length? dup.join(' '):'none');
  console.log('urls have fingerprint:', reqs.every(x=>/\?v=[0-9a-f]{8}$/.test(x)));
  console.log(errs); await b.close();
})();
