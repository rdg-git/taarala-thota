// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Share feedback: buttons on Privacy & Safety and in Settings, one box, only the message and release sent,
// thank-you on success, the message kept on failure, Back returns where you came from.
const { chromium } = require('playwright');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let sent = null, reply = 200;
  await p.route('**/api/feedback', async (route) => { sent = route.request().postDataJSON(); await route.fulfill({ status: reply, contentType: 'application/json', body: '{"ok":' + (reply === 200) + '}' }); });
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  await p.evaluate(() => MM.go('privacy')); await p.waitForTimeout(200);
  ok(await p.evaluate(() => [...document.querySelectorAll('#privacy .sbtn')].some(x => /Share feedback/.test(x.textContent))), 'Privacy & Safety has "Share feedback (anonymous)"');
  await p.evaluate(() => MM.go('settings')); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const sh = document.querySelector('#settings .sheet'); return /Share feedback/.test(sh.children[2].textContent); }), 'Settings has it too, before the passcode');
  await p.locator('#settings .fb-open').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => MM.cur === 'feedback' && document.querySelectorAll('#feedback textarea').length === 1 && document.querySelectorAll('#feedback input').length === 0), 'one box, no other fields');
  ok(await p.evaluate(() => /kind and respectful/.test(document.querySelector('#feedback .sheet').textContent)), 'asks people to keep it kind and respectful');
  await p.locator('#feedback .sbtn', { hasText: 'Send' }).click(); await p.waitForTimeout(200);
  ok(sent === null && /write something/.test(await p.textContent('#feedback .fb-msg')), 'empty box: nothing sent');
  await p.fill('#feedback textarea', 'More levels please <b>bold</b>'); await p.locator('#feedback .sbtn', { hasText: 'Send' }).click(); await p.waitForTimeout(400);
  ok(sent && Object.keys(sent).sort().join() === 'message,release' && sent.message === 'More levels please <b>bold</b>' && sent.release === (await p.evaluate(() => APP_RELEASE)), 'only the message and the app release are sent');
  ok(/Thank you/.test(await p.textContent('#feedback .fb-msg')) && (await p.inputValue('#feedback textarea')) === '', 'thank-you shown and the box cleared');
  ok(await p.evaluate(() => document.querySelector('#feedback .sbtn:not(.fb-open)').disabled), 'short pause before another message');
  // failure keeps the message
  await p.evaluate(() => { document.querySelectorAll('#feedback .sbtn').forEach(x => x.disabled = false); });
  reply = 500; await p.fill('#feedback textarea', 'keep me'); await p.locator('#feedback .sbtn', { hasText: 'Send' }).click(); await p.waitForTimeout(400);
  ok(/still here/.test(await p.textContent('#feedback .fb-msg')) && (await p.inputValue('#feedback textarea')) === 'keep me', 'if sending fails, the message stays in the box');
  await p.evaluate(() => goBack()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => MM.cur === 'settings'), 'Back returns to where you came from (Settings)');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log('RESULT', n - f, 'passed', f, 'failed');
})();
