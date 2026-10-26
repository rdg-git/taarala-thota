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
