// ============================================================
// START-UP
// ============================================================
function bootApp() {
  buildHome(); buildGames(); buildLoved(); buildSettings(); buildPrivacy(); buildBubble(); buildMine(); buildChess(); buildCheckers();
  if (!Store.get('since', 0)) Store.set('since', nowMs());   // first time this phone opened the app (for the backup reminder)
  Music.armFirstTap();
  Music.paint();
  goHome();                                   // no sign-in: open straight onto Home
  setupPWA();
  setupSteadyScreen();
  setupUprightCard();
  // prevent double-tap zoom
  let lastTap = 0;
  document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastTap < 300 && e.target.closest && !e.target.closest('input,textarea,select')) e.preventDefault(); lastTap = n; }, { passive: false });
  if (TEST_MODE) window.MM = { go, goHome, goBack, SCREENS, CH, CK, BUB, MS, Store, Saved, Results, advance: (ms) => { CLOCK_SHIFT += ms; }, nowMs, Music, Contacts, Pass, PWA, get cur() {
    return CUR;
  } };
}

// ------------------------------------------------------------
// STEADY SCREEN
// Stray touches (a child tapping fast, a palm on the screen) should never move or leave the app:
// - no long-press menus, no pinch-zoom (iPhone), no text selection outside typing boxes;
// - Android's back swipe / back button (and iPhone Safari's edge swipe) goes back ONE screen inside the app;
//   on Home it asks before leaving. (The phone's own Home gesture can't be blocked by any app: for that,
//   the Privacy & safety page explains Guided Access on iPhone and App pinning on Android.)
// ------------------------------------------------------------
function setupSteadyScreen() {
  const typing = (t) => t && t.closest && t.closest('input,textarea,select');
  document.addEventListener('contextmenu', (e) => { if (!typing(e.target)) e.preventDefault(); });
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
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
