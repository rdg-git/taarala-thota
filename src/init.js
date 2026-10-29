// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// START-UP
// ============================================================
function bootApp() {
  buildHome(); buildGames(); buildLoved(); buildSettings(); buildPrivacy(); buildFeedback(); buildBubble(); buildMine(); buildChess(); buildCheckers();
  if (!Store.get('since', 0)) Store.set('since', nowMs());   // first time this phone opened the app (for the backup reminder)
  Music.armFirstTap();
  Music.paint();
  goHome();                                   // no sign-in: open straight onto Home
  setupPWA();
  setupSteadyScreen();
  setupUprightCard();
  setupDeskCard();
  Visits.start();                             // anonymous visit count (only if allowed and the welcome note was seen; see visits.js)
  showWelcome();                              // one-time welcome note on the first visit
  // prevent double-tap zoom
  let lastTap = 0;
  document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastTap < 300 && e.target.closest && !e.target.closest('input,textarea,select')) e.preventDefault(); lastTap = n; }, { passive: false });
  if (TEST_MODE) window.MM = { go, goHome, goBack, SCREENS, CH, CK, BUB, MS, Store, Saved, Results, advance: (ms) => { CLOCK_SHIFT += ms; }, nowMs, Music, Contacts, Pass, PWA, get cur() {
    return CUR;
  } };
}

// ------------------------------------------------------------
// STEADY SCREEN
// Stray touches (fast tapping, a palm on the screen) should never move or leave the app:
// - no long-press menus, no pinch-zoom (iPhone), no text selection outside typing boxes;
//   except: the Settings and Privacy & Safety pages (just text, no games) can be zoomed with two fingers, for easier reading;
// - Android's back swipe / back button (and iPhone Safari's edge swipe) goes back ONE screen inside the app;
//   on Home it asks before leaving. (The phone's own Home gesture can't be blocked by any app: for that,
//   the Privacy & Safety page explains Guided Access on iPhone and App pinning on Android.)
// ------------------------------------------------------------
// Two-finger zoom is allowed only on the text pages (Settings, Privacy & Safety). Leaving them zooms back to normal.
let ZOOM_OK = false;
const VIEW_STEADY = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
const VIEW_ZOOM = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
function allowZoom(on) {
  ZOOM_OK = !!on;
  const m = document.querySelector('meta[name="viewport"]'); if (m) m.setAttribute('content', on ? VIEW_ZOOM : VIEW_STEADY);
  document.body.classList.toggle('zoomable', ZOOM_OK);
}
function setupSteadyScreen() {
  const typing = (t) => t && t.closest && t.closest('input,textarea,select');
  document.addEventListener('contextmenu', (e) => { if (!typing(e.target)) e.preventDefault(); });
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, (e) => { if (!ZOOM_OK) e.preventDefault(); }, { passive: false }));
  document.addEventListener('touchmove', (e) => { if (!ZOOM_OK && e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // back gesture: keep one extra history step so "back" lands inside the app
  try {
    history.replaceState({ tt: 'base' }, '');
    history.pushState({ tt: 'app' }, '');
  } catch (e) { return; }
  let leaving = false;
  window.addEventListener('popstate', () => {
    if (leaving) return;
    const S = CUR && SCREENS[CUR];
    const stay = () => { try { history.pushState({ tt: 'app' }, ''); } catch (e) {} };
    if (Tour.on) { Tour.end(); stay(); return; }                     // during the tour: back ends the tour
    if (S && S.panel) { closePanel(S); stay(); return; }            // first: close an open card
    if (CUR && CUR !== 'home-view') { goBack(); stay(); return; }  // then: one screen back
    stay();                                                          // on Home: ask before leaving
    showPanel(SCREENS['home-view'], { title: 'Leave Taarala Thota (Garden of Stars)?', text: 'Your games and contacts stay saved on this phone.',
      buttons: [{ label: 'Stay', secondary: true }, { label: 'Leave', fn: () => { leaving = true; history.go(-2); } }] });
  });
}

// ------------------------------------------------------------
// TURN YOUR PHONE UPRIGHT
// Every picture is painted for an upright phone. When a PHONE is turned sideways (short side under 500 px),
// a calm card covers the app and Bubble Pop pauses; it all continues the moment the phone is upright again.
// Tablets turned sideways keep playing (the upright picture is large enough there).
// ------------------------------------------------------------
let SIDEWAYS = false;
function setupUprightCard() {
  // themed like the rest of the garden: blurred night-sky picture, glowing handwritten title, frosted gold-edged panel,
  // and the phone drawn in the carved-wood medallion style of the music button
  const card = el('div', 'upright-card'); card.setAttribute('role', 'alert');
  const bg = el('div', 'upright-bg'); bg.style.backgroundImage = 'url("' + picUrl('home') + '")'; card.appendChild(bg);
  const panel = el('div', 'upright-panel');
  panel.innerHTML = '<svg viewBox="0 0 64 64" class="upright-phone"><defs><linearGradient id="upw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a2b"/><stop offset="1" stop-color="#4b2c12"/></linearGradient></defs>' +
    '<circle cx="32" cy="32" r="29" fill="url(#upw)" stroke="#d9a95a" stroke-width="3"/>' +
    '<g class="upright-turn"><rect x="23" y="13" width="18" height="34" rx="4" fill="#2a1608" stroke="#ffe3a3" stroke-width="2.6"/><circle cx="32" cy="42" r="1.8" fill="#ffe3a3"/></g></svg>';
  const words = el('div', 'upright-words');
  words.appendChild(Object.assign(document.createElement('div'), { className: 'upright-title', textContent: 'Turn your phone upright' }));
  words.appendChild(Object.assign(document.createElement('div'), { className: 'upright-sub', textContent: 'The garden is painted for upright screens. Your game is paused and nothing is lost.' }));
  panel.appendChild(words);
  card.appendChild(panel);
  document.body.appendChild(card);
  const mq = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
  const apply = () => { SIDEWAYS = mq.matches; card.classList.toggle('show', SIDEWAYS); };
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
}

// ------------------------------------------------------------
// BEST ON YOUR PHONE (laptops and desktop computers only)
// The garden is painted for phone screens. On a computer whose main pointer is a mouse or trackpad (touch-screen laptops included),
// a welcome card shows a QR code with this site's own address (made by the app, see qr.js) so a phone can
// open it, and a "Continue on this screen" button. Phones and tablets never see it.
// "Continue" is remembered only until the browser tab is closed (tt:deskok in session storage).
// ------------------------------------------------------------
function isComputerScreen() {
  const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
  // main pointer is a mouse or trackpad (a touch-screen laptop also has touch, but its main pointer is still the trackpad);
  // phones and tablets have touch as their main pointer, so they never match
  return mq('(pointer: fine)') && mq('(hover: hover)');
}
function setupDeskCard() {
  if (TEST_MODE && !QS.has('desk')) return;                    // automatic tests skip it unless they ask for it
  if (!isComputerScreen()) return;
  try { if (sessionStorage.getItem('tt:deskok') === '1') return; } catch (e) {}
  const addr = location.origin + location.pathname.replace(/index\.html$/, '');
  const card = el('div', 'desk-card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', 'Best on your phone');
  const bg = el('div', 'upright-bg'); bg.style.backgroundImage = 'url("' + picUrl('home') + '")'; card.appendChild(bg);
  const panel = el('div', 'desk-panel');
  const qr = el('div', 'desk-qr'); qr.innerHTML = qrSvg(addr);
  const words = el('div', 'desk-words');
  const t = (cls, text) => Object.assign(document.createElement('div'), { className: cls, textContent: text });
  words.appendChild(t('upright-title', 'Best on your phone'));
  words.appendChild(t('upright-sub', 'Taarala Thota is painted for phone screens. Point your phone\u2019s camera at this code to open it there.'));
  words.appendChild(t('desk-addr', 'Or type this address on your phone: ' + location.host));
  const go = el('button', 'desk-btn'); go.type = 'button'; go.textContent = 'Continue on this screen';
  const close = () => { try { sessionStorage.setItem('tt:deskok', '1'); } catch (e) {} card.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  go.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  document.addEventListener('keydown', onKey);
  words.appendChild(go);
  if (qr.innerHTML) panel.appendChild(qr);
  panel.appendChild(words); card.appendChild(panel);
  document.body.appendChild(card);
  setTimeout(() => go.focus(), 50);
}
