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
