// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Step 4 checks: every picture loads (smaller AVIF where supported, WebP fallback exists), Hidden Comets words, comets.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs = [], bad = []; p.on('pageerror', e => errs.push(e.message)); p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(800);
  const ev = (fn, a) => p.evaluate(fn, a);
  ok(await ev(() => PIC_EXT) === 'avif', 'this browser gets the smaller AVIF pictures');
  const ids = await ev(() => Object.keys(SCREENS));
  for (const id of ids) { await ev((i) => MM.go(i), id); await p.waitForTimeout(80); }
  await p.waitForTimeout(1200);
  const broken = await ev(() => Object.values(SCREENS).filter(S => S.loaded).map(S => S.art.querySelector('img.pic')).filter(i => i && !(i.complete && i.naturalWidth > 0)).map(i => i.src));
  ok(broken.length === 0 && bad.length === 0, 'every picture loads (' + (broken.concat(bad).join(' ') || 'all fine') + ')');
  const names = await ev(() => Object.keys(PIC));
  const missing = names.filter(nm => !fs.existsSync(path.join(__dirname, '..', 'public', 'img', nm + '.webp')) || !fs.existsSync(path.join(__dirname, '..', 'public', 'img', nm + '.avif')));
  ok(missing.length === 0, 'every picture has both an AVIF and a WebP fallback (' + (missing.join(',') || 'complete') + ')');
  ok(await ev(() => { PIC_EXT = 'webp'; const u = picUrl('home'); PIC_EXT = 'avif'; return /home\.webp\?v=[0-9a-f]{8}$/.test(u); }), 'fallback addresses point at WebP with a fingerprint');
  await ev(() => MM.go('ms-home')); await p.waitForTimeout(300);
  ok(await ev(() => /Hidden Comets/.test(document.querySelector('#ms-home').textContent) && ['Gentle', 'Medium', 'Hard', 'Stats'].every(w => document.querySelector('#ms-home').textContent.includes(w))), 'Hidden Comets screen shows its words, added by the app');
  ok(await ev(() => !/minesweeper/i.test(document.body.innerText)), 'the word Minesweeper is never shown');
  await ev(() => document.querySelector('#ms-home .hot[aria-label="Medium"]').click()); await p.waitForTimeout(300);
  ok(await ev(() => MM.cur === 'ms-medium'), 'Medium lantern opens the game');
  await ev(() => { const S = SCREENS['ms-medium']; const i = S.G.cells.findIndex(c => c.mine); S.boardEl.children[i].dispatchEvent(new PointerEvent('pointerdown')); S.boardEl.children[i].dispatchEvent(new PointerEvent('pointerup')); });
  await p.waitForTimeout(900);
  ok(await ev(() => /A Comet/.test(document.querySelector('#ms-medium .panel-card').textContent) && !!document.querySelector('#ms-medium .mscell.open svg circle')), 'finding a comet shows comets and a gentle card');
  await ev(() => MM.go('games')); ok(await ev(() => /Hidden Comets/.test(document.querySelector('#games').textContent)), 'Games screen label reads Hidden Comets');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log('RESULT', n - f, 'passed', f, 'failed'); await b.close();
})();
