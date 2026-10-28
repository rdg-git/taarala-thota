// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// SETTINGS (passcode-protected) and PRIVACY & SAFETY page
// Built on the Loved Ones night-sky picture with a dark frosted sheet on top.
// All text is set with textContent: anything a person types is shown as plain text, never run as code.
// ============================================================
const APP_NAME = 'Taarala Thota (Garden of Stars)';   // the name always travels with its meaning

// ------------------------------------------------------------
// WORDING SHOWN TO PEOPLE
// All privacy wording lives here so it can be reviewed and changed in one place.
// The name is always written with its meaning: Taarala Thota (Garden of Stars).
// ------------------------------------------------------------
const SETTINGS_NOTE = 'Contacts saved here stay only on this phone, inside ' + APP_NAME + '. Anyone using this phone can call them from Loved Ones and see their names and photos, but only someone with the passcode can see or change the numbers. Your phone’s own contacts are never touched.';
const FORGOT_TEXT = 'If you forget this passcode, the contacts you saved in ' + APP_NAME + ' will be erased, and you’ll need to add them again. Your phone’s own contacts and WhatsApp are not affected.';
const DAILY_NOTICE = 'Contacts saved here stay only on this phone. Your phone’s own contacts are never touched.';
const OFFICIAL_ADDRESS = '';   // filled in at launch
const PRIVACY_POINTS = [
  // Application data (what the app saves) is kept apart from infrastructure data (what any website's host handles):
  'Your saved data stays on this phone: contacts and their photos, your passcode, game progress, stats and settings are stored only in this browser on this phone. The app never sends them anywhere, and the creator cannot see them.',
  'The app itself has no sign-in, no ads, no analytics and no tracking.',
  'Like every website, the app is delivered by a hosting service (Cloudflare). When your phone downloads the app or checks for an update, the hosting service automatically handles basic technical information, such as your internet (IP) address, browser type and the time, to deliver and protect the site. This never includes your saved data. The creator does not receive these details (apart from overall totals the hosting service may show, such as the number of visits) and has no control or oversight over how the hosting service handles them: that is covered by the hosting service\u2019s own privacy policy.',
  'Contacts you save here exist only in this app. Your phone’s own contacts and WhatsApp are never changed.',
  'Anyone using this phone can call your saved contacts from Loved Ones and see their names and photos. Seeing or changing numbers needs your passcode.',
  'Keep your phone locked with a PIN, fingerprint or face unlock. That also protects this app’s data.',
  'Choose a passcode you’ll remember. If you forget it, your saved contacts must be erased and added again.',
  'Back up regularly, and keep the backup file private. Its password can\u2019t be recovered. If you keep it in a cloud drive or email, that service\u2019s own privacy policy applies (the file stays locked with your password).',
  'On iPhone, add the app to your Home Screen, so your data is kept even if you don’t open it for a while.',
  'Clearing your browser’s data or removing the app deletes everything, unless you have a backup.',
  'Tapping a contact only opens WhatsApp. Nothing is ever sent automatically. Once WhatsApp opens, WhatsApp\u2019s own privacy policy applies.',
  'Sharing your phone with someone? Keep the screen on this app: on iPhone turn on Guided Access (Settings \u2192 Accessibility \u2192 Guided Access), open the app and triple-click the side button; on Android turn on App pinning (Settings \u2192 Security \u2192 App pinning) and pin the app from the recent-apps view. To stop the screen turning sideways, use your phone\u2019s Rotation Lock (iPhone: Control Center; Android: quick settings, \u201cAuto-rotate\u201d off).',
  'Only use the official address' + (OFFICIAL_ADDRESS ? ': ' + OFFICIAL_ADDRESS + '.' : ' shared by the creator.') + ' Copies elsewhere aren’t ours.'
];

// ---- tiny DOM builders (always plain text) ----

// ------------------------------------------------------------
// SAFE BUILDING BLOCKS
// Every word on these screens is set with textContent, so a name like "<script>" is shown as plain text and never runs.
// ------------------------------------------------------------
function tx(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, cls, fn) {
  const b = tx('button', 'sbtn ' + (cls || ''), label);
  b.type = 'button';
  b.addEventListener('click', (ev) => { ev.stopPropagation(); try { fn && fn(ev); } catch (e) { console.error(e); } });
  return b;
}
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

// ------------------------------------------------------------
// SETTINGS SCREEN
// Opened by the gear on Home. Uses the Loved Ones picture with a dark frosted sheet for the forms.
// pendingView lets another part of the app open a specific page after unlocking (e.g. "Back up now").
// ------------------------------------------------------------
function buildSettings() {
  const S = defScreen('settings', 'loved', { parent: 'home-view', name: 'Settings' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 100, 150, 520, 140, 92, 'Settings');
  const sheet = el('div', 'sheet'); place(sheet, 45, 330, 763, 1470, S); S.art.appendChild(sheet);
  S.sheet = sheet; S.view = null;
  S.onShow = () => {
    S.view = null; renderSettings(S); dailyNotice(S);                       // S.pendingView (e.g. 'backup') opens after unlocking
    // after 10 minutes without a tap here, show the passcode page again
    clearInterval(S.idleTimer);
    S.idleTimer = setInterval(() => { if (CUR === 'settings' && Pass.isSet() && !Pass.isUnlocked() && !/^(unlock|create|forgot)$/.test(S.view)) renderSettings(S); }, 15000);
  };
  // leaving Settings (Home, Back, the back gesture, any other screen) locks it straight away
  S.onHide = () => { clearInterval(S.waitTimer); clearInterval(S.idleTimer); Pass.lock(); };
  // only taps inside Settings keep it unlocked (taps in games don't)
  ['pointerup', 'keydown'].forEach(t => S.el.addEventListener(t, () => Pass.touch(), true));
}
// The once-a-day reminder that fades after 6 seconds (remembered as tt:noticeDay).
function dailyNotice(S) {
  if (Store.get('noticeDay', '') === today()) return;
  Store.set('noticeDay', today());
  const b = tx('button', 'fade-note', DAILY_NOTICE); b.type = 'button';
  b.addEventListener('click', (ev) => { ev.stopPropagation(); b.classList.add('out'); setTimeout(() => b.remove(), 500); });
  S.el.appendChild(b);
  setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 600); }, 6000);
}

// ------------------------------------------------------------
// WHICH PAGE TO SHOW
// No passcode yet -> create one. Locked -> ask for it. Unlocked -> the requested page (default: contact list).
// The passcode logic itself is in contacts.js (Pass).
// ------------------------------------------------------------
function renderSettings(S, view, data) {
  const sh = S.sheet; if (!sh) return;
  clearInterval(S.waitTimer);
  if (!Pass.isSet()) view = 'create';
  else if (!Pass.isUnlocked() && view !== 'forgot') view = 'unlock';
  else { if (!view && S.pendingView) { view = S.pendingView; } view = view || 'list'; }
  if (view === S.pendingView) S.pendingView = null;
  S.view = view; sh.innerHTML = ''; sh.scrollTop = 0;
  ({ create: viewCreate, unlock: viewUnlock, forgot: viewForgot, list: viewList, form: viewForm, eraseall: viewEraseAll, backup: viewBackup, restore: viewRestore })[view](S, sh, data || {});
  if (/^(create|unlock|forgot)$/.test(view)) { sh.appendChild(tx('div', 'snote', SETTINGS_NOTE)); }
  const ub = tx('div', 'supd'); sh.insertBefore(ub, sh.firstChild); S.updBox = ub; refreshUpdateBox(S);
}
// App update: the first thing on every Settings page, even before the passcode (updating never touches saved data).
// Kept compact. Up to date: one quiet line that can't be tapped. Update waiting: Update now, then Update later and What's new.
function refreshUpdateBox(S) {
  const ub = S.updBox; if (!ub || !ub.isConnected) return;
  ub.innerHTML = '';
  const ready = !!(PWA.reg && PWA.reg.waiting && navigator.serviceWorker && navigator.serviceWorker.controller);
  ub.classList.toggle('ready', ready);
  if (!ready) { ub.appendChild(tx('div', 'supd-ok', '\u2713 Your app is up to date')); return; }
  if (S.updLater) {                         // after "Update later": one small line, so the page gets its space back
    const line = tx('div', 'supd-line'); line.appendChild(tx('span', '', 'Update waiting'));
    line.appendChild(btn('Update now', 'small', applyUpdate)); ub.appendChild(line); return;
  }
  ub.appendChild(tx('div', 'supd-title', 'New update available'));
  ub.appendChild(btn('Update now', 'small', applyUpdate));
  const row = tx('div', 'supd-row');
  row.appendChild(btn('Update later', 'secondary small', () => { PWA.dismissed = true; S.updLater = true; refreshUpdateBox(S); }));
  let box = null;
  const wn = btn('What\u2019s new', 'secondary small', async () => {          // tap again to hide the list
    if (box) { box.remove(); box = null; wn.textContent = 'What\u2019s new'; return; }
    box = await whatsNewBox(); ub.appendChild(box); wn.textContent = 'Hide what\u2019s new';
  });
  row.appendChild(wn);
  ub.appendChild(row);
}

// ------------------------------------------------------------
// PASSCODE PAGES
// Create (8+ characters, typed twice), Unlock (with waiting after 5 wrong tries), Forgot (type ERASE).
// ------------------------------------------------------------
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
    if (r === 'ok') { renderSettings(S); return; }
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

// ------------------------------------------------------------
// CONTACT LIST
// Contacts, Backups and Safety sections, the permanent note, and "Erase all ... data".
// ------------------------------------------------------------
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
  sh.appendChild(tx('h3', 'sgap', 'Backups'));
  const last = Store.get('lastBackup', 0);
  sh.appendChild(tx('p', 'shint', last ? 'Last backup: ' + fmtDay(last) + '.' : 'No backup yet.'));
  sh.appendChild(btn('Back up now', '', () => renderSettings(S, 'backup')));
  sh.appendChild(btn('Restore from a backup', 'secondary', () => renderSettings(S, 'restore')));
  sh.appendChild(tx('h3', 'sgap', 'Safety'));
  sh.appendChild(btn('Lock Settings now', 'secondary', () => { Pass.lock(); goHome(); }));
  sh.appendChild(btn('Privacy & safety', 'slink', () => go('privacy')));
  sh.appendChild(tx('div', 'snote', SETTINGS_NOTE));
  sh.appendChild(btn('Erase all ' + APP_NAME + ' data', 'slink danger-link', () => renderSettings(S, 'eraseall')));
}
function circleFor(c, cls) {
  const d = tx('span', cls);
  if (isSafePhoto(c.photo)) d.style.backgroundImage = 'url("' + c.photo + '")';
  else { d.style.background = accentFor(c); d.textContent = initialOf(c.name); }
  return d;
}

// ------------------------------------------------------------
// ADD / EDIT A CONTACT
// Name, WhatsApp number (must start with + and the country code), optional photo, circle colour, Test, Save, Delete.
// Photos are redrawn by makeContactPhoto (contacts.js); the original file is never kept.
// ------------------------------------------------------------
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
    const b = tx('button', 'swatch');
    b.type = 'button';
    b.style.background = col;
    b.dataset.col = col.toLowerCase();
    b.setAttribute('aria-label', 'Colour ' + col);
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
    showPanel(S, { title: 'Delete ' + c.name + '?', text: 'This removes them from ' + APP_NAME + ' only. Your phone’s own contacts are not affected.',
      buttons: [{ label: 'Keep', secondary: true }, { label: 'Delete', fn: () => { Contacts.remove(c.id); toast(S, 'Deleted'); renderSettings(S, 'list'); } }] });
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}

// ------------------------------------------------------------
// ERASE ALL APP DATA
// Lists exactly what is and is not erased. Requires typing ERASE.
// ------------------------------------------------------------
function viewEraseAll(S, sh) {
  sh.appendChild(tx('h3', '', 'Erase all ' + APP_NAME + ' data?'));
  sh.appendChild(tx('p', '', 'This erases only what this app saved in this browser on this phone:'));
  const yes = tx('ul', 'slist');
  ['your saved contacts and their photos', 'your passcode', 'game progress and stats', 'your settings (like music on or off)'].forEach(t => yes.appendChild(tx('li', '', t)));
  sh.appendChild(yes);
  sh.appendChild(tx('p', '', 'It does not touch:'));
  const no = tx('ul', 'slist');
  ['your phone\u2019s own contacts or photo gallery', 'WhatsApp', 'other apps or websites', 'any backup files you saved'].forEach(t => no.appendChild(tx('li', '', t)));
  sh.appendChild(no);
  sh.appendChild(tx('p', '', 'This app uses no cookies. This can\u2019t be undone.'));
  const a = field('To confirm, type ERASE', 'text', { caps: 'characters' }); sh.appendChild(a.wrap);
  const err = tx('p', 'serr'); sh.appendChild(err);
  sh.appendChild(btn('Erase all app data', 'danger', () => {
    if (a.input.value.trim().toUpperCase() !== 'ERASE') { err.textContent = 'Please type the word ERASE to confirm.'; return; }
    eraseEverything(); try { Music.paint(); } catch (e) {}
    goHome(); toast(SCREENS['home-view'], 'All Taarala Thota data was erased');
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}

// ------------------------------------------------------------
// BACKUP AND RESTORE PAGES
// The file work itself (locking, checking) is in backup.js.
// ------------------------------------------------------------
function viewBackup(S, sh) {
  sh.appendChild(tx('h3', '', 'Back up your data'));
  sh.appendChild(tx('p', '', 'This makes one locked file with your contacts (and their photos), game progress, stats and settings. Your passcode is not included.'));
  sh.appendChild(tx('p', 'swarn', 'Choose a backup password of at least ' + PASS_MIN + ' characters. There is no way to recover it: if you forget it, this backup can\u2019t be opened. It can be the same as your passcode or different.'));
  const a = field('Backup password', 'password', { autocomplete: 'new-password' }), b = field('Type it again', 'password', { autocomplete: 'new-password' });
  sh.append(a.wrap, b.wrap, showToggle([a.input, b.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  const go1 = btn('Create backup file', '', async () => {
    const p = a.input.value;
    if (Array.from(p).length < PASS_MIN) { err.textContent = 'Please use at least ' + PASS_MIN + ' characters.'; return; }
    if (p !== b.input.value) { err.textContent = 'The two passwords don\u2019t match. Please type them again.'; return; }
    go1.disabled = true; err.textContent = 'Making your backup\u2026';
    try {
      const r = await saveBackupFile(await makeBackupFile(p));
      if (r === 'cancelled') { err.textContent = 'Backup not saved. You can try again any time.'; go1.disabled = false; return; }
      Store.set('lastBackup', nowMs()); Store.del('backupSnooze');
      toast(S, 'Backup saved'); renderSettings(S, 'list');
      showPanel(S, { title: 'Backup saved', text: 'Keep the file somewhere private, such as your own cloud drive or email. To restore, open Settings \u2192 Restore from a backup.', buttons: [{ label: 'OK' }] });
    } catch (e) { console.error(e); err.textContent = 'Sorry, the backup couldn\u2019t be made on this phone.'; go1.disabled = false; }
  });
  sh.appendChild(go1);
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}
function viewRestore(S, sh) {
  sh.appendChild(tx('h3', '', 'Restore from a backup'));
  sh.appendChild(tx('p', '', 'Choose a Taarala Thota backup file (its name ends in .ttbackup) and type its backup password.'));
  sh.appendChild(tx('p', 'swarn', 'Restoring replaces all ' + APP_NAME + ' data on this phone with what is in the backup. Your current passcode stays the same.'));
  const file = document.createElement('input'); file.type = 'file'; file.style.display = 'none'; sh.appendChild(file);
  const fname = tx('p', 'shint', 'No file chosen.');
  sh.appendChild(btn('Choose backup file', 'secondary', () => file.click())); sh.appendChild(fname);
  file.addEventListener('change', () => {
    fname.textContent = file.files && file.files[0] ? 'Chosen: ' + file.files[0].name : 'No file chosen.';
    err.textContent = '';
  });
  const a = field('Backup password', 'password', { autocomplete: 'off' }); sh.append(a.wrap, showToggle([a.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  const open = btn('Open backup', '', async () => {
    const f = file.files && file.files[0];
    if (!f) { err.textContent = 'Please choose the backup file first.'; return; }
    open.disabled = true; err.textContent = 'Opening\u2026';
    try {
      const b = await readBackupFile(f, a.input.value);
      err.textContent = ''; open.disabled = false;
      const when = new Date(b.created), d = when.getDate() + ' ' + fmtDay(when.getTime()).split(' ')[1] + ' ' + when.getFullYear();
      showPanel(S, { title: 'Replace all app data?',
        text: 'This backup is from ' + d + ' and has ' + b.contacts + (b.contacts === 1 ? ' contact' : ' contacts') + '. Replace all ' + APP_NAME + ' data on this phone with it? Your current passcode stays the same.',
        buttons: [{ label: 'Cancel', secondary: true }, { label: 'Replace', fn: () => {
          if (!applyBackup(b)) { err.textContent = 'This phone has no room left to restore that backup.'; return; }
          try { Music.paint(); } catch (e) {}
          toast(S, 'Backup restored'); renderSettings(S, 'list'); } }] });
    } catch (e) { open.disabled = false; err.textContent = e instanceof BackupError ? e.message : 'Sorry, that backup couldn\u2019t be opened.'; }
  });
  sh.appendChild(open);
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}

// ============================================================

// ------------------------------------------------------------
// PRIVACY & SAFETY PAGE
// The points (PRIVACY_POINTS above), opened from the link at the bottom of Home, ending with the maker's signature.
// ------------------------------------------------------------
function buildPrivacy() {
  const S = defScreen('privacy', 'loved', { parent: 'home-view', name: 'Privacy & safety' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 90, 160, 560, 130, 74, 'Privacy & safety');
  const sheet = el('div', 'sheet'); place(sheet, 45, 330, 763, 1470, S); S.art.appendChild(sheet);
  const ol = tx('ol', 'plist'); PRIVACY_POINTS.forEach(p => ol.appendChild(tx('li', '', p))); sheet.appendChild(ol);
  // links to the outside services mentioned above (they open in a new tab; nothing is sent by the app)
  const links = tx('p', 'shint', 'More about the services mentioned: ');
  [['Cloudflare privacy policy', 'https://www.cloudflare.com/privacypolicy/'], ['WhatsApp privacy policy', 'https://www.whatsapp.com/legal/privacy-policy']].forEach(([t, u], i) => {
    const a = tx('a', 'plink', t); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
    if (i) links.append(' \u00b7 '); links.appendChild(a);
  });
  sheet.appendChild(links);
  // the maker's signature: seal, "Made with care by rdg" with its shooting star, and the copyright line
  const mk = tx('div', 'maker'), seal = tx('div', 'maker-big'); seal.innerHTML = makerSealSvg(); mk.appendChild(seal);
  const sig = tx('div', 'maker-sig'); sig.appendChild(tx('div', 'maker-by', 'Made with care by'));
  sig.appendChild(tx('div', 'maker-rdg', 'rdg'));
  const trail = tx('div', 'maker-trail'); trail.innerHTML = makerTrailSvg(); sig.appendChild(trail);
  sig.appendChild(tx('div', 'maker-copy', MAKER_CREDIT)); mk.appendChild(sig);
  sheet.appendChild(mk);
}
