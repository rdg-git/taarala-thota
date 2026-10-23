// ============================================================
// SETTINGS (passcode-protected) and PRIVACY & SAFETY page
// Built on the Loved Ones night-sky picture with a dark frosted sheet on top.
// All text is set with textContent: anything a person types is shown as plain text, never run as code.
// ============================================================
const SETTINGS_NOTE = 'Contacts saved here stay only on this phone, inside Taarala Thota. Anyone using this phone can call them from Loved Ones and see their names and photos, but only someone with the passcode can see or change the numbers. Your phone’s own contacts are never touched.';
const FORGOT_TEXT = 'If you forget this passcode, the contacts you saved in Taarala Thota will be erased, and you’ll need to add them again. Your phone’s own contacts and WhatsApp are not affected.';
const DAILY_NOTICE = 'Contacts saved here stay only on this phone. Your phone’s own contacts are never touched.';
const OFFICIAL_ADDRESS = '';   // filled in at launch
const PRIVACY_POINTS = [
  'Everything stays on this phone. No sign-in, no ads, no tracking.',
  'Contacts you save here exist only in this app. Your phone’s own contacts and WhatsApp are never changed.',
  'Anyone using this phone can call your saved contacts from Loved Ones and see their names and photos. Seeing or changing numbers needs your passcode.',
  'Keep your phone locked with a PIN, fingerprint or face unlock. That also protects this app’s data.',
  'Choose a passcode you’ll remember. If you forget it, your saved contacts must be erased and added again.',
  'Back up regularly, and keep the backup file private. Its password can’t be recovered.',
  'On iPhone, add the app to your Home Screen, so your data is kept even if you don’t open it for a while.',
  'Clearing your browser’s data or removing the app deletes everything, unless you have a backup.',
  'Tapping a contact only opens WhatsApp. Nothing is ever sent automatically.',
  'Only use the official address' + (OFFICIAL_ADDRESS ? ': ' + OFFICIAL_ADDRESS + '.' : ' shared by the creator.') + ' Copies elsewhere aren’t ours.'
];

// ---- tiny DOM builders (always plain text) ----
function tx(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, cls, fn) { const b = tx('button', 'sbtn ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', (ev) => { ev.stopPropagation(); try { fn && fn(ev); } catch (e) { console.error(e); } }); return b; }
function field(labelText, type, opts) {
  opts = opts || {};
  const w = tx('label', 'sfield'); w.appendChild(tx('span', 'slabel', labelText));
  const i = document.createElement('input'); i.type = type; i.className = 'sinput';
  if (opts.value != null) i.value = opts.value;
  if (opts.placeholder) i.placeholder = opts.placeholder;
  if (opts.inputmode) i.inputMode = opts.inputmode;
  if (opts.max) i.maxLength = opts.max;
  i.autocomplete = opts.autocomplete || 'off'; i.spellcheck = false; i.setAttribute('autocapitalize', opts.caps || 'off');
  w.appendChild(i); return { wrap: w, input: i };
}
function today() { const d = new Date(nowMs()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

// ============================================================
function buildSettings() {
  const S = defScreen('settings', 'loved', { parent: 'home-view', name: 'Settings' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 100, 150, 520, 140, 92, 'Settings');
  const sheet = el('div', 'sheet'); place(sheet, 45, 330, 763, 1470, S); S.art.appendChild(sheet);
  S.sheet = sheet; S.view = null;
  S.onShow = () => { S.view = null; renderSettings(S); dailyNotice(S); };
  S.onHide = () => { clearInterval(S.waitTimer); };
}
function dailyNotice(S) {
  if (Store.get('noticeDay', '') === today()) return;
  Store.set('noticeDay', today());
  const b = tx('button', 'fade-note', DAILY_NOTICE); b.type = 'button';
  b.addEventListener('click', (ev) => { ev.stopPropagation(); b.classList.add('out'); setTimeout(() => b.remove(), 500); });
  S.el.appendChild(b);
  setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 600); }, 6000);
}
function renderSettings(S, view, data) {
  const sh = S.sheet; if (!sh) return;
  clearInterval(S.waitTimer);
  if (!Pass.isSet()) view = 'create';
  else if (!Pass.isUnlocked() && view !== 'forgot') view = 'unlock';
  else view = view || 'list';
  S.view = view; sh.innerHTML = ''; sh.scrollTop = 0;
  ({ create: viewCreate, unlock: viewUnlock, forgot: viewForgot, list: viewList, form: viewForm, eraseall: viewEraseAll })[view](S, sh, data || {});
  if (view !== 'list' && view !== 'form') { sh.appendChild(tx('div', 'snote', SETTINGS_NOTE)); }
}

function viewCreate(S, sh) {
  sh.appendChild(tx('h3', '', 'Create a passcode'));
  sh.appendChild(tx('p', '', 'The passcode protects your contacts’ numbers. Use at least ' + PASS_MIN + ' characters (letters, numbers or a short phrase).'));
  sh.appendChild(tx('p', 'swarn', FORGOT_TEXT));
  const a = field('Passcode', 'password', { autocomplete: 'new-password' }), b = field('Type it again', 'password', { autocomplete: 'new-password' });
  sh.append(a.wrap, b.wrap, showToggle([a.input, b.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  sh.appendChild(btn('Save passcode', '', async () => {
    const p = a.input.value;
    if (Array.from(p).length < PASS_MIN) { err.textContent = 'Please use at least ' + PASS_MIN + ' characters.'; return; }
    if (p !== b.input.value) { err.textContent = 'The two passcodes don’t match. Please type them again.'; return; }
    err.textContent = 'Saving…'; await Pass.create(p); renderSettings(S, 'list');
  }));
}
function showToggle(inputs) {
  const w = tx('label', 'scheck'); const c = document.createElement('input'); c.type = 'checkbox';
  c.addEventListener('change', () => inputs.forEach(i => { i.type = c.checked ? 'text' : 'password'; }));
  w.append(c, tx('span', '', 'Show passcode')); return w;
}
function viewUnlock(S, sh) {
  sh.appendChild(tx('h3', '', 'Enter your passcode'));
  sh.appendChild(tx('p', '', 'Settings is locked to protect your contacts’ numbers.'));
  const a = field('Passcode', 'password', { autocomplete: 'current-password' });
  sh.append(a.wrap, showToggle([a.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  const go = btn('Unlock', '', async () => {
    const r = await Pass.check(a.input.value);
    if (r === 'ok') { renderSettings(S, 'list'); return; }
    a.input.value = ''; showWait();
    if (r === 'wrong' && Pass.waitLeft() <= 0) err.textContent = 'That passcode isn’t right. Please try again.';
  });
  sh.appendChild(go);
  a.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });
  const forgot = btn('Forgot passcode?', 'slink', () => renderSettings(S, 'forgot')); sh.appendChild(forgot);
  function showWait() {
    const left = Pass.waitLeft();
    a.input.disabled = go.disabled = left > 0;
    if (left > 0) err.textContent = 'Too many wrong tries. Please wait ' + Math.ceil(left / 1000) + ' seconds.';
    else if (/wait/.test(err.textContent)) err.textContent = '';
  }
  showWait(); S.waitTimer = setInterval(showWait, 1000);
}
function viewForgot(S, sh) {
  sh.appendChild(tx('h3', '', 'Forgot your passcode?'));
  sh.appendChild(tx('p', '', FORGOT_TEXT));
  sh.appendChild(tx('p', '', 'Your games, progress and stats stay as they are.'));
  const a = field('To confirm, type ERASE', 'text', { caps: 'characters' }); sh.appendChild(a.wrap);
  const err = tx('p', 'serr'); sh.appendChild(err);
  sh.appendChild(btn('Erase saved contacts', 'danger', () => {
    if (a.input.value.trim().toUpperCase() !== 'ERASE') { err.textContent = 'Please type the word ERASE to confirm.'; return; }
    Pass.forget(); toast(S, 'Saved contacts erased'); renderSettings(S, 'create');
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S)));
}
function viewList(S, sh) {
  const list = Contacts.list().sort((x, y) => x.name.localeCompare(y.name));
  sh.appendChild(tx('h3', '', 'Your contacts (' + list.length + ' of ' + CONTACT_MAX + ')'));
  if (!list.length) sh.appendChild(tx('p', '', 'No contacts yet. Add the people you call most, and they’ll appear in Loved Ones.'));
  list.forEach(c => {
    const r = tx('button', 'crow'); r.type = 'button';
    r.appendChild(circleFor(c, 'cdot'));
    const t = tx('span', 'ctext'); t.append(tx('span', 'cname', c.name), tx('span', 'cnum', c.phone)); r.appendChild(t);
    r.appendChild(tx('span', 'carrow', '›'));
    r.addEventListener('click', (ev) => { ev.stopPropagation(); renderSettings(S, 'form', { c }); });
    sh.appendChild(r);
  });
  const add = btn('+ Add a contact', '', () => renderSettings(S, 'form', {}));
  if (list.length >= CONTACT_MAX) { add.disabled = true; add.textContent = 'You have the maximum of ' + CONTACT_MAX + ' contacts'; }
  sh.appendChild(add);
  sh.appendChild(btn('Lock Settings now', 'secondary', () => { Pass.lock(); goHome(); }));
  sh.appendChild(btn('Privacy & safety', 'slink', () => go('privacy')));
  sh.appendChild(tx('div', 'snote', SETTINGS_NOTE));
  sh.appendChild(btn('Erase everything on this phone', 'slink danger-link', () => renderSettings(S, 'eraseall')));
}
function circleFor(c, cls) {
  const d = tx('span', cls);
  if (isSafePhoto(c.photo)) d.style.backgroundImage = 'url("' + c.photo + '")';
  else { d.style.background = accentFor(c); d.textContent = initialOf(c.name); }
  return d;
}
function viewForm(S, sh, data) {
  const c = data.c || null, edit = !!c;
  let photo = edit && isSafePhoto(c.photo) ? c.photo : '', accent = edit ? (c.accent || '') : '';
  sh.appendChild(tx('h3', '', edit ? 'Edit contact' : 'Add a contact'));
  const nm = field('Name', 'text', { value: edit ? c.name : '', max: NAME_MAX, caps: 'words', placeholder: 'e.g. Grandma' });
  const ph = field('WhatsApp number', 'tel', { value: edit ? c.phone : '+', inputmode: 'tel', placeholder: '+1 555 123 4567' });
  sh.append(nm.wrap, ph.wrap, tx('p', 'shint', 'Start with + and the country code, for example +1 for Canada or +91 for India.'));
  // photo
  const prow = tx('div', 'prow'); const prev = tx('span', 'pprev'); prow.appendChild(prev);
  const pbtns = tx('div', 'pbtns'); prow.appendChild(pbtns); sh.appendChild(tx('span', 'slabel', 'Photo (optional)')); sh.appendChild(prow);
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none'; sh.appendChild(file);
  const choose = btn('Choose photo', 'secondary small', () => file.click());
  const remove = btn('Remove photo', 'secondary small', () => { photo = ''; paintPhoto(); });
  pbtns.append(choose, remove);
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    err.textContent = 'Preparing photo…';
    try { photo = await makeContactPhoto(f); err.textContent = ''; paintPhoto(); }
    catch (e) { err.textContent = 'Sorry, that picture couldn’t be used. Please try a different photo.'; }
  });
  // colour (used when there is no photo)
  const sw = tx('div', 'swatches'); sh.appendChild(tx('span', 'slabel', 'Circle colour')); sh.appendChild(sw);
  CONTACT_ACCENTS.forEach(col => {
    const b = tx('button', 'swatch'); b.type = 'button'; b.style.background = col; b.dataset.col = col.toLowerCase(); b.setAttribute('aria-label', 'Colour ' + col);
    b.addEventListener('click', (ev) => { ev.stopPropagation(); accent = col; paintPhoto(); });
    sw.appendChild(b);
  });
  function paintPhoto() {
    const tmp = { name: nm.input.value || '?', photo, accent };
    prow.querySelector('.pprev').replaceWith(circleFor(tmp, 'pprev'));
    remove.style.display = photo ? '' : 'none';
    const cur = (accent || accentFor(tmp)).toLowerCase();
    sw.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x.dataset.col === cur));
  }
  nm.input.addEventListener('input', paintPhoto);
  const err = tx('p', 'serr'); sh.appendChild(err);
  paintPhoto();
  sh.appendChild(btn('Test on WhatsApp', 'secondary', () => {
    const m = Contacts.check(nm.input.value || 'x', ph.input.value); if (m) { err.textContent = m; return; }
    err.textContent = ''; window.open(waLink(ph.input.value), '_blank', 'noopener');
  }));
  sh.appendChild(btn(edit ? 'Save changes' : 'Save contact', '', () => {
    const m = Contacts.check(nm.input.value, ph.input.value); if (m) { err.textContent = m; return; }
    const r = Contacts.upsert({ id: edit ? c.id : '', name: nm.input.value, phone: ph.input.value, accent, photo });
    if (r === 'full') { err.textContent = 'You already have ' + CONTACT_MAX + ' contacts. Please remove one first.'; return; }
    if (r === 'nospace') { err.textContent = 'This phone has no room left to save that. Try removing a photo.'; return; }
    toast(S, edit ? 'Saved' : 'Contact added'); renderSettings(S, 'list');
  }));
  if (edit) sh.appendChild(btn('Delete contact', 'danger', () => {
    showPanel(S, { title: 'Delete ' + c.name + '?', text: 'This removes them from Taarala Thota only. Your phone’s own contacts are not affected.',
      buttons: [{ label: 'Keep', secondary: true }, { label: 'Delete', fn: () => { Contacts.remove(c.id); toast(S, 'Deleted'); renderSettings(S, 'list'); } }] });
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}
function viewEraseAll(S, sh) {
  sh.appendChild(tx('h3', '', 'Erase everything on this phone?'));
  sh.appendChild(tx('p', '', 'This removes everything Taarala Thota saved on this phone: contacts, photos, passcode, game progress, stats and settings.'));
  sh.appendChild(tx('p', '', 'Your phone’s own contacts, photos and WhatsApp are not affected. This cannot be undone.'));
  const a = field('To confirm, type ERASE', 'text', { caps: 'characters' }); sh.appendChild(a.wrap);
  const err = tx('p', 'serr'); sh.appendChild(err);
  sh.appendChild(btn('Erase everything', 'danger', () => {
    if (a.input.value.trim().toUpperCase() !== 'ERASE') { err.textContent = 'Please type the word ERASE to confirm.'; return; }
    eraseEverything(); try { Music.paint(); } catch (e) {}
    goHome(); toast(SCREENS['home-view'], 'Everything was erased');
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}

// ============================================================
function buildPrivacy() {
  const S = defScreen('privacy', 'loved', { parent: 'home-view', name: 'Privacy & safety' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 90, 160, 560, 130, 74, 'Privacy & safety');
  const sheet = el('div', 'sheet'); place(sheet, 45, 330, 763, 1470, S); S.art.appendChild(sheet);
  const ol = tx('ol', 'plist'); PRIVACY_POINTS.forEach(p => ol.appendChild(tx('li', '', p))); sheet.appendChild(ol);
}
