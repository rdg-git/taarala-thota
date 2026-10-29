// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// BACKUP & RESTORE (the file is made on this phone and saved wherever the person chooses;
// it never passes through anyone else)
// - Locked with the person's backup password: AES-GCM 256, key from PBKDF2-SHA256.
// - The passcode is never inside a backup (restoring keeps the passcode that is set now).
// - Restore treats every file as untrusted: size, structure, allowed items and every contact are checked.
// ============================================================
const BACKUP_APP = 'taarala-thota-backup', BACKUP_V = 1, BACKUP_MAX_BYTES = 15 * 1024 * 1024;
const BACKUP_REMIND_DAYS = 6;
// the only items a backup may carry (everything the app saves, except the passcode and housekeeping)
const BACKUP_KEYS = /^tt:(contacts|music|count|bubble|bubble:stats|minesweeper:best|(chess|checkers|minesweeper|bubble):(game|stats|totals))$/;

function b64(bytes) {
  let s = '';
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(str) { const s = atob(str), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
async function backupKey(password, salt, rounds) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function backupItems() {
  const items = {};
  try { Object.keys(localStorage).forEach(k => { if (BACKUP_KEYS.test(k)) items[k] = localStorage.getItem(k); }); } catch (e) {}
  return items;
}
// is there anything worth backing up? (a contact or some game progress)
function hasSomethingToSave() { return Object.keys(backupItems()).some(k => k !== 'tt:music'); }

async function makeBackupFile(password) {
  const payload = JSON.stringify({ app: BACKUP_APP, v: BACKUP_V, created: new Date(nowMs()).toISOString(), items: backupItems() });
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupKey(password, salt, PBKDF2_ROUNDS);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));
  const text = JSON.stringify({ app: BACKUP_APP, v: BACKUP_V, kdf: 'PBKDF2-SHA256', rounds: PBKDF2_ROUNDS, salt: b64(salt), iv: b64(iv), data: b64(data) });
  const d = new Date(nowMs()), name = 'taarala-thota-backup-' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.ttbackup';
  return new File([text], name, { type: 'application/octet-stream' });
}
// Share where the phone supports sharing files, otherwise Download. Returns 'shared' | 'downloaded' | 'cancelled'.
async function saveBackupFile(file) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Taarala Thota (Garden of Stars) backup' });
      return 'shared';
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const url = URL.createObjectURL(file), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

// ---- restore: every step can fail with a friendly message ----
class BackupError extends Error {}
async function readBackupFile(file, password) {
  if (!file || file.size > BACKUP_MAX_BYTES) throw new BackupError('That file is too big to be a Taarala Thota backup.');
  let outer;
  try { outer = JSON.parse(await file.text()); } catch (e) { throw new BackupError('That file isn’t a Taarala Thota backup.'); }
  if (!outer || outer.app !== BACKUP_APP || outer.v !== BACKUP_V || typeof outer.salt !== 'string' || typeof outer.iv !== 'string' || typeof outer.data !== 'string'
      || !(outer.rounds >= 100000 && outer.rounds <= 5000000)) throw new BackupError('That file isn’t a Taarala Thota backup.');
  let plain;
  try {
    const key = await backupKey(password, unb64(outer.salt), outer.rounds);
    plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(outer.iv) }, key, unb64(outer.data)));
  } catch (e) { throw new BackupError('That password doesn’t open this backup. Please check it and try again.'); }
  let inner;
  try { inner = JSON.parse(plain); } catch (e) { throw new BackupError('This backup is damaged and can’t be used.'); }
  if (!inner || inner.app !== BACKUP_APP || typeof inner.items !== 'object' || !inner.items || isNaN(Date.parse(inner.created))) throw new BackupError('This backup is damaged and can’t be used.');
  // keep only allowed items, each a sensible size and valid JSON
  const items = {};
  Object.keys(inner.items).forEach(k => {
    const v = inner.items[k];
    if (!BACKUP_KEYS.test(k) || typeof v !== 'string' || v.length > 8 * 1024 * 1024) return;
    try { JSON.parse(v); } catch (e) { if (k !== 'tt:music') return; }
    if (k === 'tt:music' && !/^(on|off)$/.test(v)) return;
    if (k === 'tt:count' && !/^"(on|off)"$/.test(v)) return;
    items[k] = v;
  });
  // every contact is re-checked and re-cleaned exactly as if it were typed in Settings
  if (items['tt:contacts']) {
    let list = [];
    try { list = JSON.parse(items['tt:contacts']); } catch (e) {}
    list = (Array.isArray(list) ? list : []).filter(c => c && typeof c === 'object' && !Contacts.check(c.name, c.phone)).slice(0, CONTACT_MAX).map(c => Contacts.clean(c));
    items['tt:contacts'] = JSON.stringify(list);
  }
  const contacts = items['tt:contacts'] ? JSON.parse(items['tt:contacts']).length : 0;
  return { created: inner.created, items, contacts };
}
function applyBackup(b) {
  try {
    // replace all app data, but keep the passcode that is set now (and its lock state)
    Object.keys(localStorage).filter(k => k.startsWith('tt:') && !/^tt:(pass|passlock|noticeDay|since)$/.test(k)).forEach(k => localStorage.removeItem(k));
    Object.keys(b.items).forEach(k => localStorage.setItem(k, b.items[k]));
    Store.set('lastBackup', nowMs());
    return true;
  } catch (e) { return false; }
}

// ---- 6-day reminder on Home (never during a game) ----
function backupReminderDue() {
  if (!hasSomethingToSave()) return false;
  const since = Store.get('lastBackup', 0) || Store.get('since', nowMs());
  if (nowMs() - since < BACKUP_REMIND_DAYS * 86400000) return false;
  return nowMs() >= Store.get('backupSnooze', 0);
}
function maybeRemindBackup(S) {
  if (!S || S.panel || !backupReminderDue()) return;
  const last = Store.get('lastBackup', 0);
  showPanel(S, { title: 'Time For A Backup?',
    text: (last ? 'It’s been ' + Math.floor((nowMs() - last) / 86400000) + ' days since your last backup.' : 'You haven’t made a backup yet.') + ' A backup keeps your contacts and progress safe if this phone’s data is ever cleared.',
    buttons: [{ label: 'Later', secondary: true, fn: () => Store.set('backupSnooze', nowMs() + 86400000) },
              { label: 'Back Up Now', fn: () => { SCREENS.settings.pendingView = 'backup'; go('settings'); } }] });
}
