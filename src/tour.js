// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// TAKE A TOUR (a playing walkthrough, like a screen recording)
// The app plays the tour on its REAL screens: a glowing finger moves to each button and "taps" it, a short caption
// explains, and a player bar gives pause/play, 5 seconds back/forward, a bar to drag, speed (1×, 1.5×, 2×, 0.5×)
// and music on/off. Started from the "Take a tour" card at the top of Privacy & Safety and in Settings (under App update).
// Rules:
// - It only LOOKS: the finger is a picture. A see-through cover sits over the app, so nothing underneath can be
//   tapped; the tour never opens a contact, starts a game or changes a setting, and never visits Settings itself.
//   (The only thing it can change is the music, through its own music button, which is the app's music switch.)
// - Everything shown at a moment depends only on the time, so dragging the bar (or going back) always shows the
//   right screen, finger and caption.
// - The controls fade after a few seconds while playing (so they never cover what is being shown); a tap anywhere
//   brings them back. When paused they stay.
// - ✕, Done or the back gesture ends it, back on the screen it started from. Started from Settings, Settings is
//   locked again on return (leaving Settings always locks it).
// - The install scene draws the browser's menu (no app can open the phone's own browser menu). It shows Chrome's
//   steps on Android, Safari's on iPhone, and both when the phone type isn't known.
// - Recording mode (tests only, ?tourrec): no player bar and no ✕, for the LinkedIn / README video.
// To change the tour, edit TOUR_SCENES below: the screen, caption, how long (ms at 1×), what the finger taps
// (a CSS selector inside that screen) and, if the tap opens another screen, which one ('then').
// tapAt / switchAt (0 to 1) move the tap and the screen change within a scene; scrollTo glides a page down first.
// ============================================================
const TOUR_UA = navigator.userAgent || '';
const TOUR_KIND = /Android/.test(TOUR_UA) ? 'android' : (/iPhone|iPad|iPod/.test(TOUR_UA) || (/Macintosh/.test(TOUR_UA) && navigator.maxTouchPoints > 1)) ? 'ios' : 'both';
const TOUR_NOTE = 'Menus can look slightly different depending on your phone and browser version.';
const TOUR_SCENES = [
  { screen: 'home-view', dur: 5000, title: 'Welcome to the garden \u{1F31F}',
    text: 'A calm place to play and to stay close to the people who matter. Here’s a quick look around.' },
  { screen: 'home-view', dur: TOUR_KIND === 'both' ? 20000 : 11000, install: TOUR_KIND, title: 'Install it (optional, recommended)',
    text: TOUR_KIND === 'ios' ? 'In Safari: ⋯ → Share → Add to Home Screen → keep “Open as Web App” on → Add. It then opens full screen and works offline.'
        : TOUR_KIND === 'android' ? 'In Chrome: ⋮ → Add to home screen → Install (not “Create shortcut”, which only opens a browser tab). It then opens full screen and works offline.'
        : 'Android (Chrome): ⋮ → Add to home screen → Install. iPhone (Safari): ⋯ → Share → Add to Home Screen → Add. It then works offline.' },
  { screen: 'home-view', dur: 6000, tap: '.gear-btn', title: 'Add your loved ones',
    text: 'Tap the gear (Settings), create a passcode, then Add a contact: a name, a WhatsApp number and, if you like, a photo.' },
  { screen: 'home-view', dur: 4500, tap: '.hot[aria-label="Family"]', then: 'contact-view', title: 'See your loved ones',
    text: 'Tap the Family door.' },
  { screen: 'contact-view', dur: 6000, tap: '.medallion, .loved-empty', title: 'Reach them in one tap',
    text: 'Tap a person’s circle and WhatsApp opens to message or call. Nothing is ever sent automatically.' },
  { screen: 'contact-view', dur: 3500, tap: '.wbtn.home', then: 'home-view', title: 'Home is one tap away',
    text: 'Tap Home anytime to come back.' },
  { screen: 'home-view', dur: 4500, tap: '.hot[aria-label="Play"]', then: 'games', title: 'Play',
    text: 'Tap the Play door to choose a game.' },
  { screen: 'games', dur: 6000, tap: '[data-game="chess"]', then: 'chs-entry-n', title: 'Pick a game',
    text: 'Bubble Pop, Hidden Comets, Checkers and Chess, each with gentle beginner levels. Let’s open Chess.' },
  { screen: 'chs-entry-n', dur: 6500, tap: '.hot[aria-label="Easy"]', title: 'Learn as you go',
    text: 'On Easy, Chess and Checkers show move hints and let you undo. In Bubble Pop, reach the goal on a level to earn a gold star.' },
  { screen: 'chs-entry-n', dur: 3500, tap: '.hot[aria-label="Home"]', then: 'home-view', title: 'Back to Home',
    text: 'Every screen has a way Home.' },
  { screen: 'home-view', dur: 6000, tap: '.gear-btn', title: 'Keep your data safe',
    text: 'Everything stays on this phone. Now and then, tap the gear → Back up now, and keep the file somewhere safe.' },
  { screen: 'home-view', dur: 6000, pill: true, title: 'Stay up to date',
    text: 'When a new version is ready, a gold ↑ Update button appears up here. See What’s New, then update whenever it suits you.' },
  { screen: 'home-view', dur: 4500, tap: '.privacy-link', then: 'privacy', title: 'Privacy & Safety',
    text: 'Tap Privacy & Safety at the bottom of Home.' },
  { screen: 'privacy', dur: 8000, scrollTo: '.fb-open', tap: '.fb-open', then: 'feedback', tapAt: 0.82, switchAt: 0.9, title: 'Privacy & Safety',
    text: 'Everything about how the app handles your data is explained here, and you can adjust a few settings to suit you.' },
  { screen: 'feedback', dur: 7000, rest: '.fb-box', title: 'Share your thoughts',
    text: 'What do you enjoy? What felt confusing? What would you love to see? Tell us here, anytime. It’s anonymous. Enjoy the garden! \u{1F31F}' }
];
const TOUR_SPEEDS = [1, 1.5, 2, 0.5];
const TOUR_TAP = 0.6, TOUR_SWITCH = 0.78;          // in a tap scene: the tap happens at 60%, the next screen shows at 78%

const Tour = {
  on: false, from: null, root: null, t: 0, total: 0, playing: false, speed: 1, last: 0, shown: null, ctlUntil: 0, rec: false,
  start(from, opts) {
    if (this.on) return;
    opts = opts || {};
    let t = 0; TOUR_SCENES.forEach(s => { s.start = t; t += s.dur; }); this.total = t;
    this.on = true; this.from = from || CUR || 'home-view'; this.t = 0; this.playing = true; this.speed = 1; this.last = 0; this.shown = null;
    this.rec = !!opts.record;
    const F = SCREENS[this.from], fs = F && F.el.querySelector('.sheet'); this.scroll = fs ? fs.scrollTop : 0;
    this.build(); this.showControls(); requestAnimationFrame((n) => this.loop(n));
  },
  build() {
    const r = el('div', 'tour' + (this.rec ? ' rec' : '')); r.setAttribute('role', 'dialog'); r.setAttribute('aria-label', 'Tour of the app');
    r.innerHTML = '<div class="tour-ill"></div><div class="tour-pill upd-badge" hidden><span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15V5M5.5 9.5 10 5l4.5 4.5" fill="none" stroke="#3a2208" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Update</span></div>' +
      '<div class="tour-finger"></div>' +
      '<div class="tour-cap" aria-live="polite"><div class="tour-title"></div><div class="tour-text"></div><div class="tour-note"></div>' +
      '<button type="button" class="tour-done" data-k="done">Done</button><button type="button" class="tour-x" data-k="close" aria-label="Close the tour">✕</button></div>' +
      '<div class="tour-thin"><i></i></div>' +
      '<div class="tour-bar"><div class="tour-tl"><div class="tour-ticks"></div><input type="range" min="0" step="100" aria-label="Position in the tour"></div>' +
      '<div class="tour-row"><button type="button" class="tour-b s" data-k="back" aria-label="Back 5 seconds">⟲<small>5</small></button>' +
      '<button type="button" class="tour-b" data-k="play"></button>' +
      '<button type="button" class="tour-b s" data-k="fwd" aria-label="Forward 5 seconds">⟳<small>5</small></button>' +
      '<button type="button" class="tour-b s" data-k="music" aria-label="Music on or off">♪</button>' +
      '<span class="tour-time"></span><button type="button" class="tour-speed" data-k="speed" aria-label="Speed"></button></div></div>';
    const $ = (q) => r.querySelector(q);
    this.$ = $;
    $('.tour-ticks').innerHTML = TOUR_SCENES.slice(1).map(s => '<em style="left:' + (s.start / this.total * 100) + '%"></em>').join('');
    const range = $('input'); range.max = this.total;
    range.addEventListener('input', () => { this.t = +range.value; this.showControls(); });
    // every tap stays inside the tour: buttons work; a tap anywhere else shows or hides the controls
    r.addEventListener('click', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      const k = ev.target.closest('[data-k]');
      if (!k) { if (!ev.target.closest('.tour-bar, .tour-cap')) { if (this.ctlUntil > performance.now() && this.playing) this.ctlUntil = 0; else this.showControls(); } return; }
      this.showControls();
      const K = k.dataset.k;
      if (K === 'close' || K === 'done') return this.end();
      if (K === 'play') { if (this.t >= this.total) this.t = 0; this.playing = !this.playing; }
      if (K === 'back') this.t = Math.max(0, this.t - 5000);
      if (K === 'fwd') this.t = Math.min(this.total, this.t + 5000);
      if (K === 'speed') this.speed = TOUR_SPEEDS[(TOUR_SPEEDS.indexOf(this.speed) + 1) % TOUR_SPEEDS.length];
      if (K === 'music') { try { Music.toggle(); } catch (e) {} }
    });
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'contextmenu'].forEach(t => r.addEventListener(t, (ev) => ev.stopPropagation()));
    document.body.appendChild(r); this.root = r;
  },
  showControls() { this.ctlUntil = performance.now() + 3500; },
  loop(now) {
    if (!this.on) return;
    const prev = this.t;
    if (this.playing) { this.t = Math.min(this.total, this.t + (this.last ? now - this.last : 0) * this.speed); if (this.t >= this.total) this.playing = false; }
    this.last = now;
    this.render(prev);
    requestAnimationFrame((n) => this.loop(n));
  },
  seek(ms) { this.t = Math.max(0, Math.min(this.total, ms)); this.render(this.t); },
  scene() { const t = this.t; let i = TOUR_SCENES.findIndex(s => t < s.start + s.dur); return i < 0 ? TOUR_SCENES.length - 1 : i; },
  render(prev) {
    const $ = this.$, i = this.scene(), sc = TOUR_SCENES[i], u = Math.min(1, (this.t - sc.start) / sc.dur);
    const pu = (prev - sc.start) / sc.dur;                                   // where we were a moment ago (for tap ripples)
    // 1. the screen (a tap that opens another screen shows it near the end of the scene)
    const tapAt = sc.tapAt || TOUR_TAP, switchAt = sc.switchAt || TOUR_SWITCH;
    const want = sc.then && u >= switchAt ? sc.then : sc.screen;
    if (CUR !== want) go(want);
    const S = SCREENS[want];
    // 2. scrolling (Privacy & Safety glides down to Share feedback); other pages start at the top
    const sh = S.el.querySelector('.sheet');
    if (sh && want === sc.screen && sc.scrollTo) {
      const tg = sh.querySelector(sc.scrollTo), end = tg ? Math.max(0, tg.offsetTop - sh.clientHeight * 0.45) : 0, k = Math.min(1, Math.max(0, (u - 0.25) / 0.25));
      sh.scrollTop = end * k * k * (3 - 2 * k);
    } else if (sh && sh.scrollTop) sh.scrollTop = 0;
    // 3. the finger
    let pos = null, taps = [];
    const ill = $('.tour-ill'), pill = $('.tour-pill');
    pill.hidden = !sc.pill;
    if (sc.pill) {
      const g = S.el.querySelector('.gear-btn').getBoundingClientRect();
      pill.style.left = (g.left - pill.offsetWidth - 6) + 'px'; pill.style.top = (g.top + (g.height - pill.offsetHeight) / 2) + 'px';
    }
    if (sc.install) { const r = this.installScene(sc.install, u); pos = r.pos; taps = r.taps; }
    else {
      if (ill.innerHTML) { ill.innerHTML = ''; this.illKey = ''; }
      const tgt = sc.pill ? pill : sc.tap ? S.el.querySelector(sc.tap) : sc.rest ? S.el.querySelector(sc.rest) : null;
      if (tgt && u < (sc.then ? switchAt : 1.01)) {
        const r = tgt.getBoundingClientRect(), to = [r.left + r.width / 2, r.top + Math.min(r.height / 2, 70)];
        const k0 = sc.scrollTo ? 0.5 : 0.12, k = Math.min(1, Math.max(0, (u - k0) / 0.3)), e = k * k * (3 - 2 * k);
        const from = [innerWidth * 0.5, innerHeight * 0.72];
        pos = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
        if (sc.tap || sc.pill) taps = [[tapAt, pos]];
      }
    }
    const f = $('.tour-finger');
    f.style.opacity = pos ? 1 : 0;
    if (pos) { f.style.left = pos[0] + 'px'; f.style.top = pos[1] + 'px'; }
    if (this.playing && this.t - prev < 400) taps.forEach(([at, p]) => { if (pu < at && u >= at) this.ripple(p); });
    // 4. the caption: at the top, or at the bottom when the finger works near the top
    $('.tour-title').textContent = sc.title; $('.tour-text').textContent = sc.text;
    $('.tour-note').textContent = sc.install ? TOUR_NOTE : '';
    const end = this.t >= this.total;
    $('.tour-done').hidden = !end;
    const up = sc.install === 'android' || (sc.install === 'both' && u < 0.5) || (pos && pos[1] < innerHeight * 0.38);
    const ctl = !this.rec && (!this.playing || performance.now() < this.ctlUntil);
    this.root.classList.toggle('ctl', ctl);
    const cap = $('.tour-cap'), barH = ctl ? $('.tour-bar').offsetHeight : 14;
    this.root.style.setProperty('--tour-bottom', (ctl ? $('.tour-bar').offsetHeight : 4) + 'px');   // drawn iPhone menus sit above the player bar
    if (up) { cap.style.top = 'auto'; cap.style.bottom = (barH + 10) + 'px'; } else { cap.style.bottom = 'auto'; cap.style.top = 'max(14px, env(safe-area-inset-top))'; }
    // 5. the player bar
    const range = $('input'); if (document.activeElement !== range) range.value = Math.round(this.t);
    $('.tour-thin i').style.width = (this.t / this.total * 100) + '%';
    const fmt = (ms) => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    $('.tour-time').textContent = fmt(this.t) + ' / ' + fmt(this.total);
    const pb = $('[data-k=play]'); pb.textContent = this.playing ? '❚❚' : '▶'; pb.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
    $('[data-k=speed]').textContent = this.speed + '×';
    let mOn = false; try { mOn = Music.isOn(); } catch (e) {}
    $('[data-k=music]').classList.toggle('off', !mOn);
  },
  ripple(p) {
    const r = el('div', 'tour-rip'); r.style.left = p[0] + 'px'; r.style.top = p[1] + 'px'; this.root.appendChild(r);
    setTimeout(() => r.remove(), 650);
  },
  // The browser's menu, drawn (Chrome on Android, Safari on iPhone). Returns where the finger is and when it taps.
  installScene(kind, u) {
    let k = kind, v = u;
    if (kind === 'both') { k = u < 0.5 ? 'android' : 'ios'; v = u < 0.5 ? u * 2 : (u - 0.5) * 2; }
    const ill = this.$('.tour-ill'), phase = k === 'android' ? (v < 0.3 ? 0 : v < 0.6 ? 1 : 2) : (v < 0.25 ? 0 : v < 0.5 ? 1 : v < 0.75 ? 2 : 3);
    const hl = () => (k === 'android' ? [0.18, 0.47, 0.75] : [0.15, 0.4, 0.65, 0.92])[phase] - 0.04 <= v ? ' hl' : '';
    const key = k + phase + hl();
    if (this.illKey !== key) {
      this.illKey = key;
      let h = '';
      if (k === 'android') {
        h = '<div class="ti-url top"><span>taarala-thota.pages.dev</span><b data-f="0">⋮</b></div>';
        if (phase === 1) h += '<div class="ti-menu"><div>New tab</div><div>Bookmarks</div><div>History</div><div data-f="1" class="' + hl() + '">Add to home screen</div><div>Settings</div></div>';
        if (phase === 2) h += '<div class="ti-sheet"><h4>Add to home screen</h4><div data-f="2" class="ti-opt' + hl() + '"><b>Install</b> · full app, works offline</div><div class="ti-opt">Create shortcut · opens a browser tab</div></div>';
      } else {
        h = '<div class="ti-url bottom"><b>‹</b><span>taarala-thota.pages.dev</span><b data-f="0">⋯</b></div>';
        if (phase === 1) h += '<div class="ti-menu ios"><div>Bookmarks</div><div>Reload</div><div data-f="1" class="' + hl() + '">Share</div></div>';
        if (phase === 2) h += '<div class="ti-sheet ios"><div>Copy</div><div>Add to Bookmarks</div><div>Add to Favourites</div><div data-f="2" class="ti-opt' + hl() + '">Add to Home Screen</div></div>';
        if (phase === 3) h += '<div class="ti-sheet ios top"><div class="ti-hd"><span>Cancel</span><h4>Add to Home Screen</h4><b data-f="3" class="' + hl() + '">Add</b></div><div>Taarala Thota</div><div class="ti-tog">Open as Web App <i></i></div></div>';
      }
      ill.innerHTML = h;
    }
    const tg = ill.querySelector('[data-f="' + phase + '"]');
    if (!tg) return { pos: null, taps: [] };
    const r = tg.getBoundingClientRect(), pos = [r.left + Math.min(r.width / 2, 70), r.top + r.height / 2];
    const at = (k === 'android' ? [0.18, 0.47, 0.75] : [0.15, 0.4, 0.65, 0.92])[phase];
    const atU = kind === 'both' ? (u < 0.5 ? at / 2 : 0.5 + at / 2) : at;
    return { pos, taps: [[atU, pos]] };
  },
  end() {
    if (!this.on) return;
    this.on = false;
    if (this.root) this.root.remove(); this.root = null; this.illKey = '';
    ['privacy', 'feedback'].forEach(id => { const s = SCREENS[id] && SCREENS[id].el.querySelector('.sheet'); if (s) s.scrollTop = 0; });
    go(this.from);
    const F = SCREENS[this.from], sh = F && F.el.querySelector('.sheet'); if (sh) sh.scrollTop = this.scroll;
  }
};

// The invitation card (top of Privacy & Safety; in Settings just under App update)
function tourCard(from) {
  const c = tx('div', 'tour-card');
  c.appendChild(tx('div', 'tour-card-title', 'New here? \u{1F31F}'));
  c.appendChild(tx('div', 'tour-card-text', 'Watch a short walkthrough of everything the app does.'));
  c.appendChild(btn('▶ Take a tour', 'small tour-go', () => Tour.start(from, { record: TEST_MODE && QS.has('tourrec') })));
  return c;
}
