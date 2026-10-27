// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(500);
  await p.mouse.click(200, 400);
  const res = await p.evaluate(async () => {
    const an = window.__an; const out = { rms: [], peak: 0, hz: new Set() };
    const buf = new Float32Array(an.fftSize), fb = new Float32Array(an.frequencyBinCount);
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250));
      an.getFloatTimeDomainData(buf); let s = 0, pk = 0; for (const v of buf) { s += v * v; pk = Math.max(pk, Math.abs(v)); }
      out.rms.push(Math.sqrt(s / buf.length)); out.peak = Math.max(out.peak, pk);
      an.getFloatFrequencyData(fb); let mi = 0; for (let k = 3; k < 400; k++) if (fb[k] > fb[mi]) mi = k;
      out.hz.add(Math.round(mi * an.context.sampleRate / an.fftSize));
    }
    out.hz = [...out.hz].sort((a, c) => a - c);
    return out;
  });
  console.log('state ok; rms avg', (res.rms.reduce((a, c) => a + c, 0) / res.rms.length).toFixed(4), 'peak', res.peak.toFixed(3), 'dominant Hz seen:', res.hz.join(','));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
