// privacy & clean-up checks: node tests/privacy.js
const { chromium } = require('playwright');
let f = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage(); const errs = [], outside = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.hostname !== 'localhost') outside.push(r.url()); });   // blob:/data: addresses are made inside the page itself
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(800);
  // visit every screen so every picture and font is requested
  const ids = await p.evaluate(() => Object.keys(SCREENS));
  for (const id of ids) { await p.evaluate((i) => { try { MM.go(i); } catch (e) {} }, id); await p.waitForTimeout(60); }
  await p.waitForTimeout(800);
  ok(outside.length === 0, 'the app contacts no outside address (' + (outside.join(' ') || 'none') + ')');
  ok(await p.evaluate(() => MM.cur !== null), 'app opens straight onto a screen, no sign-in');
  const html = await p.content();
  ok(!/firebase|googleapis|gstatic|sign out|signout/i.test(html), 'page contains no Firebase, Google or sign-out text');
  ok(await p.evaluate(() => typeof askSignOut === 'undefined' && typeof openAdmin === 'undefined' && typeof signInWithGoogle === 'undefined'), 'sign-in, sign-out and admin code are gone');
  await p.evaluate(() => { MM.Music.toggle(); CH.pendingLevel = 'easy'; chsStart('w'); }); await p.waitForTimeout(500);   // make the app save something
  ok(await p.evaluate(() => Object.keys(localStorage).length > 0 && Object.keys(localStorage).every(k => k.startsWith('tt:'))), 'everything saved uses the neutral tt: label (' + (await p.evaluate(() => Object.keys(localStorage).join(','))) + ')');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(f ? 'FAILED' : 'ALL PASSED'); await b.close();
})();
