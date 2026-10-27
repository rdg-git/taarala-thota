// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// SMALL SAFETY HELPERS (text and phone numbers)
// ============================================================
// Show any typed text as plain text: turns < > & " ' into harmless symbols.
// Used wherever text could reach the page as HTML. Most of the app sets text with textContent instead, which is safer still.
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
// A WhatsApp number: digits with an optional leading +, 8 to 15 digits. Returns '' if not valid.
function sanitizePhone(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.trim().replace(/[^0-9+]/g, '');
  if (s.startsWith('+')) s = '+' + s.slice(1).replace(/\+/g, ''); else s = s.replace(/\+/g, '');
  const digits = s.replace(/\+/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return s;
}
// Circle colour for a contact: the colour they chose, otherwise one picked from their name.
const CONTACT_ACCENTS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCF7F', '#A78BFA', '#FF9F40', '#F472B6', '#60A5FA'];
function accentFor(c) {
  if (c && /^#[0-9a-fA-F]{6}$/.test(c.accent || '')) return c.accent;
  const key = (c && c.name) || '';
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CONTACT_ACCENTS[h % CONTACT_ACCENTS.length];
}
function initialOf(name) { const t = String(name || '?').trim(); return t ? Array.from(t)[0].toUpperCase() : '?'; }
// Saved numbers and words are checked before they are shown (a restored backup could contain anything):
// Values restored from a backup file could be anything, so Stats screens only ever show real numbers and known words.
function num(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function known(map, k) { return Object.prototype.hasOwnProperty.call(map, k) ? k : null; }

// ------------------------------------------------------------
// MAKER'S MARK (who made this app)
// The rdg seal: a ring of twelve stars, the letters r d g drawn as a constellation, and a shooting star.
// Shown faintly in the bottom corner of Home and, with the signature and copyright line, on the Privacy page.
// The drawing is fixed text written here (nothing typed by a person goes into it).
// ------------------------------------------------------------
const MAKER_CREDIT = '\u00a9 2026 Rukmini Gandepalli (@rdg-git)';
let makerSealCount = 0;
function makerSealSvg() {
  const id = 'mkTrail' + (++makerSealCount);      // each copy gets its own colour-fade name, so every copy draws correctly
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#e8be6a" stop-opacity="0"/><stop offset="1" stop-color="#e8be6a"/></linearGradient></defs>' +
    '<g fill="none" stroke="#e8be6a"><circle cx="50" cy="50" r="46" stroke-width="1.6"/><circle cx="50" cy="50" r="39" stroke-width=".7"/></g>' +
    '<g fill="#ffe3a3"><circle cx="50.0" cy="7.5" r="1.8"/><circle cx="71.2" cy="13.2" r="1.1"/><circle cx="86.8" cy="28.7" r="1.1"/><circle cx="92.5" cy="50.0" r="1.8"/><circle cx="86.8" cy="71.2" r="1.1"/><circle cx="71.2" cy="86.8" r="1.1"/><circle cx="50.0" cy="92.5" r="1.8"/><circle cx="28.8" cy="86.8" r="1.1"/><circle cx="13.2" cy="71.3" r="1.1"/><circle cx="7.5" cy="50.0" r="1.8"/><circle cx="13.2" cy="28.7" r="1.1"/><circle cx="28.7" cy="13.2" r="1.1"/></g>' +
    '<g transform="translate(16,14) scale(.68)"><g fill="none" stroke="#e8be6a" stroke-width="1.2" stroke-opacity=".75" stroke-linejoin="round"><polyline points="14,68 14,42"/><polyline points="14,50 21,42 28,42"/><polyline points="54,26 54,68 44,68 38,60 40,51 48,48 54,50"/><polyline points="84,50 76,47 68,50 66,58 72,63 80,61 84,56"/><polyline points="84,47 84,76 78,83 68,82"/></g>' +
    '<g fill="#ffe3a3"><circle cx="14" cy="68" r="2.2"/><circle cx="14" cy="42" r="2.6"/><circle cx="21" cy="42" r="1.8"/><circle cx="28" cy="42" r="2.2"/><circle cx="54" cy="68" r="2.4"/><circle cx="44" cy="68" r="1.8"/><circle cx="38" cy="60" r="2.2"/><circle cx="40" cy="51" r="1.8"/><circle cx="48" cy="48" r="2"/><circle cx="54" cy="50" r="1.8"/><circle cx="54" cy="26" r="2"/><circle cx="76" cy="47" r="1.8"/><circle cx="68" cy="50" r="2"/><circle cx="66" cy="58" r="1.8"/><circle cx="72" cy="63" r="2.2"/><circle cx="80" cy="61" r="1.8"/><circle cx="84" cy="47" r="2"/><circle cx="84" cy="76" r="2"/><circle cx="78" cy="83" r="1.8"/><circle cx="68" cy="82" r="2.4"/></g></g>' +
    '<path d="M22 76 Q48 86 76 70" fill="none" stroke="url(#' + id + ')" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M77 62.9 l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z" fill="#fff1c8"/></svg>';
}
// the shooting-star line under the handwritten "rdg" signature
function makerTrailSvg() {
  const id = 'mkTrail' + (++makerSealCount);
  return '<svg viewBox="0 0 100 30" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#e8be6a" stop-opacity="0"/><stop offset="1" stop-color="#e8be6a"/></linearGradient></defs>' +
    '<path d="M2 12 Q50 26 88 8" fill="none" stroke="url(#' + id + ')" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M90 2 l2 5.4 5.4 2-5.4 2-2 5.4-2-5.4-5.4-2 5.4-2z" fill="#fff1c8"/></svg>';
}
