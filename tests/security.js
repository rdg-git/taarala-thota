// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Step 6 checks: security rules are sent and the whole app works under them; blocked things stay blocked.
const { chromium } = require('playwright');
const http = require('http'), zlib = require('zlib');
function png(w, h) {   // a small solid-colour PNG made on the fly (stands in for a phone photo)
  const crc = (b) => { let c, t = []; for (let k = 0; k < 256; k++) { c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[k] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 200; raw[o + 1] = 120; raw[o + 2] = 60; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  // a pretend "other website" on another port that tries to show the app inside its own page
  const evil = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end('<iframe id=f src="http://localhost:8765/index.html" width=300 height=500></iframe>'); });
  await new Promise(r => evil.listen(8766, '127.0.0.1', r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
    const p = await ctx.newPage(); const errs = [], csp = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
    const resp = await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(900);
    const h = resp.headers();
    ok(/script-src 'self'/.test(h['content-security-policy'] || '') && /frame-ancestors 'none'/.test(h['content-security-policy']), 'strict security rules are sent with the page');
    ok(h['x-content-type-options'] === 'nosniff' && h['x-frame-options'] === 'DENY' && h['referrer-policy'] === 'no-referrer' && /camera=\(\)/.test(h['permissions-policy'] || ''), 'extra protections are sent (no sniffing, no framing, no referrer, no camera/mic/location)');
    const ev = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
    // use every part of the app under the rules
    for (const id of await ev(() => Object.keys(SCREENS))) { await ev((i) => { try { MM.go(i); } catch (e) {} }, id); await wait(60); }
    await ev(() => { CH.pendingLevel = 'easy'; chsStart('w'); }); await wait(300);
    await ev(() => { document.querySelectorAll('#chs-board .ccell')[52].click(); document.querySelectorAll('#chs-board .ccell')[36].click(); }); await wait(3500);
    ok(await ev(() => CH.G.state.fullmove >= 2), 'the computer player (background helper) still works under the rules');
    await ev(async () => { await MM.Pass.create('sec pass 123'); localStorage.setItem('tt:noticeDay', JSON.stringify('x')); MM.go('home-view'); MM.Pass.unlockedUntil = MM.nowMs() + 600000; MM.go('settings'); }); await wait(400);
    await p.locator('#settings .sbtn', { hasText: '+ Add A Contact' }).click(); await wait(200);
    await p.setInputFiles('#settings input[type=file]', { name: 'a.png', mimeType: 'image/png', buffer: png(300, 300) }); await wait(700);
    ok(await ev(() => /data:image\/jpeg/.test(document.querySelector('#settings .pprev').style.backgroundImage)), 'contact photos still work under the rules');
    await ev(() => { MM.go('home-view'); MM.Pass.unlockedUntil = MM.nowMs() + 600000; MM.go('settings'); }); await wait(300);
    await p.locator('#settings .sbtn', { hasText: 'Back Up Now' }).click(); await wait(200);
    for (const lab of ['Backup Password', 'Type It Again']) await p.locator('#settings label.sfield', { has: p.locator('.slabel', { hasText: new RegExp('^' + lab + '$') }) }).locator('input').fill('backup 12345');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('#settings .sbtn', { hasText: 'Create Backup File' }).click()]);
    ok(!!dl, 'backups still work under the rules');
    ok(csp.length === 0, 'nothing in the app is blocked by the rules (' + (csp[0] || 'none') + ')');
    // things that must stay blocked
    await ev(() => { const s = document.createElement('script'); s.textContent = 'window.__injected = 1'; document.body.appendChild(s); }); await wait(300);
    ok(await ev(() => window.__injected === undefined), 'code slipped into the page is refused');
    await ev(() => { const i = document.createElement('img'); i.src = 'https://example.com/x.png'; document.body.appendChild(i); const s = document.createElement('script'); s.src = 'https://example.com/x.js'; document.body.appendChild(s); }); await wait(800);
    ok(csp.some(t => /example\.com/.test(t)), 'outside pictures and scripts are refused');
    ok(await ev(async () => { try { await fetch('https://example.com/'); return false; } catch (e) { return true; } }), 'sending anything to an outside address is refused');
    // framing by another site
    const q = await ctx.newPage(); await q.goto('http://127.0.0.1:8766/'); await q.waitForTimeout(1500);
    const framed = await q.frames().filter(fr => fr !== q.mainFrame()).map(fr => fr.url());
    const inner = await q.evaluate(() => { try { return document.getElementById('f').contentDocument && document.getElementById('f').contentDocument.body.innerHTML.length; } catch (e) { return -1; } });
    ok(!(await Promise.all(q.frames().filter(fr => fr !== q.mainFrame()).map(fr => fr.evaluate(() => typeof SCREENS !== 'undefined').catch(() => false)))).some(Boolean), 'another website cannot show the app inside its page');
    ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  } finally { await b.close(); evil.close(); }
  console.log('RESULT', n - f, 'passed', f, 'failed');
})();
