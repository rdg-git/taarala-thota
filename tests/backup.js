// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Step 3 checks: backup, restore, tampered files, reminder.  node tests/backup.js
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttb-'));
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  const ev = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
  const sheet = '#settings .sheet';
  const clickText = async (t) => { await p.locator(sheet + ' button', { hasText: t }).first().click(); await wait(250); };
  const fill = async (label, v) => { await p.locator(sheet + ' label.sfield', { has: p.locator('.slabel', { hasText: new RegExp('^' + label + '$') }) }).locator('input').fill(v); };
  const errText = () => ev(() => (document.querySelector('#settings .serr') || {}).textContent || '');
  const panelText = () => ev(() => (document.querySelector('#settings .panel-card') || {}).textContent || '');

  // a brand-new visitor is never reminded
  await ev(() => { localStorage.setItem('tt:since', JSON.stringify(MM.nowMs() - 30 * 86400000)); MM.go('games'); MM.go('home-view'); }); await wait(1000);
  ok(await ev(() => !document.querySelector('#home-view .panel-card')), 'new visitor with nothing saved: no backup reminder');
  // set up data
  await ev(async () => {
    await MM.Pass.create('my pass code 1');
    localStorage.setItem('tt:contacts', JSON.stringify([{ id: 'a', name: 'Test Star', phone: '+10000000001', accent: '#FF9F40' }, { id: 'b', name: 'Moon Friend', phone: '+10000000002' }]));
    localStorage.setItem('tt:chess:totals', JSON.stringify({ won: 4, lost: 1, forfeited: 0 }));
    localStorage.setItem('tt:music', 'off'); localStorage.setItem('tt:noticeDay', JSON.stringify('x'));
  });
  // reminder shows on Home after 6+ days
  await ev(() => { MM.go('games'); MM.go('home-view'); }); await wait(1000);
  ok(await ev(() => /Time for a backup/.test((document.querySelector('#home-view .panel-card') || {}).textContent || '')), 'reminder appears on Home when something is saved and no backup in 6+ days');
  await p.locator('#home-view .panel-btn', { hasText: 'Later' }).click(); await wait(200);
  await ev(() => { MM.go('games'); MM.go('home-view'); }); await wait(1000);
  ok(await ev(() => !document.querySelector('#home-view .panel-card')), 'Later: not shown again the same day');
  await ev(() => { MM.advance(86400000 + 1000); MM.go('games'); MM.go('home-view'); }); await wait(1000);
  ok(await ev(() => !!document.querySelector('#home-view .panel-card')), 'Later: shown again the next day');
  await ev(() => MM.go('bubble-home')); await wait(900);
  ok(await ev(() => !document.querySelector('#bubble-home .panel-card')), 'never shown on game screens');
  // Back up now from the reminder goes to Settings -> backup (after unlock)
  await ev(() => MM.go('home-view')); await wait(1000);
  await ev(() => MM.Pass.lock());
  await p.locator('#home-view .panel-btn', { hasText: 'Back up now' }).click(); await wait(300);
  ok(await ev(() => MM.cur === 'settings' && /Enter your passcode/.test(document.querySelector('#settings .sheet').textContent)), 'Back up now asks for the passcode first');
  await fill('Passcode', 'my pass code 1'); await clickText('Unlock'); await wait(1000);
  ok(await ev(() => /Back up your data/.test(document.querySelector('#settings .sheet').textContent)), '...then opens the backup page');
  // password rules
  await fill('Backup password', 'short'); await fill('Type it again', 'short'); await clickText('Create backup file');
  ok(/at least 8/.test(await errText()), 'too-short backup password refused');
  await fill('Backup password', 'backup pass 9'); await fill('Type it again', 'backup pass 8'); await clickText('Create backup file');
  ok(/match/.test(await errText()), 'mismatched backup passwords refused');
  await fill('Backup password', 'backup pass 9'); await fill('Type it again', 'backup pass 9');
  const [dl] = await Promise.all([p.waitForEvent('download'), clickText('Create backup file')]);
  const file = path.join(tmp, dl.suggestedFilename()); await dl.saveAs(file); await wait(600);
  ok(/^taarala-thota-backup-\d{4}-\d\d-\d\d\.ttbackup$/.test(dl.suggestedFilename()), 'backup file downloaded: ' + dl.suggestedFilename());
  const txt = fs.readFileSync(file, 'utf8');
  ok(!/Test Star|10000000001|tt:|chess|pass code/i.test(txt) && JSON.parse(txt).app === 'taarala-thota-backup', 'file is locked: no names, numbers or labels readable inside');
  ok(await ev(() => !!localStorage.getItem('tt:lastBackup') && !localStorage.getItem('tt:backupSnooze')), 'last-backup date recorded');
  await ev(() => document.querySelectorAll('.panel-ov').forEach(e => e.remove()));
  await ev(() => { MM.go('games'); MM.go('home-view'); }); await wait(1000);
  ok(await ev(() => !document.querySelector('#home-view .panel-card')), 'no reminder right after a backup');
  // wipe, set a NEW passcode, restore
  await ev(async () => { Object.keys(localStorage).filter(k => k.startsWith('tt:')).forEach(k => localStorage.removeItem(k)); localStorage.setItem('tt:noticeDay', JSON.stringify('x')); await MM.Pass.create('new pass code 2'); MM.go('home-view'); MM.Pass.unlockedUntil = MM.nowMs() + 600000; MM.go('settings'); });
  await wait(400); await clickText('Restore from a backup');
  await clickText('Open backup'); ok(/choose the backup file/.test(await errText()), 'asks for a file first');
  await p.setInputFiles('#settings input[type=file]', file);
  await fill('Backup password', 'wrong password'); await clickText('Open backup'); await wait(1500);
  ok(/doesn.t open this backup/.test(await errText()), 'wrong backup password refused');
  await fill('Backup password', 'backup pass 9'); await clickText('Open backup'); await wait(1500);
  ok(/has 2 contacts/.test(await panelText()) && /stays the same/.test(await panelText()), 'confirmation shows date and contact count before replacing');
  await p.locator('#settings .panel-btn', { hasText: 'Replace' }).click(); await wait(400);
  ok(await ev(() => MM.Contacts.list().length === 2 && JSON.parse(localStorage.getItem('tt:chess:totals')).won === 4 && localStorage.getItem('tt:music') === 'off'), 'restore brings back contacts, stats and settings');
  ok(await ev(async () => { MM.Pass.lock(); return (await MM.Pass.check('new pass code 2')) === 'ok'; }), 'restore keeps the current passcode (the old one is not inside backups)');
  // hostile files
  const tampered = JSON.parse(txt); tampered.data = (tampered.data[0] === 'A' ? 'B' : 'A') + tampered.data.slice(1); fs.writeFileSync(path.join(tmp, 't.ttbackup'), JSON.stringify(tampered));
  fs.writeFileSync(path.join(tmp, 'x.ttbackup'), 'hello, I am not a backup');
  fs.writeFileSync(path.join(tmp, 'big.ttbackup'), Buffer.alloc(16 * 1024 * 1024, 65));
  await ev(() => { MM.go('home-view'); MM.Pass.unlockedUntil = MM.nowMs() + 600000; MM.go('settings'); }); await wait(300); await clickText('Restore from a backup');
  for (const [fn, re, label] of [['t.ttbackup', /doesn.t open/, 'a changed (tampered) backup is refused'], ['x.ttbackup', /isn.t a Taarala Thota backup/, 'a file that is not a backup is refused'], ['big.ttbackup', /too big/, 'an oversized file is refused']]) {
    await p.setInputFiles('#settings input[type=file]', path.join(tmp, fn)); await fill('Backup password', 'backup pass 9'); await clickText('Open backup'); await wait(1200);
    ok(re.test(await errText()), label);
  }
  // a correctly locked but booby-trapped backup: extra items, bad contacts, fake photo
  const evil = await ev(async () => {
    const items = { 'tt:contacts': JSON.stringify([{ id: 'g', name: 'Good', phone: '+10000000003' }, { id: 'e', name: 'Evil', phone: 'javascript:alert(1)' }, { id: 'p', name: 'Pic', phone: '+10000000004', photo: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }]),
      'tt:pass': JSON.stringify({ salt: 'AAAA', hash: 'BBBB' }), 'tt:other': '"x"', 'evil:key': '"x"', 'tt:music': '<script>' };
    const payload = JSON.stringify({ app: 'taarala-thota-backup', v: 1, created: new Date().toISOString(), items });
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await backupKey('backup pass 9', salt, 210000);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));
    return JSON.stringify({ app: 'taarala-thota-backup', v: 1, kdf: 'PBKDF2-SHA256', rounds: 210000, salt: b64(salt), iv: b64(iv), data: b64(data) });
  });
  fs.writeFileSync(path.join(tmp, 'evil.ttbackup'), evil);
  await p.setInputFiles('#settings input[type=file]', path.join(tmp, 'evil.ttbackup')); await fill('Backup password', 'backup pass 9'); await clickText('Open backup'); await wait(1500);
  ok(/has 2 contacts/.test(await panelText()), 'booby-trapped backup: the contact with a bad number is dropped');
  await p.locator('#settings .panel-btn', { hasText: 'Replace' }).click(); await wait(400);
  ok(await ev(() => !localStorage.getItem('tt:other') && !localStorage.getItem('evil:key') && localStorage.getItem('tt:music') !== '<script>'), 'booby-trapped backup: unknown and invalid items ignored');
  ok(await ev(async () => { MM.Pass.lock(); return (await MM.Pass.check('new pass code 2')) === 'ok'; }), 'booby-trapped backup: cannot replace the passcode');
  ok(await ev(() => MM.Contacts.list().every(c => !c.photo || /^data:image\/jpeg/.test(c.photo)) && MM.Contacts.list().find(c => c.name === 'Pic').photo === ''), 'booby-trapped backup: fake photo removed');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log('RESULT', n - f, 'passed', f, 'failed'); await b.close();
})();
