// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// CONTACTS + PASSCODE (kept only on this phone, never sent anywhere)
// - Contacts: name, WhatsApp number, circle colour. Readable by the app so
//   Loved Ones can open WhatsApp with one tap. Seeing/changing numbers needs the passcode.
// - Passcode: never stored. Only a salted PBKDF2 fingerprint is kept, so it cannot be read back.
// ============================================================
const CONTACT_MAX = 20, NAME_MAX = 40, PASS_MIN = 8;
const UNLOCK_MINUTES = 10;                 // locks again after 10 minutes without a tap (or when the app closes)
const PBKDF2_ROUNDS = 210000;

const Contacts = {
  list() {
    const a = Store.get('contacts', []);
    return Array.isArray(a) ? a.filter(c => c && typeof c.name === 'string' && typeof c.phone === 'string') : [];
  },
  saveAll(a) { try { localStorage.setItem(Store.key('contacts'), JSON.stringify(a.slice(0, CONTACT_MAX))); return true; } catch (e) {
    return false;
  } },
  // returns '' when fine, otherwise a friendly message
  check(name, phone) {
    name = String(name || '').trim(); phone = String(phone || '').trim();
    if (!name) return 'Please type a name.';
    if (Array.from(name).length > NAME_MAX) return 'Please keep the name under ' + NAME_MAX + ' characters.';
    if (!phone.startsWith('+')) return 'Please start the number with + and the country code, for example +1 for Canada or +91 for India.';
    if (!sanitizePhone(phone)) return 'Please check the number: it should have 8 to 15 digits after the +.';
    return '';
  },
  clean(c) {
    return { id: c.id || ('c' + nowMs().toString(36) + Math.random().toString(36).slice(2, 6)),
             name: String(c.name).trim().slice(0, 80), phone: '+' + sanitizePhone(c.phone).replace(/\D/g, ''),
             accent: /^#[0-9a-fA-F]{6}$/.test(c.accent || '') ? c.accent : '',
             photo: isSafePhoto(c.photo) ? c.photo : '' };
  },
  upsert(c) {
    const a = this.list(), x = this.clean(c), i = a.findIndex(o => o.id === x.id);
    if (i >= 0) a[i] = x; else { if (a.length >= CONTACT_MAX) return 'full'; a.push(x); }
    return this.saveAll(a) ? 'ok' : 'nospace';
  },
  remove(id) { this.saveAll(this.list().filter(c => c.id !== id)); },
  eraseAll() { Store.del('contacts'); }
};
// A contact photo is only ever a small JPEG the app drew itself (see makeContactPhoto).
function isSafePhoto(p) { return typeof p === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p) && p.length < 300000; }
// Turn any picture the person chooses into a small square JPEG. The original file is never kept:
// redrawing it removes hidden details (location, camera) and anything that is not a picture.
function makeContactPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || '') || file.size > 25 * 1024 * 1024) { reject(new Error('not a picture')); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight), N = 320;
        const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
        const g = cv.getContext('2d');
        g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, N, N);
        URL.revokeObjectURL(url);
        const out = cv.toDataURL('image/jpeg', 0.82);
        if (!isSafePhoto(out)) { reject(new Error('too big')); return; }
        resolve(out);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    img.src = url;
  });
}
function waLink(phone) { const d = (sanitizePhone(phone || '') || '').replace(/\D/g, ''); return d ? 'https://wa.me/' + d : ''; }

// ---- passcode ----
const Pass = {
  unlockedUntil: 0,                         // in memory only: closing the app always locks
  isSet() { const p = Store.get('pass', null); return !!(p && p.salt && p.hash); },
  isUnlocked() { return this.unlockedUntil > nowMs(); },
  touch() { if (this.isUnlocked()) this.unlockedUntil = nowMs() + UNLOCK_MINUTES * 60000; },
  lock() { this.unlockedUntil = 0; },
  async fingerprint(code, saltB64, rounds) {
    const enc = new TextEncoder(), salt = Uint8Array.from(atob(saltB64), ch => ch.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  },
  async create(code) {
    const salt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    const hash = await this.fingerprint(code, salt, PBKDF2_ROUNDS);
    Store.set('pass', { v: 1, salt, hash, rounds: PBKDF2_ROUNDS });
    Store.del('passlock');
    this.unlockedUntil = nowMs() + UNLOCK_MINUTES * 60000;
  },
  // waiting time (ms) still left after too many wrong tries
  waitLeft() { const l = Store.get('passlock', null); return l && l.until ? Math.max(0, l.until - nowMs()) : 0; },
  async check(code) {
    if (this.waitLeft() > 0) return 'wait';
    const p = Store.get('pass', null); if (!p) return 'none';
    const h = await this.fingerprint(code, p.salt, p.rounds || PBKDF2_ROUNDS);
    if (h === p.hash) { Store.del('passlock'); this.unlockedUntil = nowMs() + UNLOCK_MINUTES * 60000; return 'ok'; }
    const l = Store.get('passlock', { fails: 0, rounds: 0 }); l.fails = (l.fails || 0) + 1;
    if (l.fails >= 5) {                     // 5 wrong tries: wait 30 s, then 1 min, 2 min, 4 min ... (max 30 min)
      l.until = nowMs() + Math.min(30 * 60000, 30000 * Math.pow(2, l.rounds || 0));
      l.rounds = (l.rounds || 0) + 1; l.fails = 0;
    }
    Store.set('passlock', l);
    return 'wrong';
  },
  // "Forgot passcode?": erases saved contacts and the passcode. Games and stats stay.
  forget() { Contacts.eraseAll(); Store.del('pass'); Store.del('passlock'); this.lock(); }
};
// any tap keeps an unlocked Settings open for another 10 minutes
['pointerup', 'keydown'].forEach(t => document.addEventListener(t, () => Pass.touch(), true));

// "Erase all Taarala Thota data": every item this app saved (all under the tt: label), nothing else on the phone
function eraseEverything() {
  try { Object.keys(localStorage).filter(k => k.startsWith('tt:')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  try { Object.keys(sessionStorage).filter(k => k.startsWith('tt:')).forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
  Pass.lock();
}
