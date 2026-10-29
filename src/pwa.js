// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// INSTALLABLE APP: register the offline helper, keep pictures for offline play,
// and show "A new version is ready" on Home only (never during a game, never forced),
// with a "What's New" button that lists the new version's notes before the person decides.
// After "Later", the person is reminded the next time the app opens, and Settings always has an "App update"
// section (outside the passcode, since updating never touches saved data) that is pressable only when a version waits.
// ============================================================
const PWA = { reg: null, updateReady: false, dismissed: false, applying: false, lastCheck: 0 };
function setupPWA() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || IS_LOCAL)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (PWA.applying) location.reload(); });   // only after "Update now"
  navigator.serviceWorker.register('sw.js').then(reg => {
    PWA.reg = reg;
    const flag = () => { if (reg.waiting && navigator.serviceWorker.controller) {
      PWA.updateReady = true;
      if (CUR === 'home-view') showUpdateCard();
      refreshUpdateBadges();
      if (CUR === 'settings' && SCREENS.settings) refreshUpdateBox(SCREENS.settings);
    } };
    flag();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') flag(); });
    });
    // keep the pictures this phone uses, so every game works offline
    setTimeout(() => { try { const urls = Object.keys(PIC).map(picUrl); (reg.active || reg.waiting || reg.installing).postMessage({ type: 'warm', urls }); } catch (e) {} }, 4000);
    // look for a new version when the app is opened again (at most once an hour)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || Date.now() - PWA.lastCheck < 3600000) return;
      PWA.lastCheck = Date.now(); reg.update().catch(() => {});
    });
  }).catch(() => {});
}
// Ask the waiting (new) version for its "What's New" notes: a list of releases, newest first.
// Only short plain-text lines are accepted. (An older helper may send a plain list of lines instead.)
function askWhatsNew(worker) {
  const clean = (n) => (Array.isArray(n) ? n : []).filter(x => typeof x === 'string' && x.trim()).slice(0, 8).map(x => x.slice(0, 200));
  return new Promise((resolve) => {
    try {
      const ch = new MessageChannel(), t = setTimeout(() => resolve(null), 1500);
      ch.port1.onmessage = (ev) => {
        clearTimeout(t); const n = ev.data && ev.data.notes;
        if (!Array.isArray(n)) { resolve(null); return; }
        if (n.every(x => typeof x === 'string')) { resolve([{ release: '', notes: clean(n) }]); return; }
        resolve(n.filter(r => r && typeof r.release === 'string' && /^\d{4}-\d{2}-\d{2}[a-z]?$/.test(r.release)).slice(0, 200)
                 .map(r => ({ release: r.release, notes: clean(r.notes) })).filter(r => r.notes.length));
      };
      worker.postMessage({ type: 'notes' }, [ch.port2]);
    } catch (e) { resolve(null); }
  });
}
// "2026-10-30" -> "30 Oct 2026"; "2026-10-30b" -> "30 Oct 2026 (update 2)"
function releaseLabel(r) {
  const m = /^(\d{4})-(\d{2})-(\d{2})([a-z]?)$/.exec(r || ''); if (!m) return '';
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] || '';
  return (+m[3]) + ' ' + mon + ' ' + m[1] + (m[4] ? ' (update ' + (m[4].charCodeAt(0) - 96) + ')' : '');
}
// The "What's New" list (plain text only), used on the update card and in Settings: every release newer than this one.
async function whatsNewBox() {
  const all = PWA.reg && PWA.reg.waiting ? await askWhatsNew(PWA.reg.waiting) : null;
  let rel = (all || []).filter(r => !r.release || r.release > APP_RELEASE);
  if (!rel.length) rel = [{ release: '', notes: ['Improvements and fixes.'] }];
  const box = el('div', 'wn-box'); box.appendChild(el('div', 'wn-title', 'What\u2019s New'));
  rel.forEach(r => {
    if (rel.length > 1 && r.release) box.appendChild(el('div', 'wn-date', releaseLabel(r.release)));
    const ul = el('ul', 'wn-list');
    r.notes.forEach(n => { const li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
    box.appendChild(ul);
  });
  return box;
}
// Switch to the waiting version (the page reloads once it takes over). Saved data is never touched.
function applyUpdate() {
  if (!PWA.reg || !PWA.reg.waiting) return;
  PWA.applying = true;
  try { PWA.reg.waiting.postMessage({ type: 'skip-waiting' }); } catch (e) { location.reload(); }
}
// The update card. On Home it appears by itself (once per visit); from the small badge it opens on whatever screen is showing.
function showUpdateCard(S, fromBadge) {
  S = S || SCREENS['home-view'];
  if (!S || S.panel || !PWA.reg || !PWA.reg.waiting || (!fromBadge && PWA.dismissed)) return;
  const ov = showPanel(S, { title: 'A new version is ready',
    text: 'A new version of Taarala Thota (Garden of Stars) is ready. Your contacts, progress and settings stay exactly as they are.',
    buttons: [{ label: 'What\u2019s New', secondary: true, keepOpen: true, fn: async () => {
                const card = ov.querySelector('.panel-card'), btn = [...ov.querySelectorAll('.panel-btn')].find(b => /new/.test(b.textContent));
                if (!card || card.querySelector('.wn-box')) return;
                card.insertBefore(await whatsNewBox(), card.querySelector('.panel-btns'));
                if (btn) btn.remove();
              } },
              // Later: reminded again next time the app opens; meanwhile the badge and Settings stay available
              { label: 'Later', secondary: true, fn: () => { PWA.dismissed = true; toast(S, 'You can update anytime from Settings.', 3500); } },
              { label: 'Update Now', fn: applyUpdate }] });
}

// ------------------------------------------------------------
// UPDATE BADGE
// While a new version waits, a small gold "Update" pill sits just below the corner button at the top right of each screen
// (the Settings gear on Home, the music button elsewhere), without covering any button. Tapping it opens the update card.
// Not shown while a game is being played, so an update can never interrupt a game.
// ------------------------------------------------------------
const BADGE_HIDDEN_ON = /^(bubble-l\d|chs-board|ck-board|ms-(?!home$|stats$).+)$/;
function placeUpdateBadge(S) {
  const show = !!(PWA.reg && PWA.reg.waiting && navigator.serviceWorker && navigator.serviceWorker.controller) && !BADGE_HIDDEN_ON.test(S.id);
  const anchor = S.art && (S.art.querySelector(':scope > .gear-btn') || S.art.querySelector(':scope > .music-btn'));
  let b = S.updBadge;
  if (!show || !anchor) { if (b) b.hidden = true; return; }
  if (!b) {
    b = el('button', 'upd-badge'); b.type = 'button'; b.setAttribute('aria-label', 'A new version is ready');
    b.innerHTML = '<span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15V5M5.5 9.5 10 5l4.5 4.5" fill="none" stroke="#3a2208" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Update</span>';
    b.addEventListener('click', (ev) => { ev.stopPropagation(); showUpdateCard(S, true); });
    S.art.appendChild(b); S.updBadge = b;
  }
  b.hidden = false;
  // a small "Update" pill next to the corner button: try a few spots (left of it, below it, ...) and use the first
  // one that covers no button, title or panel and stays on screen
  const W = S.art.offsetWidth, ax = anchor.offsetLeft, ay = anchor.offsetTop, aw = anchor.offsetWidth, ah = anchor.offsetHeight;
  b.style.left = '0px'; b.style.top = '0px';
  const pw = b.offsetWidth, ph = b.offsetHeight, artBox = S.art.getBoundingClientRect();
  const others = [...S.art.querySelectorAll('button, .hot, .live, .sheet, .plank, .wbtn, a')]
    .filter(e => e !== b && !b.contains(e) && e.offsetParent !== null).map(e => e.getBoundingClientRect()).filter(q => q.width > 1);
  const spots = [[ax - pw - 6, ay + (ah - ph) / 2], [ax + aw - pw, ay + ah + 4], [ax - pw - 6, ay + ah + 4],
                 [ax - pw - 6, ay + ah + ph + 8], [ax + aw - pw, ay + ah + ph + 8], [ax - pw * 2 - 12, ay + (ah - ph) / 2]];
  const vis = { l: -artBox.left, t: -artBox.top, r: window.innerWidth - artBox.left, btm: window.innerHeight - artBox.top };
  const free = ([x, y]) => x >= Math.max(0, vis.l) + 2 && x + pw <= Math.min(W, vis.r) - 2 && y >= Math.max(0, vis.t) + 2 &&
    !others.some(q => { const L = q.left - artBox.left, T = q.top - artBox.top; return x < L + q.width - 1 && x + pw > L + 1 && y + 6 < T + q.height - 1 && y + ph - 6 > T + 1; });
  const [x, y] = spots.find(free) || spots[1];
  b.style.left = x + 'px'; b.style.top = y + 'px';
}
function refreshUpdateBadges() { for (const k in SCREENS) placeUpdateBadge(SCREENS[k]); }
