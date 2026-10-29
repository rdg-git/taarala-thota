// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Take A Tour (the playing walkthrough): the cards, every scene on the right screen, the player controls, dragging,
// nothing tappable underneath, nothing saved, the right install steps for each phone, Done/✕/back return to the start.
const { chromium } = require('playwright');
const SHOTS = process.env.TOUR_SHOTS;   // folder for screenshots (optional)
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
const URL = 'http://localhost:8765/index.html?test=1';
const UA = { android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
             ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = async (o) => { const p = await (await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' }, o || {}))).newPage(); return p; };
  const p = await page({ userAgent: UA.android });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(700);
  await p.evaluate(() => MM.go('privacy')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#privacy .sheet').firstElementChild.classList.contains('tour-card')), 'Privacy & Safety: the tour card is at the very top');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/card_privacy.png' });
  await p.evaluate(() => MM.go('settings')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const c = document.querySelector('#settings .sheet').children; return c[0].classList.contains('supd') && c[1].classList.contains('tour-card'); }), 'Settings: App update first, then the tour card');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/card_settings.png' });
  await p.evaluate(() => MM.go('privacy')); await p.waitForTimeout(200);
  await p.mouse.click(200, 500); await p.waitForTimeout(200);   // the first tap anywhere starts the music (saved as tt:music); not part of the tour
  const snap = () => p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage[k]])));
  const before = await snap();
  await p.locator('#privacy .tour-go').click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => Tour.on && Tour.playing && Tour.t > 100), 'the tour starts playing by itself');
  // every scene: the right screen, its caption on screen, the finger where it should be
  await p.evaluate(() => { Tour.playing = false; });
  const scenes = await p.evaluate(() => TOUR_SCENES.map(s => ({ start: s.start, dur: s.dur, screen: s.screen, then: s.then, title: s.title, finger: !!(s.tap || s.pill || s.rest || s.install) })));
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    for (const [u, scr] of [[0.55, s.screen], [0.95, s.then || s.screen]]) {
      const r = await p.evaluate((ms) => { Tour.seek(ms); return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
        const c = document.querySelector('.tour-cap').getBoundingClientRect(), fg = document.querySelector('.tour-finger');
        res({ cur: MM.cur, title: document.querySelector('.tour-title').textContent, capIn: c.top >= 0 && c.bottom <= innerHeight, finger: fg.style.opacity === '1' });
      }))); }, s.start + s.dur * u);
      const fingerOk = u === 0.55 ? r.finger === s.finger : true;
      ok(r.cur === scr && r.title === s.title && r.capIn && fingerOk, 'scene ' + (i + 1) + ' at ' + Math.round(u * 100) + '%: ' + r.cur + ' · "' + r.title + '"' + (u === 0.55 ? (r.finger ? ' · finger' : ' · no finger') : ''));
      if (SHOTS && u === 0.55) await p.screenshot({ path: SHOTS + '/scene' + String(i + 1).padStart(2, '0') + '.png' });
    }
  }
  // a tap under the cover does nothing (the glowing gear must not open Settings)
  await p.evaluate(() => Tour.seek(TOUR_SCENES[2].start + 3000));
  const g = await p.evaluate(() => { const r = document.querySelector('#home-view .gear-btn').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.mouse.click(g[0], g[1]); await p.waitForTimeout(200);
  ok(await p.evaluate(() => MM.cur === 'home-view' && Tour.on), 'tapping under the cover does nothing');
  // controls
  await p.evaluate(() => { Tour.seek(20000); Tour.showControls(); }); await p.waitForTimeout(100);
  await p.locator('.tour [data-k=play]').click(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => Tour.playing && Tour.t > 20300), 'Play plays');
  await p.locator('.tour [data-k=play]').click(); const t1 = await p.evaluate(() => Tour.t); await p.waitForTimeout(600);
  ok(await p.evaluate((t) => !Tour.playing && Math.abs(Tour.t - t) < 50, t1), 'Pause pauses');
  await p.locator('.tour [data-k=back]').click(); ok(await p.evaluate((t) => Math.abs(Tour.t - (t - 5000)) < 50, t1), '⟲ goes back 5 seconds');
  await p.locator('.tour [data-k=fwd]').click(); await p.locator('.tour [data-k=fwd]').click(); ok(await p.evaluate((t) => Math.abs(Tour.t - (t + 5000)) < 50, t1), '⟳ goes forward 5 seconds');
  const sp = []; for (let i = 0; i < 4; i++) { await p.locator('.tour [data-k=speed]').click(); sp.push(await p.evaluate(() => Tour.speed)); }
  ok(sp.join() === '1.5,2,0.5,1', 'speed: 1× → 1.5× → 2× → 0.5× → 1×');
  // dragging the bar shows the right screen
  const target = scenes[7].start + 1000;
  await p.evaluate((v) => { const r = document.querySelector('.tour input[type=range]'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, target);
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => MM.cur === 'games' && document.querySelector('.tour-title').textContent === 'Pick A Game'), 'dragging the bar jumps to that part of the tour');
  // controls fade while playing, a tap brings them back; paused they stay
  await p.evaluate(() => { Tour.playing = true; Tour.ctlUntil = 0; }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.querySelector('.tour').classList.contains('ctl')), 'while playing, the controls fade away (a thin progress line stays)');
  await p.mouse.click(200, 400); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelector('.tour').classList.contains('ctl')), 'a tap brings the controls back');
  await p.evaluate(() => { Tour.playing = false; Tour.ctlUntil = 0; }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelector('.tour').classList.contains('ctl')), 'when paused, the controls stay');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/paused.png' });
  // the end: Done returns to Privacy & Safety, at the top
  await p.evaluate(() => { Tour.seek(Tour.total); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.querySelector('.tour-done').hidden && !Tour.playing), 'at the end: Done');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/end.png' });
  await p.locator('.tour-done').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !Tour.on && !document.querySelector('.tour') && MM.cur === 'privacy' && document.querySelector('#privacy .sheet').scrollTop === 0), 'Done: back on Privacy & Safety, at the top');
  ok(before === await snap(), 'the tour saved nothing');
  // from Settings: ✕ returns to Settings
  await p.evaluate(() => MM.go('settings')); await p.waitForTimeout(200);
  await p.locator('#settings .tour-go').click(); await p.waitForTimeout(400);
  await p.locator('.tour-x').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !Tour.on && MM.cur === 'settings'), '✕ closes the tour: back in Settings');
  // back gesture ends it
  await p.evaluate(() => Tour.start('settings')); await p.waitForTimeout(300);
  await p.evaluate(() => history.back()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !Tour.on && MM.cur === 'settings'), 'the back gesture ends the tour and returns to the start');
  // the install scene matches the phone
  const inst = async (ua, w, h) => {
    const q = await page(Object.assign({ viewport: { width: w || 390, height: h || 844 } }, ua ? { userAgent: ua } : {}));
    await q.goto(URL); await q.waitForTimeout(600);
    const r = await q.evaluate(() => { Tour.start('home-view'); Tour.playing = false; const s = TOUR_SCENES[1]; Tour.seek(s.start + s.dur * 0.1); const a = document.querySelector('.tour-ill').textContent;
      Tour.seek(s.start + s.dur * 0.6); const b = document.querySelector('.tour-ill').textContent; return { kind: TOUR_KIND, text: document.querySelector('.tour-text').textContent, note: document.querySelector('.tour-note').textContent, a, b }; });
    return { q, r };
  };
  const A = (await inst(UA.android)).r, I = (await inst(UA.ios)).r, D = (await inst(null)).r;
  ok(A.kind === 'android' && /Chrome/.test(A.text) && !/Safari/.test(A.text) && /Install/.test(A.b), 'Android: Chrome steps (⋮ → Add to home screen → Install)');
  ok(I.kind === 'ios' && /Safari/.test(I.text) && !/Chrome/.test(I.text), 'iPhone: Safari steps');
  ok(D.kind === 'both' && /Chrome/.test(D.text) && /Safari/.test(D.text), 'unknown phone: both');
  ok(/slightly different/.test(A.note) && /slightly different/.test(I.note), 'the "menus can look slightly different" note is shown');
  if (SHOTS) {
    for (const [nm, ua] of [['install_ios', UA.ios]]) {
      const { q } = await inst(ua);
      for (const u of [0.1, 0.35, 0.6, 0.9]) { await q.evaluate((u) => { const s = TOUR_SCENES[1]; Tour.seek(s.start + s.dur * u); }, u); await q.waitForTimeout(100); await q.screenshot({ path: SHOTS + '/' + nm + '_' + Math.round(u * 100) + '.png' }); }
    }
    for (const u of [0.1, 0.45, 0.8]) { await p.evaluate(() => { Tour.start('privacy'); Tour.playing = false; }); await p.evaluate((u) => { const s = TOUR_SCENES[1]; Tour.seek(s.start + s.dur * u); }, u); await p.waitForTimeout(100); await p.screenshot({ path: SHOTS + '/install_android_' + Math.round(u * 100) + '.png' }); await p.evaluate(() => Tour.end()); }
  }
  // small phone: every caption fits
  const q = await page({ viewport: { width: 375, height: 667 } });
  await q.goto(URL); await q.waitForTimeout(600);
  const allIn = await q.evaluate(async () => { Tour.start('privacy'); Tour.playing = false; let okAll = true;
    for (const s of TOUR_SCENES) for (const u of [0.3, 0.7]) { Tour.seek(s.start + s.dur * u); await new Promise(r => requestAnimationFrame(r));
      const c = document.querySelector('.tour-cap').getBoundingClientRect(); if (c.top < 0 || c.bottom > innerHeight) okAll = false; } return okAll; });
  ok(allIn, 'small phone (375x667): every caption fits on screen');
  // recording mode (for the LinkedIn / README video): no player bar, no ✕
  const rq = await page(); await rq.goto(URL + '&tourrec'); await rq.waitForTimeout(600);
  await rq.evaluate(() => MM.go('privacy')); await rq.locator('#privacy .tour-go').click(); await rq.waitForTimeout(700);
  ok(await rq.evaluate(() => Tour.rec && getComputedStyle(document.querySelector('.tour-bar')).opacity === '0' && getComputedStyle(document.querySelector('.tour-x')).display === 'none'), 'recording mode: no player bar, no ✕');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
  console.log(`\nRESULT ${n - f} passed ${f} failed`); process.exit(f ? 1 : 0);
})();
