// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Two-finger zoom: allowed on the Settings and Privacy & safety pages only; everywhere else the screen stays steady.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  const state = (id) => p.evaluate((i) => {
    MM.go(i);
    const meta = document.querySelector('meta[name=viewport]').content, S = document.getElementById(i);
    const pinchBlocked = (() => { const ev = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [new Touch({ identifier: 1, target: S, clientX: 10, clientY: 10 }), new Touch({ identifier: 2, target: S, clientX: 50, clientY: 50 })] }); S.dispatchEvent(ev); return ev.defaultPrevented; })();
    return { zoomMeta: /user-scalable=yes/.test(meta), css: getComputedStyle(S).touchAction, pinchBlocked };
  }, id);
  for (const id of ['settings', 'privacy']) {
    const s = await state(id);
    ok(s.zoomMeta && /pinch-zoom|manipulation/.test(s.css) && !s.pinchBlocked, id + ': two-finger zoom allowed');
  }
  for (const id of ['home-view', 'games', 'bubble-home', 'contact-view', 'chs-board']) {
    const s = await state(id);
    ok(!s.zoomMeta && s.css === 'none' && s.pinchBlocked, id + ': zoom blocked (steady screen)');
  }
  await state('settings'); const back = await state('home-view');
  ok(!back.zoomMeta, 'leaving Settings turns zoom off again');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
