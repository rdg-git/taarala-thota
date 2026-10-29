// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
const APP_RELEASE = '2026-10-28f';   // this version's release label (newest entry in src/whats_new.json)
// ============================================================
// CORE: helpers, storage, picture-screen system, navigation
// ============================================================
'use strict';

// ------------------------------------------------------------
// START-UP FLAGS
// TEST_MODE is only ever true on the developer's own computer (localhost + "?test=1").
// It exposes helpers (window.MM) that the automatic tests use. It can never switch on for real visitors.
// ------------------------------------------------------------
const QS = new URLSearchParams(location.search);
const IS_LOCAL = ['localhost', '127.0.0.1'].indexOf(location.hostname) >= 0;
const TEST_MODE = IS_LOCAL && QS.has('test');       // test helpers only ever on a local machine
if (QS.has('debug') && IS_LOCAL) document.body.classList.add('debug');

// Every "now" in the app goes through nowMs(), so tests can jump the clock forward
// (for example to check the 60-minute resume rule or the 6-day backup reminder) without waiting.
// ---- clock (can be moved forward in tests so 60-minute rules can be checked) ----
let CLOCK_SHIFT = 0;
function nowMs() { return Date.now() + CLOCK_SHIFT; }

// Tiny shared helpers. el(..., html) is only ever given text written in this code, never anything a person typed.
// ---- small helpers ----
function $(id) { return document.getElementById(id); }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + pad2(sec % 60); }

// ------------------------------------------------------------
// SAVED DATA (this phone only)
// Everything the app remembers lives in the browser's storage for this site, under labels starting with "tt:".
// Nothing is ever sent anywhere. The full list of labels is in docs/DEVELOPER_GUIDE.md.
// Reads and writes are wrapped in try/catch because private browsing can refuse storage.
// ------------------------------------------------------------
// ---- storage: on this phone/browser only, never sent anywhere (try/catch: it can fail in private mode) ----
const Store = {
  key(k) { return 'tt:' + k; },
  get(k, dflt) { try { const v = localStorage.getItem(this.key(k)); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
  set(k, v) { try { localStorage.setItem(this.key(k), JSON.stringify(v)); } catch (e) { console.warn('save failed', e); } },
  del(k) { try { localStorage.removeItem(this.key(k)); } catch (e) {} }
};

// ------------------------------------------------------------
// PICTURES
// Each screen is one painted picture. build.py fills PIC (sizes) and PICV (fingerprints) automatically.
// Phones that can show AVIF get the smaller .avif files; all others get .webp. The fingerprint (?v=...)
// changes whenever a picture changes, so phones always fetch the new one and can cache old ones forever.
// ------------------------------------------------------------
// ---- picture sizes [width,height] (filled by build script) ----
const PIC = {"bubble-home": [853, 1844], "bubble-l1": [853, 1844], "bubble-l2": [853, 1844], "bubble-l3": [853, 1844], "checkers-board": [852, 1846], "checkers-draw": [900, 1748], "checkers-forfeit": [900, 1748], "checkers-lost": [900, 1748], "checkers-replace": [853, 1844], "checkers-stats": [853, 1844], "checkers-won": [900, 1748], "chess-board": [853, 1844], "chess-entry-noresume": [853, 1844], "chess-entry-resume": [853, 1844], "chess-side": [853, 1844], "chess-stats": [853, 1843], "games": [936, 1681], "home": [853, 1844], "ms-home": [853, 1844], "loved": [851, 1847], "ms-board": [853, 1844], "ms-stats": [852, 1846], "bubble-stats": [852, 1846]};
const PICV = {"bubble-home": {"webp": "d113975c", "avif": "3f549fc7"}, "bubble-l1": {"webp": "ac253054", "avif": "5508c812"}, "bubble-l2": {"webp": "bb3a7435", "avif": "648c8635"}, "bubble-l3": {"webp": "09cf1fcb", "avif": "1f2ca55d"}, "checkers-board": {"webp": "84129473", "avif": "f98ba8bc"}, "checkers-draw": {"webp": "1e7817c6", "avif": "37c1ff94"}, "checkers-forfeit": {"webp": "0408982b", "avif": "9ed47b73"}, "checkers-lost": {"webp": "3e8fd28c", "avif": "b2669767"}, "checkers-replace": {"webp": "be2d5b2f", "avif": "c660f4bc"}, "checkers-stats": {"webp": "593e1c5b", "avif": "ce4d0755"}, "checkers-won": {"webp": "246f5020", "avif": "92f8b085"}, "chess-board": {"webp": "69248f23", "avif": "8b78d3be"}, "chess-entry-noresume": {"webp": "d2104577", "avif": "e567d01f"}, "chess-entry-resume": {"webp": "e712fb23", "avif": "78bcc9c0"}, "chess-side": {"webp": "2210eff0", "avif": "560cc06e"}, "chess-stats": {"webp": "07a558c4", "avif": "96e9ef0c"}, "games": {"webp": "d19d8c12", "avif": "de966ab8"}, "home": {"webp": "aab1c2e4", "avif": "e56907c0"}, "ms-home": {"webp": "e6988136", "avif": "2bef222e"}, "loved": {"webp": "12a30f2a", "avif": "e9dab910"}, "ms-board": {"webp": "59d3ec71", "avif": "77e09ac9"}, "ms-stats": {"webp": "e3ca83b5", "avif": "ad3bbc63"}, "bubble-stats": {"webp": "de6d6abf", "avif": "d5b31da3"}};          // fingerprints: {name: {webp: '...', avif: '...'}}
// Pictures come in two formats: AVIF (about a third smaller) for phones that can show it, WebP for the rest.
let PIC_EXT = 'webp';
function picUrl(name) { const v = PICV[name] && PICV[name][PIC_EXT]; return 'img/' + name + '.' + PIC_EXT + (v ? '?v=' + v : ''); }
function detectAvif(done) {
  let called = false; const finish = () => { if (!called) { called = true; done(); } };
  try {
    const t = new Image();
    t.onload = () => { if (t.width > 0) PIC_EXT = 'avif'; finish(); };
    t.onerror = finish;
    t.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAIQAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAKW1kYXQSAAoIGAAGiAhoNCAyExlHh4Yhh5555oAAAJBAyRxhQr4=';
  } catch (e) { finish(); }
  setTimeout(finish, 600);             // never wait long: WebP works everywhere
}

// ============================================================
// PICTURE SCREENS
// A screen = blurred copy of the picture as background + the picture itself
// ("contain" fit, never cropped). Everything on top is positioned in picture
// pixels and scales together with the picture.
// ============================================================
// SCREENS holds every screen by its id; CUR is the id of the screen showing now.
const SCREENS = {};
let CUR = null;

// Create a screen: a blurred copy of the picture fills the background, the sharp picture sits on top.
// opts.parent is where "Back" goes. onShow / onHide run when the screen appears / disappears.
function defScreen(id, pic, opts) {
  opts = opts || {};
  const sec = el('section', 'scr'); sec.id = id;
  const bg = el('div', 'bg'); sec.appendChild(bg);
  const art = el('div', 'art'); sec.appendChild(art);
  const S = { id, el: sec, art, bg, pic: null, W: 853, H: 1844, parent: opts.parent || null, onShow: opts.onShow || null, onHide: opts.onHide || null, name: opts.name || id };
  if (pic) setPic(S, pic);
  document.body.appendChild(sec);
  SCREENS[id] = S;
  return S;
}
function setPic(S, pic) {
  if (!PIC[pic]) { console.warn('no picture', pic); return; }
  S.pic = pic; S.W = PIC[pic][0]; S.H = PIC[pic][1];
  let img = S.art.querySelector('img.pic');
  if (!img) { img = el('img', 'pic'); img.alt = ''; img.draggable = false; S.art.insertBefore(img, S.art.firstChild); }
  S.lazyUrl = picUrl(pic); S.loaded = false;
  layoutScreen(S);
}

// ------------------------------------------------------------
// FITTING ANY PHONE
// The picture is scaled to the screen and the scale is stored as --u, so everything placed on top
// (buttons, words) is measured in PICTURE pixels and scales with the picture.
// The last part keeps the small round buttons (Home, Back, music) at least 44 px, finger-sized,
// on short screens, moving them just enough that they never overlap.
// ------------------------------------------------------------
// FILL THE SCREEN: when the phone screen is wider than the picture (which would leave dark strips on the left
// and right), zoom in instead and trim a little of the picture's top and bottom (at most FILL_CROP of its height).
// Each screen works out how much it can safely trim: never past anything painted that you tap or read
// (painted signs, lanterns, boards). Buttons and titles floating near the top or bottom edge move inwards,
// and the Settings / Privacy panels get shorter, so nothing is ever cut off.
const FILL_CROP = 0.16, EDGE = 200, SAFE = 6;
const FLOATING = '.gear-btn, .privacy-link, .game-title, .loved-title, .maker-seal';
function layoutScreen(S) {
  const vw = window.innerWidth, vh = window.innerHeight;
  let sc = Math.min(vw / S.W, vh / S.H), cropTop = 0, cropBot = 0;
  if (vw / S.W > vh / S.H) {
    // how far from the top / bottom edge is the first fixed (painted-on) thing?
    let safeTop = S.H, safeBot = S.H;
    S.art.querySelectorAll('*').forEach(e => {
      const g = e._pg; if (!g || e.matches(FLOATING) || e.matches('.sheet') || e.dataset.g) return;
      if (g[3] >= S.H * 0.9) return;                              // full-screen see-through layers are not content
      safeTop = Math.min(safeTop, g[1] - SAFE); safeBot = Math.min(safeBot, S.H - (g[1] + (g[3] || 0)) - SAFE);
    });
    safeTop = Math.max(0, safeTop); safeBot = Math.max(0, safeBot);
    const fit = vw / S.W, need = S.H - vh / fit;                   // picture pixels to hide to fill the width
    const allowed = Math.min(FILL_CROP * S.H, safeTop + safeBot);
    const hide = Math.min(need, allowed);
    sc = vh / (S.H - hide);
    cropTop = Math.min(safeTop, Math.max(hide / 2, hide - safeBot)); cropBot = hide - cropTop;
  }
  S.crop = cropTop; S.cropBot = cropBot;
  S.art.style.width = (S.W * sc) + 'px';
  S.art.style.height = (S.H * sc) + 'px';
  S.art.style.top = 'calc(50% + ' + ((cropBot - cropTop) / 2 * sc) + 'px)';   // trim more at whichever end has room
  S.art.style.setProperty('--u', sc + 'px');
  S.scale = sc;
  S.art.querySelectorAll(FLOATING).forEach(e => {
    const g = e._pg; if (!g) return;
    const y = g[1] < EDGE ? g[1] + cropTop : (g[1] + g[3] > S.H - EDGE ? g[1] - cropBot : g[1]);
    e.style.top = (y / S.H * 100) + '%';
  });
  S.art.querySelectorAll('.sheet').forEach(e => {                 // panels end above the visible bottom edge
    const g = e._pg; if (!g) return;
    // the panel's top moves down with the page title (which moves inward by the trimmed amount), so the title is never hidden
    const top = Math.max(g[1] + cropTop, cropTop + 20), bottom = Math.min(g[1] + g[3], S.H - cropBot - 24);
    e.style.top = (top / S.H * 100) + '%'; e.style.height = ((bottom - top) / S.H * 100) + '%';
  });
  const crop = cropTop;
  // small round buttons (Home, Back, music) never shrink below finger size; when enlarged they keep their order
  const MIN = 44, GAP = 6;
  S.art.querySelectorAll('[data-g]').forEach(b => {
    const g = b.dataset.g.split(',').map(Number), [x, y, w, h, slot, right] = g;
    if (w * sc >= MIN) { place(b, x, y + crop, w, h, S); return; }
    const size = MIN, top = (y + crop) * sc;
    const left = right ? (x + w) * sc - size : 30 * sc + slot * (size + GAP);
    Object.assign(b.style, { left: left + 'px', top: top + 'px', width: size + 'px', height: size + 'px' });
  });
  if (typeof placeUpdateBadge === 'function') placeUpdateBadge(S);
}
function layoutAll() { for (const k in SCREENS) layoutScreen(SCREENS[k]); }
window.addEventListener('resize', layoutAll);
window.addEventListener('orientationchange', () => setTimeout(layoutAll, 200));

// position an element by picture pixels

// ------------------------------------------------------------
// PLACING THINGS ON A PICTURE
// All positions below are in picture pixels (x, y, width, height), measured on the original picture.
// To move a button or word, change these four numbers; the screen size does not matter.
// addHot  = invisible tap area over something painted in the picture (a painted sign or door).
// addText = words drawn by the app (always plain text, never read as code).
// addPlank / addIconBtn / addMusic = buttons drawn by the app.
// ------------------------------------------------------------
function place(e, x, y, w, h, S) {
  const W = S.W, H = S.H; if (!e._pg) e._pg = [x, y, w, h];     // remember the original spot (used by screen fill)
  e.style.left = (x / W * 100) + '%';
  e.style.top = (y / H * 100) + '%';
  if (w != null) e.style.width = (w / W * 100) + '%';
  if (h != null) e.style.height = (h / H * 100) + '%';
  return e;
}
// an invisible tap area exactly over a baked-in sign
function addHot(S, x, y, w, h, fn, label) {
  const b = el('button', 'hot'); b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  place(b, x, y, w, h, S);
  b.addEventListener('click', (ev) => { ev.stopPropagation(); try { fn(ev); } catch (e) { console.error(e); } });
  S.art.appendChild(b);
  return b;
}
// a text/number drawn live by the app. fs = font size in picture pixels
function addText(S, cls, x, y, w, h, fs, text) {
  const d = el('div', 'live ' + (cls || '')); place(d, x, y, w, h, S);
  d.style.fontSize = 'calc(var(--u) * ' + fs + ')';
  if (text != null) d.textContent = text;
  S.art.appendChild(d);
  return d;
}
// a code-drawn carved-wood sign (used where a picture has no Home / Back sign)
// Small icons drawn in code (no picture files needed).
const ICON_HOME = '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M3 11.5 12 4l9 7.5M6 10v9h12v-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M14 5 7 12l7 7M7 12h13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
function addPlank(S, x, y, w, h, kind, fn) {
  const b = el('button', 'plank'); b.type = 'button';
  place(b, x, y, w, h, S);
  b.style.fontSize = 'calc(var(--u) * ' + Math.round(h * 0.42) + ')';
  const lab = kind === 'home' ? ICON_HOME + '<span>Home</span>' : kind === 'back' ? ICON_BACK + '<span>Back</span>' : '<span>' + kind + '</span>';
  b.innerHTML = lab;
  b.addEventListener('click', (ev) => { ev.stopPropagation(); fn(ev); });
  S.art.appendChild(b);
  return b;
}
function addMusic(S, x, y) {
  const b = el('button', 'music-btn'); b.type = 'button'; b.dataset.music = '1'; b.setAttribute('aria-label', 'Music on or off');
  place(b, x == null ? 692 : x, y == null ? 36 : y, 64, 64, S);
  b.dataset.g = [x == null ? 692 : x, y == null ? 36 : y, 64, 64, 0, 1].join(',');
  b.innerHTML = MUSIC_SVG.replace(/__ID__/g, 'mw' + S.id);
  b.addEventListener('click', (ev) => { ev.stopPropagation(); Music.toggle(); });
  S.art.appendChild(b);
  return b;
}
const MUSIC_SVG = '<svg viewBox="0 0 64 64"><defs><linearGradient id="__ID__" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a2b"/><stop offset="1" stop-color="#4b2c12"/></linearGradient></defs>' +
  '<rect x="2" y="2" width="60" height="60" rx="30" fill="url(#__ID__)" stroke="#d9a95a" stroke-width="3"/>' +
  '<g class="note" fill="#ffe3a3" stroke="#ffe3a3" stroke-linecap="round" stroke-linejoin="round"><path d="M27 43V21l17-4v21" fill="none" stroke-width="4"/><ellipse cx="22" cy="44" rx="6.500" ry="5" stroke="none"/><ellipse cx="39" cy="39" rx="6.500" ry="5" stroke="none"/></g>' +
  '<path class="slash" d="M15 49 49 15" stroke="#2a1608" stroke-width="9" stroke-linecap="round"/><path class="slash" d="M15 49 49 15" stroke="#ffe3a3" stroke-width="4" stroke-linecap="round"/></svg>';
// music on/off button in the top-right corner of every screen except Home
function addTopMusic(S, y) { return addMusic(S, 764, y); }
// small carved-wood square buttons (Home / Back / Undo) in the same family as the music button
const ICON_UNDO = '<svg viewBox="0 0 24 24"><path d="M9 7 4.5 11.5 9 16M5 11.5h9.500a5 5 0 0 1 0 10H10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" transform="translate(0 -2)"/></svg>';
function addIconBtn(S, x, y, w, kind, fn, label, h, slot) {
  const b = el('button', 'wbtn ' + kind); b.type = 'button'; b.setAttribute('aria-label', label);
  place(b, x, y, w, h || w, S);
  if (slot != null) b.dataset.g = [x, y, w, h || w, slot, 0].join(',');
  b.innerHTML = kind === 'home' ? ICON_HOME : kind === 'back' ? ICON_BACK : ICON_UNDO;
  b.addEventListener('click', (ev) => { ev.stopPropagation(); try { fn(ev); } catch (e) { console.error(e); } });
  S.art.appendChild(b);
  return b;
}
// a banner that slides in across the middle of the screen and stays until the person taps it
// A banner across the middle of a screen that stays until tapped (used by games, e.g. "Level complete").
function showBanner(S, text) {
  if (!S || !S.art) return;
  hideBanner(S);
  const b = el('button', 'banner');
  b.type = 'button';
  b.innerHTML = '<span>' + text + '<small>Tap to continue</small></span>';
  b.setAttribute('role', 'status');
  b.addEventListener('click', (ev) => { ev.stopPropagation(); hideBanner(S); });
  S.art.appendChild(b); S.banner = b;
}
function hideBanner(S) {
  const b = S && S.banner; if (!b) return; S.banner = null;
  b.classList.add('out'); setTimeout(() => b.remove(), 350);
}
// Adds Home and Back to a screen, either as tap areas over painted signs, drawn planks, or small round icons.
// Every screen except Home must have both, and Back always goes to the screen's parent.
function addNav(S, o) {   // o: {home:[x,y,w,h]|'plank:x,y,w,h', back:...}
  const homeFn = () => goHome(), backFn = () => goBack();
  if (o.home) {
    if (o.home.plank) addPlank(S, o.home.plank[0], o.home.plank[1], o.home.plank[2], o.home.plank[3], 'home', homeFn);
    else addHot(S, ...o.home, homeFn, 'Home').classList.add('navhot');
  }
  if (o.back) {
    if (o.back.plank) addPlank(S, o.back.plank[0], o.back.plank[1], o.back.plank[2], o.back.plank[3], 'back', backFn);
    else addHot(S, ...o.back, backFn, 'Back').classList.add('navhot');
  }
  if (o.icons) { addIconBtn(S, 30, 36, 64, 'home', homeFn, 'Home', null, 0); addIconBtn(S, 106, 36, 64, 'back', backFn, 'Back', null, 1); }
  if (o.music !== false) addTopMusic(S);
}

// ============================================================
// NAVIGATION
// Back  = one step back (the screen's "parent").  Home = main Home.
// ============================================================

// ------------------------------------------------------------
// NAVIGATION
// go(id) switches screens without reloading the page. goBack() goes to the current screen's parent.
// ALIAS lets one name pick the right real screen (for example the Chess entry with or without "Resume").
// ------------------------------------------------------------
const ALIAS = {};   // virtual screens: name -> function returning the real screen id
function go(id, params) {
  if (ALIAS[id]) id = ALIAS[id]();
  const S = SCREENS[id];
  if (!S) { console.warn('unknown screen', id); return; }
  if (CUR && SCREENS[CUR] && CUR !== id) {
    const P = SCREENS[CUR];
    try { if (P.onHide) P.onHide(); } catch (e) { console.error(e); }
    P.el.classList.remove('active');
  }
  CUR = id;
  S.el.classList.add('active');
  if (S.lazyUrl && !S.loaded) {
    S.loaded = true;
    const im = S.art.querySelector('img.pic');
    if (im) im.src = S.lazyUrl;
    S.bg.style.backgroundImage = 'url(' + S.lazyUrl + ')';
  }
  layoutScreen(S);
  preloadNext(id);
  try { if (S.onShow) S.onShow(params || {}); } catch (e) { console.error(e); }
  try { Music.paint(); } catch (e) {}
}
// After a screen is showing, quietly fetch the pictures of the screens you can reach from it,
// so the next tap shows its picture straight away. Waits until the browser is idle; never blocks.
// Quietly fetch the pictures of the screens reachable from here, so the next tap shows instantly.
const PRELOADED = {};
function preloadNext(id) {
  try {
    const run = () => {
      if (CUR !== id) return;
      Object.keys(SCREENS).forEach(k => {
        const T = SCREENS[k];
        if (!T || !T.lazyUrl || T.loaded || PRELOADED[T.lazyUrl]) return;
        if (T.parent !== id && !(id === 'home-view' && (k === 'games' || k === 'contact-view'))) return;
        PRELOADED[T.lazyUrl] = true; const im = new Image(); im.decoding = 'async'; im.src = T.lazyUrl;
      });
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 600);
  } catch (e) {}
}
function goHome() { go('home-view'); }
function goBack() {
  const S = CUR && SCREENS[CUR];
  if (!S) { goHome(); return; }
  const p = typeof S.parent === 'function' ? S.parent() : S.parent;
  go(p || 'home-view');
}

// ============================================================
// PANELS (code-drawn cards that sit on top of a screen)
// ============================================================

// ------------------------------------------------------------
// CARDS AND MESSAGES
// showPanel = a cream card in the middle of the screen with a title, text and buttons (confirmations, results).
// toast = a short message near the bottom that fades away by itself.
// ------------------------------------------------------------
function showPanel(S, o) {
  // o: {title, text, buttons:[{label, fn, secondary}], icon, big}
  closePanel(S);
  const ov = el('div', 'panel-ov'); ov.dataset.panel = '1';
  const card = el('div', 'panel-card' + (o.big ? ' big' : ''));
  if (o.icon) card.appendChild(el('div', 'panel-icon', o.icon));
  card.appendChild(el('div', 'panel-title', o.title || ''));
  if (o.text) card.appendChild(el('div', 'panel-text', o.text));
  if (o.html) { const h = el('div', 'panel-extra'); h.appendChild(o.html); card.appendChild(h); }
  const row = el('div', 'panel-btns');
  (o.buttons || []).forEach(bd => {
    const b = el('button', 'panel-btn' + (bd.secondary ? ' secondary' : ''), bd.label); b.type = 'button';
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (bd.keepOpen !== true) closePanel(S);
      try { bd.fn && bd.fn(); } catch (e) { console.error(e); }
    });
    row.appendChild(b);
  });
  card.appendChild(row);
  ov.appendChild(card);
  S.el.appendChild(ov);
  S.panel = ov;
  return ov;
}
function closePanel(S) {
  if (S.panel && S.panel.parentNode) S.panel.parentNode.removeChild(S.panel);
  S.panel = null;
}
function toast(S, msg, ms) {
  const t = el('div', 'toast', msg);
  S.el.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms || 1800);
}

// Run code for one second-tick while a screen is open
// One shared once-a-second timer for clocks and time-based rules, instead of many separate timers.
const Ticker = { fns: new Set(), start() {
  if (this.t) return;
  this.t = setInterval(() => this.fns.forEach(f => { try { f(); } catch (e) { console.error(e); } }), 1000);
} };
Ticker.start();

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

// ============================================================
// CONTACTS + PASSCODE (kept only on this phone, never sent anywhere)
// - Contacts: name, WhatsApp number, circle colour. Readable by the app so
//   Loved Ones can open WhatsApp with one tap. Seeing/changing numbers needs the passcode.
// - Passcode: never stored. Only a salted PBKDF2 fingerprint is kept, so it cannot be read back.
// ============================================================
const CONTACT_MAX = 20, NAME_MAX = 40, PASS_MIN = 8;
const UNLOCK_MINUTES = 10;                 // locks when you leave Settings, after 10 minutes without a tap in Settings, or when the app closes
const PBKDF2_ROUNDS = 210000;

const Contacts = {
  list() {
    const a = Store.get('contacts', []);
    return Array.isArray(a) ? a.filter(c => c && typeof c.name === 'string' && typeof c.phone === 'string') : [];
  },
  saveAll(a) { try { localStorage.setItem(Store.key('contacts'), JSON.stringify(a.slice(0, CONTACT_MAX))); return true; } catch (e) {
    return false;
  } },
  // returns '' when fine, otherwise a friendly message
  check(name, phone) {
    name = String(name || '').trim(); phone = String(phone || '').trim();
    if (!name) return 'Please type a name.';
    if (Array.from(name).length > NAME_MAX) return 'Please keep the name under ' + NAME_MAX + ' characters.';
    if (!phone.startsWith('+')) return 'Please start the number with + and the country code, for example +1 for Canada or +91 for India.';
    if (!sanitizePhone(phone)) return 'Please check the number: it should have 8 to 15 digits after the +.';
    return '';
  },
  clean(c) {
    return { id: c.id || ('c' + nowMs().toString(36) + Math.random().toString(36).slice(2, 6)),
             name: String(c.name).trim().slice(0, 80), phone: '+' + sanitizePhone(c.phone).replace(/\D/g, ''),
             accent: /^#[0-9a-fA-F]{6}$/.test(c.accent || '') ? c.accent : '',
             photo: isSafePhoto(c.photo) ? c.photo : '' };
  },
  upsert(c) {
    const a = this.list(), x = this.clean(c), i = a.findIndex(o => o.id === x.id);
    if (i >= 0) a[i] = x; else { if (a.length >= CONTACT_MAX) return 'full'; a.push(x); }
    return this.saveAll(a) ? 'ok' : 'nospace';
  },
  remove(id) { this.saveAll(this.list().filter(c => c.id !== id)); },
  eraseAll() { Store.del('contacts'); }
};
// A contact photo is only ever a small JPEG the app drew itself (see makeContactPhoto).
function isSafePhoto(p) { return typeof p === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p) && p.length < 300000; }
// Turn any picture the person chooses into a small square JPEG. The original file is never kept:
// redrawing it removes hidden details (location, camera) and anything that is not a picture.
function makeContactPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || '') || file.size > 25 * 1024 * 1024) { reject(new Error('not a picture')); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight), N = 320;
        const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
        const g = cv.getContext('2d');
        g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, N, N);
        URL.revokeObjectURL(url);
        const out = cv.toDataURL('image/jpeg', 0.82);
        if (!isSafePhoto(out)) { reject(new Error('too big')); return; }
        resolve(out);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    img.src = url;
  });
}
function waLink(phone) { const d = (sanitizePhone(phone || '') || '').replace(/\D/g, ''); return d ? 'https://wa.me/' + d : ''; }

// ---- passcode ----
const Pass = {
  unlockedUntil: 0,                         // in memory only: closing the app always locks
  isSet() { const p = Store.get('pass', null); return !!(p && p.salt && p.hash); },
  isUnlocked() { return this.unlockedUntil > nowMs(); },
  touch() { if (this.isUnlocked()) this.unlockedUntil = nowMs() + UNLOCK_MINUTES * 60000; },
  lock() { this.unlockedUntil = 0; },
  async fingerprint(code, saltB64, rounds) {
    const enc = new TextEncoder(), salt = Uint8Array.from(atob(saltB64), ch => ch.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  },
  async create(code) {
    const salt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    const hash = await this.fingerprint(code, salt, PBKDF2_ROUNDS);
    Store.set('pass', { v: 1, salt, hash, rounds: PBKDF2_ROUNDS });
    Store.del('passlock');
    this.unlockedUntil = nowMs() + UNLOCK_MINUTES * 60000;
  },
  // waiting time (ms) still left after too many wrong tries
  waitLeft() { const l = Store.get('passlock', null); return l && l.until ? Math.max(0, l.until - nowMs()) : 0; },
  async check(code) {
    if (this.waitLeft() > 0) return 'wait';
    const p = Store.get('pass', null); if (!p) return 'none';
    const h = await this.fingerprint(code, p.salt, p.rounds || PBKDF2_ROUNDS);
    if (h === p.hash) { Store.del('passlock'); this.unlockedUntil = nowMs() + UNLOCK_MINUTES * 60000; return 'ok'; }
    const l = Store.get('passlock', { fails: 0, rounds: 0 }); l.fails = (l.fails || 0) + 1;
    if (l.fails >= 5) {                     // 5 wrong tries: wait 30 s, then 1 min, 2 min, 4 min ... (max 30 min)
      l.until = nowMs() + Math.min(30 * 60000, 30000 * Math.pow(2, l.rounds || 0));
      l.rounds = (l.rounds || 0) + 1; l.fails = 0;
    }
    Store.set('passlock', l);
    return 'wrong';
  },
  // "Forgot passcode?": erases saved contacts and the passcode. Games and stats stay.
  forget() { Contacts.eraseAll(); Store.del('pass'); Store.del('passlock'); this.lock(); }
};
// (taps inside Settings keep it unlocked for another 10 minutes: see buildSettings in settings.js)

// "Erase all Taarala Thota data": every item this app saved (all under the tt: label), nothing else on the phone
function eraseEverything() {
  try { Object.keys(localStorage).filter(k => k.startsWith('tt:')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  try { Object.keys(sessionStorage).filter(k => k.startsWith('tt:')).forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
  Pass.lock();
}

// ============================================================
// MUSIC ENGINE: 432 Hz Veena + Bansuri flute, made live (no audio files)
// - Tuning: A4 = 432 Hz (so the note D, our "Sa", is exactly 288 Hz).
// - Raga: Bhoopali-style five-note scale (Sa Re Ga Pa Dha).
// - Veena = plucked string (Karplus-Strong). Bansuri = breathy flute with vibrato.
// - On/off choice is remembered for the whole session (sessionStorage).
// - Browsers only allow sound after a tap, so it starts on the first tap.
// ============================================================
const Music = (function () {
  const A4 = 432;
  const SCALE = [0, 2, 4, 7, 9];                 // semitones above Sa: Sa Re Ga Pa Dha
  const SA_FROM_A4 = -7;                          // D is 7 semitones below A
  function hz(octave, degree) {                   // octave 0 = middle (Sa=288Hz)
    const semis = SA_FROM_A4 + SCALE[degree % 5] + 12 * octave;
    return A4 * Math.pow(2, semis / 12);
  }
  let ctx = null, master = null, wet = null, comp = null, timer = null;
  let on = false, started = false, nextVeena = 0, nextFlute = 0, step = 0, pos = 2, fpos = 7, phraseLeft = 0, restUntil = 0;
  const cache = {};

  // on/off choice is kept on this device (localStorage) so "off" stays off until the button is tapped again
  function getPref() { try { const v = localStorage.getItem('tt:music'); return v == null ? 'on' : v; } catch (e) { return 'on'; } }
  function setPref(v) { try { localStorage.setItem('tt:music', v); } catch (e) {} }
  function saveState() { try { sessionStorage.setItem('tt:music_pos', JSON.stringify({ pos, fpos, step })); } catch (e) {} }
  function loadState() { try { const s = JSON.parse(sessionStorage.getItem('tt:music_pos') || 'null'); if (s) { pos = s.pos; fpos = s.fpos; step = s.step; } } catch (e) {} }

  // plucked string: Karplus-Strong, rendered once per note and reused
  function pluckBuffer(freq) {
    const k = Math.round(freq * 10);
    if (cache[k]) return cache[k];
    const sr = ctx.sampleRate, len = Math.floor(sr * 4.2);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq)), line = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) { const n = Math.random() * 2 - 1; lp = lp * 0.55 + n * 0.45; line[i] = lp; }
    let idx = 0, prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx], nxt = line[(idx + 1) % N];
      const v = (cur + nxt) * 0.5 * 0.9965;
      line[idx] = v; idx = (idx + 1) % N;
      d[i] = cur * (1 - Math.exp(-i / (sr * 0.004)));
      prev = cur;
    }
    cache[k] = buf; return buf;
  }
  function pluck(freq, when, vol) {
    const s = ctx.createBufferSource(); s.buffer = pluckBuffer(freq);
    const g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(5200, freq * 9);
    s.connect(f); f.connect(g); g.connect(master); g.connect(wet);
    s.start(when);
    s.stop(when + 4.3);
  }
  // breathy flute note
  function flute(freq, when, dur, vol) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sine'; o2.type = 'sine'; o3.type = 'sine';
    o1.frequency.setValueAtTime(freq * 0.985, when); o1.frequency.exponentialRampToValueAtTime(freq, when + 0.12);
    o2.frequency.setValueAtTime(freq * 2 * 0.985, when); o2.frequency.exponentialRampToValueAtTime(freq * 2, when + 0.12);
    o3.frequency.setValueAtTime(freq * 3 * 0.985, when); o3.frequency.exponentialRampToValueAtTime(freq * 3, when + 0.12);
    const g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
    g1.gain.value = 1; g2.gain.value = 0.22; g3.gain.value = 0.07;
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5.1; vg.gain.setValueAtTime(0, when); vg.gain.linearRampToValueAtTime(freq * 0.006, when + Math.min(dur * 0.6, 0.9));
    vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency); vg.connect(o3.frequency);
    // breath
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 2; bp.Q.value = 3;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    ns.connect(bp); bp.connect(ng);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(vol, when + 0.18);
    env.gain.setValueAtTime(vol, when + Math.max(0.2, dur - 0.5));
    env.gain.linearRampToValueAtTime(0.0001, when + dur + 0.45);
    o1.connect(g1); o2.connect(g2); o3.connect(g3); g1.connect(env); g2.connect(env); g3.connect(env); ng.connect(env);
    env.connect(master); env.connect(wet);
    const end = when + dur + 0.6;
    [o1, o2, o3, vib, ns].forEach(n => { n.start(when); n.stop(end); });
  }
  function makeReverb() {
    const sr = ctx.sampleRate, len = Math.floor(sr * 3.2), buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    wet = ctx.createGain(); wet.gain.value = 0.32;
    wet.connect(conv); conv.connect(master);
  }
  // choose the next scale degree: gentle random walk, favouring steps
  function walk(p, lo, hi) {
    const r = Math.random(); let d = r < 0.34 ? -1 : r < 0.68 ? 1 : r < 0.8 ? -2 : r < 0.92 ? 2 : 0;
    p = clamp(p + d, lo, hi); return p;
  }
  function degHz(p) { return hz(Math.floor(p / 5), ((p % 5) + 5) % 5); }
  function schedule() {
    if (!ctx || !on) return;
    const t = ctx.currentTime;
    // veena: steady unhurried pluck pattern + a soft drone of Sa and Pa
    while (nextVeena < t + 1.8) {
      if (nextVeena < t) nextVeena = t + 0.05;
      const k = step % 8;
      if (k === 0) pluck(hz(-1, 0), nextVeena, 0.30);               // Sa (low)
      else if (k === 4) pluck(hz(-1, 3), nextVeena, 0.20);          // Pa (low)
      else if (k % 2 === 0) { pos = walk(pos, -3, 6); pluck(degHz(pos), nextVeena, 0.26); }
      else if (Math.random() < 0.6) { pos = walk(pos, -3, 6); pluck(degHz(pos), nextVeena, 0.16); }
      nextVeena += 0.82 + (k === 7 ? 0.25 : 0);
      step++;
      if (step % 8 === 0) saveState();
    }
    // bansuri: phrases of 3-5 long notes, then a rest
    while (nextFlute < t + 1.8) {
      if (nextFlute < t) nextFlute = t + 0.1;
      if (phraseLeft <= 0) {
        if (restUntil && nextFlute < restUntil) { nextFlute = restUntil; continue; }
        phraseLeft = 3 + Math.floor(Math.random() * 3);
      }
      fpos = walk(fpos, 5, 11);
      const dur = 1.6 + Math.random() * 2.2;
      flute(degHz(fpos), nextFlute, dur, 0.13);
      nextFlute += dur + 0.15;
      phraseLeft--;
      if (phraseLeft <= 0) restUntil = nextFlute + 4 + Math.random() * 6;
    }
  }
  function ensureCtx() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
      makeReverb();
      if (typeof TEST_MODE !== 'undefined' && TEST_MODE) { const an = ctx.createAnalyser(); an.fftSize = 8192; comp.connect(an); window.__an = an; }
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function start() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!started) {
      started = true;
      loadState();
      nextVeena = ctx.currentTime + 0.2;
      nextFlute = ctx.currentTime + 3;
      timer = setInterval(schedule, 300);
    }
    on = true; setPref('on');
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.7, ctx.currentTime, 0.8);
    schedule(); paint();
  }
  function stop() {
    on = false; setPref('off');
    if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.25); }
    paint();
  }
  function wantsOn() { return on || (!started && getPref() === 'on'); }
  function toggle() { if (wantsOn()) stop(); else start(); }
  function paint() {
    const w = wantsOn();
    document.querySelectorAll('.music-state,.music-btn').forEach(e => e.classList.toggle('off', !w));
    document.querySelectorAll('.music-btn').forEach(e => e.setAttribute('aria-pressed', w ? 'true' : 'false'));
  }
  // small sound effects (pop, tap) share the same sound system
  function blip(f0, f1, dur, vol) {
    if (!on || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  // first tap anywhere starts the music (if it is switched on).
  // Phones only allow sound after a COMPLETED tap (finger lifted), so we listen for the end of the tap,
  // not the moment the finger touches the screen.
  const TAP_END = ['pointerup', 'touchend', 'click', 'keydown'];
  function armFirstTap() {
    const h = (e) => {
      TAP_END.forEach(t => document.removeEventListener(t, h, true));
      if (e.target && e.target.closest && e.target.closest('[data-music]')) { armFirstTap(); return; }   // the music button decides by itself
      if (getPref() === 'on' && !on) start();
    };
    TAP_END.forEach(t => document.addEventListener(t, h, true));
  }
  // safety net: if the phone paused the sound system (call, lock screen, another app), the next tap wakes it again
  TAP_END.forEach(t => document.addEventListener(t, () => { try { if (on && ctx && ctx.state !== 'running') ctx.resume(); } catch (e) {} }, true));
  // silence without changing the person's on/off choice
  function pause() {
    on = false;
    if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.15); }
    paint();
  }
  return { start, stop, pause, toggle, wantsOn, isOn: () => on, ctxState: () => ctx && ctx.state, blip, armFirstTap, paint, hz, A4 };
})();

// ============================================================
// GAME KIT shared by Chess and Checkers:
// computer-player helper (runs in the background so the screen never freezes),
// results history ("Stats"), 60-minute resume rule
// ============================================================

// ------------------------------------------------------------
// SHARED RULES FOR CHESS AND CHECKERS
// RESUME_MS: an unfinished game can be resumed for 60 minutes after the LAST MOVE, then it is forfeited.
// PACE_MS: the computer waits at least this long before replying, so Easy feels relaxed.
// ------------------------------------------------------------
const RESUME_MS = 60 * 60 * 1000;
const PACE_MS = { easy: 2000, medium: 1000, hard: 0 };      // minimum time before the computer replies
const LEVEL_NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// ------------------------------------------------------------
// COMPUTER PLAYER IN THE BACKGROUND
// The engine's thinking runs in a Web Worker (a background helper) so the screen never freezes.
// If the phone refuses background helpers, it falls back to thinking on the main page.
// The security rules allow this helper (worker-src blob:) and nothing else from outside.
// ------------------------------------------------------------
function makeAI(factory) {
  let w = null, id = 0, pending = {};
  const E = factory();
  function fallback() {
    const p = pending;
    pending = {};
    Object.keys(p).forEach(k => { try { p[k].cb(E.bestMove(p[k].state, p[k].level)); } catch (e) { p[k].cb(null); } });
  }
  try {
    const src = '(function(){var E=(' + factory.toString() + ')();onmessage=function(e){var m=e.data,r=null;try{r=E.bestMove(m.state,m.level,m.opts)}catch(x){}postMessage({id:m.id,move:r})}})()';
    w = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
    w.onmessage = (e) => { const f = pending[e.data.id]; if (!f) return; delete pending[e.data.id]; f.cb(e.data.move); };
    w.onerror = () => { w = null; fallback(); };
  } catch (err) { w = null; }
  return {
    E,
    ask(state, level, cb) {
      const myid = ++id; pending[myid] = { cb, state, level };
      if (w) w.postMessage({ id: myid, state, level });
      else setTimeout(() => { const f = pending[myid]; if (!f) return; delete pending[myid]; let m = null; try { m = E.bestMove(state, level); } catch (e) {} f.cb(m); }, 30);
    },
    cancel() { pending = {}; }
  };
}

// results history: newest last; only the last 10 are shown/counted

// ------------------------------------------------------------
// RESULTS HISTORY AND TOTALS (shown on the Stats screens)
// Results keeps the last 10 games per game; Totals keeps running counts. Stored under tt:<game>:stats / :totals.
// ------------------------------------------------------------
const Results = {
  list(game) { const l = Store.get(game + ':stats', []); return Array.isArray(l) ? l.filter(x => x && typeof x === 'object') : []; },
  add(game, result, level, extra) {
    const l = this.list(game); l.push(Object.assign({ r: result, d: level, t: nowMs() }, extra || {}));
    Store.set(game + ':stats', l.slice(-10));
  },
  counts(game) {
    const c = { won: 0, lost: 0, forfeited: 0, draw: 0 };
    this.list(game).slice(-10).forEach(x => { if (c[x.r] != null) c[x.r]++; });
    return c;
  }
};
const Totals = {
  get(game) { return Object.assign({ won: 0, lost: 0, forfeited: 0 }, Store.get(game + ':totals', {})); },
  bump(game, r) { const t = this.get(game); if (t[r] != null) t[r]++; Store.set(game + ':totals', t); }
};
function fmtDay(ts) {
  const d = new Date(ts);
  return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
}
const RESULT_WORD = { won: 'Won', lost: 'Lost', forfeited: 'Forfeited', draw: 'Draw' };

// saved game: {state, level, side, last (time of last move), undo:[...], capHuman:[], capComp:[]}
const Saved = {
  get(game) { return Store.get(game + ':game', null); },
  set(game, g) { Store.set(game + ':game', g); },
  clear(game) { Store.del(game + ':game'); },
  minsLeft(g) { return Math.max(0, Math.ceil((g.last + RESUME_MS - nowMs()) / 60000)); },
  expired(g) { return !!g && nowMs() - g.last >= RESUME_MS; }
};

// Fill the Stats screen numbers and the 10 Recent Games rows
// Draws a Stats screen for Chess or Checkers. geo = where each number and row sits on that Stats picture.
function paintStats(S, game, geo) {
  const c = Results.counts(game);
  S.statEls.forEach(x => x.remove()); S.statEls = [];
  const push = (e) => { S.statEls.push(e); return e; };
  [['won', geo.tiles[0]], ['lost', geo.tiles[1]], ['forfeited', geo.tiles[2]], ['draw', geo.tiles[3]]].forEach(([k, r]) => {
    push(addText(S, 'stat-num', r[0], r[1], r[2], r[3], geo.numFs, String(c[k])));
  });
  const list = Results.list(game).slice(-10).reverse();
  for (let i = 0; i < 10; i++) {
    const x = list[i]; if (!x || !known(RESULT_WORD, x.r)) continue;
    const y = geo.rowY + i * geo.rowH;
    const row = push(addText(S, 'stat-row', geo.rowX, y, geo.rowW, geo.rowH, geo.rowFs, ''));
    row.innerHTML = '<span class="sr-l"><b class="r-' + x.r + '">' + RESULT_WORD[x.r] + '</b> · ' + (LEVEL_NAME[known(LEVEL_NAME, x.d)] || '') + '</span><span class="sr-r">' + fmtDay(num(x.t)) + '</span>';
  }
}

// ============================================================
// HOME, GAMES, LOVED ONES
// ============================================================

// ------------------------------------------------------------
// HOME
// The painted Play and Family doors are tap areas. The app adds: the Settings gear (top right, opens with
// the passcode), the "Privacy & Safety" link (bottom), the music button over the painted note, and the maker's seal (bottom right).
// When Home appears it may show ONE card: "new version ready" first, otherwise the backup reminder.
// ------------------------------------------------------------
function buildHome() {
  const S = defScreen('home-view', 'home', { name: 'Home' });
  addHot(S, 130, 1010, 260, 380, () => go('games'), 'Play');
  addHot(S, 500, 1010, 240, 380, () => go('contact-view'), 'Family');
  // music button (sound on/off) with a slash when off
  const mb = addHot(S, 45, 1600, 105, 105, () => { Music.toggle(); }, 'Music'); mb.dataset.music = '1';
  const slash = el('div', 'music-state');
  slash.innerHTML = '<svg viewBox="0 0 100 100"><path d="M18 82 82 18" stroke="#ffd9a0" stroke-width="7" stroke-linecap="round"/></svg>';
  mb.appendChild(slash);
  // Settings gear (top-right, where the old sign-out words are painted)
  const gear = el('button', 'gear-btn'); gear.type = 'button'; gear.setAttribute('aria-label', 'Settings');
  place(gear, 700, 16, 124, 124, S);
  gear.innerHTML = '<svg viewBox="0 0 64 64"><defs><linearGradient id="gearw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a2b"/><stop offset="1" stop-color="#4b2c12"/></linearGradient></defs>' +
    '<rect x="2" y="2" width="60" height="60" rx="30" fill="url(#gearw)" stroke="#d9a95a" stroke-width="3"/>' +
    '<g fill="#ffe3a3"><path d="M29 12h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2z"/></g>' +
    '<circle cx="32" cy="32" r="7" fill="#5e3716"/></svg>';
  gear.addEventListener('click', (ev) => { ev.stopPropagation(); go('settings'); });
  S.art.appendChild(gear);
  // small "Privacy & Safety" link at the bottom
  const pl = el('button', 'privacy-link'); pl.type = 'button'; pl.textContent = 'Privacy & Safety';
  place(pl, 246, 1748, 360, 72, S); pl.style.fontSize = 'calc(var(--u) * 38)';
  pl.addEventListener('click', (ev) => { ev.stopPropagation(); go('privacy'); });
  S.art.appendChild(pl);
  // the maker's seal, faint in the bottom-right corner (decoration only: it can't be tapped)
  const seal = el('div', 'maker-seal'); seal.innerHTML = makerSealSvg();
  place(seal, 748, 1752, 70, 70, S); S.art.appendChild(seal);
  S.onShow = () => {
    Music.paint();
    setTimeout(() => { if (CUR !== 'home-view' || Tour.on) return; if (PWA.updateReady && !PWA.dismissed) showUpdateCard(); else maybeRemindBackup(S); }, 700);
  };
}

// ------------------------------------------------------------
// GAMES MENU ("Choose Your Adventure")
// GAME_LIST is the single place that lists the games. To add a game: add a row here with its tap area
// (rect), where its name goes on the painted plaque (plaque), and the screen it opens.
// The id "gamesContainer" is relied on by tests; keep it.
// ------------------------------------------------------------
function buildGames() {
  const S = defScreen('games', 'games', { parent: 'home-view', name: 'Games' });
  const box = el('div', 'hotbox'); box.id = 'gamesContainer';     // required id, keeps the games list in one place
  place(box, 0, 0, S.W, S.H, S); S.art.appendChild(box);
  const GAME_LIST = [
    { id: 'bubble', label: 'Bubble Pop', rect: [40, 320, 380, 440], plaque: [90, 676, 276, 76], fn: () => go('bubble-home') },
    { id: 'minesweeper', label: 'Hidden Comets', rect: [520, 540, 400, 390], plaque: [590, 842, 262, 70], fn: () => go('ms-home') },
    { id: 'checkers', label: 'Checkers', rect: [60, 905, 410, 300], plaque: [106, 1110, 304, 82], fn: () => go('ck-entry') },
    { id: 'chess', label: 'Chess', rect: [520, 1075, 395, 430], plaque: [562, 1404, 322, 84], fn: () => go('chs-entry') }
  ];
  GAME_LIST.forEach(g => {
    const b = addHot(S, g.rect[0], g.rect[1], g.rect[2], g.rect[3], g.fn, g.label);
    b.dataset.game = g.id; box.appendChild(b);
    addText(S, 'game-label', g.plaque[0], g.plaque[1], g.plaque[2], g.plaque[3], g.label.length > 11 ? 29 : g.label.length > 9 ? 34 : 44, g.label);
  });
  addText(S, 'game-title', 150, 128, 520, 70, 46, 'Choose Your Adventure');
  addIconBtn(S, 30, 36, 64, 'home', goHome, 'Home', null, 0); addIconBtn(S, 106, 36, 64, 'back', goBack, 'Back', null, 1);
  addTopMusic(S);
}

// ------------------------------------------------------------
// LOVED ONES
// Opens WITHOUT the passcode by design: shows names, circles and photos only, never phone numbers.
// One tap opens WhatsApp (wa.me link) for that person; nothing is ever sent automatically.
// Contacts are added and changed in Settings (settings.js); they are stored by contacts.js.
// ------------------------------------------------------------
function buildLoved() {
  const S = defScreen('contact-view', 'loved', { parent: 'home-view', name: 'Loved Ones' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 100, 150, 520, 140, 100, 'Loved Ones');
  const scroll = el('div', 'loved-scroll'); place(scroll, 70, 360, 711, 1280, S); S.art.appendChild(scroll);
  S.scroll = scroll;
  S.onShow = () => renderLoved(S);
}
// Contacts are kept only on this phone (see contacts.js). Loved Ones opens freely: names, circles and photos only.
function lovedPeople() {
  return Contacts.list().filter(m => !!sanitizePhone(m.phone || ''))       // only people with a valid WhatsApp number
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
// Circle size depends on how many people there are (1 = big, 8+ = small, scrolls above 8).
function renderLoved(S) {
  const sc = S.scroll; if (!sc) return;
  sc.innerHTML = '';
  const people = lovedPeople();
  if (!people.length) {
    const e = el('div', 'loved-empty');
    e.append('No one is here yet.', document.createElement('br'), 'Add people in Settings (the gear on the Home screen).');
    sc.appendChild(e);
    return;
  }
  const n = people.length;
  const d = n === 1 ? 380 : n === 2 ? 320 : n <= 4 ? 270 : n <= 6 ? 225 : 170;
  const grid = el('div', 'loved-grid');
  grid.style.setProperty('--d', d);
  grid.dataset.n = n;
  people.forEach(m => {
    const card = el('button', 'medallion'); card.type = 'button';
    const ring = el('div', 'med-ring');
    if (isSafePhoto(m.photo)) ring.style.backgroundImage = 'url("' + m.photo + '")';
    else { ring.style.background = accentFor(m); ring.textContent = initialOf(m.name); }   // plain text, never read as code
    card.appendChild(ring);
    const nm = el('div', 'med-name'); nm.textContent = m.name || ''; card.appendChild(nm);
    card.addEventListener('click', () => {
      const link = waLink(m.phone); if (!link) return;
      window.open(link, '_blank', 'noopener');
    });
    grid.appendChild(card);
  });
  sc.appendChild(grid);
}

// ============================================================
// SETTINGS (passcode-protected) and PRIVACY & SAFETY page
// Built on the Loved Ones night-sky picture with a dark frosted sheet on top.
// All text is set with textContent: anything a person types is shown as plain text, never run as code.
// ============================================================
const APP_NAME = 'Taarala Thota (Garden of Stars)';   // the name always travels with its meaning

// ------------------------------------------------------------
// WORDING SHOWN TO PEOPLE
// All privacy wording lives here so it can be reviewed and changed in one place.
// The name is always written with its meaning: Taarala Thota (Garden of Stars).
// ------------------------------------------------------------
const SETTINGS_NOTE = 'Contacts saved here stay only on this phone, inside ' + APP_NAME + '. Anyone using this phone can call them from Loved Ones and see their names and photos, but only someone with the passcode can see or change the numbers. Your phone’s own contacts are never touched.';
const FORGOT_TEXT = 'If you forget this passcode, the contacts you saved in ' + APP_NAME + ' will be erased, and you’ll need to add them again. Your phone’s own contacts and WhatsApp are not affected.';
const DAILY_NOTICE = 'Contacts saved here stay only on this phone. Your phone’s own contacts are never touched.';
const OFFICIAL_ADDRESS = 'taarala-thota.pages.dev';   // the app's one official address (people's saved data belongs to it)
const PRIVACY_POINTS = [
  // Application data (what the app saves) is kept apart from infrastructure data (what any website's host handles):
  'Your saved data stays on this phone: contacts and their photos, your passcode, game progress, stats and settings are stored only in this browser on this phone. The app never sends them anywhere, and the creator cannot see them.',
  'The app has no sign-in, no ads and no personal tracking. To know roughly how many people visit, it counts visits anonymously with Cloudflare Web Analytics, which by Cloudflare’s description uses no cookies, stores nothing on your phone and builds no personal profile. It never sees anything you save in the app or what you do in it. You can switch counting off below or in Settings. If your browser sends a “Global Privacy Control” signal, your visits are never counted.',
  'Like every website, the app is delivered by a hosting service (Cloudflare). When your phone downloads the app or checks for an update, the hosting service automatically handles basic technical information, such as your internet (IP) address, browser type and the time, to deliver and protect the site. This never includes your saved data. The creator does not receive these details (apart from overall totals the hosting service may show, such as the number of visits) and has no control or oversight over how the hosting service handles them: that is covered by the hosting service\u2019s own privacy policy.',
  'Contacts you save here exist only in this app. Your phone’s own contacts and WhatsApp are never changed.',
  'Anyone using this phone can call your saved contacts from Loved Ones and see their names and photos. Seeing or changing numbers needs your passcode.',
  'Keep your phone locked with a PIN, fingerprint or face unlock. That also protects this app’s data.',
  'Choose a passcode you’ll remember. If you forget it, your saved contacts must be erased and added again.',
  'Back up regularly, and keep the backup file private. Its password can\u2019t be recovered. If you keep it in a cloud drive or email, that service\u2019s own privacy policy applies (the file stays locked with your password).',
  'On iPhone, add the app to your Home Screen, so your data is kept even if you don’t open it for a while.',
  'So the games work without internet, the app quietly saves its pictures on your phone (about 5 MB) the first time it opens. On mobile data this counts toward your data plan; on Wi-Fi it costs nothing extra.',
  'Closing the app or your browser keeps everything. Clearing your browser’s site data (cookies and site data), removing the app, or using a private/incognito window deletes it all, unless you have a backup. To bring it back: set a passcode, then Settings → Restore From A Backup.',
  'Feedback you send from the app is anonymous: we don’t ask for your name or email, and nothing about you is stored with it. It is kept by the app’s hosting service (Cloudflare) so the creator can read it. Please don’t include personal details.',
  'Tapping a contact only opens WhatsApp. Nothing is ever sent automatically. Once WhatsApp opens, WhatsApp\u2019s own privacy policy applies.',
  'Sharing your phone with someone? Keep the screen on this app: on iPhone turn on Guided Access (Settings \u2192 Accessibility \u2192 Guided Access), open the app and triple-click the side button; on Android turn on App pinning (Settings \u2192 Security \u2192 App pinning) and pin the app from the recent-apps view. To stop the screen turning sideways, use your phone\u2019s Rotation Lock (iPhone: Control Center; Android: quick settings, \u201cAuto-rotate\u201d off).',
  'Only use the official address' + (OFFICIAL_ADDRESS ? ': ' + OFFICIAL_ADDRESS + '.' : ' shared by the creator.') + ' Copies elsewhere aren’t ours.'
];

// ---- tiny DOM builders (always plain text) ----

// ------------------------------------------------------------
// SAFE BUILDING BLOCKS
// Every word on these screens is set with textContent, so a name like "<script>" is shown as plain text and never runs.
// ------------------------------------------------------------
function tx(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, cls, fn) {
  const b = tx('button', 'sbtn ' + (cls || ''), label);
  b.type = 'button';
  b.addEventListener('click', (ev) => { ev.stopPropagation(); try { fn && fn(ev); } catch (e) { console.error(e); } });
  return b;
}
function field(labelText, type, opts) {
  opts = opts || {};
  const w = tx('label', 'sfield'); w.appendChild(tx('span', 'slabel', labelText));
  const i = document.createElement('input'); i.type = type; i.className = 'sinput';
  if (opts.value != null) i.value = opts.value;
  if (opts.placeholder) i.placeholder = opts.placeholder;
  if (opts.inputmode) i.inputMode = opts.inputmode;
  if (opts.max) i.maxLength = opts.max;
  i.autocomplete = opts.autocomplete || 'off'; i.spellcheck = false; i.setAttribute('autocapitalize', opts.caps || 'off');
  w.appendChild(i); return { wrap: w, input: i };
}
function today() { const d = new Date(nowMs()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

// ============================================================

// ------------------------------------------------------------
// SETTINGS SCREEN
// Opened by the gear on Home. Uses the Loved Ones picture with a dark frosted sheet for the forms.
// pendingView lets another part of the app open a specific page after unlocking (e.g. "Back up now").
// ------------------------------------------------------------
function buildSettings() {
  const S = defScreen('settings', 'loved', { parent: 'home-view', name: 'Settings' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 100, 150, 520, 140, 92, 'Settings');
  const sheet = el('div', 'sheet'); place(sheet, 45, 330, 763, 1470, S); S.art.appendChild(sheet);
  S.sheet = sheet; S.view = null;
  S.onShow = () => {
    allowZoom(true);                                                           // text page: two-finger zoom allowed
    S.view = null; renderSettings(S); dailyNotice(S);                       // S.pendingView (e.g. 'backup') opens after unlocking
    // after 10 minutes without a tap here, show the passcode page again
    clearInterval(S.idleTimer);
    S.idleTimer = setInterval(() => { if (CUR === 'settings' && Pass.isSet() && !Pass.isUnlocked() && !/^(unlock|create|forgot)$/.test(S.view)) renderSettings(S); }, 15000);
  };
  // leaving Settings (Home, Back, the back gesture, any other screen) locks it straight away
  S.onHide = () => { clearInterval(S.waitTimer); clearInterval(S.idleTimer); Pass.lock(); allowZoom(false); };
  // only taps inside Settings keep it unlocked (taps in games don't)
  ['pointerup', 'keydown'].forEach(t => S.el.addEventListener(t, () => Pass.touch(), true));
}
// The once-a-day reminder that fades after 6 seconds (remembered as tt:noticeDay).
function dailyNotice(S) {
  if (Store.get('noticeDay', '') === today()) return;
  Store.set('noticeDay', today());
  const b = tx('button', 'fade-note', DAILY_NOTICE); b.type = 'button';
  b.addEventListener('click', (ev) => { ev.stopPropagation(); b.classList.add('out'); setTimeout(() => b.remove(), 500); });
  S.el.appendChild(b);
  setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 600); }, 6000);
}

// ------------------------------------------------------------
// WHICH PAGE TO SHOW
// No passcode yet -> create one. Locked -> ask for it. Unlocked -> the requested page (default: contact list).
// The passcode logic itself is in contacts.js (Pass).
// ------------------------------------------------------------
function renderSettings(S, view, data) {
  const sh = S.sheet; if (!sh) return;
  clearInterval(S.waitTimer);
  if (!Pass.isSet()) view = 'create';
  else if (!Pass.isUnlocked() && view !== 'forgot') view = 'unlock';
  else { if (!view && S.pendingView) { view = S.pendingView; } view = view || 'list'; }
  if (view === S.pendingView) S.pendingView = null;
  S.view = view; sh.innerHTML = ''; sh.scrollTop = 0;
  ({ create: viewCreate, unlock: viewUnlock, forgot: viewForgot, list: viewList, form: viewForm, eraseall: viewEraseAll, backup: viewBackup, restore: viewRestore })[view](S, sh, data || {});
  if (/^(create|unlock|forgot)$/.test(view)) { sh.appendChild(tx('div', 'snote', SETTINGS_NOTE)); }
  const ub = tx('div', 'supd'); sh.insertBefore(ub, sh.firstChild); S.updBox = ub; refreshUpdateBox(S);
  const tc = tourCard('settings'); tc.classList.add('in-settings'); ub.after(tc);  // "Take A Tour" invitation, right under App update
  const vs = visitSwitch(S); vs.classList.add('in-settings'); tc.after(vs);       // visit counting: before the passcode too
  const fb = feedbackButton('settings'); fb.classList.add('in-settings'); vs.after(fb);   // anonymous feedback, also before the passcode
}
// App update: the first thing on every Settings page, even before the passcode (updating never touches saved data).
// Kept compact. Up to date: one quiet line that can't be tapped. Update waiting: Update now, then Update later and What's New.
function refreshUpdateBox(S) {
  const ub = S.updBox; if (!ub || !ub.isConnected) return;
  ub.innerHTML = '';
  const ready = !!(PWA.reg && PWA.reg.waiting && navigator.serviceWorker && navigator.serviceWorker.controller);
  ub.classList.toggle('ready', ready);
  if (!ready) { ub.appendChild(tx('div', 'supd-ok', '\u2713 Your app is up to date')); return; }
  if (S.updLater) {                         // after "Update later": one small line, so the page gets its space back
    const line = tx('div', 'supd-line'); line.appendChild(tx('span', '', 'Update waiting'));
    line.appendChild(btn('Update Now', 'small', applyUpdate)); ub.appendChild(line); return;
  }
  ub.appendChild(tx('div', 'supd-title', 'New update available'));
  ub.appendChild(btn('Update Now', 'small', applyUpdate));
  const row = tx('div', 'supd-row');
  row.appendChild(btn('Update Later', 'secondary small', () => { PWA.dismissed = true; S.updLater = true; refreshUpdateBox(S); }));
  let box = null;
  const wn = btn('What\u2019s New', 'secondary small', async () => {          // tap again to hide the list
    if (box) { box.remove(); box = null; wn.textContent = 'What\u2019s New'; return; }
    box = await whatsNewBox(); ub.appendChild(box); wn.textContent = 'Hide What\u2019s New';
  });
  row.appendChild(wn);
  ub.appendChild(row);
}

// ------------------------------------------------------------
// PASSCODE PAGES
// Create (8+ characters, typed twice), Unlock (with waiting after 5 wrong tries), Forgot (type ERASE).
// ------------------------------------------------------------
function viewCreate(S, sh) {
  sh.appendChild(tx('h3', '', 'Create a passcode'));
  sh.appendChild(tx('p', '', 'The passcode protects your contacts’ numbers. Use at least ' + PASS_MIN + ' characters (letters, numbers or a short phrase).'));
  sh.appendChild(tx('p', 'swarn', FORGOT_TEXT));
  const a = field('Passcode', 'password', { autocomplete: 'new-password' }), b = field('Type it again', 'password', { autocomplete: 'new-password' });
  sh.append(a.wrap, b.wrap, showToggle([a.input, b.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  sh.appendChild(btn('Save Passcode', '', async () => {
    const p = a.input.value;
    if (Array.from(p).length < PASS_MIN) { err.textContent = 'Please use at least ' + PASS_MIN + ' characters.'; return; }
    if (p !== b.input.value) { err.textContent = 'The two passcodes don’t match. Please type them again.'; return; }
    err.textContent = 'Saving…'; await Pass.create(p); renderSettings(S, 'list');
  }));
}
function showToggle(inputs) {
  const w = tx('label', 'scheck'); const c = document.createElement('input'); c.type = 'checkbox';
  c.addEventListener('change', () => inputs.forEach(i => { i.type = c.checked ? 'text' : 'password'; }));
  w.append(c, tx('span', '', 'Show passcode')); return w;
}
function viewUnlock(S, sh) {
  sh.appendChild(tx('h3', '', 'Enter your passcode'));
  sh.appendChild(tx('p', '', 'Settings is locked to protect your contacts’ numbers.'));
  const a = field('Passcode', 'password', { autocomplete: 'current-password' });
  sh.append(a.wrap, showToggle([a.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  const go = btn('Unlock', '', async () => {
    const r = await Pass.check(a.input.value);
    if (r === 'ok') { renderSettings(S); return; }
    a.input.value = ''; showWait();
    if (r === 'wrong' && Pass.waitLeft() <= 0) err.textContent = 'That passcode isn’t right. Please try again.';
  });
  sh.appendChild(go);
  a.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });
  const forgot = btn('Forgot Passcode?', 'slink', () => renderSettings(S, 'forgot')); sh.appendChild(forgot);
  function showWait() {
    const left = Pass.waitLeft();
    a.input.disabled = go.disabled = left > 0;
    if (left > 0) err.textContent = 'Too many wrong tries. Please wait ' + Math.ceil(left / 1000) + ' seconds.';
    else if (/wait/.test(err.textContent)) err.textContent = '';
  }
  showWait(); S.waitTimer = setInterval(showWait, 1000);
}
function viewForgot(S, sh) {
  sh.appendChild(tx('h3', '', 'Forgot your passcode?'));
  sh.appendChild(tx('p', '', FORGOT_TEXT));
  sh.appendChild(tx('p', '', 'Your games, progress and stats stay as they are.'));
  const a = field('To confirm, type ERASE', 'text', { caps: 'characters' }); sh.appendChild(a.wrap);
  const err = tx('p', 'serr'); sh.appendChild(err);
  sh.appendChild(btn('Erase Saved Contacts', 'danger', () => {
    if (a.input.value.trim().toUpperCase() !== 'ERASE') { err.textContent = 'Please type the word ERASE to confirm.'; return; }
    Pass.forget(); toast(S, 'Saved contacts erased'); renderSettings(S, 'create');
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S)));
}

// ------------------------------------------------------------
// CONTACT LIST
// Contacts, Backups and Safety sections, the permanent note, and "Erase all ... data".
// ------------------------------------------------------------
function viewList(S, sh) {
  const list = Contacts.list().sort((x, y) => x.name.localeCompare(y.name));
  sh.appendChild(tx('h3', '', 'Your contacts (' + list.length + ' of ' + CONTACT_MAX + ')'));
  if (!list.length) sh.appendChild(tx('p', '', 'No contacts yet. Add the people you call most, and they’ll appear in Loved Ones.'));
  list.forEach(c => {
    const r = tx('button', 'crow'); r.type = 'button';
    r.appendChild(circleFor(c, 'cdot'));
    const t = tx('span', 'ctext'); t.append(tx('span', 'cname', c.name), tx('span', 'cnum', c.phone)); r.appendChild(t);
    r.appendChild(tx('span', 'carrow', '›'));
    r.addEventListener('click', (ev) => { ev.stopPropagation(); renderSettings(S, 'form', { c }); });
    sh.appendChild(r);
  });
  const add = btn('+ Add A Contact', '', () => renderSettings(S, 'form', {}));
  if (list.length >= CONTACT_MAX) { add.disabled = true; add.textContent = 'You have the maximum of ' + CONTACT_MAX + ' contacts'; }
  sh.appendChild(add);
  sh.appendChild(tx('h3', 'sgap', 'Backups'));
  const last = Store.get('lastBackup', 0);
  sh.appendChild(tx('p', 'shint', last ? 'Last backup: ' + fmtDay(last) + '.' : 'No backup yet.'));
  sh.appendChild(btn('Back Up Now', '', () => renderSettings(S, 'backup')));
  sh.appendChild(btn('Restore From A Backup', 'secondary', () => renderSettings(S, 'restore')));
  sh.appendChild(tx('h3', 'sgap', 'Safety'));
  sh.appendChild(btn('Lock Settings Now', 'secondary', () => { Pass.lock(); goHome(); }));
  sh.appendChild(btn('Privacy & Safety', 'slink', () => go('privacy')));
  sh.appendChild(tx('div', 'snote', SETTINGS_NOTE));
  sh.appendChild(btn('Erase All ' + APP_NAME + ' Data', 'slink danger-link', () => renderSettings(S, 'eraseall')));
}
function circleFor(c, cls) {
  const d = tx('span', cls);
  if (isSafePhoto(c.photo)) d.style.backgroundImage = 'url("' + c.photo + '")';
  else { d.style.background = accentFor(c); d.textContent = initialOf(c.name); }
  return d;
}

// ------------------------------------------------------------
// ADD / EDIT A CONTACT
// Name, WhatsApp number (must start with + and the country code), optional photo, circle colour, Test, Save, Delete.
// Photos are redrawn by makeContactPhoto (contacts.js); the original file is never kept.
// ------------------------------------------------------------
function viewForm(S, sh, data) {
  const c = data.c || null, edit = !!c;
  let photo = edit && isSafePhoto(c.photo) ? c.photo : '', accent = edit ? (c.accent || '') : '';
  sh.appendChild(tx('h3', '', edit ? 'Edit contact' : 'Add a contact'));
  const nm = field('Name', 'text', { value: edit ? c.name : '', max: NAME_MAX, caps: 'words', placeholder: 'e.g. Grandma' });
  const ph = field('WhatsApp number', 'tel', { value: edit ? c.phone : '+', inputmode: 'tel', placeholder: '+1 555 123 4567' });
  sh.append(nm.wrap, ph.wrap, tx('p', 'shint', 'Start with + and the country code, for example +1 for Canada or +91 for India.'));
  // photo
  const prow = tx('div', 'prow'); const prev = tx('span', 'pprev'); prow.appendChild(prev);
  const pbtns = tx('div', 'pbtns'); prow.appendChild(pbtns); sh.appendChild(tx('span', 'slabel', 'Photo (optional)')); sh.appendChild(prow);
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none'; sh.appendChild(file);
  const choose = btn('Choose Photo', 'secondary small', () => file.click());
  const remove = btn('Remove Photo', 'secondary small', () => { photo = ''; paintPhoto(); });
  pbtns.append(choose, remove);
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    err.textContent = 'Preparing photo…';
    try { photo = await makeContactPhoto(f); err.textContent = ''; paintPhoto(); }
    catch (e) { err.textContent = 'Sorry, that picture couldn’t be used. Please try a different photo.'; }
  });
  // colour (used when there is no photo)
  const sw = tx('div', 'swatches'); sh.appendChild(tx('span', 'slabel', 'Circle colour')); sh.appendChild(sw);
  CONTACT_ACCENTS.forEach(col => {
    const b = tx('button', 'swatch');
    b.type = 'button';
    b.style.background = col;
    b.dataset.col = col.toLowerCase();
    b.setAttribute('aria-label', 'Colour ' + col);
    b.addEventListener('click', (ev) => { ev.stopPropagation(); accent = col; paintPhoto(); });
    sw.appendChild(b);
  });
  function paintPhoto() {
    const tmp = { name: nm.input.value || '?', photo, accent };
    prow.querySelector('.pprev').replaceWith(circleFor(tmp, 'pprev'));
    remove.style.display = photo ? '' : 'none';
    const cur = (accent || accentFor(tmp)).toLowerCase();
    sw.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x.dataset.col === cur));
  }
  nm.input.addEventListener('input', paintPhoto);
  const err = tx('p', 'serr'); sh.appendChild(err);
  paintPhoto();
  sh.appendChild(btn('Test On WhatsApp', 'secondary', () => {
    const m = Contacts.check(nm.input.value || 'x', ph.input.value); if (m) { err.textContent = m; return; }
    err.textContent = ''; window.open(waLink(ph.input.value), '_blank', 'noopener');
  }));
  sh.appendChild(btn(edit ? 'Save changes' : 'Save contact', '', () => {
    const m = Contacts.check(nm.input.value, ph.input.value); if (m) { err.textContent = m; return; }
    const r = Contacts.upsert({ id: edit ? c.id : '', name: nm.input.value, phone: ph.input.value, accent, photo });
    if (r === 'full') { err.textContent = 'You already have ' + CONTACT_MAX + ' contacts. Please remove one first.'; return; }
    if (r === 'nospace') { err.textContent = 'This phone has no room left to save that. Try removing a photo.'; return; }
    toast(S, edit ? 'Saved' : 'Contact added'); renderSettings(S, 'list');
  }));
  if (edit) sh.appendChild(btn('Delete Contact', 'danger', () => {
    showPanel(S, { title: 'Delete ' + c.name + '?', text: 'This removes them from ' + APP_NAME + ' only. Your phone’s own contacts are not affected.',
      buttons: [{ label: 'Keep', secondary: true }, { label: 'Delete', fn: () => { Contacts.remove(c.id); toast(S, 'Deleted'); renderSettings(S, 'list'); } }] });
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}

// ------------------------------------------------------------
// ERASE ALL APP DATA
// Lists exactly what is and is not erased. Requires typing ERASE.
// ------------------------------------------------------------
function viewEraseAll(S, sh) {
  sh.appendChild(tx('h3', '', 'Erase all ' + APP_NAME + ' data?'));
  sh.appendChild(tx('p', '', 'This erases only what this app saved in this browser on this phone:'));
  const yes = tx('ul', 'slist');
  ['your saved contacts and their photos', 'your passcode', 'game progress and stats', 'your settings (like music on or off, and visit counting, which turns back on)'].forEach(t => yes.appendChild(tx('li', '', t)));
  sh.appendChild(yes);
  sh.appendChild(tx('p', '', 'It does not touch:'));
  const no = tx('ul', 'slist');
  ['your phone\u2019s own contacts or photo gallery', 'WhatsApp', 'other apps or websites', 'any backup files you saved'].forEach(t => no.appendChild(tx('li', '', t)));
  sh.appendChild(no);
  sh.appendChild(tx('p', '', 'This app uses no cookies. This can\u2019t be undone.'));
  const a = field('To confirm, type ERASE', 'text', { caps: 'characters' }); sh.appendChild(a.wrap);
  const err = tx('p', 'serr'); sh.appendChild(err);
  sh.appendChild(btn('Erase All App Data', 'danger', () => {
    if (a.input.value.trim().toUpperCase() !== 'ERASE') { err.textContent = 'Please type the word ERASE to confirm.'; return; }
    eraseEverything(); try { Music.paint(); } catch (e) {}
    goHome(); toast(SCREENS['home-view'], 'All Taarala Thota data was erased');
  }));
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}

// ------------------------------------------------------------
// BACKUP AND RESTORE PAGES
// The file work itself (locking, checking) is in backup.js.
// ------------------------------------------------------------
function viewBackup(S, sh) {
  sh.appendChild(tx('h3', '', 'Back up your data'));
  sh.appendChild(tx('p', '', 'This makes one locked file with your contacts (and their photos), game progress, stats and settings. Your passcode is not included.'));
  sh.appendChild(tx('p', 'swarn', 'Choose a backup password of at least ' + PASS_MIN + ' characters. There is no way to recover it: if you forget it, this backup can\u2019t be opened. It can be the same as your passcode or different.'));
  const a = field('Backup password', 'password', { autocomplete: 'new-password' }), b = field('Type it again', 'password', { autocomplete: 'new-password' });
  sh.append(a.wrap, b.wrap, showToggle([a.input, b.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  const go1 = btn('Create Backup File', '', async () => {
    const p = a.input.value;
    if (Array.from(p).length < PASS_MIN) { err.textContent = 'Please use at least ' + PASS_MIN + ' characters.'; return; }
    if (p !== b.input.value) { err.textContent = 'The two passwords don\u2019t match. Please type them again.'; return; }
    go1.disabled = true; err.textContent = 'Making your backup\u2026';
    try {
      const r = await saveBackupFile(await makeBackupFile(p));
      if (r === 'cancelled') { err.textContent = 'Backup not saved. You can try again any time.'; go1.disabled = false; return; }
      Store.set('lastBackup', nowMs()); Store.del('backupSnooze');
      toast(S, 'Backup saved'); renderSettings(S, 'list');
      showPanel(S, { title: 'Backup saved', text: 'Keep the file somewhere private, such as your own cloud drive or email. To restore, open Settings \u2192 Restore From A Backup.', buttons: [{ label: 'OK' }] });
    } catch (e) { console.error(e); err.textContent = 'Sorry, the backup couldn\u2019t be made on this phone.'; go1.disabled = false; }
  });
  sh.appendChild(go1);
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}
function viewRestore(S, sh) {
  sh.appendChild(tx('h3', '', 'Restore from a backup'));
  sh.appendChild(tx('p', '', 'Choose a Taarala Thota backup file (its name ends in .ttbackup) and type its backup password.'));
  sh.appendChild(tx('p', 'swarn', 'Restoring replaces all ' + APP_NAME + ' data on this phone with what is in the backup. Your current passcode stays the same.'));
  const file = document.createElement('input'); file.type = 'file'; file.style.display = 'none'; sh.appendChild(file);
  const fname = tx('p', 'shint', 'No file chosen.');
  sh.appendChild(btn('Choose Backup File', 'secondary', () => file.click())); sh.appendChild(fname);
  file.addEventListener('change', () => {
    fname.textContent = file.files && file.files[0] ? 'Chosen: ' + file.files[0].name : 'No file chosen.';
    err.textContent = '';
  });
  const a = field('Backup password', 'password', { autocomplete: 'off' }); sh.append(a.wrap, showToggle([a.input]));
  const err = tx('p', 'serr'); sh.appendChild(err);
  const open = btn('Open Backup', '', async () => {
    const f = file.files && file.files[0];
    if (!f) { err.textContent = 'Please choose the backup file first.'; return; }
    open.disabled = true; err.textContent = 'Opening\u2026';
    try {
      const b = await readBackupFile(f, a.input.value);
      err.textContent = ''; open.disabled = false;
      const when = new Date(b.created), d = when.getDate() + ' ' + fmtDay(when.getTime()).split(' ')[1] + ' ' + when.getFullYear();
      showPanel(S, { title: 'Replace all app data?',
        text: 'This backup is from ' + d + ' and has ' + b.contacts + (b.contacts === 1 ? ' contact' : ' contacts') + '. Replace all ' + APP_NAME + ' data on this phone with it? Your current passcode stays the same.',
        buttons: [{ label: 'Cancel', secondary: true }, { label: 'Replace', fn: () => {
          if (!applyBackup(b)) { err.textContent = 'This phone has no room left to restore that backup.'; return; }
          try { Music.paint(); } catch (e) {}
          toast(S, 'Backup restored'); renderSettings(S, 'list'); } }] });
    } catch (e) { open.disabled = false; err.textContent = e instanceof BackupError ? e.message : 'Sorry, that backup couldn\u2019t be opened.'; }
  });
  sh.appendChild(open);
  sh.appendChild(btn('Cancel', 'secondary', () => renderSettings(S, 'list')));
}

// ============================================================

// ------------------------------------------------------------
// PRIVACY & SAFETY PAGE
// The points (PRIVACY_POINTS above), opened from the link at the bottom of Home, ending with the maker's signature.
// ------------------------------------------------------------
function buildPrivacy() {
  const S = defScreen('privacy', 'loved', { parent: 'home-view', name: 'Privacy & Safety' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 90, 160, 560, 130, 74, 'Privacy & Safety');
  const sheet = el('div', 'sheet'); place(sheet, 45, 330, 763, 1470, S); S.art.appendChild(sheet);
  sheet.appendChild(tourCard('privacy'));                         // "Take A Tour" invitation, at the very top
  const ol = tx('ol', 'plist'); PRIVACY_POINTS.forEach(p => ol.appendChild(tx('li', '', p))); sheet.appendChild(ol);
  ol.children[1].appendChild(visitSwitch(S));                    // the visit-counting switch, right under the point that explains it
  // links to the outside services mentioned above (they open in a new tab; nothing is sent by the app)
  const links = tx('p', 'shint', 'More about the services mentioned: ');
  [['Cloudflare privacy policy', 'https://www.cloudflare.com/privacypolicy/'], ['WhatsApp privacy policy', 'https://www.whatsapp.com/legal/privacy-policy']].forEach(([t, u], i) => {
    const a = tx('a', 'plink', t); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
    if (i) links.append(' \u00b7 '); links.appendChild(a);
  });
  sheet.appendChild(links);
  sheet.appendChild(feedbackButton('privacy'));                 // anonymous feedback
  S.onShow = () => allowZoom(true); S.onHide = () => allowZoom(false);   // text page: two-finger zoom allowed
  // the maker's signature: seal, "Made with care by rdg" with its shooting star, and the copyright line
  const mk = tx('div', 'maker'), seal = tx('div', 'maker-big'); seal.innerHTML = makerSealSvg(); mk.appendChild(seal);
  const sig = tx('div', 'maker-sig'); sig.appendChild(tx('div', 'maker-by', 'Made with care by'));
  sig.appendChild(tx('div', 'maker-rdg', 'rdg'));
  const trail = tx('div', 'maker-trail'); trail.innerHTML = makerTrailSvg(); sig.appendChild(trail);
  sig.appendChild(tx('div', 'maker-copy', MAKER_CREDIT)); mk.appendChild(sig);
  sheet.appendChild(mk);
}

// ------------------------------------------------------------
// SHARE FEEDBACK (anonymous)
// One short invitation and one box. Opened from the Privacy & Safety page and from Settings; Back returns there.
// The message is sent to the app's own feedback address (functions/api/feedback.js) with only the app release.
// No name, email or anything about the person is sent. Text is never shown back as code (plain text only).
// ------------------------------------------------------------
const FEEDBACK_MAX = 10000;
function openFeedback(from) { const S = SCREENS.feedback; if (S) { S.parent = from; go('feedback'); } }
function feedbackButton(from) { return btn('Share Feedback (Anonymous)', 'secondary fb-open', () => openFeedback(from)); }
function buildFeedback() {
  const S = defScreen('feedback', 'loved', { parent: 'privacy', name: 'Share Feedback' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 90, 160, 600, 130, 74, 'Share Feedback');
  const sheet = el('div', 'sheet'); place(sheet, 45, 330, 763, 1470, S); S.art.appendChild(sheet);
  sheet.appendChild(tx('p', '', 'What do you enjoy? What didn’t you like, or what felt confusing? What would make it better, and how? Is there a feature you’d love to see? Anything at all is welcome.'));
  sheet.appendChild(tx('p', 'shint', 'This is anonymous: we don’t ask for your name or email, and please don’t include personal details. Please keep it kind and respectful.'));
  const box = document.createElement('textarea'); box.className = 'fb-box'; box.setAttribute('aria-label', 'Your feedback'); box.rows = 9;
  sheet.appendChild(box);
  const msg = tx('p', 'fb-msg'); msg.setAttribute('role', 'status');
  const send = btn('Send', '', async () => {
    const text = box.value.trim();
    if (!text) { msg.textContent = 'Please write something first.'; return; }
    if (Array.from(text).length > FEEDBACK_MAX) { msg.textContent = 'That’s a lot of thoughts! Please keep it under ' + FEEDBACK_MAX.toLocaleString() + ' characters.'; return; }
    send.disabled = true; msg.textContent = 'Sending…';
    let res = null;
    try { res = await fetch('api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, release: APP_RELEASE }) }); } catch (e) {}
    if (res && res.ok) {
      box.value = ''; msg.textContent = 'Thank you! Your feedback was sent. 🌟';
      S.pauseUntil = Date.now() + 10000;                           // a short pause before the next message (the server also limits each day)
      setTimeout(() => { send.disabled = false; S.pauseUntil = 0; if (/few seconds/.test(msg.textContent)) msg.textContent = ''; }, 10000);
      return;
    }
    send.disabled = false;
    msg.textContent = res && res.status === 429 ? 'Lots of messages today. Please try again tomorrow; your message is still here.'
      : 'Couldn’t send right now. Please check your internet and try again; your message is still here.';
  });
  sheet.appendChild(send); sheet.appendChild(msg);
  // coming back during the short pause: say why Send is resting, never leave it silently greyed out
  S.onShow = () => { allowZoom(true); msg.textContent = S.pauseUntil > Date.now() ? 'Thanks! You can send another message in a few seconds.' : ''; };
  S.onHide = () => allowZoom(false);
}

// ============================================================
// BACKUP & RESTORE (the file is made on this phone and saved wherever the person chooses;
// it never passes through anyone else)
// - Locked with the person's backup password: AES-GCM 256, key from PBKDF2-SHA256.
// - The passcode is never inside a backup (restoring keeps the passcode that is set now).
// - Restore treats every file as untrusted: size, structure, allowed items and every contact are checked.
// ============================================================
const BACKUP_APP = 'taarala-thota-backup', BACKUP_V = 1, BACKUP_MAX_BYTES = 15 * 1024 * 1024;
const BACKUP_REMIND_DAYS = 6;
// the only items a backup may carry (everything the app saves, except the passcode and housekeeping)
const BACKUP_KEYS = /^tt:(contacts|music|count|bubble|bubble:stats|minesweeper:best|(chess|checkers|minesweeper|bubble):(game|stats|totals))$/;

function b64(bytes) {
  let s = '';
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(str) { const s = atob(str), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
async function backupKey(password, salt, rounds) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function backupItems() {
  const items = {};
  try { Object.keys(localStorage).forEach(k => { if (BACKUP_KEYS.test(k)) items[k] = localStorage.getItem(k); }); } catch (e) {}
  return items;
}
// is there anything worth backing up? (a contact or some game progress)
function hasSomethingToSave() { return Object.keys(backupItems()).some(k => k !== 'tt:music'); }

async function makeBackupFile(password) {
  const payload = JSON.stringify({ app: BACKUP_APP, v: BACKUP_V, created: new Date(nowMs()).toISOString(), items: backupItems() });
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupKey(password, salt, PBKDF2_ROUNDS);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));
  const text = JSON.stringify({ app: BACKUP_APP, v: BACKUP_V, kdf: 'PBKDF2-SHA256', rounds: PBKDF2_ROUNDS, salt: b64(salt), iv: b64(iv), data: b64(data) });
  const d = new Date(nowMs()), name = 'taarala-thota-backup-' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.ttbackup';
  return new File([text], name, { type: 'application/octet-stream' });
}
// Share where the phone supports sharing files, otherwise Download. Returns 'shared' | 'downloaded' | 'cancelled'.
async function saveBackupFile(file) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Taarala Thota (Garden of Stars) backup' });
      return 'shared';
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const url = URL.createObjectURL(file), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

// ---- restore: every step can fail with a friendly message ----
class BackupError extends Error {}
async function readBackupFile(file, password) {
  if (!file || file.size > BACKUP_MAX_BYTES) throw new BackupError('That file is too big to be a Taarala Thota backup.');
  let outer;
  try { outer = JSON.parse(await file.text()); } catch (e) { throw new BackupError('That file isn’t a Taarala Thota backup.'); }
  if (!outer || outer.app !== BACKUP_APP || outer.v !== BACKUP_V || typeof outer.salt !== 'string' || typeof outer.iv !== 'string' || typeof outer.data !== 'string'
      || !(outer.rounds >= 100000 && outer.rounds <= 5000000)) throw new BackupError('That file isn’t a Taarala Thota backup.');
  let plain;
  try {
    const key = await backupKey(password, unb64(outer.salt), outer.rounds);
    plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(outer.iv) }, key, unb64(outer.data)));
  } catch (e) { throw new BackupError('That password doesn’t open this backup. Please check it and try again.'); }
  let inner;
  try { inner = JSON.parse(plain); } catch (e) { throw new BackupError('This backup is damaged and can’t be used.'); }
  if (!inner || inner.app !== BACKUP_APP || typeof inner.items !== 'object' || !inner.items || isNaN(Date.parse(inner.created))) throw new BackupError('This backup is damaged and can’t be used.');
  // keep only allowed items, each a sensible size and valid JSON
  const items = {};
  Object.keys(inner.items).forEach(k => {
    const v = inner.items[k];
    if (!BACKUP_KEYS.test(k) || typeof v !== 'string' || v.length > 8 * 1024 * 1024) return;
    try { JSON.parse(v); } catch (e) { if (k !== 'tt:music') return; }
    if (k === 'tt:music' && !/^(on|off)$/.test(v)) return;
    if (k === 'tt:count' && !/^"(on|off)"$/.test(v)) return;
    items[k] = v;
  });
  // every contact is re-checked and re-cleaned exactly as if it were typed in Settings
  if (items['tt:contacts']) {
    let list = [];
    try { list = JSON.parse(items['tt:contacts']); } catch (e) {}
    list = (Array.isArray(list) ? list : []).filter(c => c && typeof c === 'object' && !Contacts.check(c.name, c.phone)).slice(0, CONTACT_MAX).map(c => Contacts.clean(c));
    items['tt:contacts'] = JSON.stringify(list);
  }
  const contacts = items['tt:contacts'] ? JSON.parse(items['tt:contacts']).length : 0;
  return { created: inner.created, items, contacts };
}
function applyBackup(b) {
  try {
    // replace all app data, but keep the passcode that is set now (and its lock state)
    Object.keys(localStorage).filter(k => k.startsWith('tt:') && !/^tt:(pass|passlock|noticeDay|since)$/.test(k)).forEach(k => localStorage.removeItem(k));
    Object.keys(b.items).forEach(k => localStorage.setItem(k, b.items[k]));
    Store.set('lastBackup', nowMs());
    return true;
  } catch (e) { return false; }
}

// ---- 6-day reminder on Home (never during a game) ----
function backupReminderDue() {
  if (!hasSomethingToSave()) return false;
  const since = Store.get('lastBackup', 0) || Store.get('since', nowMs());
  if (nowMs() - since < BACKUP_REMIND_DAYS * 86400000) return false;
  return nowMs() >= Store.get('backupSnooze', 0);
}
function maybeRemindBackup(S) {
  if (!S || S.panel || !backupReminderDue()) return;
  const last = Store.get('lastBackup', 0);
  showPanel(S, { title: 'Time for a backup?',
    text: (last ? 'It’s been ' + Math.floor((nowMs() - last) / 86400000) + ' days since your last backup.' : 'You haven’t made a backup yet.') + ' A backup keeps your contacts and progress safe if this phone’s data is ever cleared.',
    buttons: [{ label: 'Later', secondary: true, fn: () => Store.set('backupSnooze', nowMs() + 86400000) },
              { label: 'Back Up Now', fn: () => { SCREENS.settings.pendingView = 'backup'; go('settings'); } }] });
}

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

// ============================================================
// TAKE A TOUR (a playing walkthrough, like a screen recording)
// The app plays the tour on its REAL screens: a glowing finger moves to each button and "taps" it, a short caption
// explains, and a player bar gives pause/play, 5 seconds back/forward, a bar to drag, speed (1×, 1.5×, 2×, 0.5×)
// and music on/off. Started from the "Take A Tour" card at the top of Privacy & Safety and in Settings (under App update).
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
    text: 'Tap the gear (Settings), create a passcode, then Add A Contact: a name, a WhatsApp number and, if you like, a photo.' },
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
    text: 'Everything stays on this phone. Now and then, tap the gear → Back Up Now, and keep the file somewhere safe.' },
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
  c.appendChild(btn('▶ Take A Tour', 'small tour-go', () => Tour.start(from, { record: TEST_MODE && QS.has('tourrec') })));
  return c;
}

// ============================================================
// BUBBLE POP  (3 levels x 120 seconds)
// Only the travel speed increases between levels. Every level is open to everyone (like Chess).
// Each level has an accuracy goal, 95% / 98% / 100%: reaching it completes the level and earns its gold star.
// Accuracy = popped / (popped + missed).
// Bubbles still floating when time ends are not counted either way.
// ============================================================

// ------------------------------------------------------------
// BUBBLE POP: SETTINGS PER LEVEL
// Three levels, each lasting the same time. "gate" is the accuracy goal (95 / 98 / 100 %) that completes the level.
// pic = the level's picture; src = where bubbles rise from; dur = seconds a bubble takes to float across (smaller = faster);
// the other numbers place the timer, star, Home and Back.
// ------------------------------------------------------------
const BUB = {
  R: 48, LEN: 120, SPAWN: 0.75,        // SPAWN = seconds between new bubbles (about 1.4 per second)
  L: {
    1: { pic: 'bubble-l1', src: [445, 1310], dur: 6.0, gate: 95, timer: [390, 65, 81, 145], star: [721, 266, 105, 129], home: [35, 206, 146, 55], back: [197, 206, 137, 55] },
    2: { pic: 'bubble-l2', src: [135, 1113], dur: 4.8, gate: 98, timer: [402, 105, 72, 105], star: [740, 258, 76, 137], home: [39, 206, 142, 52], backPlank: [190, 206, 145, 52] },
    3: { pic: 'bubble-l3', src: [426, 1371], dur: 3.7, gate: 100, timer: [385, 65, 89, 145], star: [732, 258, 81, 137], home: [31, 206, 161, 55], back: [202, 206, 129, 55] }
  },
  cur: null
};
const BUB_COLORS = ['#8fd6ff', '#ffb3d9', '#b9f0c0', '#ffe08a', '#d1b3ff', '#ffc78a'];

// Saved as tt:bubble: { level: the level Continue plays next, done: levels completed (gold stars) }.
// Older saves only had "level" (the highest unlocked), meaning every level below it was completed.
function bubSaved() { const p = Store.get('bubble', null); return p && typeof p === 'object' ? p : {}; }
function bubProgress() { return clamp(num(bubSaved().level) || 1, 1, 3); }
function bubDone() {
  const p = bubSaved();
  if (Array.isArray(p.done)) return [1, 2, 3].filter(n => p.done.includes(n));
  return [1, 2, 3].filter(n => n < bubProgress());
}
function bubSetProgress(n, doneLevel) {
  const done = bubDone(); if (doneLevel && !done.includes(doneLevel)) done.push(doneLevel);
  Store.set('bubble', { level: clamp(n, 1, 3), done: done.sort() });
}

// ------------------------------------------------------------
// BUBBLE POP SCREENS
// Builds the Bubble Pop home (level tiles 1-3, Stats) and one screen per level.
// ------------------------------------------------------------
function buildBubble() {
  // Bubble Pop home
  const H = defScreen('bubble-home', 'bubble-home', { parent: 'games', name: 'Bubble Pop' });
  addNav(H, { home: [35, 100, 210, 82], back: [35, 195, 210, 84] });
  addHot(H, 322, 520, 205, 330, () => startBubbleLevel(bubProgress()), 'Continue');
  [[55, 990, 245, 275], [310, 985, 240, 280], [565, 990, 240, 275]].forEach((r, i) => {
    addHot(H, r[0], r[1], r[2], r[3], () => startBubbleLevel(i + 1), 'Level ' + (i + 1));   // every level open
    // gold star on the stone plaque once the level is completed
    const st = el('div', 'bub-star'); st.setAttribute('aria-hidden', 'true');
    st.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.2l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#ffd45e" stroke="#7a4a12" stroke-width="1.2" stroke-linejoin="round"/></svg>';
    place(st, r[0] + r[2] - 92, 1166, 58, 58, H); H.art.appendChild(st);
  });
  H.onShow = () => { const d = bubDone(); H.art.querySelectorAll('.bub-star').forEach((s, i) => s.classList.toggle('on', d.includes(i + 1))); };
  const T = defScreen('bubble-stats', 'bubble-stats', { parent: 'bubble-home', name: 'Bubble Pop stats' });
  addNav(T, { icons: true });
  T.statEls = [];
  addText(T, 'stat-title', 235, 402, 382, 82, 44, 'Bubble Pop Stats');
  [[105, 'Levels Done'], [325, 'Games Played'], [541, 'Bubbles Popped']].forEach(([x, lab]) => addText(T, 'stat-lab', x + 14, 631, 180, 44, 22, lab));
  addText(T, 'stat-sub', 235, 794, 380, 50, 38, 'Best Scores');
  [1, 2, 3].forEach((n, i) => addText(T, 'stat-rl', 120, 860 + i * 64, 176, 48, 30, 'Level ' + n));
  addText(T, 'stat-sub', 235, 1088, 380, 50, 38, 'Recent Games');
  for (let i = 0; i < 7; i++) addText(T, 'stat-badge', 117, 1150 + i * 56.7, 52, 54, 28, String(i + 1));
  T.onShow = () => paintBubbleStats(T);
  addText(H, 'stone-lab', 318, 1530, 224, 60, 36, 'Stats');
  addHot(H, 255, 1300, 350, 350, () => go('bubble-stats'), 'Stats');
  // the three level screens
  [1, 2, 3].forEach(n => {
    const C = BUB.L[n];
    const S = defScreen('bubble-l' + n, C.pic, { parent: 'bubble-home', name: 'Bubble Pop Level ' + n });
    if (C.backPlank) {
      addHot(S, ...C.home, goHome, 'Home');
      addPlank(S, C.backPlank[0], C.backPlank[1], C.backPlank[2], C.backPlank[3], 'back', goBack);
    }
    else { addHot(S, ...C.home, goHome, 'Home'); addHot(S, ...C.back, goBack, 'Back'); }
    addTopMusic(S);
    S.layer = el('div', 'blayer'); place(S.layer, 0, 0, S.W, S.H, S); S.art.appendChild(S.layer);
    S.timerEl = addText(S, 'lantern-digits', C.timer[0] + 3, C.timer[1] + 66, C.timer[2] - 6, 42, 25, '2:00');
    S.starEl = addText(S, 'lantern-digits star', C.star[0] + 3, C.star[1] + 52, C.star[2] - 6, 46, 30, '0');
    S.onShow = () => beginBubbleLevel(n);
    S.onHide = () => endBubbleLoop();
  });
}
function startBubbleLevel(n) { go('bubble-l' + n); }

// ------------------------------------------------------------
// THE GAME LOOP
// beginBubbleLevel starts the clock; bubFrame runs every animation frame, moving bubbles and making new ones;
// popBub handles a tap; finishBubbleLevel works out accuracy and decides whether the next level unlocks.
// ------------------------------------------------------------
function beginBubbleLevel(n) {
  endBubbleLoop();
  const S = SCREENS['bubble-l' + n]; closePanel(S);
  S.layer.innerHTML = '';
  BUB.cur = { n, S, t: 0, popped: 0, missed: 0, bubbles: [], nextSpawn: 0.6, last: 0, over: false, raf: 0 };
  S.starEl.textContent = '0'; S.timerEl.textContent = fmtClock(BUB.LEN);
  BUB.cur.last = performance.now();
  BUB.cur.raf = requestAnimationFrame(bubFrame);
}
function endBubbleLoop() {
  if (BUB.cur) { cancelAnimationFrame(BUB.cur.raf); BUB.cur.over = true; }
}
// where is a bubble on its curved path at time t (0..1)?
function bubPos(b, t) {
  const u = 1 - t;
  return [u * u * b.p0[0] + 2 * u * t * b.p1[0] + t * t * b.p2[0], u * u * b.p0[1] + 2 * u * t * b.p1[1] + t * t * b.p2[1]];
}
function bubMake(G) {
  const C = BUB.L[G.n], src = C.src;
  for (let tries = 0; tries < 14; tries++) {
    const e = [rnd(150, 710), rnd(455, 520)];
    const mid = [(src[0] + e[0]) / 2, (src[1] + e[1]) / 2];
    const dx = e[0] - src[0], dy = e[1] - src[1], len = Math.hypot(dx, dy) || 1;
    const off = rnd(90, 230) * (Math.random() < 0.5 ? -1 : 1);
    const p1 = [clamp(mid[0] + (-dy / len) * off, 120, 735), Math.max(470, mid[1] + (dx / len) * off)];
    const cand = { p0: src.slice(), p1, p2: e, born: G.t, dur: C.dur };
    // keep clear of every bubble that is floating now (checked along the whole trip)
    let ok = true;
    for (let tau = 0; tau <= C.dur && ok; tau += 0.2) {
      const a = bubPos(cand, tau / C.dur);
      for (const o of G.bubbles) {
        const to = (G.t + tau - o.born) / o.dur; if (to > 1) continue;
        const b = bubPos(o, to);
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < BUB.R * 2 + 12) { ok = false; break; }
      }
    }
    if (ok) return cand;
  }
  return null;
}
function bubFrame(now) {
  const G = BUB.cur; if (!G || G.over) return;
  if (SIDEWAYS) { G.last = now; G.raf = requestAnimationFrame(bubFrame); return; }   // paused while the "turn upright" card shows
  const dt = Math.min(0.1, (now - G.last) / 1000); G.last = now; G.t += dt;
  const S = G.S, C = BUB.L[G.n], u = S.scale;
  if (G.t >= BUB.LEN) { finishBubbleLevel(); return; }
  if (G.t >= G.nextSpawn && G.t < BUB.LEN - 0.5) {
    G.nextSpawn = G.t + BUB.SPAWN;
    const b = bubMake(G);
    if (!b) G.nextSpawn = G.t + 0.12;      // no free path right now: look again very soon
    if (b) {
      b.el = el('div', 'bub'); const col = BUB_COLORS[Math.floor(Math.random() * BUB_COLORS.length)];
      b.el.style.setProperty('--bc', col);
      b.el.style.width = b.el.style.height = (BUB.R * 2 * u) + 'px';
      b.el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); popBub(G, b); });
      S.layer.appendChild(b.el); G.bubbles.push(b);
    }
  }
  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    const b = G.bubbles[i], t = (G.t - b.born) / b.dur;
    if (t >= 1) { G.missed++; b.el.remove(); G.bubbles.splice(i, 1); continue; }
    const p = bubPos(b, t), grow = Math.min(1, (G.t - b.born) / 0.5);
    b.el.style.transform = 'translate(' + ((p[0] - BUB.R * grow) * u) + 'px,' + ((p[1] - BUB.R * grow) * u) + 'px) scale(' + (0.35 + 0.65 * grow) + ')';
  }
  S.timerEl.textContent = fmtClock(Math.ceil(BUB.LEN - G.t));
  G.raf = requestAnimationFrame(bubFrame);
}
function popBub(G, b) {
  if (G.over) return; const i = G.bubbles.indexOf(b); if (i < 0) return;
  G.bubbles.splice(i, 1); G.popped++; G.S.starEl.textContent = String(G.popped);
  b.el.classList.add('pop'); setTimeout(() => b.el.remove(), 220);
  Music.blip(880 + Math.random() * 300, 1500, 0.12, 0.12);
}

// ------------------------------------------------------------
// BUBBLE POP STATS
// Saved as tt:bubble:stats: levels done, games, bubbles popped, best per level, last games.
// ------------------------------------------------------------
function bubRecord(n, popped, acc, pass) {
  const s = Store.get('bubble:stats', { games: 0, popped: 0, done: 0, best: {}, recent: [] });
  const a = Math.floor(acc * 10) / 10;
  s.games++; s.popped += popped; if (pass) s.done = Math.max(s.done, n);
  const b = s.best[n] || { p: 0, a: 0 }; s.best[n] = { p: Math.max(b.p, popped), a: Math.max(b.a, a) };
  s.recent.push({ n, p: popped, a, ok: !!pass, t: nowMs() }); s.recent = s.recent.slice(-10);
  Store.set('bubble:stats', s);
}
function paintBubbleStats(T) {
  T.statEls.forEach(x => x.remove()); T.statEls = [];
  const push = (e) => { T.statEls.push(e); return e; };
  const s = Store.get('bubble:stats', { games: 0, popped: 0, done: 0, best: {}, recent: [] });
  [[105, num(s.done) + '/3'], [325, String(num(s.games))], [541, String(num(s.popped))]].forEach(([x, v]) => push(addText(T, 'stat-num', x + 4, 682, 200, 66, 50, v)));
  [1, 2, 3].forEach((n, i) => {
    const b = s.best && s.best[n];
    push(addText(T, 'stat-num best', 322, 860 + i * 64, 410, 48, 34, b ? num(b.p) + ' popped \u00b7 ' + (num(b.a) % 1 ? num(b.a).toFixed(1) : num(b.a)) + '%' : '\u2014'));
  });
  (Array.isArray(s.recent) ? s.recent : []).slice(-7).reverse().forEach((x, i) => {
    x = x || {}; const a = num(x.a);
    const row = push(addText(T, 'stat-row', 182, 1150 + i * 56.7, 550, 54, 29, ''));
    row.innerHTML = '<span class="sr-l"><b class="' + (x.ok ? 'r-won' : 'r-forfeited') + '">' + (x.ok ? '\u2713' : '\u2022') + '</b> Level ' + num(x.n) + ' \u00b7 ' + num(x.p) + ' popped \u00b7 ' + (a % 1 ? a.toFixed(1) : a) + '%</span><span class="sr-r">' + fmtDay(num(x.t)) + '</span>';
  });
}
// End of a level: accuracy = popped / (popped + missed). Meets the goal -> level completed (gold star),
// and Continue moves on to the next level (back to level 1 after level 3).
function finishBubbleLevel() {
  const G = BUB.cur; if (!G) return; G.over = true; cancelAnimationFrame(G.raf);
  G.bubbles.forEach(b => b.el.remove()); G.bubbles = [];             // still floating at the end: not counted
  const S = G.S, C = BUB.L[G.n], total = G.popped + G.missed;
  const acc = total ? (G.popped / total) * 100 : 0, accTxt = (Math.floor(acc * 10) / 10).toFixed(1).replace('.0', '') + '%';
  const pass = total > 0 && acc >= C.gate - 1e-9;
  bubRecord(G.n, G.popped, acc, pass);
  const info = 'Popped ' + G.popped + ' · Missed ' + G.missed + ' · Accuracy ' + accTxt + ' (need ' + C.gate + '%)';
  if (pass && G.n === 3) {
    bubSetProgress(1, 3);
    showPanel(S, { icon: '✨', title: 'Bubble Pop Complete!', text: info, buttons: [{ label: 'Bubble Pop Home', fn: () => go('bubble-home') }] });
  } else if (pass) {
    bubSetProgress(G.n + 1, G.n);
    showPanel(S, { icon: '⭐', title: 'Level ' + G.n + ' Complete!', text: info,
      buttons: [{ label: 'Bubble Pop Home', secondary: true, fn: () => go('bubble-home') }, { label: 'Next Level', fn: () => startBubbleLevel(G.n + 1) }] });
  } else {
    showPanel(S, { icon: '🫧', title: 'So close!', text: info,
      buttons: [{ label: 'Bubble Pop Home', secondary: true, fn: () => go('bubble-home') }, { label: 'Try Again', fn: () => beginBubbleLevel(G.n) }] });
  }
}
document.addEventListener('visibilitychange', () => { if (BUB.cur && !BUB.cur.over) BUB.cur.last = performance.now(); });

// ============================================================
// HIDDEN COMETS (a minesweeper-style game): Gentle 4x4 (no losing), Medium 9x9 (10 comets), Hard 12x12 (22 comets)
// Tap = open.  Press and hold (about half a second) = flag.
// The first tap CAN find a comet. Finding one keeps the board, outlines it in
// copper, and offers a gentle Try Again (no red, no explosion).
// (Internal names such as 'minesweeper' and 'mine' are kept for saved progress and are never shown.)
// ============================================================

// ------------------------------------------------------------
// HIDDEN COMETS: SETTINGS
// Board size and number of hidden comets per difficulty. All three use the same board picture.
// MS_BOARD / MS_CLOCK / MS_FLAG = where the grid, timer and flag counter sit on that picture.
// ------------------------------------------------------------
const MS_BOARD = [75, 598, 706, 706], MS_CLOCK = [278, 260, 80, 50], MS_FLAG = [602, 264, 80, 50];
const MS = {
  gentle: { n: 4, mines: 2, pic: 'ms-board', board: MS_BOARD, clock: MS_CLOCK, flag: MS_FLAG },
  medium: { n: 9, mines: 10, pic: 'ms-board', board: MS_BOARD, clock: MS_CLOCK, flag: MS_FLAG },
  hard: { n: 12, mines: 22, pic: 'ms-board', board: MS_BOARD, clock: MS_CLOCK, flag: MS_FLAG }
};
const MS_NUM = ['', '#2f6fb3', '#2f8a4a', '#b8651b', '#6a3fa0', '#a8442b', '#1d8a8a', '#444', '#777'];
// Pictures drawn in code: the comet, the flag and (Gentle mode) the treasure gem.
// a small comet: glowing head with a soft tail (drawn by the app, no picture needed)
const SVG_MINE = '<svg viewBox="0 0 24 24" width="92%" height="92%"><g stroke-linecap="round" fill="none"><path d="M3 21 12.5 11.5" stroke="#8fb6ff" stroke-width="3.4" opacity=".55"/><path d="M6 22.2 13.6 14.2" stroke="#7fa9e8" stroke-width="1.7" opacity=".75"/><path d="M1.8 18 9.8 10.4" stroke="#7fa9e8" stroke-width="1.7" opacity=".75"/></g><circle cx="15.6" cy="8.4" r="5.2" fill="#fff1c2" stroke="#d9962a" stroke-width="1.5"/><circle cx="14" cy="6.9" r="1.7" fill="#fff"/></svg>';
const SVG_FLAG = '<svg viewBox="0 0 24 24" width="62%" height="62%"><path d="M7 3v18" stroke="#5a3a1a" stroke-width="2.2" stroke-linecap="round"/><path d="M7 4h11l-3 4 3 4H7z" fill="#e9892c" stroke="#8a4a10" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const SVG_GEM = '<svg viewBox="0 0 24 24" width="62%" height="62%"><path d="M12 3 4 9l8 12 8-12z" fill="#7fe0e8" stroke="#2a8f9a" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 9h16M9 9l3 12 3-12M12 3 9 9m3-6 3 6" fill="none" stroke="#2a8f9a" stroke-width="1"/></svg>';

const MS_BT = [913, 972, 1030];

// ------------------------------------------------------------
// HIDDEN COMETS SCREENS
// Entry screen (your blank-sign picture: every word is added here), Stats, and one game screen per difficulty.
// Leaving a game in progress counts as Forfeited.
// ------------------------------------------------------------
function buildMine() {
  const H = defScreen('ms-home', 'ms-home', { parent: 'games', name: 'Hidden Comets' });
  addNav(H, { icons: true });
  // all words are added by the app: the picture's sign, lanterns and plaque are blank
  addText(H, 'carved-sign', 180, 455, 495, 100, 62, 'Hidden Comets');
  [['Gentle', 152, 'ms-gentle'], ['Medium', 366, 'ms-medium'], ['Hard', 581, 'ms-hard']].forEach(([lab, x, scr]) => {
    addText(H, 'lantern-lab', x, 745, 124, 60, lab.length > 5 ? 27 : 31, lab);
    addHot(H, x - 10, 655, 144, 245, () => go(scr), lab);
  });
  const T = defScreen('ms-stats', 'ms-stats', { parent: 'ms-home', name: 'Hidden Comets stats' });
  addNav(T, { icons: true });
  T.statEls = [];
  addText(T, 'stat-title', 230, 535, 392, 76, 38, 'Hidden Comets Stats');
  [[100, 'Won'], [322, 'Lost'], [545, 'Forfeited']].forEach(([x, lab]) => addText(T, 'stat-lab', x + 16, 722, 176, 40, 31, lab));
  addText(T, 'stat-sub', 140, 850, 570, 48, 36, 'Best Times');
  ['Gentle', 'Medium', 'Hard'].forEach((lab, i) => addText(T, 'stat-rl', 128, MS_BT[i] + 2, 182, 44, 31, lab));
  addText(T, 'stat-sub', 140, 1120, 570, 46, 36, 'Recent Games');
  for (let i = 0; i < 8; i++) addText(T, 'stat-badge', 123, 1178 + i * 49.7, 44, 46, 26, String(i + 1));
  T.onShow = () => paintMineStats(T);
  addText(H, 'stone-lab', 340, 1410, 173, 60, 38, 'Stats');
  addHot(H, 300, 1190, 255, 330, () => go('ms-stats'), 'Stats');
  ['gentle', 'medium', 'hard'].forEach(mode => {
    const C = MS[mode];
    const S = defScreen('ms-' + mode, C.pic, { parent: 'ms-home', name: 'Hidden Comets ' + mode });
    addNav(S, { icons: true });
    S.boardEl = el('div', 'msboard'); place(S.boardEl, C.board[0], C.board[1], C.board[2], C.board[3], S);
    S.boardEl.style.gridTemplateColumns = 'repeat(' + C.n + ',1fr)'; S.boardEl.style.gridTemplateRows = 'repeat(' + C.n + ',1fr)';
    S.art.appendChild(S.boardEl);
    if (C.clock) {
      S.clockEl = addText(S, 'lantern-digits', C.clock[0], C.clock[1], C.clock[2], C.clock[3], 26, '0:00');
      S.flagEl = addText(S, 'lantern-digits', C.flag[0], C.flag[1], C.flag[2], C.flag[3], 34, String(C.mines));
    }
    S.mode = mode;
    S.onShow = () => newMineGame(S);
    S.onHide = () => { if (S.G && !S.G.over && S.G.startAt) mineRecord(S, 'forfeited'); if (S.G) S.G.over = true; };
  });
}

// ------------------------------------------------------------
// A NEW BOARD
// Places the comets at random and counts each square's neighbours.
// Tap = open a square; press and hold about half a second = flag (not in Gentle).
// ------------------------------------------------------------
function newMineGame(S) {
  closePanel(S);
  const C = MS[S.mode], n = C.n, cells = [];
  for (let i = 0; i < n * n; i++) cells.push({ mine: false, open: false, flag: false, adj: 0 });
  let placed = 0; while (placed < C.mines) { const i = Math.floor(Math.random() * n * n); if (!cells[i].mine) { cells[i].mine = true; placed++; } }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let a = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n && cells[rr * n + cc].mine) a++;
    }
    cells[r * n + c].adj = a;
  }
  S.G = { n, cells, mode: S.mode, over: false, opened: 0, flags: 0, startAt: 0, secs: 0 };
  S.boardEl.innerHTML = '';
  S.boardEl.style.fontSize = 'calc(var(--u) * ' + Math.round(C.board[2] / n * 0.52) + ')';
  for (let i = 0; i < n * n; i++) {
    const b = el('button', 'mscell'); b.type = 'button'; b.dataset.i = i;
    // Tap = open. Press and hold (about half a second) = flag (not in Gentle). A finger that slides away cancels.
    let timer = null, fired = false, armed = false, sx = 0, sy = 0;
    b.addEventListener('pointerdown', (ev) => {
      fired = false; armed = true; sx = ev.clientX; sy = ev.clientY;
      if (S.mode === 'gentle') return;                      // Gentle has no flags: a tap simply opens
      timer = setTimeout(() => { fired = true; timer = null; mineFlag(S, i); }, 450);
    });
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    b.addEventListener('pointermove', (ev) => { if (armed && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) { cancel(); armed = false; } });
    b.addEventListener('pointerleave', () => { cancel(); armed = false; }); b.addEventListener('pointercancel', () => { cancel(); armed = false; });
    b.addEventListener('pointerup', () => {
      if (S.mode === 'gentle') { if (armed) mineOpen(S, i); armed = false; return; }
      if (timer) { cancel(); mineOpen(S, i); }               // released before the hold time: open
      armed = false;
    });
    b.addEventListener('contextmenu', (ev) => { ev.preventDefault(); });
    S.boardEl.appendChild(b);
  }
  if (S.clockEl) { S.clockEl.textContent = '0:00'; S.flagEl.textContent = String(C.mines); }
}
const MSN = { gentle: 'Gentle', medium: 'Medium', hard: 'Hard' };

// ------------------------------------------------------------
// HIDDEN COMETS STATS
// Results, totals and best time per difficulty (tt:minesweeper:*, internal name kept on purpose).
// ------------------------------------------------------------
function mineRecord(S, result) {
  const m = S.mode, secs = (S.G && S.G.secs) || 0;
  Results.add('minesweeper', result, m, result === 'forfeited' ? {} : { s: secs });
  Totals.bump('minesweeper', result);
  if (result === 'won') { const b = Store.get('minesweeper:best', {}); if (!b[m] || secs < b[m]) { b[m] = secs; Store.set('minesweeper:best', b); } }
}
function paintMineStats(T) {
  T.statEls.forEach(x => x.remove()); T.statEls = [];
  const push = (e) => { T.statEls.push(e); return e; };
  const t = Totals.get('minesweeper'), best = Store.get('minesweeper:best', {});
  [[100, t.won], [322, t.lost], [545, t.forfeited]].forEach(([x, n]) => {
    push(addText(T, 'stat-num', x + 10, 768, 188, 56, 52, String(n)));
  });
  ['gentle', 'medium', 'hard'].forEach((m, i) => {
    push(addText(T, 'stat-num best', 335, MS_BT[i] + 2, 390, 44, 36, best[m] != null ? fmtClock(best[m]) : '\u2014'));
  });
  const list = Results.list('minesweeper').slice(-8).reverse();
  const ICON = { won: '\u2713', lost: '\u2717', forfeited: '\u2691', draw: '=' };
  list.filter(x => known(RESULT_WORD, x.r)).forEach((x, i) => {
    const y = 1178 + i * 49.7;
    const row = push(addText(T, 'stat-row', 178, y, 544, 46, 30, ''));
    row.innerHTML = '<span class="sr-l"><b class="r-' + x.r + '">' + ICON[x.r] + ' ' + RESULT_WORD[x.r] + '</b> \u00b7 ' + (MSN[known(MSN, x.d)] || '') + (x.s != null && x.r === 'won' ? ' \u00b7 ' + fmtClock(num(x.s)) : '') + '</span><span class="sr-r">' + fmtDay(num(x.t)) + '</span>';
  });
}
function mineTick(S) {
  const G = S.G;
  if (!G || G.over || !G.startAt) return;
  G.secs = Math.floor((nowMs() - G.startAt) / 1000);
  if (S.clockEl) S.clockEl.textContent = fmtClock(G.secs);
}
Ticker.fns.add(() => {
  ['gentle', 'medium', 'hard'].forEach(m => { const S = SCREENS['ms-' + m]; if (S && S.el.classList.contains('active')) mineTick(S); });
});

// ------------------------------------------------------------
// PLAYING
// paintCell draws one square; mineFlag toggles a flag; mineOpen opens a square; floodOpen opens empty areas.
// Gentle mode never loses: a comet just whooshes away.
// ------------------------------------------------------------
function paintCell(S, i) {
  const G = S.G, c = G.cells[i], b = S.boardEl.children[i]; if (!b) return;
  b.className = 'mscell' + (c.open ? ' open' : '') + (c.flag ? ' flag' : '') + (c.hit ? ' hit' : '') + (c.open && c.mine ? ' comet' : '');
  if (c.open) {
    if (c.mine) b.innerHTML = SVG_MINE;
    else if (c.adj) { b.innerHTML = ''; b.textContent = c.adj; b.style.color = MS_NUM[c.adj]; }
    else b.innerHTML = G.mode === 'gentle' ? SVG_GEM : '';
  } else b.innerHTML = c.flag ? SVG_FLAG : '';
}
function mineFlag(S, i) {
  const G = S.G; if (!G || G.over) return; const c = G.cells[i]; if (c.open) return;
  c.flag = !c.flag; G.flags += c.flag ? 1 : -1;
  if (S.flagEl) S.flagEl.textContent = String(MS[S.mode].mines - G.flags);
  paintCell(S, i);
}
function mineOpen(S, i) {
  const G = S.G; if (!G || G.over) return; const c = G.cells[i]; if (c.open || c.flag) return;
  if (!G.startAt) G.startAt = nowMs();
  if (c.mine) {
    if (G.mode === 'gentle') {      // gentle: the comet whooshes away, nothing is lost
      c.open = true; c.hazard = true; paintCell(S, i);
      const b = S.boardEl.children[i]; b.classList.add('bounce');
      toast(S, 'Whoosh! A comet flew by. Try another one');
      setTimeout(() => { c.open = false; paintCell(S, i); }, 900);
      return;
    }
    G.over = true; c.hit = true; mineTick(S); mineRecord(S, 'lost');
    G.cells.forEach((x, k) => { if (x.mine) { x.open = true; paintCell(S, k); } });
    setTimeout(() => showPanel(S, { icon: '☄️', title: 'Oh! A comet', text: 'That is okay. Try again?',
      buttons: [{ label: 'Hidden Comets', secondary: true, fn: () => go('ms-home') }, { label: 'Try Again', fn: () => newMineGame(S) }] }), 700);
    return;
  }
  floodOpen(S, i);
  const safe = G.n * G.n - MS[S.mode].mines;
  if (G.opened >= safe) {
    G.over = true; mineTick(S); mineRecord(S, 'won');
    const when = S.mode === 'gentle' ? 'You found every treasure!' : 'Time ' + fmtClock(G.secs);
    showPanel(S, { icon: S.mode === 'gentle' ? '🌟' : '🏆', title: S.mode === 'gentle' ? 'Sticker earned!' : 'Well done!', text: when,
      buttons: [{ label: 'Hidden Comets', secondary: true, fn: () => go('ms-home') }, { label: 'Play Again', fn: () => newMineGame(S) }] });
  }
}
function floodOpen(S, start) {
  const G = S.G, n = G.n, q = [start];
  while (q.length) {
    const i = q.pop(), c = G.cells[i]; if (c.open || c.mine) continue;
    if (c.flag) { c.flag = false; G.flags--; if (S.flagEl) S.flagEl.textContent = String(MS[S.mode].mines - G.flags); }
    c.open = true; G.opened++; paintCell(S, i);
    if (c.adj === 0) {
      const r = Math.floor(i / n), cc = i % n;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, c2 = cc + dc;
        if (rr >= 0 && c2 >= 0 && rr < n && c2 < n) q.push(rr * n + c2);
      }
    }
  }
}

/* ==========================================================================
   Chess engine: rules + computer opponent.
   Self-contained on purpose: the page copies this function's text into a
   background worker, so it must not use anything from outside itself.

   Board: array of 64 cells. Index = row*8 + column. Row 0 is rank 8 (top),
   column 0 is file a. A cell is null or a 2-letter text like 'wP' or 'bK'.
   ========================================================================== */
function makeChessEngine(){
  'use strict';
  var E = {};

  // ---------------------------------------------------------------- basics
  // Inside the engine a piece is a small number: type 1..6 (P N B R Q K),
  // plus 8 for black. 0 means empty.
  var TYPE_CH = ' PNBRQK';
  var VAL = [0, 100, 320, 330, 500, 900, 0];     // piece worth in centipawns
  var PHASE_W = [0, 0, 1, 1, 2, 4, 0];           // how much a piece counts toward "middle game"
  var INF = 1000000, MATE = 30000;
  var MAXP = 120;                                // deepest ply we ever allow
  var ABORT = { abort: true };                   // thrown when time runs out

  var BD = new Int8Array(64);                    // the board being worked on
  var turn = 0;                                  // 0 = white, 1 = black
  var castle = 0;                                // bits: 1 wK, 2 wQ, 4 bK, 8 bQ
  var ep = -1;                                   // en-passant target square or -1
  var half = 0;                                  // halfmove clock
  var ksq = [60, 4];                             // king squares
  var hlo = 0, hhi = 0;                          // position hash (two 32-bit halves)

  // ---------------------------------------------------------- lookup tables
  var DR = [-1, 1, 0, 0, -1, -1, 1, 1];          // ray directions: N S W E NW NE SW SE
  var DC = [0, 0, -1, 1, -1, 1, -1, 1];
  var KNIGHT = [], KING = [], RAYS = [];
  (function buildTables(){
    var kn = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    var sq, i, d, r, c, rr, cc, list;
    for (sq = 0; sq < 64; sq++) {
      r = sq >> 3; c = sq & 7;
      list = [];
      for (i = 0; i < 8; i++) {
        rr = r + kn[i][0]; cc = c + kn[i][1];
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) list.push(rr * 8 + cc);
      }
      KNIGHT[sq] = list;
      list = [];
      for (d = 0; d < 8; d++) {
        rr = r + DR[d]; cc = c + DC[d];
        if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) list.push(rr * 8 + cc);
      }
      KING[sq] = list;
      for (d = 0; d < 8; d++) {
        list = []; rr = r + DR[d]; cc = c + DC[d];
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { list.push(rr * 8 + cc); rr += DR[d]; cc += DC[d]; }
        RAYS[sq * 8 + d] = list;
      }
    }
  })();

  // Which castling rights survive when a piece moves from / to a square.
  var CM = new Int8Array(64);
  (function(){
    var i; for (i = 0; i < 64; i++) CM[i] = 15;
    CM[60] = 15 & ~3; CM[4] = 15 & ~12;          // king squares
    CM[63] = 15 & ~1; CM[56] = 15 & ~2;          // white rooks
    CM[7] = 15 & ~4;  CM[0] = 15 & ~8;           // black rooks
  })();

  // Random numbers for the position hash (fixed seed, so always the same).
  var ZL = new Int32Array(16 * 64), ZH = new Int32Array(16 * 64);
  var ZCL = new Int32Array(16), ZCH = new Int32Array(16);
  var ZTL = 0, ZTH = 0;
  (function(){
    var seed = 0x2545F491;
    function rnd(){ seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
    var i;
    for (i = 0; i < 16 * 64; i++) { ZL[i] = rnd(); ZH[i] = rnd(); }
    for (i = 0; i < 16; i++) { ZCL[i] = rnd(); ZCH[i] = rnd(); }
    ZTL = rnd(); ZTH = rnd();
  })();

  // Piece-square tables (white's view, row 0 = rank 8). Black uses them flipped.
  var PST = [null,
    [ 0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
      0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0 ],
    [ -50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
      -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50 ],
    [ -20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
      -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20 ],
    [ 0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0 ],
    [ -20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
      0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20 ],
    null ];
  var KMG = [ -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
              -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
              -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
               20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20 ];
  var KEG = [ -50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30,
              -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
              -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30,
              -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50 ];
  var PASSED = [0, 5, 12, 25, 50, 90];           // bonus by how far a pawn has advanced

  // ------------------------------------------------- moves packed in a number
  // bits 0-5 from, 6-11 to, 12-14 promotion type (2..5), 15-17 flag
  // flag: 1 en passant, 2 castle king side, 3 castle queen side, 4 pawn double step
  var PROMO_CH = { 2: 'n', 3: 'b', 4: 'r', 5: 'q' };
  var PROMO_NUM = { n: 2, b: 3, r: 4, q: 5 };

  // Undo information, one slot per move made.
  var U_cap = new Int8Array(512), U_castle = new Int8Array(512), U_ep = new Int16Array(512),
      U_half = new Int16Array(512), U_hlo = new Int32Array(512), U_hhi = new Int32Array(512);
  var sp = 0;

  function hx(code, sq){ hlo ^= ZL[code * 64 + sq]; hhi ^= ZH[code * 64 + sq]; }

  function computeHash(){
    hlo = 0; hhi = 0;
    for (var i = 0; i < 64; i++) if (BD[i]) hx(BD[i], i);
    if (turn) { hlo ^= ZTL; hhi ^= ZTH; }
    hlo ^= ZCL[castle]; hhi ^= ZCH[castle];
  }

  // Is square sq attacked by pieces of colour "by"?
  function attacked(sq, by){
    var r = sq >> 3, c = sq & 7, i, t, ray, p, d, base = by * 8, n;
    if (by === 0) {
      if (r < 7) { if (c > 0 && BD[sq + 7] === 1) return true; if (c < 7 && BD[sq + 9] === 1) return true; }
    } else {
      if (r > 0) { if (c > 0 && BD[sq - 9] === 9) return true; if (c < 7 && BD[sq - 7] === 9) return true; }
    }
    t = KNIGHT[sq]; n = t.length;
    for (i = 0; i < n; i++) if (BD[t[i]] === base + 2) return true;
    t = KING[sq]; n = t.length;
    for (i = 0; i < n; i++) if (BD[t[i]] === base + 6) return true;
    for (d = 0; d < 8; d++) {
      ray = RAYS[sq * 8 + d]; n = ray.length;
      for (i = 0; i < n; i++) {
        p = BD[ray[i]];
        if (p) {
          if (p === base + 5) return true;
          if (d < 4 ? p === base + 4 : p === base + 3) return true;
          break;
        }
      }
    }
    return false;
  }

  // Play a packed move on the working board (remembers how to undo it).
  function make(m){
    var from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 7;
    var us = turn, piece = BD[from], cap = BD[to], placed = piece, capSq = to, rf, rt;
    sp++;
    U_castle[sp] = castle; U_ep[sp] = ep; U_half[sp] = half; U_hlo[sp] = hlo; U_hhi[sp] = hhi;
    hlo ^= ZCL[castle]; hhi ^= ZCH[castle];
    if (flag === 1) { capSq = us === 0 ? to + 8 : to - 8; cap = BD[capSq]; BD[capSq] = 0; }
    U_cap[sp] = cap;
    if (cap) hx(cap, capSq);
    hx(piece, from);
    if (promo) placed = promo + us * 8;
    BD[from] = 0; BD[to] = placed; hx(placed, to);
    if (flag === 2 || flag === 3) {
      if (flag === 2) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
      hx(BD[rf], rf); BD[rt] = BD[rf]; BD[rf] = 0; hx(BD[rt], rt);
    }
    if ((piece & 7) === 6) ksq[us] = to;
    castle &= CM[from] & CM[to];
    ep = flag === 4 ? (from + to) >> 1 : -1;
    half = ((piece & 7) === 1 || cap) ? 0 : half + 1;
    turn ^= 1;
    hlo ^= ZTL; hhi ^= ZTH;
    hlo ^= ZCL[castle]; hhi ^= ZCH[castle];
  }

  function unmake(m){
    var from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 7;
    var us = turn ^ 1, piece = promo ? 1 + us * 8 : BD[to], rf, rt;
    turn = us;
    BD[from] = piece; BD[to] = 0;
    if (flag === 1) BD[us === 0 ? to + 8 : to - 8] = U_cap[sp]; else BD[to] = U_cap[sp];
    if (flag === 2 || flag === 3) {
      if (flag === 2) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
      BD[rf] = BD[rt]; BD[rt] = 0;
    }
    if ((piece & 7) === 6) ksq[us] = from;
    castle = U_castle[sp]; ep = U_ep[sp]; half = U_half[sp]; hlo = U_hlo[sp]; hhi = U_hhi[sp];
    sp--;
  }

  // ---------------------------------------------------------- move creation
  var MV = [], MS = [];                          // move lists and scores, one per ply
  (function(){ for (var i = 0; i < MAXP + 8; i++) { MV.push(new Int32Array(256)); MS.push(new Int32Array(256)); } })();

  // Make all pseudo-legal moves (may leave own king in check) for the side to move.
  // caps = true: only captures and promotions (used by the capture search).
  function genMoves(ply, caps){
    var mv = MV[ply], n = 0, us = turn, base = us * 8, from, p, t, r, c, to, q, i, k, list, d, ray, d0, d1, cc, dc;
    var fwd = us === 0 ? -8 : 8, lastRow = us === 0 ? 0 : 7, startRow = us === 0 ? 6 : 1;
    for (from = 0; from < 64; from++) {
      p = BD[from];
      if (!p || (p >> 3) !== us) continue;
      t = p & 7;
      if (t === 1) {
        r = from >> 3; c = from & 7;
        to = from + fwd;
        if (BD[to] === 0) {
          if ((to >> 3) === lastRow) {
            mv[n++] = from | (to << 6) | (5 << 12);
            if (!caps) { mv[n++] = from | (to << 6) | (4 << 12); mv[n++] = from | (to << 6) | (3 << 12); mv[n++] = from | (to << 6) | (2 << 12); }
          } else if (!caps) {
            mv[n++] = from | (to << 6);
            if (r === startRow && BD[to + fwd] === 0) mv[n++] = from | ((to + fwd) << 6) | (4 << 15);
          }
        }
        for (dc = -1; dc <= 1; dc += 2) {
          cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          to = from + fwd + dc; q = BD[to];
          if (q) {
            if ((q >> 3) !== us) {
              if ((to >> 3) === lastRow) {
                mv[n++] = from | (to << 6) | (5 << 12);
                if (!caps) { mv[n++] = from | (to << 6) | (4 << 12); mv[n++] = from | (to << 6) | (3 << 12); mv[n++] = from | (to << 6) | (2 << 12); }
              } else mv[n++] = from | (to << 6);
            }
          } else if (to === ep && BD[us === 0 ? to + 8 : to - 8] === (1 + (us ^ 1) * 8)) {
            mv[n++] = from | (to << 6) | (1 << 15);
          }
        }
      } else if (t === 2 || t === 6) {
        list = t === 2 ? KNIGHT[from] : KING[from];
        k = list.length;
        for (i = 0; i < k; i++) {
          to = list[i]; q = BD[to];
          if (q === 0) { if (!caps) mv[n++] = from | (to << 6); }
          else if ((q >> 3) !== us) mv[n++] = from | (to << 6);
        }
      } else {
        d0 = t === 3 ? 4 : 0; d1 = t === 4 ? 4 : 8;
        for (d = d0; d < d1; d++) {
          ray = RAYS[from * 8 + d]; k = ray.length;
          for (i = 0; i < k; i++) {
            to = ray[i]; q = BD[to];
            if (q === 0) { if (!caps) mv[n++] = from | (to << 6); }
            else { if ((q >> 3) !== us) mv[n++] = from | (to << 6); break; }
          }
        }
      }
    }
    if (!caps) {
      // Castling: rights, empty squares, king not in / through check.
      // (Landing square is checked later with all other moves.)
      if (us === 0) {
        if ((castle & 1) && BD[60] === 6 && BD[63] === 4 && !BD[61] && !BD[62] && !attacked(60, 1) && !attacked(61, 1))
          mv[n++] = 60 | (62 << 6) | (2 << 15);
        if ((castle & 2) && BD[60] === 6 && BD[56] === 4 && !BD[57] && !BD[58] && !BD[59] && !attacked(60, 1) && !attacked(59, 1))
          mv[n++] = 60 | (58 << 6) | (3 << 15);
      } else {
        if ((castle & 4) && BD[4] === 14 && BD[7] === 12 && !BD[5] && !BD[6] && !attacked(4, 0) && !attacked(5, 0))
          mv[n++] = 4 | (6 << 6) | (2 << 15);
        if ((castle & 8) && BD[4] === 14 && BD[0] === 12 && !BD[1] && !BD[2] && !BD[3] && !attacked(4, 0) && !attacked(3, 0))
          mv[n++] = 4 | (2 << 6) | (3 << 15);
      }
    }
    return n;
  }

  // All fully legal moves as a plain array of packed numbers.
  function legalList(){
    var n = genMoves(0, false), out = [], i, m, us = turn;
    var buf = new Int32Array(n);
    for (i = 0; i < n; i++) buf[i] = MV[0][i];
    for (i = 0; i < n; i++) {
      m = buf[i];
      make(m);
      if (!attacked(ksq[us], us ^ 1)) out.push(m);
      unmake(m);
    }
    return out;
  }

  function anyLegal(){
    return legalList().length > 0;
  }

  // ---------------------------------------------------- state <-> working board
  function codeOf(cell){
    if (!cell) return 0;
    return TYPE_CH.indexOf(cell.charAt(1)) + (cell.charAt(0) === 'b' ? 8 : 0);
  }
  function cellOf(code){
    if (!code) return null;
    return ((code >> 3) ? 'b' : 'w') + TYPE_CH.charAt(code & 7);
  }

  function load(s){
    var i, cs = s.castling || {};
    for (i = 0; i < 64; i++) BD[i] = codeOf(s.board[i]);
    turn = s.turn === 'b' ? 1 : 0;
    castle = (cs.wK ? 1 : 0) | (cs.wQ ? 2 : 0) | (cs.bK ? 4 : 0) | (cs.bQ ? 8 : 0);
    ep = (s.ep === null || s.ep === undefined) ? -1 : s.ep;
    half = s.halfmove | 0;
    ksq[0] = -1; ksq[1] = -1;
    for (i = 0; i < 64; i++) if ((BD[i] & 7) === 6) ksq[BD[i] >> 3] = i;
    sp = 0;
    computeHash();
  }

  function moveToObj(m){
    var o = { from: m & 63, to: (m >> 6) & 63 }, promo = (m >> 12) & 7, flag = (m >> 15) & 7;
    if (promo) o.promo = PROMO_CH[promo];
    if (flag === 1) o.flag = 'ep';
    else if (flag === 2) o.flag = 'castleK';
    else if (flag === 3) o.flag = 'castleQ';
    else if (flag === 4) o.flag = 'double';
    o.capture = (BD[o.to] !== 0) || flag === 1;
    return o;
  }

  // Is any legal en-passant capture available right now?
  function epCapturable(){
    if (ep < 0) return false;
    var us = turn, fwd = us === 0 ? -8 : 8, dc, from, ec = ep & 7, found = false, m;
    for (dc = -1; dc <= 1 && !found; dc += 2) {
      if (ec - dc < 0 || ec - dc > 7) continue;
      from = ep - fwd - dc;
      if (from < 0 || from > 63 || BD[from] !== us * 8 + 1) continue;
      if (BD[us === 0 ? ep + 8 : ep - 8] !== ((us ^ 1) * 8 + 1) || BD[ep]) continue;
      m = from | (ep << 6) | (1 << 15);
      make(m);
      if (!attacked(ksq[us], us ^ 1)) found = true;
      unmake(m);
    }
    return found;
  }

  // Text key of the working position (used for repetition counting).
  var KEYCH = '.PNBRQK??pnbrqk';
  function keyOfLoaded(){
    var s = '', i, cs = '';
    for (i = 0; i < 64; i++) s += BD[i] ? KEYCH.charAt(BD[i]) : '.';
    if (castle & 1) cs += 'K'; if (castle & 2) cs += 'Q'; if (castle & 4) cs += 'k'; if (castle & 8) cs += 'q';
    return s + (turn ? 'b' : 'w') + ' ' + (cs || '-') + ' ' + (epCapturable() ? String(ep) : '-');
  }

  // Rebuild the position hash from a key text (ignores en passant).
  function hashFromKey(k){
    var lo = 0, hi = 0, i, ch, code, parts, cb = 0;
    for (i = 0; i < 64; i++) {
      ch = k.charAt(i);
      if (ch === '.') continue;
      code = KEYCH.indexOf(ch);
      lo ^= ZL[code * 64 + i]; hi ^= ZH[code * 64 + i];
    }
    parts = k.substring(64).split(' ');
    if (parts[0].charAt(0) === 'b') { lo ^= ZTL; hi ^= ZTH; }
    if (parts[1].indexOf('K') >= 0) cb |= 1;
    if (parts[1].indexOf('Q') >= 0) cb |= 2;
    if (parts[1].indexOf('k') >= 0) cb |= 4;
    if (parts[1].indexOf('q') >= 0) cb |= 8;
    lo ^= ZCL[cb]; hi ^= ZCH[cb];
    return [lo, hi];
  }

  function exportState(prev, lastM, captured){
    var board = [], i, cs = [];
    for (i = 0; i < 64; i++) board.push(cellOf(BD[i]));
    return {
      board: board,
      turn: turn ? 'b' : 'w',
      castling: { wK: !!(castle & 1), wQ: !!(castle & 2), bK: !!(castle & 4), bQ: !!(castle & 8) },
      ep: ep < 0 ? null : ep,
      halfmove: half,
      fullmove: 1,
      keys: [],
      lastMove: lastM,
      captured: captured
    };
  }

  // ------------------------------------------------------------ public rules
  E.initialState = function(){
    var b = new Array(64), i, back = ['R','N','B','Q','K','B','N','R'];
    for (i = 0; i < 64; i++) b[i] = null;
    for (i = 0; i < 8; i++) { b[i] = 'b' + back[i]; b[8 + i] = 'bP'; b[48 + i] = 'wP'; b[56 + i] = 'w' + back[i]; }
    var s = {
      board: b, turn: 'w', castling: { wK: true, wQ: true, bK: true, bQ: true },
      ep: null, halfmove: 0, fullmove: 1, keys: [], lastMove: null, captured: null
    };
    load(s);
    s.keys = [keyOfLoaded()];
    return s;
  };

  E.legalMoves = function(state){
    load(state);
    var list = legalList(), out = [], i;
    for (i = 0; i < list.length; i++) out.push(moveToObj(list[i]));
    return out;
  };

  E.applyMove = function(state, move){
    load(state);
    var list = legalList(), i, m = -1, want = move.promo ? PROMO_NUM[String(move.promo).toLowerCase()] : 0;
    var from = move.from, to = move.to;
    // A pawn reaching the last row with no promotion given becomes a queen.
    if (!want && (BD[from] & 7) === 1 && ((to >> 3) === 0 || (to >> 3) === 7)) want = 5;
    for (i = 0; i < list.length; i++) {
      if ((list[i] & 63) === from && ((list[i] >> 6) & 63) === to && ((list[i] >> 12) & 7) === want) { m = list[i]; break; }
    }
    if (m < 0) throw new Error('Illegal move: ' + from + '->' + to);
    var obj = moveToObj(m), captured = null, flag = (m >> 15) & 7;
    if (flag === 1) captured = cellOf((turn ^ 1) * 8 + 1);
    else if (BD[to]) captured = cellOf(BD[to]);
    var mover = turn;
    make(m);
    var ns = exportState(state, obj, captured);
    ns.fullmove = (state.fullmove | 0 || 1) + (mover === 1 ? 1 : 0);
    var key = keyOfLoaded();
    ns.keys = (half === 0) ? [key] : (state.keys || []).concat([key]);
    return ns;
  };

  function insufficient(){
    var i, p, t, minors = 0, bishops = [], knightsOrOther = false;
    for (i = 0; i < 64; i++) {
      p = BD[i]; if (!p) continue;
      t = p & 7;
      if (t === 6) continue;
      if (t === 1 || t === 4 || t === 5) return false;
      minors++;
      if (t === 3) bishops.push({ side: p >> 3, colour: ((i >> 3) + (i & 7)) & 1 }); else knightsOrOther = true;
    }
    if (minors === 0) return true;                // K v K
    if (minors === 1) return true;                // K+B v K or K+N v K
    if (minors === 2 && !knightsOrOther && bishops.length === 2 &&
        bishops[0].side !== bishops[1].side && bishops[0].colour === bishops[1].colour) return true;
    return false;
  }

  E.status = function(state){
    load(state);
    var us = turn, ks = ksq[us];
    var inCheck = ks >= 0 && attacked(ks, us ^ 1);
    var res = { over: false, result: null, winner: null, inCheck: inCheck, claimable: null, kingSquare: ks };
    if (!anyLegal()) {
      res.over = true;
      if (inCheck) { res.result = 'checkmate'; res.winner = us === 0 ? 'b' : 'w'; }
      else res.result = 'stalemate';
      return res;
    }
    if (insufficient()) { res.over = true; res.result = 'insufficient'; return res; }
    var cur = keyOfLoaded(), keys = state.keys || [], count = 0, i;
    for (i = 0; i < keys.length; i++) if (keys[i] === cur) count++;
    if (!keys.length || keys[keys.length - 1] !== cur) count++;
    if (count >= 5) { res.over = true; res.result = 'fivefold'; return res; }
    if (half >= 150) { res.over = true; res.result = 'seventyfive'; return res; }
    if (count >= 3) res.claimable = 'threefold';
    else if (half >= 100) res.claimable = 'fifty';
    return res;
  };

  // Count positions reachable in "depth" moves (used to test the rules).
  function perftRec(depth, ply){
    if (depth === 0) return 1;
    var n = genMoves(ply, false), total = 0, i, m, us = turn, local = new Int32Array(n);
    for (i = 0; i < n; i++) local[i] = MV[ply][i];
    for (i = 0; i < n; i++) {
      m = local[i];
      make(m);
      if (!attacked(ksq[us], us ^ 1)) total += depth === 1 ? 1 : perftRec(depth - 1, ply + 1);
      unmake(m);
    }
    return total;
  }
  E.perft = function(state, depth){ load(state); return perftRec(depth, 0); };

  // ------------------------------------------------------------- evaluation
  function passedBonus(i, c){
    var r = i >> 3, col = i & 7, enemy = c ? 1 : 9, rr, cc, adv;
    if (c === 0) {
      for (rr = r - 1; rr >= 1; rr--) for (cc = col - 1; cc <= col + 1; cc++) if (cc >= 0 && cc < 8 && BD[rr * 8 + cc] === enemy) return 0;
      adv = 6 - r;
    }
    else {
      for (rr = r + 1; rr <= 6; rr++) for (cc = col - 1; cc <= col + 1; cc++) if (cc >= 0 && cc < 8 && BD[rr * 8 + cc] === enemy) return 0;
      adv = r - 1;
    }
    return adv > 0 && adv < 6 ? PASSED[adv] : 0;
  }

  // Score for the side to move (positive = good for them), in centipawns.
  function evaluate(){
    var sc = 0, phase = 0, tot0 = 0, tot1 = 0, b0 = 0, b1 = 0, i, p, t, c, v;
    for (i = 0; i < 64; i++) {
      p = BD[i]; if (!p) continue;
      t = p & 7; if (t === 6) continue;
      c = p >> 3;
      v = VAL[t] + PST[t][c ? i ^ 56 : i];
      if (t === 1) v += passedBonus(i, c);
      else { phase += PHASE_W[t]; if (t === 3) { if (c) b1++; else b0++; } }
      if (c) { tot1 += VAL[t]; sc -= v; } else { tot0 += VAL[t]; sc += v; }
    }
    if (phase > 24) phase = 24;
    var wk = ksq[0], bk = ksq[1];
    if (wk >= 0) sc += ((KMG[wk] * phase + KEG[wk] * (24 - phase)) / 24) | 0;
    if (bk >= 0) sc -= ((KMG[bk ^ 56] * phase + KEG[bk ^ 56] * (24 - phase)) / 24) | 0;
    if (b0 >= 2) sc += 30;
    if (b1 >= 2) sc -= 30;
    // Endgame: the side far ahead should drive the lone king to the edge and bring its king close.
    var diff = tot0 - tot1;
    if (phase <= 14 && (diff >= 300 || diff <= -300) && wk >= 0 && bk >= 0) {
      var win = diff > 0 ? wk : bk, lose = diff > 0 ? bk : wk;
      var lr = lose >> 3, lc = lose & 7;
      var cd = Math.max(3 - lr, lr - 4) + Math.max(3 - lc, lc - 4);
      var md = Math.abs((win >> 3) - lr) + Math.abs((win & 7) - lc);
      var bonus = cd * 14 + (14 - md) * 5;
      sc += diff > 0 ? bonus : -bonus;
    }
    return (turn ? -sc : sc) + 10;
  }

  // ----------------------------------------------------------------- search
  var TTBITS = 19, TTSIZE = 1 << TTBITS, TTMASK = TTSIZE - 1;
  var TTH = null, TTS = null, TTM = null, TTD = null, TTF = null;
  var killers = [], history = null;
  var PL = new Int32Array(1024), PH = new Int32Array(1024);   // hashes of positions on the path
  var histLen = 0, nodes = 0, deadline = 0, abortable = false;
  var ORDV = [0, 1, 3, 3, 5, 9, 10];

  function scoreMoves(ply, n, ttMove){
    var mv = MV[ply], ms = MS[ply], i, m, from, to, flag, promo, v, s, k0 = killers[ply];
    for (i = 0; i < n; i++) {
      m = mv[i]; from = m & 63; to = (m >> 6) & 63; flag = (m >> 15) & 7; promo = (m >> 12) & 7;
      if (m === ttMove) s = 2000000;
      else if (BD[to] || flag === 1) {
        v = flag === 1 ? 1 : BD[to] & 7;
        s = 1000000 + ORDV[v] * 16 - (BD[from] & 7) + (promo ? 500 : 0);
      } else if (promo) s = 900000 + promo;
      else if (k0[0] === m) s = 800000;
      else if (k0[1] === m) s = 790000;
      else s = history[turn * 4096 + from * 64 + to];
      ms[i] = s;
    }
  }

  function pickNext(ply, i, n){
    var mv = MV[ply], ms = MS[ply], best = i, j, t;
    for (j = i + 1; j < n; j++) if (ms[j] > ms[best]) best = j;
    if (best !== i) { t = mv[i]; mv[i] = mv[best]; mv[best] = t; t = ms[i]; ms[i] = ms[best]; ms[best] = t; }
    return mv[i];
  }

  // Captures-only search so we don't stop in the middle of a trade.
  function qsearch(alpha, beta, ply){
    nodes++;
    if ((nodes & 1023) === 0 && abortable && Date.now() > deadline) throw ABORT;
    if (ply >= MAXP) return evaluate();
    var stand = evaluate();
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    var n = genMoves(ply, true), i, m, sc, us = turn, to, flag, gain;
    scoreMoves(ply, n, 0);
    for (i = 0; i < n; i++) {
      m = pickNext(ply, i, n);
      to = (m >> 6) & 63; flag = (m >> 15) & 7;
      gain = flag === 1 ? 100 : VAL[BD[to] & 7];
      if (!((m >> 12) & 7) && stand + gain + 200 < alpha) continue;   // hopeless capture
      make(m);
      if (attacked(ksq[us], us ^ 1)) { unmake(m); continue; }
      sc = -qsearch(-beta, -alpha, ply + 1);
      unmake(m);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function search(depth, alpha, beta, ply){
    nodes++;
    if ((nodes & 1023) === 0 && abortable && Date.now() > deadline) throw ABORT;
    if (half >= 100) return 0;
    var idx = histLen + ply, j, lim = idx - half;
    for (j = idx - 2; j >= lim && j >= 0; j -= 2) if (PL[j] === hlo && PH[j] === hhi) return 0;   // repeated position
    PL[idx] = hlo; PH[idx] = hhi;
    if (ply >= MAXP - 2) return evaluate();
    var us = turn;
    var inCheck = attacked(ksq[us], us ^ 1);
    if (inCheck && ply < 64) depth++;
    if (depth <= 0) return qsearch(alpha, beta, ply);

    // transposition table lookup
    var alpha0 = alpha, ttMove = 0, ti = hlo & TTMASK, ts;
    if (TTF[ti] !== 0 && TTH[ti] === hhi) {
      ttMove = TTM[ti];
      if (TTD[ti] >= depth) {
        ts = TTS[ti];
        if (ts > MATE - 200) ts -= ply; else if (ts < -MATE + 200) ts += ply;
        if (TTF[ti] === 1) return ts;
        if (TTF[ti] === 2) { if (ts >= beta) return ts; }
        else if (ts <= alpha) return ts;
      }
    }

    var n = genMoves(ply, false), i, m, sc, legal = 0, best = -INF, bestM = 0, quiet, red, pr;
    scoreMoves(ply, n, ttMove);
    for (i = 0; i < n; i++) {
      m = pickNext(ply, i, n);
      quiet = !BD[(m >> 6) & 63] && ((m >> 15) & 7) !== 1 && !((m >> 12) & 7);
      make(m);
      if (attacked(ksq[us], us ^ 1)) { unmake(m); continue; }
      legal++;
      if (legal === 1) sc = -search(depth - 1, -beta, -alpha, ply + 1);
      else {
        red = (depth >= 3 && legal > 4 && quiet && !inCheck) ? 1 : 0;
        sc = -search(depth - 1 - red, -alpha - 1, -alpha, ply + 1);
        if (sc > alpha && (red || sc < beta)) sc = -search(depth - 1, -beta, -alpha, ply + 1);
      }
      unmake(m);
      if (sc > best) {
        best = sc; bestM = m;
        if (sc > alpha) {
          alpha = sc;
          if (alpha >= beta) {
            if (quiet) {
              if (killers[ply][0] !== m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
              pr = turn * 4096 + (m & 63) * 64 + ((m >> 6) & 63);
              if (history[pr] < 60000) history[pr] += depth * depth;
            }
            break;
          }
        }
      }
    }
    if (legal === 0) return inCheck ? -MATE + ply : 0;

    ts = best;
    if (ts > MATE - 200) ts += ply; else if (ts < -MATE + 200) ts -= ply;
    TTH[ti] = hhi; TTS[ti] = ts; TTM[ti] = bestM; TTD[ti] = depth > 100 ? 100 : depth;
    TTF[ti] = best <= alpha0 ? 3 : (best >= beta ? 2 : 1);
    return best;
  }

  // ------------------------------------------------------------- bestMove
  var LEVELS = {
    easy:   { budget: 800 },
    medium: { budget: 2500 },
    hard:   { budget: 1500 }
  };

  function pickRandom(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  E.bestMove = function(state, level, opts){
    load(state);
    var rootInts = legalList();
    if (rootInts.length === 0) return null;
    var objs = [], i;
    for (i = 0; i < rootInts.length; i++) objs.push(moveToObj(rootInts[i]));
    if (rootInts.length === 1) return objs[0];
    var chosen;
    try { chosen = think(state, level, opts || {}, rootInts); }
    catch (e) { chosen = -1; }                     // never fail: fall back below
    var idx = rootInts.indexOf(chosen);
    if (idx < 0) idx = Math.floor(Math.random() * rootInts.length);
    return objs[idx];
  };

  function think(state, level, opts, rootInts){
    if (level !== 'easy' && level !== 'hard') level = 'medium';
    var budget = (typeof opts.timeMs === 'number' && opts.timeMs > 0) ? opts.timeMs : LEVELS[level].budget;
    var start = Date.now();
    deadline = start + budget;
    var maxDepth, allScores;
    if (level === 'hard') { maxDepth = 5; allScores = false; }
    else if (level === 'medium') { maxDepth = 3; allScores = true; }
    else { maxDepth = Math.random() < 0.5 ? 1 : 2; allScores = true; }

    // Reset search memory.
    if (!TTH) {
      TTH = new Int32Array(TTSIZE);
      TTS = new Int32Array(TTSIZE);
      TTM = new Int32Array(TTSIZE);
      TTD = new Int8Array(TTSIZE);
      TTF = new Int8Array(TTSIZE);
    }
    TTF.fill(0);
    history = new Int32Array(2 * 4096);
    killers = [];
    for (var k = 0; k < MAXP + 8; k++) killers.push([0, 0]);

    // History of earlier positions (for repetition), then the root itself.
    var keys = state.keys || [], hs, j;
    var cur = keyOfLoaded();
    var upto = keys.length;
    if (upto && keys[upto - 1] === cur) upto--;
    var from0 = Math.max(0, upto - 300);
    histLen = 0;
    for (j = from0; j < upto; j++) { hs = hashFromKey(keys[j]); PL[histLen] = hs[0]; PH[histLen] = hs[1]; histLen++; }
    PL[histLen] = hlo; PH[histLen] = hhi;

    nodes = 0;
    var order = rootInts.slice();                 // moves, best-first from earlier rounds
    var scores = null;                            // {move: score} of last completed round
    var bestMove = order[0], d, us = turn, ri, m, sc, alpha, curBest, curBestScore, cur2, aborted = false;
    var lastScores = null;

    for (d = 1; d <= maxDepth; d++) {
      abortable = d > 1;
      alpha = -INF; curBest = 0; curBestScore = -INF; cur2 = [];
      try {
        for (ri = 0; ri < order.length; ri++) {
          m = order[ri];
          make(m);
          if (allScores) sc = -search(d - 1, -INF, INF, 1);
          else sc = -search(d - 1, -INF, -alpha, 1);
          unmake(m);
          cur2.push({ m: m, s: sc });
          if (sc > curBestScore) { curBestScore = sc; curBest = m; if (sc > alpha) alpha = sc; }
        }
      } catch (e) {
        if (e !== ABORT) throw e;
        aborted = true;
      }
      if (aborted) {
        // Use the partly finished round only in "best move" mode, where the
        // old best move was searched first so any better move found is real.
        if (!allScores && curBest) bestMove = curBest;
        break;
      }
      lastScores = cur2;
      bestMove = curBest;
      cur2.sort(function(a, b){ return b.s - a.s; });
      order = cur2.map(function(x){ return x.m; });
      if (!allScores && curBestScore > MATE - 100) break;         // forced mate found
      if (Date.now() - start > budget * 0.55) break;               // not enough time for another round
    }
    abortable = false;

    if (level === 'hard' || !lastScores) return bestMove;

    // Easy / medium: choose among near-equal moves, easy sometimes plays a weaker one.
    var sorted = lastScores.slice().sort(function(a, b){ return b.s - a.s; });
    var top = sorted[0].s, pool = [], x;
    if (level === 'medium') {
      for (x = 0; x < sorted.length; x++) if (sorted[x].s >= top - 10) pool.push(sorted[x].m);
      return pickRandom(pool);
    }
    if (Math.random() < 0.25) {
      for (x = 1; x < sorted.length; x++) if (sorted[x].s >= top - 300) pool.push(sorted[x].m);
      if (pool.length) return pickRandom(pool);
    }
    for (x = 0; x < sorted.length; x++) if (sorted[x].s >= top - 50) pool.push(sorted[x].m);
    return pickRandom(pool);
  }

  E.pieceValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  return E;
}
if (typeof module !== 'undefined') module.exports = makeChessEngine;

/* =====================================================================
   INTERNATIONAL CHECKERS (10x10 draughts, FMJD rules) - engine + computer
   ---------------------------------------------------------------------
   Self-contained on purpose: the browser calls makeCheckersEngine.toString()
   to rebuild this inside a Web Worker. No outside references allowed here.

   Board: index = r*10 + c.  r=0 is the TOP row (Black's home), c=0 is the
   left column.  Dark (playable) squares have (r+c)%2 === 1.
   White starts on rows 6-9 and moves UP (towards r=0); Black starts on
   rows 0-3 and moves DOWN.  White moves first.
   ===================================================================== */
function makeCheckersEngine(){
  'use strict';
  const E = {};

  // ---------- 1. Geometry: the four diagonal directions from every square ----------
  // Direction numbers: 0=up-left, 1=up-right, 2=down-left, 3=down-right.
  // White men use 0,1 (forward = up). Black men use 2,3 (forward = down).
  const DR = [-1, -1, 1, 1], DC = [-1, 1, -1, 1];
  const RAYS = [];            // RAYS[square][direction] = list of squares in that direction
  for (let sq = 0; sq < 100; sq++) {
    const r = (sq / 10) | 0, c = sq % 10, rays = [];
    for (let d = 0; d < 4; d++) {
      const ray = [];
      let rr = r + DR[d], cc = c + DC[d];
      while (rr >= 0 && rr < 10 && cc >= 0 && cc < 10) { ray.push(rr * 10 + cc); rr += DR[d]; cc += DC[d]; }
      rays.push(ray);
    }
    RAYS.push(rays);
  }

  // Internal piece codes (fast): 0 empty, 1 white man, 2 white king, -1 black man, -2 black king.
  // The sign is the side (+1 white, -1 black).
  const TO_INT = { w: 1, W: 2, b: -1, B: -2 };
  const TO_CHR = { '1': 'w', '2': 'W', '-1': 'b', '-2': 'B' };
  function toInt(board) {
    const b = new Int8Array(100);
    for (let i = 0; i < 100; i++) { const p = board[i]; b[i] = p ? TO_INT[p] : 0; }
    return b;
  }
  function sideOf(turn) { return turn === 'w' ? 1 : -1; }

  // A "position key" = the board as text plus whose turn it is. Used for repetition.
  function keyOf(board, turn) {
    let s = '';
    for (let i = 0; i < 100; i++) s += board[i] || '.';
    return s + turn;
  }

  // ---------- 2. Move generation ----------
  // Shared scratch variables for the generator (it is not re-entrant, but that is fine).
  const CF = new Uint8Array(100);   // CF[sq]=1 while that enemy piece is already captured in the current sequence
  let gB, gSide, gBest, gOut, gPath, gCap, gKing, gPromoRow;

  // Record a landing during a capture: mark the piece captured, continue from the new square, undo.
  function land(captSq, to) {
    CF[captSq] = 1; gCap.push(captSq); gPath.push(to);
    rec(to);
    gPath.pop(); gCap.pop(); CF[captSq] = 0;
  }

  // Depth-first search of capture sequences from square `cur`.
  // Captured pieces STAY on the board until the sequence ends (they block, and cannot be jumped twice).
  // The moving piece's own start square is emptied first, so it may pass over it again.
  function rec(cur) {
    let found = false;
    const rays = RAYS[cur];
    for (let d = 0; d < 4; d++) {
      const ray = rays[d], n = ray.length;
      if (n === 0) continue;
      if (!gKing) {
        // Man: jumps an adjacent enemy (any direction, forward or backward) onto the empty square behind it.
        const s = ray[0];
        if (n > 1 && gB[s] * gSide < 0 && CF[s] === 0 && gB[ray[1]] === 0) { found = true; land(s, ray[1]); }
      } else {
        // Flying king: slide over empty squares, jump the first piece met if it is an uncaptured enemy,
        // then it may land on ANY empty square beyond it (stopping at the first non-empty square).
        let i = 0;
        while (i < n && gB[ray[i]] === 0) i++;
        if (i >= n) continue;
        const s = ray[i];
        if (gB[s] * gSide < 0 && CF[s] === 0) {
          for (let j = i + 1; j < n && gB[ray[j]] === 0; j++) { found = true; land(s, ray[j]); }
        }
      }
    }
    // Sequence is finished only when nothing more can be captured. Keep it only if it is (one of) the longest.
    if (!found && gCap.length > 0) {
      const len = gCap.length;
      if (len < gBest) return;
      if (len > gBest) { gBest = len; gOut.length = 0; }
      const to = cur;
      // A man promotes only if the sequence ENDS on the last row (passing through does not count).
      gOut.push({ from: gPath[0], to: to, path: gPath.slice(), captured: gCap.slice(), isCapture: true,
                  promotes: !gKing && ((to / 10) | 0) === gPromoRow });
    }
  }

  // All legal moves for `side` on internal board b. If any capture exists, only the maximum-capture ones.
  function gen(b, side) {
    gB = b; gSide = side; gBest = 0; gOut = []; gPromoRow = side === 1 ? 0 : 9;
    for (let sq = 0; sq < 100; sq++) {
      const p = b[sq];
      if (p * side <= 0) continue;
      gKing = (p === 2 || p === -2);
      b[sq] = 0; gPath = [sq]; gCap = [];
      rec(sq);
      b[sq] = p;
    }
    if (gBest > 0) return gOut;       // capturing is compulsory (and the maximum must be taken)
    const out = [];
    for (let sq = 0; sq < 100; sq++) {
      const p = b[sq];
      if (p * side <= 0) continue;
      if (p === 1 || p === -1) {
        const d0 = side === 1 ? 0 : 2;
        for (let d = d0; d < d0 + 2; d++) {
          const ray = RAYS[sq][d];
          if (ray.length && b[ray[0]] === 0) {
            out.push({ from: sq, to: ray[0], path: [sq, ray[0]], captured: [], isCapture: false,
                       promotes: ((ray[0] / 10) | 0) === gPromoRow });
          }
        }
      } else {
        for (let d = 0; d < 4; d++) {
          const ray = RAYS[sq][d];
          for (let k = 0; k < ray.length && b[ray[k]] === 0; k++) {
            out.push({ from: sq, to: ray[k], path: [sq, ray[k]], captured: [], isCapture: false, promotes: false });
          }
        }
      }
    }
    return out;
  }

  // ---------- 3. Public rules API ----------
  // Count material and decide whether the 3v1 / 2v1 endgame draw situation exists.
  // 3v1: one side has exactly 3 pieces (>=1 king) vs a lone king.
  // 2v1: one side has 2 or fewer pieces (>=1 king) vs a lone king (so 1 king v 1 king counts here).
  function situation(board) {
    let wn = 0, wk = 0, bn = 0, bk = 0;
    for (let i = 0; i < 100; i++) {
      const p = board[i];
      if (p === 'w') wn++; else if (p === 'W') { wn++; wk++; }
      else if (p === 'b') bn++; else if (p === 'B') { bn++; bk++; }
    }
    function test(sn, sk, ln, lk) { // strong side counts, lone side counts
      if (ln === 1 && lk === 1 && sk >= 1 && sn >= 1 && sn <= 3) return sn === 3 ? '3v1' : '2v1';
      return null;
    }
    return test(wn, wk, bn, bk) || test(bn, bk, wn, wk);
  }

  // Build a state from a board (and side to move). Handy for tests and puzzles.
  E.stateFrom = function (board, turn) {
    const bd = board.slice();
    for (let i = 0; i < 100; i++) if (!bd[i]) bd[i] = 0;
    return { board: bd, turn: turn || 'w', keys: [keyOf(bd, turn || 'w')], kingMoves: { w: 0, b: 0 },
             lastMove: null, endgame: null, moveNo: 0 };
  };

  E.initialState = function () {
    const board = new Array(100).fill(0);
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r <= 3) board[r * 10 + c] = 'b';
      else if (r >= 6) board[r * 10 + c] = 'w';
    }
    return E.stateFrom(board, 'w');
  };

  E.legalMoves = function (state) {
    return gen(toInt(state.board), sideOf(state.turn));
  };

  E.movablePieces = function (state) {
    const seen = {}, out = [];
    E.legalMoves(state).forEach(function (m) { if (!seen[m.from]) { seen[m.from] = 1; out.push(m.from); } });
    return out;
  };

  // Returns a NEW state; the input is never changed.
  // Draw bookkeeping done here:
  //  - keys: position keys since the last irreversible move (a capture or a man move clears the list).
  //  - kingMoves[side]: that side's consecutive king moves; reset to 0 by that side's man move;
  //    a capture by either side resets both to 0.
  //  - endgame: see situation(). Each ply after the situation first appears adds 1 to count.
  //    When the situation first appears count=0. If the situation kind changes (or ends) it restarts / clears.
  //    Draw when count reaches 32 plies (3v1) or 10 plies (2v1).
  E.applyMove = function (state, move) {
    const board = state.board.slice();
    const mover = state.turn;
    const piece = board[move.from];
    const wasMan = piece === 'w' || piece === 'b';
    board[move.from] = 0;
    for (let i = 0; i < move.captured.length; i++) board[move.captured[i]] = 0;
    board[move.to] = move.promotes ? piece.toUpperCase() : piece;
    const next = mover === 'w' ? 'b' : 'w';
    const km = { w: state.kingMoves.w, b: state.kingMoves.b };
    if (move.isCapture) { km.w = 0; km.b = 0; }
    else if (wasMan) km[mover] = 0;
    else km[mover] = km[mover] + 1;
    const key = keyOf(board, next);
    const keys = (move.isCapture || wasMan) ? [key] : state.keys.concat([key]);
    const kind = situation(board);
    let endgame = null;
    if (kind) {
      endgame = (state.endgame && state.endgame.kind === kind)
        ? { kind: kind, count: state.endgame.count + 1 } : { kind: kind, count: 0 };
    }
    return { board: board, turn: next, keys: keys, kingMoves: km, lastMove: move, endgame: endgame,
             moveNo: state.moveNo + 1 };
  };

  E.status = function (state) {
    const moves = E.legalMoves(state);
    if (moves.length === 0) {
      return { over: true, result: 'loss', winner: state.turn === 'w' ? 'b' : 'w', reason: 'nomoves', mustCapture: false };
    }
    const mustCapture = moves[0].isCapture;
    const cur = keyOf(state.board, state.turn);
    let reps = 0;
    for (let i = 0; i < state.keys.length; i++) if (state.keys[i] === cur) reps++;
    let reason = null;
    if (reps >= 3) reason = 'threefold';
    else if (state.kingMoves.w >= 25 && state.kingMoves.b >= 25) reason = 'kings25';
    else if (state.endgame && state.endgame.kind === '3v1' && state.endgame.count >= 32) reason = '3v1';
    else if (state.endgame && state.endgame.kind === '2v1' && state.endgame.count >= 10) reason = '2v1';
    if (reason) return { over: true, result: 'draw', winner: null, reason: reason, mustCapture: mustCapture };
    return { over: false, result: null, winner: null, reason: null, mustCapture: mustCapture };
  };

  // ---------- 4. Computer opponent ----------
  const INF = 1000000, MATE = 100000;
  const ABORT = { abort: true };

  // Random numbers for position hashing (fixed seed so it is repeatable).
  let seed = 123456789;
  function rand32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
  const Z1 = [], Z2 = [];
  for (let i = 0; i < 500; i++) { Z1.push(rand32()); Z2.push(rand32()); }
  const ZS1 = rand32(), ZS2 = rand32();   // mixed in when Black is to move

  // Search state (module-level inside the factory for speed).
  let B = null, h1 = 0, h2 = 0, nodes = 0, deadline = 0, timed = false, maxPly = 0;
  let TT = new Map();
  let HIST = new Int32Array(10000);
  const UP = [], UCV = [];     // undo info per ply

  function hashBoard() {
    h1 = 0; h2 = 0;
    for (let i = 0; i < 100; i++) if (B[i]) { h1 ^= Z1[i * 5 + B[i] + 2]; h2 ^= Z2[i * 5 + B[i] + 2]; }
  }
  function ttKey(side) {
    const a = (side === 1 ? h1 : (h1 ^ ZS1)) >>> 0;
    const b = (side === 1 ? h2 : (h2 ^ ZS2)) & 0x1FFFFF;
    return a * 2097152 + b;
  }

  // Play a move on the search board (and update the hash). Undo info is kept per ply.
  function make(m, side, ply) {
    const from = m.from, to = m.to, p = B[from], cv = [];
    h1 ^= Z1[from * 5 + p + 2]; h2 ^= Z2[from * 5 + p + 2];
    for (let i = 0; i < m.captured.length; i++) {
      const c = m.captured[i], v = B[c];
      cv.push(v); B[c] = 0; h1 ^= Z1[c * 5 + v + 2]; h2 ^= Z2[c * 5 + v + 2];
    }
    B[from] = 0;
    const np = m.promotes ? 2 * side : p;
    B[to] = np; h1 ^= Z1[to * 5 + np + 2]; h2 ^= Z2[to * 5 + np + 2];
    UP[ply] = p; UCV[ply] = cv;
  }
  function unmake(m, ply) {
    B[m.to] = 0; B[m.from] = UP[ply];
    const cv = UCV[ply];
    for (let i = 0; i < m.captured.length; i++) B[m.captured[i]] = cv[i];
  }

  // Static evaluation from White's point of view (positive = good for White).
  // Material (man 100, king 300) + advancement + centre + back-rank guard + simple mobility.
  function evaluate() {
    let s = 0;
    for (let sq = 0; sq < 100; sq++) {
      const p = B[sq];
      if (p === 0) continue;
      const r = (sq / 10) | 0, c = sq % 10;
      const centre = (r >= 3 && r <= 6 && c >= 3 && c <= 6);
      let v;
      if (p === 1) {            // white man
        v = 100 + (9 - r) * 3;
        if (r === 9) v += 6;                  // back-rank guard
        if (centre) v += 4;
        const rays = RAYS[sq];
        if (rays[0].length && B[rays[0][0]] === 0) v += 2;   // free forward squares = mobility
        if (rays[1].length && B[rays[1][0]] === 0) v += 2;
        s += v;
      } else if (p === -1) {    // black man
        v = 100 + r * 3;
        if (r === 0) v += 6;
        if (centre) v += 4;
        const rays = RAYS[sq];
        if (rays[2].length && B[rays[2][0]] === 0) v += 2;
        if (rays[3].length && B[rays[3][0]] === 0) v += 2;
        s -= v;
      } else {                  // king
        v = 300 + (centre ? 4 : 0);
        const rays = RAYS[sq];
        for (let d = 0; d < 4; d++) if (rays[d].length && B[rays[d][0]] === 0) v += 2;
        s += p > 0 ? v : -v;
      }
    }
    return s;
  }

  // Negamax alpha-beta. Returns score for `side` to move.
  // Forced captures are always searched even when depth runs out (quiescence), capped by maxPly.
  function search(side, depth, alpha, beta, ply) {
    if ((++nodes & 511) === 0 && timed && Date.now() > deadline) throw ABORT;
    const moves = gen(B, side);
    if (moves.length === 0) return -(MATE - ply);         // no move = loss
    const cap = moves[0].isCapture;
    if ((depth <= 0 && !cap) || ply >= maxPly) return side * evaluate();
    let hashMove = -1, key = 0;
    const a0 = alpha;
    if (depth > 0) {
      key = ttKey(side);
      const e = TT.get(key);
      if (e) {
        hashMove = e.mv;
        if (e.d >= depth && e.s < MATE - 200 && e.s > -MATE + 200) {
          if (e.f === 0) return e.s;
          if (e.f === 1 && e.s >= beta) return e.s;
          if (e.f === 2 && e.s <= alpha) return e.s;
        }
      }
    }
    const n = moves.length;
    if (n > 1) {   // order: hash move, promotions, history
      for (let i = 0; i < n; i++) {
        const m = moves[i];
        m.o = (m.from * 100 + m.to === hashMove ? 100000 : 0) + (m.promotes ? 5000 : 0) + HIST[m.from * 100 + m.to];
      }
      moves.sort(function (x, y) { return y.o - x.o; });
    }
    let bestS = -INF, bestMv = -1;
    for (let i = 0; i < n; i++) {
      const m = moves[i];
      const s1 = h1, s2 = h2;
      make(m, side, ply);
      const nd = (n === 1 && depth > 0) ? depth : depth - 1;     // forced single reply: extend
      const s = -search(-side, nd, -beta, -alpha, ply + 1);
      unmake(m, ply); h1 = s1; h2 = s2;
      if (s > bestS) { bestS = s; bestMv = m.from * 100 + m.to; }
      if (s > alpha) alpha = s;
      if (alpha >= beta) { if (!cap && depth > 0) HIST[m.from * 100 + m.to] += depth * depth; break; }
    }
    if (depth > 0) {
      if (TT.size > 400000) TT.clear();
      TT.set(key, { d: depth, s: bestS, f: bestS <= a0 ? 2 : (bestS >= beta ? 1 : 0), mv: bestMv });
    }
    return bestS;
  }

  // Search every root move at `depth`. fullWindow=true gives exact scores for all moves (used by 'easy').
  // Returns Map(move -> score). Throws ABORT if time runs out.
  function rootSearch(rootMoves, side, depth, fullWindow, repSet) {
    maxPly = depth + 10;
    const scores = new Map();
    let alpha = -INF;
    for (let i = 0; i < rootMoves.length; i++) {
      const m = rootMoves[i];
      let s;
      if (repSet.has(m)) s = 0;                           // would be a threefold-repetition draw
      else {
        const s1 = h1, s2 = h2;
        make(m, side, 0);
        s = -search(-side, depth - 1, -INF, fullWindow ? INF : -alpha, 1);
        unmake(m, 0); h1 = s1; h2 = s2;
      }
      scores.set(m, s);
      if (!fullWindow && s > alpha) alpha = s;
    }
    return scores;
  }

  // Pick a move. level: 'easy' | 'medium' | 'hard'. opts.timeMs = time budget; opts.random = custom RNG.
  E.bestMove = function (state, level, opts) {
    opts = opts || {};
    const moves = E.legalMoves(state);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];          // forced move: answer instantly
    const rnd = opts.random || Math.random;
    const side = sideOf(state.turn);
    B = toInt(state.board); hashBoard();
    TT = new Map(); HIST = new Int32Array(10000); nodes = 0;

    // Moves that would give a threefold repetition are treated as draws (score 0) at the root.
    const repSet = new Set();
    if (level !== 'easy') {
      for (let i = 0; i < moves.length; i++) {
        const ns = E.applyMove(state, moves[i]);
        const k = ns.keys[ns.keys.length - 1];
        let cnt = 0;
        for (let j = 0; j < ns.keys.length; j++) if (ns.keys[j] === k) cnt++;
        if (cnt >= 3) repSet.add(moves[i]);
      }
    }

    if (level === 'easy') {
      // Shallow search + random noise, and about 1 move in 4 is deliberately not the best.
      timed = false;
      const scores = rootSearch(moves, side, 2, true, repSet);
      const list = moves.map(function (m) { return { m: m, s: scores.get(m) + rnd() * 30 }; });
      list.sort(function (a, b) { return b.s - a.s; });
      if (rnd() < 0.25) return list[1 + Math.floor(rnd() * (list.length - 1))].m;
      return list[0].m;
    }

    const maxDepth = level === 'medium' ? 5 : 30;
    const budget = opts.timeMs || (level === 'medium' ? 3000 : 1500);
    deadline = Date.now() + budget;
    let rootMoves = moves.slice(), best = rootMoves[0];
    for (let d = 1; d <= maxDepth; d++) {
      timed = d > 1;                                   // depth 1 always finishes
      let scores;
      try { scores = rootSearch(rootMoves, side, d, false, repSet); }
      catch (e) { if (e === ABORT) break; throw e; }
      rootMoves.sort(function (a, b) { return scores.get(b) - scores.get(a); });   // stable: best first
      best = rootMoves[0];
      E.lastSearch = { depth: d, nodes: nodes, score: scores.get(best) };
      if (Math.abs(scores.get(best)) > MATE - 200) break;    // forced win/loss found
      if (Date.now() > deadline) break;
    }
    timed = false;
    return best;
  };

  return E;
}
if (typeof module !== 'undefined') module.exports = makeCheckersEngine;

// ============================================================
// CHESS screens (rules and computer player come from chess_engine.js)
// ============================================================
// Chess pieces drawn in code (shapes only; colours come from app.css).
const CHESS_PATHS = {
  P: '<circle cx="22.5" cy="12.5" r="5.2"/><path d="M17.8 20.5c-.8 3.800-3.800 5-3.800 10.500h17c0-5.500-3-6.700-3.800-10.500z"/><path d="M11.500 38.500c0-3.500 2.500-5 3-7.500h16c.5 2.500 3 4 3 7.500z"/>',
  R: '<path d="M10 38.500v-3.800h25v3.800z"/><path d="M13 34.700l1.600-16.200h15.800l1.600 16.200z"/><path d="M12 18.500v-8.500h4.200v2.800h3.300V10h6v2.800h3.300V10H33v8.500z"/>',
  N: '<path d="M10.500 38.500c.2-9.500 2.500-15.500 8.500-20-2.600.4-5.600 2.300-7.600 5.400L8.500 21.500c2.700-5 7-10.800 13.500-12.800l1.200-4.500 3.500 3.700c6.300 2.500 9.800 9.300 9.800 18.600 0 4.700-.4 8.700-.4 11.500z"/><circle cx="20.500" cy="13.800" r="1.400" class="eye"/><path d="M12.500 21.200l4-.5" fill="none"/>',
  B: '<path d="M10.500 38.500v-3.500h24v3.500z"/><path d="M14.500 35c0-5.500 3.200-8.500 8-10.500-3.200-2.200-5.400-5.300-5.400-9.300 0-3.400 2.500-6.800 5.400-9 2.900 2.200 5.400 5.600 5.400 9 0 4-2.200 7.100-5.400 9.300 4.800 2 8 5 8 10.500z"/><circle cx="22.500" cy="6.800" r="2.300"/><path d="M19.500 15.500h6m-3-3v6" fill="none"/>',
  Q: '<path d="M10.500 38.500v-3.500h24v3.500z"/><path d="M11.500 35 8 14l8 8.500L19 11l3.500 11.500L26 11l3 11.500L37 14l-3.500 21z"/><circle cx="8" cy="12.500" r="2.200"/><circle cx="19" cy="9.500" r="2.200"/><circle cx="26" cy="9.500" r="2.200"/><circle cx="37" cy="12.500" r="2.200"/>',
  K: '<path d="M10.500 38.500v-3.500h24v3.500z"/><path d="M13 35c-2.500-6-2-11 2.500-14.500 2-1.500 4.500-2.500 7-2.500s5 1 7 2.500c4.500 3.500 5 8.500 2.500 14.500z"/><path d="M22.500 4v13M17.500 8.500h10" fill="none" stroke-width="2.600"/><path d="M16 26c4 2 9 2 13 0" fill="none"/>'
};
function chessPieceSVG(code) {
  return '<svg class="pc ' + code[0] + '" viewBox="0 0 45 45">' + CHESS_PATHS[code[1]] + '</svg>';
}
const CH_VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

// ------------------------------------------------------------
// CHESS STATE
// CH.G is the current game (also saved as tt:chess:game so it survives closing the app).
// busy = the computer is thinking; gen changes whenever a game restarts so late computer replies are ignored.
// ------------------------------------------------------------
const CH = { ai: null, E: null, G: null, sel: null, legal: [], busy: false, gen: 0, S: null, flip: false, pendingLevel: null, justForfeited: false, declined: null };

function chsInit() {
  CH.ai = makeAI(makeChessEngine); CH.E = CH.ai.E;
}
// A saved game that is still within its 60 minutes (or null).
function chsActive() { const g = Saved.get('chess'); return g && !Saved.expired(g) ? g : null; }
// if a saved game ran past 60 minutes, record Forfeited once and tidy up
function chsExpireIfNeeded() {
  const g = Saved.get('chess');
  if (g && Saved.expired(g) && !g.over) { Results.add('chess', 'forfeited', g.level); Saved.clear('chess'); CH.justForfeited = true; }
}

// ------------------------------------------------------------
// CHESS SCREENS
// Entry (two pictures: with and without a Resume tile), choose side, the board, and Stats.
// All tap areas sit over painted signs and lanterns; the numbers are picture pixels.
// ------------------------------------------------------------
function buildChess() {
  if (typeof makeChessEngine !== 'function') return;
  chsInit();
  ALIAS['chs-entry'] = () => { chsExpireIfNeeded(); return chsActive() ? 'chs-entry-r' : 'chs-entry-n'; };
  // ---- entry (with and without a Resume tile) ----
  [['chs-entry-r', 'chess-entry-resume', true], ['chs-entry-n', 'chess-entry-noresume', false]].forEach(([id, pic, withResume]) => {
    const S = defScreen(id, pic, { parent: 'games', name: 'Chess' });
    if (withResume) {
      addNav(S, { home: [16, 310, 194, 71], back: [16, 423, 181, 69] });
      addHot(S, 161, 558, 536, 184, () => go('chs-board', { resume: true }), 'Resume Game');
      S.sub = addText(S, 'resume-sub', 250, 664, 410, 44, 31, '');
    } else addNav(S, { home: [24, 206, 192, 71], back: [24, 298, 192, 73] });
    const ly = withResume ? 806 : 610, lh = withResume ? 226 : 269;
    [['easy', withResume ? 150 : 152, 140], ['medium', withResume ? 352 : 350, 150], ['hard', withResume ? 561 : 565, 149]].forEach(([lv, x, w]) => {
      addHot(S, x, ly, w, lh, () => chsPickLevel(lv), LEVEL_NAME[lv]);
    });
    addHot(S, withResume ? 300 : 310, 1185, withResume ? 255 : 242, 250, () => go('chs-stats'), 'Stats');
    S.onShow = () => {
      if (S.sub) { const g = chsActive(); if (g) S.sub.textContent = LEVEL_NAME[g.level] + ' · ' + Saved.minsLeft(g) + ' min left'; }
      if (CH.justForfeited) {
        CH.justForfeited = false;
        showPanel(S, { icon: '⏳', title: 'Game Forfeited', text: '60 minutes since your last move', buttons: [{ label: 'Chess Home' }] });
      }
    };
  });
  // ---- choose side ----
  const SD = defScreen('chs-side', 'chess-side', { parent: 'chs-entry', name: 'Chess side' });
  addNav(SD, { home: { plank: [24, 206, 180, 66] }, back: { plank: [24, 290, 180, 66] } });
  addHot(SD, 95, 839, 170, 306, () => chsStart('w'), 'Play Ivory');
  addHot(SD, 587, 840, 186, 305, () => chsStart('b'), 'Play Charcoal');
  // ---- board ----
  const B = defScreen('chs-board', 'chess-board', { parent: 'chs-entry', name: 'Chess board' });
  CH.S = B;
  addNav(B, { icons: true });
  B.undoTop = addIconBtn(B, 692, 322, 104, 'undo', chsUndoTap, 'Undo', 96);
  B.turnEl = addText(B, 'turn-text bold', 280, 332, 295, 66, 40, '');
  B.boardEl = el('div', 'cboard'); place(B.boardEl, 84, 480, 726, 726, B); B.art.appendChild(B.boardEl);
  B.lblEls = [];
  B.topCap = el('div', 'capture-row k'); place(B.topCap, 125, 1338, 600, 36, B); B.art.appendChild(B.topCap);
  B.botCap = el('div', 'capture-row k'); place(B.botCap, 125, 1376, 600, 36, B); B.art.appendChild(B.botCap);
    for (let i = 0; i < 64; i++) {
    const c = el('button', 'ccell'); c.type = 'button'; c.dataset.d = i;
    c.addEventListener('click', () => chsTap(i)); B.boardEl.appendChild(c);
  }
  B.onShow = (p) => chsShowBoard(p);
  B.onHide = () => { CH.gen++; CH.busy = false; if (CH.ai) CH.ai.cancel(); closePanel(B); };
  // ---- stats ----
  const T = defScreen('chs-stats', 'chess-stats', { parent: 'chs-entry', name: 'Chess stats' });
  addNav(T, { home: [48, 215, 200, 70], back: [48, 293, 200, 67] });
  T.statEls = [];
  T.onShow = () => paintStats(T, 'chess', { tiles: [[211, 594, 140, 66], [510, 594, 140, 66], [211, 756, 140, 66], [510, 756, 140, 66]], numFs: 54, rowX: 135, rowY: 930, rowW: 590, rowH: 56.8, rowFs: 29 });
  Ticker.fns.add(chsTick);
}

// ------------------------------------------------------------
// STARTING A GAME
// Only one game at a time: starting a new one forfeits the current one (after asking).
// ------------------------------------------------------------
function chsPickLevel(level) {
  CH.pendingLevel = level;
  if (chsActive()) {
    showPanel(SCREENS[CUR], { title: 'Start a new game?', text: 'Starting a new game will forfeit your current game. Your current progress will be lost.',
      buttons: [{ label: 'Keep Current Game', secondary: true }, { label: 'Start New Game', fn: () => { chsForfeitCurrent(); go('chs-side'); } }] });
  } else go('chs-side');
}
function chsForfeitCurrent() {
  const old = Saved.get('chess');
  if (old && !old.over) Results.add('chess', 'forfeited', old.level);
  Saved.clear('chess');
}
function chsStart(side) {
  const E = CH.E;
  CH.G = { state: E.initialState(), level: CH.pendingLevel || 'easy', side, last: nowMs(), undo: [], capHuman: [], capComp: [], over: false };
  Saved.set('chess', CH.G);
  go('chs-board', { fresh: true });
}

// ------------------------------------------------------------
// THE BOARD
// Shows the saved game, flips the board if the person plays Charcoal, and lets the computer move if it is its turn.
// ------------------------------------------------------------
function chsShowBoard(p) {
  const S = CH.S;
  S.art.classList.remove('dim'); closePanel(S);
  CH.sel = null; CH.legal = []; CH.busy = false; CH.declined = null;
  if (!(p && p.keepOver && CH.G && CH.G.over)) {
    chsExpireIfNeeded();
    const g = Saved.get('chess');
    if (!g) { if (CH.justForfeited) { /* forfeited while away */ } go('chs-entry'); return; }
    CH.G = g;
  }
  CH.flip = CH.G.side === 'b';
  chsLabels(); chsRender();
  if (!CH.G.over) chsAfterMove(true);
}
// a-h / 1-8 labels are drawn here; reversed when the board is flipped
function chsLabels() {
  const S = CH.S; S.lblEls.forEach(e => e.remove()); S.lblEls = [];
  const files = 'abcdefgh', cw = 726 / 8;
  for (let i = 0; i < 8; i++) {
    const rank = addText(S, 'kb-lbl', 44, 480 + i * cw + cw / 2 - 20, 40, 40, 30, String(CH.flip ? i + 1 : 8 - i));
    const file = addText(S, 'kb-lbl', 84 + i * cw + cw / 2 - 20, 1210, 40, 40, 30, CH.flip ? files[7 - i] : files[i]);
    S.lblEls.push(rank, file);
  }
}
function chsSq(i) {   // display cell -> board index
  const r = Math.floor(i / 8), c = i % 8; return CH.flip ? (7 - r) * 8 + (7 - c) : r * 8 + c;
}
function chsRender() {
  const S = CH.S, G = CH.G, E = CH.E, st = G.state, sts = E.status(st);
  const cells = S.boardEl.children;
  const last = st.lastMove;
  for (let i = 0; i < 64; i++) {
    const idx = chsSq(i), c = cells[i], p = st.board[idx];
    let cls = 'ccell';
    if (CH.sel === idx) cls += ' sel';
    // move hints (where the selected piece can go) on Easy only; Medium and Hard highlight just the selected piece
    const lm = G.level === 'easy' && CH.legal.find(m => m.to === idx); if (lm) cls += lm.capture ? ' destcap' : ' dest';
    if (last && (last.from === idx || last.to === idx)) cls += ' last';
    if (sts.inCheck && sts.kingSquare === idx) cls += ' chk';
    c.className = cls;
    c.innerHTML = p ? chessPieceSVG(p) : '';
  }
  // captured pieces on the two wooden planks
  const draw = (box, arr) => {
    box.innerHTML = '';
    arr.slice().sort((a, b) => CH_VAL[b[1]] - CH_VAL[a[1]]).forEach(code => {
      const s = el('span', 'cap', chessPieceSVG(code));
      box.appendChild(s);
    });
  };
  draw(S.topCap, G.capComp); draw(S.botCap, G.capHuman);
  // turn sign
  let main = '';
  if (!G.over) main = st.turn === G.side ? 'Your Turn' : 'Computer Thinking';
  S.turnEl.textContent = main; S.turnEl.style.fontSize = 'calc(var(--u) * ' + (main.length > 10 ? 29 : 38) + ')';
  // Check: a banner, shown once each time the player's king newly comes under attack
  const chk = !G.over && sts.inCheck && st.turn === G.side;
  if (chk && S.lastChk !== st) { showBanner(S, 'Check!'); }
  if (!chk || G.over) hideBanner(S);
  S.lastChk = chk ? st : null;
  S.undoTop.style.display = G.level === 'easy' ? '' : 'none';
  S.undoTop.classList.toggle('off', !chsCanUndo()); S.undoTop.disabled = !chsCanUndo();
}

// ------------------------------------------------------------
// A PERSON'S MOVE
// First tap selects a piece (on Easy it also marks where it can go), second tap moves. Pawn promotion asks which piece.
// ------------------------------------------------------------
function chsTap(i) {
  const G = CH.G; if (!G || G.over || CH.busy) return;
  const st = G.state, E = CH.E; if (st.turn !== G.side) return;
  const idx = chsSq(i), p = st.board[idx];
  if (CH.sel != null) {
    const moves = CH.legal.filter(m => m.to === idx);
    if (moves.length) {
      if (moves.length > 1 || moves[0].promo) { chsPromote(moves); return; }
      chsHumanMove(moves[0]); return;
    }
  }
  if (p && p[0] === G.side) {
    CH.sel = idx; CH.legal = E.legalMoves(st).filter(m => m.from === idx);
  } else { CH.sel = null; CH.legal = []; }
  chsRender();
}
function chsPromote(moves) {
  const S = CH.S, box = el('div', 'promo-row');
  moves.forEach(m => {
    const b = el('button', 'promo-btn', chessPieceSVG(CH.G.side + m.promo.toUpperCase())); b.type = 'button';
    b.addEventListener('click', () => { closePanel(S); chsHumanMove(m); });
    box.appendChild(b);
  });
  showPanel(S, { title: 'Promote your pawn', html: box, buttons: [] });
}
function chsHumanMove(m) {
  const G = CH.G, E = CH.E;
  if (G.level === 'easy') G.undo.push({ state: G.state, capHuman: G.capHuman.slice(), capComp: G.capComp.slice() });   // every move is kept so Undo can go all the way back
  const ns = E.applyMove(G.state, m);
  if (ns.captured) G.capHuman.push(ns.captured);
  G.state = ns; G.last = nowMs(); CH.sel = null; CH.legal = [];
  Saved.set('chess', G); chsRender(); chsAfterMove(false);
}

// ------------------------------------------------------------
// AFTER EVERY MOVE
// Checks the official end-of-game rules (checkmate, stalemate, draws) from chess_engine.js,
// offers a claimable draw when the rules allow, and otherwise asks the computer for its reply.
// ------------------------------------------------------------
function chsAfterMove(fromShow) {
  const G = CH.G, E = CH.E, S = CH.S; if (!G || G.over) return;
  const sts = E.status(G.state);
  if (sts.over) { chsEnd(sts); return; }
  if (G.state.turn !== G.side) { chsComputer(); return; }
  if (sts.claimable) {
    const key = G.state.keys[G.state.keys.length - 1] + sts.claimable;
    if (CH.declined !== key) {
      const txt = sts.claimable === 'threefold' ? 'This position has now happened three times.' : '50 moves have passed without a capture or a pawn move.';
      showPanel(S, { title: 'Claim a draw?', text: txt, buttons: [
        { label: 'Keep Playing', secondary: true, fn: () => { CH.declined = key; } },
        { label: 'Claim Draw', fn: () => chsEnd({ over: true, result: 'claim-' + sts.claimable, winner: null }) }] });
    }
  }
}
// Asks the background helper for the computer's move, then waits at least PACE_MS so it never feels rushed.
function chsComputer() {
  const G = CH.G, S = CH.S, gen = ++CH.gen; CH.busy = true; chsRender();
  const t0 = Date.now(), level = G.level;
  CH.ai.ask(G.state, level, (mv) => {
    const wait = Math.max(0, PACE_MS[level] - (Date.now() - t0));
    setTimeout(() => {
      if (gen !== CH.gen || !CH.G || CH.G !== G || G.over) return;
      CH.busy = false;
      if (!mv) { chsAfterMove(); return; }
      const ns = CH.E.applyMove(G.state, mv);
      if (ns.captured) G.capComp.push(ns.captured);
      G.state = ns; G.last = nowMs(); Saved.set('chess', G); chsRender(); chsAfterMove();
    }, wait);
  });
}

// ------------------------------------------------------------
// END OF GAME
// The wording for every way a game can end, then recording the result.
// ------------------------------------------------------------
const CHS_TEXT = {
  checkmate: ['Checkmate', ''], stalemate: ['Stalemate', 'No safe move is left, so it is a draw.'],
  insufficient: ['Draw', 'There are not enough pieces left to checkmate.'], fivefold: ['Draw', 'The same position happened five times.'],
  seventyfive: ['Draw', '75 moves passed without a capture or a pawn move.'],
  'claim-threefold': ['Draw', 'You claimed a draw: same position three times.'], 'claim-fifty': ['Draw', 'You claimed a draw: 50 moves without a capture or pawn move.']
};
function chsEnd(sts) {
  const G = CH.G, S = CH.S; G.over = true; CH.busy = false; CH.gen++;
  let res = 'draw', title, text;
  if (sts.result === 'checkmate') {
    res = sts.winner === G.side ? 'won' : 'lost';
    title = res === 'won' ? 'You Won!' : 'You Lost';
    text = res === 'won' ? 'Checkmate. Well played!' : 'Checkmate. Good try, play again soon!';
  }
  else { const t = CHS_TEXT[sts.result] || ['Draw', '']; title = 'Draw'; text = t[1]; }
  Results.add('chess', res, G.level); Saved.clear('chess');
  chsRender(); S.art.classList.add('dim');
  showPanel(S, { icon: res === 'won' ? '🏆' : res === 'lost' ? '♟️' : '🤝', title, text, buttons: [
    { label: 'View Board', secondary: true, fn: () => { S.art.classList.remove('dim'); } }, { label: 'Chess Home', fn: () => go('chs-entry') }] });
}
function chsReset() {
  const S = CH.S, G = CH.G;
  if (!G || G.over) { go('chs-entry'); return; }
  showPanel(S, { title: 'Start a new game?', text: 'Starting a new game will forfeit your current game. Your current progress will be lost.', buttons: [
    { label: 'Keep Current Game', secondary: true }, { label: 'Start New Game', fn: () => { chsForfeitCurrent(); CH.G = null; go('chs-entry'); } }] });
}

// ------------------------------------------------------------
// UNDO (Easy only)
// Each tap takes back the person's last move together with the computer's reply; it can go all the way back to the start.
// ------------------------------------------------------------
function chsCanUndo() { const G = CH.G; return !!(G && !G.over && !CH.busy && G.level === 'easy' && G.undo.length && G.state.turn === G.side); }
function chsUndoTap() {
  const G = CH.G; if (!G || G.over) return;
  if (G.level !== 'easy') return;
  if (CH.busy || !G.undo.length) return;
  chsUndo();
}
function chsUndo() {
  const G = CH.G; if (!G || G.over || CH.busy || G.level !== 'easy' || !G.undo.length) return;
  const u = G.undo.pop(); G.state = u.state; G.capHuman = u.capHuman; G.capComp = u.capComp; G.last = nowMs();
  CH.sel = null; CH.legal = []; Saved.set('chess', G); chsRender();
}
// Once a second: enforces the 60-minute rule while the app is open.
function chsTick() {
  const S = CH.S; if (!S) return;
  if (S.el.classList.contains('active') && CH.G && !CH.G.over && Saved.expired(CH.G)) {
    const G = CH.G; G.over = true; CH.gen++; CH.busy = false;
    Results.add('chess', 'forfeited', G.level); Saved.clear('chess');
    chsRender(); S.art.classList.add('dim'); closePanel(S);
    showPanel(S, { icon: '⏳', title: 'Game Forfeited', text: '60 minutes since your last move', buttons: [{ label: 'Chess Home', fn: () => go('chs-entry') }] });
  }
  ['chs-entry-r'].forEach(id => {
    const E = SCREENS[id];
    if (E && E.el.classList.contains('active') && E.sub) {
      const g = chsActive();
      if (g) E.sub.textContent = LEVEL_NAME[g.level] + ' · ' + Saved.minsLeft(g) + ' min left';
      else go('chs-entry');
    }
  });
}

// ============================================================
// INTERNATIONAL CHECKERS 10x10 screens (rules and computer player: checkers_engine.js)
// You play White (light pieces, move first, start at the bottom).
// ============================================================
// Checkers pieces (men and kings) drawn in code.
function ckPieceSVG(p) {
  const white = p === 'w' || p === 'W', king = p === 'W' || p === 'B';
  const f1 = white ? '#fbf3dc' : '#4a4a55', f2 = white ? '#d9c590' : '#17171d', ring = white ? '#a8873f' : '#c9ac68';
  let s = '<svg class="dk" viewBox="0 0 100 100"><defs><radialGradient id="g' + (white ? 'w' : 'b') + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="' + f1 + '"/><stop offset="1" stop-color="' + f2 + '"/></radialGradient></defs>' +
    '<circle cx="50" cy="54" r="42" fill="#0006"/><circle cx="50" cy="50" r="42" fill="url(#g' + (white ? 'w' : 'b') + ')" stroke="' + ring + '" stroke-width="4"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke="' + ring + '" stroke-width="2" opacity=".7"/>';
  if (king) s += '<path d="M28 62 24 38l14 12 12-18 12 18 14-12-4 24z" fill="#f2c14e" stroke="#8a5a10" stroke-width="2.500" stroke-linejoin="round"/>';
  return s + '</svg>';
}

// ------------------------------------------------------------
// INTERNATIONAL CHECKERS STATE
// Same pattern as Chess. Rules (10x10 board, flying kings, maximum capture, FMJD draw rules) are in checkers_engine.js.
// cands / step: during a multi-capture the person taps the landing squares one by one.
// ------------------------------------------------------------
const CK = { ai: null, E: null, G: null, sel: null, cands: [], step: 0, busy: false, gen: 0, S: null, pendingLevel: null, justForfeited: false };

// ------------------------------------------------------------
// CHECKERS SCREENS
// Reuses the Chess entry picture with a CHECKERS sign drawn over it, plus board, "start new game?", result and Stats screens.
// ------------------------------------------------------------
function buildCheckers() {
  if (typeof makeCheckersEngine !== 'function') return;
  CK.ai = makeAI(makeCheckersEngine); CK.E = CK.ai.E;
  ALIAS['ck-entry'] = () => { ckExpireIfNeeded(); return ckActive() ? 'ck-entry-r' : 'ck-entry-n'; };
  [['ck-entry-r', 'chess-entry-resume', true], ['ck-entry-n', 'chess-entry-noresume', false]].forEach(([id, pic, withResume]) => {
    const S = defScreen(id, pic, { parent: 'games', name: 'Checkers' });
    // cover the carved CHESS sign with a CHECKERS sign
    const sign = el('div', 'sign-cover'); place(sign, withResume ? 200 : 205, withResume ? 392 : 385, 485, withResume ? 130 : 140, S);
    sign.innerHTML = '<span style="font-size:calc(var(--u)*' + (withResume ? 70 : 74) + ')">CHECKERS</span>'; S.art.appendChild(sign);
    if (withResume) {
      addNav(S, { home: [16, 310, 194, 71], back: [16, 423, 181, 69] });
      addHot(S, 161, 558, 536, 184, () => go('ck-board', { resume: true }), 'Resume Game');
      S.sub = addText(S, 'resume-sub', 250, 664, 410, 44, 31, '');
    } else addNav(S, { home: [24, 206, 192, 71], back: [24, 298, 192, 73] });
    const ly = withResume ? 806 : 610, lh = withResume ? 226 : 269;
    [['easy', withResume ? 150 : 152, 140], ['medium', withResume ? 352 : 350, 150], ['hard', withResume ? 561 : 565, 149]].forEach(([lv, x, w]) => addHot(S, x, ly, w, lh, () => ckPickLevel(lv), LEVEL_NAME[lv]));
    addHot(S, withResume ? 300 : 310, 1185, withResume ? 255 : 242, 250, () => go('ck-stats'), 'Stats');
    S.onShow = () => {
      if (S.sub) { const g = ckActive(); if (g) S.sub.textContent = LEVEL_NAME[g.level] + ' · ' + Saved.minsLeft(g) + ' min left'; }
      if (CK.justForfeited) { CK.justForfeited = false; go('ck-result-forfeit'); }
    };
  });
  // replace confirmation (picture)
  const R = defScreen('ck-replace', 'checkers-replace', { parent: 'ck-entry', name: 'Start a new game' });
  addHot(R, 27, 80, 194, 78, goHome, 'Home'); addHot(R, 245, 80, 185, 78, goBack, 'Back');
  addHot(R, 710, 72, 112, 89, goBack, 'Reset');
  addHot(R, 245, 677, 363, 73, () => go('ck-board', { resume: true }), 'Keep Current Game');
  addHot(R, 245, 766, 363, 76, () => { const old = Saved.get('checkers'); if (old && !old.over) { Results.add('checkers', 'forfeited', old.level); } Saved.clear('checkers'); ckStart(CK.pendingLevel); }, 'Start New Game');
  addTopMusic(R, 4);
  // board
  const B = defScreen('ck-board', 'checkers-board', { parent: 'ck-entry', name: 'Checkers board' });
  CK.S = B;
  addNav(B, { icons: true });
  B.undoTop = addIconBtn(B, 692, 246, 104, 'undo', ckUndoTap, 'Undo', 96);
  B.turnEl = addText(B, 'turn-text bold', 262, 248, 318, 76, 40, '');
  B.boardEl = el('div', 'kboard'); place(B.boardEl, 89, 430, 713, 713, B); B.art.appendChild(B.boardEl);
  B.capA = el('div', 'capture-row k'); place(B.capA, 125, 1302, 600, 42, B); B.art.appendChild(B.capA);
  B.capB = el('div', 'capture-row k'); place(B.capB, 125, 1347, 600, 42, B); B.art.appendChild(B.capB);
  for (let i = 0; i < 10; i++) {
    addText(B, 'kb-lbl', 49, 430 + i * 71.3 + 17, 40, 36, 26, String(10 - i));
    addText(B, 'kb-lbl', 89 + i * 71.3 + 17, 1148, 36, 40, 26, 'abcdefghij'[i]);
  }
  for (let i = 0; i < 100; i++) {
    const c = el('button', 'kcell');
    c.type = 'button';
    c.addEventListener('click', () => ckTap(i));
    B.boardEl.appendChild(c);
  }
  B.onShow = (p) => ckShowBoard(p);
  B.onHide = () => { CK.gen++; CK.busy = false; if (CK.ai) CK.ai.cancel(); closePanel(B); };
  // result cards (pictures)
  [['won', 'checkers-won'], ['lost', 'checkers-lost'], ['draw', 'checkers-draw'], ['forfeit', 'checkers-forfeit']].forEach(([k, pic]) => {
    const S = defScreen('ck-result-' + k, pic, { parent: 'ck-entry', name: 'Checkers result' });
    S.plaque = addText(S, 'plaque', 352, 712, 196, 42, 28, '');
    addHot(S, 229, 785, 440, 94, () => go('ck-entry'), 'Checkers Home'); addMusic(S, 764, 36);
    S.onShow = () => { S.plaque.textContent = CK.lastLevel ? LEVEL_NAME[CK.lastLevel] : ''; };
  });
  // stats
  const T = defScreen('ck-stats', 'checkers-stats', { parent: 'ck-entry', name: 'Checkers stats' });
  addNav(T, { home: [39, 113, 206, 77], back: [39, 206, 206, 76] });
  T.statEls = [];
  T.onShow = () => paintStats(T, 'checkers', { tiles: [[420, 668, 140, 80], [680, 668, 130, 80], [420, 834, 140, 80], [680, 834, 130, 80]], numFs: 54, rowX: 374, rowY: 995, rowW: 439, rowH: 49.6, rowFs: 24 });
  Ticker.fns.add(ckTick);
}
function ckActive() { const g = Saved.get('checkers'); return g && !Saved.expired(g) ? g : null; }
function ckExpireIfNeeded() {
  const g = Saved.get('checkers');
  if (g && Saved.expired(g) && !g.over) {
    Results.add('checkers', 'forfeited', g.level);
    CK.lastLevel = g.level;
    Saved.clear('checkers');
    CK.justForfeited = true;
  }
}

// ------------------------------------------------------------
// STARTING A GAME
// Only one game at a time; starting another forfeits the current one (after asking).
// ------------------------------------------------------------
function ckPickLevel(level) {
  CK.pendingLevel = level;
  if (ckActive()) go('ck-replace'); else ckStart(level);
}
function ckStart(level) {
  CK.G = { state: CK.E.initialState(), level: level || 'easy', last: nowMs(), undo: [], capHuman: [], capComp: [], over: false };
  Saved.set('checkers', CK.G); go('ck-board', { fresh: true });
}
function ckShowBoard() {
  const S = CK.S; closePanel(S); S.art.classList.remove('dim');
  CK.sel = null; CK.cands = []; CK.step = 0; CK.busy = false;
  ckExpireIfNeeded();
  const g = Saved.get('checkers');
  if (!g) { go('ck-entry'); return; }
  CK.G = g; ckRender(); ckAfterMove();
}

// ------------------------------------------------------------
// THE BOARD
// Draws every square, the selected piece, (Easy only) where it can land, and the last move.
// ------------------------------------------------------------
function ckRender() {
  const S = CK.S, G = CK.G, E = CK.E, st = G.state, cells = S.boardEl.children;
  const sts = E.status(st), last = st.lastMove;
  // squares to highlight as destinations
  const dest = {};
  // move hints (where the selected piece can land) on Easy only; Medium and Hard highlight just the selected piece
  if (CK.sel != null && G.level === 'easy') CK.cands.forEach(m => { const sq = CK.step === 0 ? m.to : m.path[CK.step]; dest[sq] = 1; });
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / 10), c = i % 10, p = st.board[i], c0 = cells[i];
    let cls = 'kcell';
    if ((r + c) % 2 === 1) cls += ' dark';
    if (CK.sel === i) cls += ' sel';
    if (dest[i]) cls += sts.mustCapture ? ' dest must' : ' dest';
    if (last && (last.path ? (last.path[0] === i || last.to === i) : false)) cls += ' last';
    c0.className = cls; c0.innerHTML = p ? ckPieceSVG(p) : '';
  }
  const draw = (box, arr) => { box.innerHTML = ''; arr.forEach(code => box.appendChild(el('span', 'cap', ckPieceSVG(code)))); };
  draw(S.capA, G.capHuman); draw(S.capB, G.capComp);
  let main = '';
  if (!G.over) main = st.turn === 'w' ? 'Your Turn' : 'Computer Thinking';
  S.turnEl.textContent = main; S.turnEl.style.fontSize = 'calc(var(--u) * ' + (main.length > 10 ? 29 : 38) + ')';
  // "You must capture": a banner shown once each time a capture becomes compulsory
  const must = !G.over && st.turn === 'w' && sts.mustCapture;
  if (must && S.lastMust !== st) showBanner(S, 'You must capture');
  if (!must) hideBanner(S);
  S.lastMust = must ? st : null;
  S.undoTop.style.display = G.level === 'easy' ? '' : 'none';
  const can = ckCanUndo(); S.undoTop.classList.toggle('off', !can); S.undoTop.disabled = !can;
}

// ------------------------------------------------------------
// A PERSON'S MOVE
// Tap a piece, then tap where it lands. Captures are compulsory and the longest capture must be taken.
// ------------------------------------------------------------
function ckTap(i) {
  const G = CK.G; if (!G || G.over || CK.busy) return;
  const st = G.state, E = CK.E; if (st.turn !== 'w') return;
  if (CK.sel != null) {
    const sq = i;
    const next = CK.step === 0 ? CK.cands.filter(m => m.to === sq) : CK.cands.filter(m => m.path[CK.step] === sq);
    if (next.length) {
      if (next.length === 1) { ckHumanMove(next[0]); return; }
      if (CK.step === 0) { CK.cands = next; CK.step = 1; ckRender(); return; }   // several routes end here: pick the route square by square
      if (next.every(m => m.path.length - 1 === CK.step)) { ckHumanMove(next[0]); return; }
      CK.cands = next; CK.step++; ckRender(); return;
    }
  }
  const mine = E.legalMoves(st).filter(m => m.from === i);
  if (mine.length) { CK.sel = i; CK.cands = mine; CK.step = 0; } else { CK.sel = null; CK.cands = []; CK.step = 0; }
  ckRender();
}
function ckHumanMove(m) {
  const G = CK.G, E = CK.E;
  if (G.level === 'easy') G.undo.push({ state: G.state, capHuman: G.capHuman.slice(), capComp: G.capComp.slice() });   // every move is kept so Undo can go all the way back
  m.captured.forEach(sq => G.capHuman.push(G.state.board[sq]));
  G.state = E.applyMove(G.state, m); G.last = nowMs(); CK.sel = null; CK.cands = []; CK.step = 0;
  Saved.set('checkers', G); ckRender(); ckAfterMove();
}

// ------------------------------------------------------------
// AFTER EVERY MOVE
// Checks win/draw rules, then asks the computer for its reply.
// ------------------------------------------------------------
function ckAfterMove() {
  const G = CK.G, E = CK.E; if (!G || G.over) return;
  const sts = E.status(G.state);
  if (sts.over) { ckEnd(sts); return; }
  if (G.state.turn === 'b') ckComputer();
}
function ckComputer() {
  const G = CK.G, gen = ++CK.gen; CK.busy = true; ckRender();
  const t0 = Date.now(), level = G.level;
  CK.ai.ask(G.state, level, (mv) => {
    const wait = Math.max(0, PACE_MS[level] - (Date.now() - t0));
    setTimeout(() => {
      if (gen !== CK.gen || CK.G !== G || G.over) return;
      CK.busy = false;
      if (!mv) { ckAfterMove(); return; }
      mv.captured.forEach(sq => G.capComp.push(G.state.board[sq]));
      G.state = CK.E.applyMove(G.state, mv); G.last = nowMs(); Saved.set('checkers', G); ckRender(); ckAfterMove();
    }, wait);
  });
}

// ------------------------------------------------------------
// END OF GAME
// Shows the result picture and records the result.
// ------------------------------------------------------------
function ckEnd(sts) {
  const G = CK.G; G.over = true; CK.busy = false; CK.gen++;
  let res = 'draw';
  if (sts.result === 'loss') res = sts.winner === 'w' ? 'won' : 'lost';
  Results.add('checkers', res, G.level); CK.lastLevel = G.level; Saved.clear('checkers');
  ckRender();
  setTimeout(() => { if (CK.G === G && CUR === 'ck-board') go('ck-result-' + res); }, 900);
}
function ckReset() {
  const G = CK.G;
  if (!G || G.over) { go('ck-entry'); return; }
  CK.pendingLevel = G.level; go('ck-replace');
}

// ------------------------------------------------------------
// UNDO (Easy only)
// Each tap takes back the person's last move together with the computer's reply; it can go all the way back to the start.
// ------------------------------------------------------------
function ckCanUndo() { const G = CK.G; return !!(G && !G.over && !CK.busy && G.level === 'easy' && G.undo.length && G.state.turn === 'w'); }
function ckUndoTap() { if (ckCanUndo()) ckUndo(); }
function ckUndo() {
  const G = CK.G; if (!G || G.over || CK.busy || G.level !== 'easy' || !G.undo.length) return;
  const u = G.undo.pop(); G.state = u.state; G.capHuman = u.capHuman; G.capComp = u.capComp; G.last = nowMs();
  CK.sel = null; CK.cands = []; CK.step = 0; Saved.set('checkers', G); ckRender();
}
// Once a second: enforces the 60-minute rule while the app is open.
function ckTick() {
  const S = CK.S; if (!S) return;
  if (S.el.classList.contains('active') && CK.G && !CK.G.over && Saved.expired(CK.G)) {
    const G = CK.G; G.over = true; CK.gen++; CK.busy = false;
    Results.add('checkers', 'forfeited', G.level); CK.lastLevel = G.level; Saved.clear('checkers');
    ckRender(); S.art.classList.add('dim'); go('ck-result-forfeit');
  }
  const E = SCREENS['ck-entry-r'];
  if (E && E.el.classList.contains('active') && E.sub) {
    const g = ckActive();
    if (g) E.sub.textContent = LEVEL_NAME[g.level] + ' · ' + Saved.minsLeft(g) + ' min left';
    else go('ck-entry');
  }
}

// ============================================================
// QR CODE (drawn by the app itself; no outside service is ever asked to make it)
// Used by the "Best on your phone" card on laptops: the code holds this site's own address,
// so a phone camera can open the app. Standard QR (ISO 18004): byte mode, error correction level M,
// sizes 1 to 9 (addresses up to about 180 characters). Returns SVG markup, or '' if the text is too long.
// ============================================================
const QR_EC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22];   // level M, by size (version)
const QR_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5];

function qrMul(x, y) {                       // multiply in the QR number field GF(256)
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
  return z & 0xFF;
}
function qrDivisor(deg) {
  const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1;
  for (let k = 0; k < deg; k++) {
    for (let j = 0; j < deg; j++) { r[j] = qrMul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
    root = qrMul(root, 2);
  }
  return r;
}
function qrRemainder(data, div) {             // the error-correction bytes for one block
  const r = new Array(div.length).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= qrMul(c, f); }); }
  return r;
}
function qrRawModules(v) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
}
function qrAlignPositions(v, size) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, r = [6];
  for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p);
  return r;
}
function qrSvg(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let v = 1;
  const dataCap = (ver) => Math.floor(qrRawModules(ver) / 8) - QR_EC_PER_BLOCK[ver] * QR_BLOCKS[ver];
  while (v <= 9 && 4 + 8 + bytes.length * 8 > dataCap(v) * 8) v++;
  if (v > 9) return '';
  const size = v * 4 + 17, cap = dataCap(v);
  // 1. the message as bits: mode (byte), length, the bytes, end marker, padding
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xEC; data.length < cap; pad ^= 0xEC ^ 0x11) data.push(pad);
  // 2. split into blocks, add error correction, interleave
  const nb = QR_BLOCKS[v], ecl = QR_EC_PER_BLOCK[v], raw = Math.floor(qrRawModules(v) / 8);
  const nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = qrDivisor(ecl), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - ecl + (i < nShort ? 0 : 1)); k += dat.length;
    const ec = qrRemainder(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ec));
  }
  const all = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecl || j >= nShort) all.push(b[i]); });
  // 3. the fixed patterns (corner squares, timing lines, alignment squares, size information)
  const M = [], F = [];
  for (let y = 0; y < size; y++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
  const fn = (x, y, dark) => { M[y][x] = dark; F[y][x] = true; };
  for (let i = 0; i < size; i++) { fn(6, i, i % 2 === 0); fn(i, 6, i % 2 === 0); }
  [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) fn(x, y, d !== 2 && d !== 4);
    }
  });
  const al = qrAlignPositions(v, size), last = al.length - 1;
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask) => {
    const d = (0 << 3) | mask; let r = d;                       // level M = 0
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) fn(8, i, bit(i));
    fn(8, 7, bit(6)); fn(8, 8, bit(7)); fn(7, 8, bit(8));
    for (let i = 9; i < 15; i++) fn(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) fn(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) fn(8, size - 15 + i, bit(i));
    fn(8, size - 8, true);
  };
  drawFormat(0);                                                // reserve the format areas
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const dark = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); fn(a, c, dark); fn(c, a, dark); }
  }
  // 4. place the message bits in the zigzag order
  let n = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!F[y][x] && n < all.length * 8) { M[y][x] = ((all[n >>> 3] >>> (7 - (n & 7))) & 1) === 1; n++; }
    }
  }
  // 5. try the 8 standard masks and keep the easiest one to scan
  const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && maskFn[m](x, y)) M[y][x] = !M[y][x]; };
  const penalty = () => {
    let p = 0, dark = 0;
    for (let a = 0; a < 2; a++) for (let i = 0; i < size; i++) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const c = a ? M[j][i] : M[i][j], pr = a ? M[j - 1][i] : M[i][j - 1];
        if (c === pr) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
      }
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (M[y][x]) dark++;
      if (x < size - 1 && y < size - 1 && M[y][x] === M[y][x + 1] && M[y][x] === M[y + 1][x] && M[y][x] === M[y + 1][x + 1]) p += 3;
    }
    return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } applyMask(m); }
  applyMask(best); drawFormat(best);
  // 6. draw it (4 squares of quiet space around it, as the standard asks)
  let path = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (M[y][x]) path += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
  return '<svg viewBox="0 0 ' + (size + 8) + ' ' + (size + 8) + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="100%" height="100%" fill="#fff6e0"/><path d="' + path + '" fill="#1a1208"/></svg>';
}

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
  const go = el('button', 'desk-btn'); go.type = 'button'; go.textContent = 'Continue On This Screen';
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

detectAvif(bootApp);
