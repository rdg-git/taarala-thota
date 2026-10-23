// ============================================================
// CORE: helpers, storage, picture-screen system, navigation
// ============================================================
'use strict';
const QS = new URLSearchParams(location.search);
const IS_LOCAL = ['localhost', '127.0.0.1'].indexOf(location.hostname) >= 0;
const TEST_MODE = IS_LOCAL && QS.has('test');       // test helpers only ever on a local machine
if (QS.has('debug') && IS_LOCAL) document.body.classList.add('debug');

// ---- clock (can be moved forward in tests so 60-minute rules can be checked) ----
let CLOCK_SHIFT = 0;
function nowMs() { return Date.now() + CLOCK_SHIFT; }

// ---- small helpers ----
function $(id) { return document.getElementById(id); }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + pad2(sec % 60); }

// ---- storage: on this phone/browser only, never sent anywhere (try/catch: it can fail in private mode) ----
const Store = {
  key(k) { return 'tt:' + k; },
  get(k, dflt) { try { const v = localStorage.getItem(this.key(k)); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
  set(k, v) { try { localStorage.setItem(this.key(k), JSON.stringify(v)); } catch (e) { console.warn('save failed', e); } },
  del(k) { try { localStorage.removeItem(this.key(k)); } catch (e) {} }
};

// ---- picture sizes [width,height] (filled by build script) ----
const PIC = /*PIC_JSON*/{};
const PICV = /*VER_JSON*/{};
function picUrl(name) { return 'img/' + name + '.webp' + (PICV[name] ? '?v=' + PICV[name] : ''); }

// ============================================================
// PICTURE SCREENS
// A screen = blurred copy of the picture as background + the picture itself
// ("contain" fit, never cropped). Everything on top is positioned in picture
// pixels and scales together with the picture.
// ============================================================
const SCREENS = {};
let CUR = null;

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
function layoutScreen(S) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sc = Math.min(vw / S.W, vh / S.H);
  S.art.style.width = (S.W * sc) + 'px';
  S.art.style.height = (S.H * sc) + 'px';
  S.art.style.setProperty('--u', sc + 'px');
  S.scale = sc;
}
function layoutAll() { for (const k in SCREENS) layoutScreen(SCREENS[k]); }
window.addEventListener('resize', layoutAll);
window.addEventListener('orientationchange', () => setTimeout(layoutAll, 200));

// position an element by picture pixels
function place(e, x, y, w, h, S) {
  const W = S.W, H = S.H;
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
function addIconBtn(S, x, y, w, kind, fn, label, h) {
  const b = el('button', 'wbtn ' + kind); b.type = 'button'; b.setAttribute('aria-label', label);
  place(b, x, y, w, h || w, S);
  b.innerHTML = kind === 'home' ? ICON_HOME : kind === 'back' ? ICON_BACK : ICON_UNDO;
  b.addEventListener('click', (ev) => { ev.stopPropagation(); try { fn(ev); } catch (e) { console.error(e); } });
  S.art.appendChild(b);
  return b;
}
// a banner that slides in across the middle of the screen and stays until the person taps it
function showBanner(S, text) {
  if (!S || !S.art) return;
  hideBanner(S);
  const b = el('button', 'banner'); b.type = 'button'; b.innerHTML = '<span>' + text + '<small>Tap to continue</small></span>'; b.setAttribute('role', 'status');
  b.addEventListener('click', (ev) => { ev.stopPropagation(); hideBanner(S); });
  S.art.appendChild(b); S.banner = b;
}
function hideBanner(S) {
  const b = S && S.banner; if (!b) return; S.banner = null;
  b.classList.add('out'); setTimeout(() => b.remove(), 350);
}
function addNav(S, o) {   // o: {home:[x,y,w,h]|'plank:x,y,w,h', back:...}
  const homeFn = () => goHome(), backFn = () => goBack();
  if (o.home) { if (o.home.plank) addPlank(S, o.home.plank[0], o.home.plank[1], o.home.plank[2], o.home.plank[3], 'home', homeFn); else addHot(S, ...o.home, homeFn, 'Home'); }
  if (o.back) { if (o.back.plank) addPlank(S, o.back.plank[0], o.back.plank[1], o.back.plank[2], o.back.plank[3], 'back', backFn); else addHot(S, ...o.back, backFn, 'Back'); }
  if (o.icons) { addIconBtn(S, 30, 36, 64, 'home', homeFn, 'Home'); addIconBtn(S, 106, 36, 64, 'back', backFn, 'Back'); }
  if (o.music !== false) addTopMusic(S);
}

// ============================================================
// NAVIGATION
// Back  = one step back (the screen's "parent").  Home = main Home.
// ============================================================
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
  if (S.lazyUrl && !S.loaded) { S.loaded = true; const im = S.art.querySelector('img.pic'); if (im) im.src = S.lazyUrl; S.bg.style.backgroundImage = 'url(' + S.lazyUrl + ')'; }
  layoutScreen(S);
  preloadNext(id);
  try { if (S.onShow) S.onShow(params || {}); } catch (e) { console.error(e); }
  try { Music.paint(); } catch (e) {}
}
// After a screen is showing, quietly fetch the pictures of the screens you can reach from it,
// so the next tap shows its picture straight away. Waits until the browser is idle; never blocks.
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
    b.addEventListener('click', (ev) => { ev.stopPropagation(); if (bd.keepOpen !== true) closePanel(S); try { bd.fn && bd.fn(); } catch (e) { console.error(e); } });
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
function toast(S, msg) {
  const t = el('div', 'toast', msg);
  S.el.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 1800);
}

// Run code for one second-tick while a screen is open
const Ticker = { fns: new Set(), start() { if (this.t) return; this.t = setInterval(() => this.fns.forEach(f => { try { f(); } catch (e) { console.error(e); } }), 1000); } };
Ticker.start();
