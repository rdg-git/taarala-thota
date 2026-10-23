// Step 2 screenshots: node tests/shots2.js <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || 'test-output';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [tag, w, h] of [['android', 390, 844], ['iphone-safari', 390, 664]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(900);
    const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${tag}-${n}.png` }); };
    await shot('1-home');
    await p.evaluate(() => MM.go('settings')); await shot('2-settings-create');
    await p.evaluate(async () => { document.querySelectorAll('.fade-note').forEach(e => e.remove()); await MM.Pass.create('demo pass 1');
      localStorage.setItem('tt:contacts', JSON.stringify([{ id: 'a', name: 'Grandma', phone: '+10000000001', accent: '#FF9F40' }, { id: 'b', name: 'Uncle Ravi', phone: '+10000000002' }, { id: 'c', name: 'Best Friend', phone: '+10000000003', accent: '#A78BFA' }]));
      MM.go('home-view'); MM.go('settings'); });
    await shot('3-settings-list');
    await p.locator('#settings .sbtn', { hasText: '+ Add a contact' }).click(); await shot('4-add-contact');
    await p.evaluate(() => { MM.Pass.lock(); MM.go('home-view'); MM.go('settings'); }); await shot('5-locked');
    await p.evaluate(() => MM.go('contact-view')); await shot('6-loved-ones');
    await p.evaluate(() => MM.go('privacy')); await shot('7-privacy');
    await ctx.close();
  }
  await b.close();
})();
