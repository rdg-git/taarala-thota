// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// The "Update" pill: invisible when there is no update; when one waits it shows next to the top-right button on every
// screen except during play, never covers a button, title or panel, and opens the update card.
// "What's New" lists every release newer than the one running (skipped releases included), each under its date.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [w, h] of [[360, 640], [390, 844], [820, 1180]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block' })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(800);
    const scan = () => p.evaluate(() => {
      const shown = [], bad = [];
      for (const id in SCREENS) {
        MM.go(id); const S = SCREENS[id]; document.querySelectorAll('.panel-ov').forEach(x => x.remove()); S.panel = null;
        const bd = S.updBadge; if (!bd || bd.hidden) continue; shown.push(id);
        const pr = bd.querySelector('span').getBoundingClientRect();
        if (pr.right > innerWidth + 1 || pr.top < 0 || pr.left < 0) bad.push(id + ' off screen');
        S.art.querySelectorAll('button,.hot,.live,.sheet,.plank,.wbtn,a').forEach(e => {
          if (e === bd || bd.contains(e) || e.offsetParent === null) return; const q = e.getBoundingClientRect(); if (q.width < 2) return;
          if (Math.min(pr.right, q.right) - Math.max(pr.left, q.left) > 1 && Math.min(pr.bottom, q.bottom) - Math.max(pr.top, q.top) > 1) bad.push(id + ' covers ' + (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20)));
        });
      }
      return { shown, bad };
    });
    const none = await scan();
    ok(none.shown.length === 0, w + 'x' + h + ': no update -> no pill on any screen');
    await p.evaluate(() => { Object.defineProperty(navigator.serviceWorker, 'controller', { get: () => ({}) }); MM.PWA.reg = { waiting: { postMessage: (m, ports) => ports && ports[0].postMessage({ notes: [
      { release: '2099-02-01', notes: ['Newest note.'] }, { release: '2099-01-01b', notes: ['Skipped note.'] }, { release: APP_RELEASE, notes: ['Already installed note.'] }] }) } }; MM.PWA.dismissed = true; });
    const some = await scan();
    ok(some.shown.length >= 15 && some.shown.includes('home-view') && some.shown.includes('settings'), w + 'x' + h + ': update waiting -> pill on ' + some.shown.length + ' screens');
    ok(!some.shown.some(id => /^(bubble-l\d|chs-board|ck-board|ms-(gentle|easy|medium|hard))$/.test(id)), w + 'x' + h + ': no pill during play');
    ok(some.bad.length === 0, w + 'x' + h + ': pill never covers anything ' + some.bad.join(' | '));
    if (w === 390) {
      await p.evaluate(() => MM.go('games')); await p.waitForTimeout(300);
      await p.locator('#games .upd-badge').click(); await p.waitForTimeout(300);
      ok(await p.evaluate(() => /new version is ready/.test((document.querySelector('#games .panel-card') || {}).textContent || '')), 'tapping the pill opens the update card');
      await p.locator('#games .panel-btn', { hasText: 'What' }).click(); await p.waitForTimeout(500);
      const t = await p.evaluate(() => ({ dates: [...document.querySelectorAll('#games .wn-date')].map(e => e.textContent), items: [...document.querySelectorAll('#games .wn-list li')].map(e => e.textContent) }));
      ok(t.items.join('|') === 'Newest note.|Skipped note.', "What's New: newer and skipped releases, not the installed one (" + t.items.join(' / ') + ')');
      ok(t.dates.join('|') === '1 Feb 2099|1 Jan 2099 (update 2)', "What's New: each release under its date (" + t.dates.join(' / ') + ')');
    }
    ok(errs.length === 0, w + 'x' + h + ': no page errors ' + errs.join(' | '));
  }
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
