// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Settings locks itself: as soon as you leave it, after 10 minutes without a tap in Settings, and taps in games don't count.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ev = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
  await p.goto('http://localhost:8765/index.html?test=1'); await wait(700);
  await ev(async () => { Object.keys(localStorage).filter(k => k.startsWith('tt:')).forEach(k => localStorage.removeItem(k)); localStorage.setItem('tt:noticeDay', JSON.stringify('x')); await MM.Pass.create('garden stars 1'); });
  const view = () => ev(() => SCREENS.settings.view);
  await ev(() => MM.go('settings')); await wait(300);
  ok(await view() === 'list', 'right after creating the passcode: Settings open');
  await p.locator('#settings .wbtn.home, #settings [aria-label="Home"]').first().click(); await wait(300);
  ok(await ev(() => !MM.Pass.isUnlocked()), 'tapping Home locks Settings');
  await ev(() => MM.go('settings')); await wait(300);
  ok(await view() === 'unlock', 'coming back asks for the passcode');
  await p.fill('#settings input[type="password"]', 'garden stars 1'); await p.locator('#settings .sbtn', { hasText: 'Unlock' }).click(); await wait(1500);
  ok(await view() === 'list', 'passcode opens it again');
  await ev(() => MM.go('games')); await wait(200);
  ok(await ev(() => !MM.Pass.isUnlocked()), 'going to another screen any other way also locks it');
  // taps inside Settings keep it open; 10 minutes without one shows the passcode page
  await ev(() => MM.go('settings')); await wait(200);
  await p.fill('#settings input[type="password"]', 'garden stars 1'); await p.locator('#settings .sbtn', { hasText: 'Unlock' }).click(); await wait(1500);
  await ev(() => MM.advance(9 * 60000)); await p.mouse.click(200, 400); await ev(() => MM.advance(9 * 60000));
  ok(await ev(() => MM.Pass.isUnlocked()), 'a tap in Settings keeps it open for another 10 minutes');
  await ev(() => MM.advance(11 * 60000)); await wait(16000);
  ok(await view() === 'unlock', 'after 10 minutes without a tap, the passcode page comes back by itself');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
