// ============================================================
// INSTALLABLE APP: register the offline helper, keep pictures for offline play,
// and show "A new version is ready" on Home only (never during a game, never forced).
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
function showUpdateCard() {
  const S = SCREENS['home-view']; if (!S || S.panel || PWA.dismissed || !PWA.reg || !PWA.reg.waiting) return;
  showPanel(S, { title: 'A new version is ready',
    text: 'A new version of Taarala Thota (Garden of Stars) is ready. Your contacts, progress and settings stay exactly as they are.',
    buttons: [{ label: 'Later', secondary: true, fn: () => { PWA.dismissed = true; } },
              { label: 'Update now', fn: () => { PWA.applying = true; try { PWA.reg.waiting.postMessage({ type: 'skip-waiting' }); } catch (e) { location.reload(); } } }] });
}
