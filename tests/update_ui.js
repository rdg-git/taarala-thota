// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// While a new version waits: the "Update" pill shows next to the top-right button on every screen except during play,
// covers nothing, and opens the update card. Settings: compact box at the top; "Update Later" shrinks it; What's New shows/hides.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [w, h] of [[360, 640], [390, 844], [820, 1180]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block' })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      Object.defineProperty(navigator.serviceWorker, 'controller', { get: () => ({}) });
      MM.PWA.reg = { waiting: { postMessage: (m, ports) => ports && ports[0].postMessage({ notes: ['One', 'Two'] }) } }; MM.PWA.dismissed = true;
      const shown = [], hiddenPlay = [], problems = [];
      for (const id in SCREENS) {
        MM.go(id); const S = SCREENS[id]; document.querySelectorAll('.panel-ov').forEach(x => x.remove()); S.panel = null;
        const bd = S.updBadge, play = /^(bubble-l\d|chs-board|ck-board|ms-(?!home$|stats$).+)$/.test(id);
        if (play) { if (!bd || bd.hidden) hiddenPlay.push(id); else problems.push(id + ': shown during play'); continue; }
        if (!bd || bd.hidden) continue;
        shown.push(id);
        const pr = bd.querySelector('span').getBoundingClientRect();
        if (pr.left < 0 || pr.top < 0 || pr.right > innerWidth + 1) problems.push(id + ': off screen');
        S.art.querySelectorAll('button,.hot,.live,.sheet,.plank,.wbtn,a').forEach(e => {
          if (e === bd || bd.contains(e) || e.offsetParent === null) return; const q = e.getBoundingClientRect(); if (q.width < 2) return;
          if (Math.min(pr.right, q.right) - Math.max(pr.left, q.left) > 1 && Math.min(pr.bottom, q.bottom) - Math.max(pr.top, q.top) > 1) problems.push(id + ': covers ' + (e.getAttribute('aria-label') || e.className));
        });
      }
      return { shown, hiddenPlay, problems };
    });
    ok(r.shown.includes('home-view') && r.shown.includes('games') && r.shown.includes('settings') && r.shown.length >= 15, w + 'x' + h + ': pill on ' + r.shown.length + ' screens (Home, Games, Settings ...)');
    ok(r.hiddenPlay.length >= 6, w + 'x' + h + ': no pill during play (' + r.hiddenPlay.length + ' play screens)');
    ok(r.problems.length === 0, w + 'x' + h + ': pill covers nothing and stays on screen ' + r.problems.join(' | '));
    if (w === 390) {
      await p.evaluate(() => MM.go('games')); await p.waitForTimeout(400);
      await p.locator('#games .upd-badge').click(); await p.waitForTimeout(400);
      ok(await p.evaluate(() => /new version is ready/.test((document.querySelector('#games .panel-card') || {}).textContent || '')), 'tapping the pill opens the update card (even after Later)');
      await p.evaluate(() => { closePanel(SCREENS.games); MM.go('settings'); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => document.querySelector('#settings .sheet').firstChild.classList.contains('supd')), 'Settings: update box is the first thing on the page');
      await p.locator('#settings .supd .sbtn', { hasText: 'What' }).click(); await p.waitForTimeout(300);
      ok(await p.evaluate(() => document.querySelectorAll('#settings .supd .wn-list li').length === 2), "Settings: What's New opens the list");
      await p.locator('#settings .supd .sbtn', { hasText: 'Hide' }).click(); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !document.querySelector('#settings .supd .wn-box')), "Settings: tapping again hides the list");
      await p.locator('#settings .supd .sbtn', { hasText: 'Update Later' }).click(); await p.waitForTimeout(300);
      ok(await p.evaluate(() => /Update waiting/.test(document.querySelector('#settings .supd').textContent) && document.querySelectorAll('#settings .supd button').length === 1), 'Settings: Update Later shrinks the box to one line');
    }
    ok(errs.length === 0, w + 'x' + h + ': no page errors ' + errs.join(' | '));
  }
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
