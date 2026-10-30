// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Step 2 checks: Settings, passcode, contacts, photos, Loved Ones, erase, Privacy page.  node tests/contacts.js
const { chromium } = require('playwright');
const zlib = require('zlib');
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
function png(w, h) {   // a small solid-colour PNG made on the fly (stands in for a phone photo)
  const crc = (b) => { let c, t = []; for (let k = 0; k < 256; k++) { c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[k] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 200; raw[o + 1] = 120; raw[o + 2] = 60; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await p.goto('http://localhost:8765/index.html?test=1'); await p.waitForTimeout(700);
  const ev = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
  const sheet = '#settings .sheet';
  const clickText = async (t) => { await p.locator(sheet + ' button', { hasText: t }).first().click(); await wait(250); };
  const fill = async (label, v) => { await p.locator(sheet + ' label.sfield', { has: p.locator('.slabel', { hasText: new RegExp('^' + label.replace(/[()+]/g, '\\$&') + '$') }) }).locator('input').fill(v); };
  const errText = () => ev(() => (document.querySelector('#settings .serr') || {}).textContent || '');

  // Home: gear + privacy link
  ok(await ev(() => !!document.querySelector('#home-view .gear-btn') && !!document.querySelector('#home-view .privacy-link')), 'Home has the Settings gear and the Privacy & Safety link');
  const gearPx = await ev(() => document.querySelector('#home-view .gear-btn').getBoundingClientRect().width);
  ok(gearPx >= 48, 'gear is finger-sized (' + Math.round(gearPx) + ' px)');
  await p.click('#home-view .gear-btn'); await wait(400);
  ok(await ev(() => MM.cur === 'settings'), 'gear opens Settings');
  ok(await ev(() => !!document.querySelector('#settings .fade-note')), 'once-a-day notice appears on first visit');
  ok(await ev(() => /Create A Passcode/.test(document.querySelector('#settings .sheet').textContent)), 'first visit asks to create a passcode');
  ok(await ev(() => /never touched/.test(document.querySelector('#settings .snote').textContent)), 'the permanent note is shown');
  const fs = await ev(() => parseFloat(getComputedStyle(document.querySelector('#settings .sinput')).fontSize));
  ok(fs >= 16, 'typing boxes use ' + fs + ' px text (16+ stops iPhone zooming)');
  // passcode rules
  await fill('Passcode', 'short'); await fill('Type It Again', 'short'); await clickText('Save Passcode');
  ok(/at least 8/.test(await errText()), 'too-short passcode refused');
  await fill('Passcode', 'mango tree 26'); await fill('Type It Again', 'mango tree 27'); await clickText('Save Passcode');
  ok(/match/.test(await errText()), 'mismatched passcodes refused');
  await fill('Passcode', 'mango tree 26'); await fill('Type It Again', 'mango tree 26'); await clickText('Save Passcode'); await wait(1200);
  ok(await ev(() => /Your Contacts \(0 of 20\)/.test(document.querySelector('#settings .sheet').textContent)), 'passcode saved, contact list opens');
  ok(await ev(() => !/mango/.test(localStorage.getItem('tt:pass')) && JSON.parse(localStorage.getItem('tt:pass')).hash.length > 20), 'the passcode itself is never stored (only a fingerprint)');
  // add contacts
  await clickText('+ Add A Contact');
  await fill('Name', 'Grandma'); await fill('WhatsApp Number', '1000000009'); await clickText('Save contact');
  ok(/country code/.test(await errText()), 'number without + and country code is refused');
  await fill('WhatsApp Number', '+1 234'); await clickText('Save contact');
  ok(/8 to 15 digits/.test(await errText()), 'too-short number refused');
  await fill('WhatsApp Number', '+1 000 000 0001'); await clickText('Test On WhatsApp');
  ok(await ev(() => window.__opened.slice(-1)[0] === 'https://wa.me/10000000001'), 'Test button opens WhatsApp with that number');
  await p.setInputFiles('#settings input[type=file]', { name: 'me.png', mimeType: 'image/png', buffer: png(600, 400) }); await wait(800);
  ok(await ev(() => /url\("data:image\/jpeg/.test(document.querySelector('#settings .pprev').style.backgroundImage)), 'chosen photo is redrawn as a small JPEG and previewed');
  await clickText('Save contact'); await wait(300);
  const saved = await ev(() => JSON.parse(localStorage.getItem('tt:contacts')));
  ok(saved.length === 1 && saved[0].phone === '+10000000001' && /^data:image\/jpeg;base64,/.test(saved[0].photo) && saved[0].photo.length < 60000, 'contact saved with clean number and small photo (' + Math.round((saved[0].photo || '').length / 1024) + ' KB)');
  await p.setInputFiles('#settings input[type=file]', []).catch(() => {});
  await clickText('+ Add A Contact'); await fill('Name', '<img src=x onerror=alert(1)>'); await fill('WhatsApp Number', '+10000000002'); await clickText('Save contact');
  ok(await ev(() => !document.querySelector('#settings .sheet img') && /<img/.test(document.querySelector('#settings .sheet').textContent)), 'a name that looks like code is shown as plain text');
  // bad file
  await clickText('Grandma');
  await p.setInputFiles('#settings input[type=file]', { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') }); await wait(600);
  ok(/couldn.t be used/.test(await errText()), 'a broken picture file is refused politely');
  await clickText('Cancel');
  // Loved Ones (no passcode needed)
  await ev(() => { MM.Pass.lock(); MM.go('contact-view'); }); await wait(300);
  ok(await ev(() => document.querySelectorAll('#contact-view .medallion').length === 2), 'Loved Ones shows both contacts without a passcode');
  ok(await ev(() => /data:image\/jpeg/.test([...document.querySelectorAll('#contact-view .med-ring')].map(r => r.style.backgroundImage).join(' '))), 'Loved Ones shows the photo in the circle');
  ok(await ev(() => !/\+1000/.test(document.querySelector('#contact-view').textContent)), 'Loved Ones never shows numbers');
  await p.locator('#contact-view .medallion', { hasText: 'Grandma' }).click(); await wait(200);
  ok(await ev(() => window.__opened.slice(-1)[0] === 'https://wa.me/10000000001'), 'one tap on a circle opens WhatsApp');
  // locked Settings
  await ev(() => MM.go('settings')); await wait(300);
  ok(await ev(() => /Enter Your Passcode/.test(document.querySelector('#settings .sheet').textContent) && !/\+1000/.test(document.querySelector('#settings .sheet').textContent)), 'locked Settings hides numbers and asks for the passcode');
  for (let i = 0; i < 5; i++) { await fill('Passcode', 'wrong pass ' + i); await clickText('Unlock'); await wait(700); }
  ok(/wait/.test(await errText()) && await ev(() => document.querySelector('#settings .sinput').disabled), '5 wrong tries: must wait');
  await ev(() => MM.advance(31000)); await wait(1300);
  await fill('Passcode', 'mango tree 26'); await clickText('Unlock'); await wait(900);
  ok(await ev(() => /Your Contacts \(2 of 20\)/.test(document.querySelector('#settings .sheet').textContent)), 'after waiting, the right passcode unlocks');
  await ev(() => MM.advance(11 * 60000)); await ev(() => MM.go('home-view')); await ev(() => MM.go('settings')); await wait(300);
  ok(await ev(() => /Enter Your Passcode/.test(document.querySelector('#settings .sheet').textContent)), 'locks again after 10 minutes unused');
  // forgot passcode
  await ev(() => localStorage.setItem('tt:chess:totals', JSON.stringify({ won: 3 })));
  await clickText('Forgot Passcode?'); await fill('To Confirm, Type ERASE', 'erase please'); await clickText('Erase Saved Contacts');
  ok(/ERASE/.test(await errText()) && await ev(() => MM.Contacts.list().length === 2), 'forgot: nothing erased without typing ERASE');
  await fill('To Confirm, Type ERASE', 'ERASE'); await clickText('Erase Saved Contacts'); await wait(300);
  ok(await ev(() => MM.Contacts.list().length === 0 && !localStorage.getItem('tt:pass') && !!localStorage.getItem('tt:chess:totals')), 'forgot: contacts and passcode erased, game stats kept');
  ok(await ev(() => /Create A Passcode/.test(document.querySelector('#settings .sheet').textContent)), 'forgot: asks to create a new passcode');
  // erase everything
  await fill('Passcode', 'new passcode 1'); await fill('Type It Again', 'new passcode 1'); await clickText('Save Passcode'); await wait(1200);
  await clickText('Erase All Taarala Thota'); await fill('To Confirm, Type ERASE', 'ERASE'); await clickText('Erase All App Data'); await wait(300);
  ok(await ev(() => Object.keys(localStorage).filter(k => k.startsWith('tt:')).length === 0 && MM.cur === 'home-view'), 'erase all app data removes every saved item and returns Home');
  // daily notice only once a day
  await ev(() => { localStorage.setItem('tt:noticeDay', JSON.stringify('x')); }); await ev(() => MM.go('settings')); await wait(200);
  await ev(() => MM.go('home-view')); await ev(() => document.querySelectorAll('.fade-note').forEach(e => e.remove())); await ev(() => MM.go('settings')); await wait(200);
  ok(await ev(() => !document.querySelector('#settings .fade-note')), 'notice does not repeat the same day');
  // privacy page
  await ev(() => MM.go('home-view')); await p.click('#home-view .privacy-link'); await wait(300);
  ok(await ev(() => MM.cur === 'privacy' && document.querySelectorAll('#privacy .plist li').length === 15), 'Privacy & Safety page shows the 15 points');
  await ev(() => MM.goBack()); ok(await ev(() => MM.cur === 'home-view'), 'Back from Privacy returns Home');
  // 20 max
  await ev(() => { const a = []; for (let i = 0; i < 20; i++) a.push({ id: 'k' + i, name: 'P' + i, phone: '+1000000' + String(1000 + i) }); localStorage.setItem('tt:contacts', JSON.stringify(a)); });
  await ev(() => MM.go('settings')); await fill('Passcode', 'x2345678'); await fill('Type It Again', 'x2345678'); await clickText('Save Passcode'); await wait(1200);
  ok(await ev(() => [...document.querySelectorAll('#settings .sbtn')].some(b => b.disabled && /maximum/.test(b.textContent))), 'adding is blocked at 20 contacts');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log('RESULT', n - f, 'passed', f, 'failed'); await b.close();
})();
