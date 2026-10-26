// Screen fill: on every screen and several phone sizes, no dark side strips where avoidable,
// and nothing you can tap or read is cut off at the top or bottom.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
const SIZES = [['small Android', 360, 640], ['iPhone Safari', 390, 664], ['Android Chrome', 412, 780], ['iPhone', 390, 844], ['large phone', 430, 932], ['tablet', 768, 1024]];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [label, w, h] of SIZES) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: 'block' })).newPage();
    await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
    await p.evaluate(() => { localStorage.setItem('tt:noticeDay', JSON.stringify('x')); localStorage.setItem('tt:contacts', JSON.stringify([{ id: 'a', name: 'Test Star', phone: '+10000000001' }])); });
    const ids = await p.evaluate(() => Object.keys(SCREENS));
    const strips = [], cut = [];
    for (const id of ids) {
      await p.evaluate((i) => { try { MM.go(i); } catch (e) {} }, id); await p.waitForTimeout(40);
      const r = await p.evaluate(() => {
        const S = SCREENS[CUR]; if (!S) return null;
        const a = S.art.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
        const needCrop = 1 - (S.W / S.H) / (vw / vh);                         // crop needed to remove side strips
        const bad = [...S.art.querySelectorAll('.hot, .wbtn, .music-btn, .gear-btn, .privacy-link, .live, .sheet, .plank')]
          .filter(e => e.offsetParent !== null && getComputedStyle(e).display !== 'none' && (e.textContent.trim() || e.matches('.hot, .wbtn, .music-btn, .gear-btn, .plank')))
          .map(e => ({ e, r: e.getBoundingClientRect() })).filter(({ r }) => r.height > 0 && (r.top < -2 || r.bottom > vh + 2))
          .map(({ e }) => (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 18) || e.className));
        return { id: CUR, stripsLeft: Math.max(0, a.left), needCrop, bad };
      });
      if (!r) continue;
      if (r.needCrop > 0 && r.needCrop <= 0.16 && r.stripsLeft > 1) strips.push(r.id);
      if (r.bad.length) cut.push(r.id + ': ' + r.bad.join(', '));
    }
    ok(strips.length === 0, label + ' ' + w + 'x' + h + ': no side strips (' + (strips.join(' ') || 'all screens fill') + ')');
    ok(cut.length === 0, label + ': nothing tappable or readable is cut off (' + (cut.join(' | ') || 'all inside') + ')');
    await p.context().close();
  }
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
