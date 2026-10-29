// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// ANONYMOUS VISIT COUNTING (Cloudflare Web Analytics)
// What it is: a count of visits to the app (and where they came from, country, device type), so the creator can
// see roughly how many people visit. By Cloudflare's description it uses no cookies or phone storage, does not
// fingerprint devices, does not track people over time and does not count unique visitors.
// What it never sees: anything saved in the app, or anything done inside it (no in-app events are sent).
// Rules:
// - The app loads Cloudflare's counting code itself, and only when counting is allowed. A phone that switched it
//   off never contacts Cloudflare's analytics at all. (Do NOT also turn on Cloudflare's automatic Web Analytics
//   for the Pages project: that would add the code for everyone and ignore the switch.)
// - Counting only ever happens on the official address (never on test previews or a developer's computer).
// - Browsers that send the "Global Privacy Control" signal are never counted, and the switch stays off for them.
// - The choice is saved on the phone as tt:count ("off" = don't count). It is included in backups, survives
//   "Forgot passcode", and is reset by "Erase all data" or clearing the browser's data (counting is then on again).
// - The switch appears on the Privacy & Safety page and in Settings (above the passcode); every change is confirmed.
// - A one-time welcome note tells people about it on their first visit (tt:welcome); nothing is counted before they
//   have seen it. Counting is on unless they switch it off (a notice, not a question).
// ============================================================
const WA_TOKEN = 'dc423f201ff946a096149c338d87a725';                       // the Web Analytics site token from Cloudflare (public, not a secret). Empty = never count.
const WA_HOST = 'taarala-thota.pages.dev'; // counting only on the official address
const WA_SCRIPT = 'https://static.cloudflareinsights.com/beacon.min.js';

const Visits = {
  gpc() { try { return navigator.globalPrivacyControl === true; } catch (e) { return false; } },
  chosenOff() { return Store.get('count', 'on') === 'off'; },
  // is this visit counted? (all conditions must hold)
  counting() { return !this.gpc() && !this.chosenOff(); },
  set(on) { if (this.gpc()) return; Store.set('count', on ? 'on' : 'off'); refreshVisitSwitches(); if (on) this.start(); },
  started: false,
  start() {
    // only after the person has seen the one-time welcome note (see showWelcome)
    if (this.started || !this.counting() || !Store.get('welcome', false) || !WA_TOKEN || location.hostname !== WA_HOST) return;
    this.started = true;
    const s = document.createElement('script');
    s.defer = true; s.src = WA_SCRIPT;
    // spa:false = one count per app opening. The app uses the browser's history for its own back button; without this,
    // Cloudflare could count every back-step inside the app as an extra page view.
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: WA_TOKEN, spa: false }));
    document.head.appendChild(s);
  }
};

// The switch (used on the Privacy & Safety page and in Settings). One setting; every copy updates together.
function visitSwitch(S) {
  const box = el('div', 'vswitch');
  const row = el('div', 'vs-row'), lab = el('span', 'vs-lab', 'Count my visits anonymously');
  const sw = el('button', 'vs-sw'); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-label', 'Count my visits anonymously');
  const note = el('div', 'vs-note');
  row.appendChild(lab); row.appendChild(sw); box.appendChild(row); box.appendChild(note);
  sw.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (Visits.gpc()) return;
    const turningOn = Visits.chosenOff();
    showPanel(S, turningOn
      ? { title: 'Count your visits again?', text: 'Visits are counted anonymously: no cookies, no personal profile, and nothing you save in the app. You can turn this off again anytime.',
          buttons: [{ label: 'Cancel', secondary: true }, { label: 'Turn On', fn: () => Visits.set(true) }] }
      : { title: 'Stop counting your visits?', text: 'The app will stop sending anonymous visit counts from this phone. You can turn this back on anytime, here or in Settings.',
          buttons: [{ label: 'Cancel', secondary: true }, { label: 'Turn Off', fn: () => Visits.set(false) }] });
  });
  box._paint = () => {
    const g = Visits.gpc(), on = Visits.counting();
    sw.setAttribute('aria-checked', on ? 'true' : 'false'); sw.classList.toggle('on', on);
    sw.disabled = g; box.classList.toggle('locked', g);
    note.textContent = g ? 'Your browser asks websites not to track you (Global Privacy Control), so your visits are never counted.'
                         : on ? 'On: visits are counted anonymously (no cookies, nothing you save).' : 'Off: this phone’s visits aren’t counted.';
  };
  box._paint();
  return box;
}
function refreshVisitSwitches() { document.querySelectorAll('.vswitch').forEach(b => b._paint && b._paint()); }

// ------------------------------------------------------------
// ONE-TIME WELCOME NOTE (first visit only; shown again after "Erase all data")
// Tells people that everything stays on the phone and that visits are counted anonymously, with where to switch it off.
// "Got it" closes it; "Read Privacy & Safety" opens that page. Either way it counts as seen and is never shown again.
// On a laptop it waits until the "Best on your phone" card is closed. Shown on Home only.
// ------------------------------------------------------------
function showWelcome() {
  if (Store.get('welcome', false)) return;
  if (TEST_MODE && !QS.has('welcome')) return;                      // automatic tests skip it unless they ask for it
  const S = SCREENS['home-view'];
  if (document.querySelector('.desk-card') || CUR !== 'home-view' || !S || S.panel) { setTimeout(showWelcome, 600); return; }
  const seen = () => { Store.set('welcome', true); Visits.start(); };
  const text = 'Everything you save stays on this phone. No ads, no sign-up, no personal tracking.\n\n' + (Visits.gpc()
    ? 'Your browser asks websites not to track you (Global Privacy Control), so your visits are never counted.'
    : 'We count visits anonymously (no cookies, no personal profile, nothing you save), so we know roughly how many people visit. You can turn this off anytime in Privacy & Safety or Settings.');
  const ov = showPanel(S, { title: 'Welcome to Taarala Thota \u{1F31F}', text,
    buttons: [{ label: 'Read Privacy & Safety', secondary: true, fn: () => { seen(); go('privacy'); } },
              { label: 'Got It', fn: seen }] });
  ov.classList.add('welcome');
}
