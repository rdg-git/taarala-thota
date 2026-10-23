// ============================================================
// START-UP
// ============================================================
function bootApp() {
  buildHome(); buildGames(); buildLoved(); buildBubble(); buildMine(); buildChess(); buildCheckers();
  Music.armFirstTap();
  Music.paint();
  goHome();                                   // no sign-in: open straight onto Home
  // prevent double-tap zoom
  let lastTap = 0;
  document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastTap < 300 && e.target.closest && !e.target.closest('input,textarea,select')) e.preventDefault(); lastTap = n; }, { passive: false });
  if (TEST_MODE) window.MM = { go, goHome, goBack, SCREENS, CH, CK, BUB, MS, Store, Saved, Results, advance: (ms) => { CLOCK_SHIFT += ms; }, nowMs, Music, get cur() { return CUR; } };
}
