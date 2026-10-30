// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Music button: present on every screen; turning music off is remembered (also after reloading); turning it on again plays across screens;
// no sign-in or admin screen exists.
const { chromium } = require('playwright');
let f = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelectorAll('.music-btn').length) >= 20, 'music button exists on many screens');
  // every screen except Home has one; Home has the picture's own button
  const miss = await p.evaluate(() => Object.keys(SCREENS).filter(k => k !== 'home-view' && !SCREENS[k].art.querySelector('.music-btn')));
  ok(miss.length === 0, 'every screen has a music button (missing: ' + miss.join(',') + ')');
  ok(await p.evaluate(() => !document.getElementById('login') && !document.getElementById('admin')), 'there is no sign-in or admin screen');
  // first tap on the button while music "on" but not yet started -> turns OFF
  await p.evaluate(() => MM.go('games')); 
  await p.click('#games .music-btn'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !MM.Music.wantsOn() && localStorage.getItem('tt:music') === 'off'), 'tap turns music off and remembers it');
  ok(await p.evaluate(() => [...document.querySelectorAll('.music-btn')].every(b => b.classList.contains('off'))), 'all buttons show the off state (slash)');
  // taps elsewhere do NOT start it again; navigation does not either
  await p.mouse.click(200, 500); await p.evaluate(() => MM.go('bubble-home')); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !MM.Music.isOn()), 'stays off after other taps and screen changes');
  // reload (new visit) stays off
  await p.reload(); await p.waitForTimeout(600); await p.mouse.click(200, 400); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !MM.Music.isOn() && !MM.Music.wantsOn()), 'stays off after reload and first tap');
  // turn on again by button
  await p.evaluate(() => MM.go('games')); await p.click('#games .music-btn'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => MM.Music.isOn() && localStorage.getItem('tt:music') === 'on'), 'tapping again turns it on');
  await p.evaluate(() => MM.go('contact-view')); await p.waitForTimeout(300);
  ok(await p.evaluate(() => MM.Music.isOn()), 'music keeps playing across screens');
  console.log(errs.join('\n') || 'no errors'); console.log(f ? 'FAILED' : 'ALL PASSED'); await b.close();
})();
