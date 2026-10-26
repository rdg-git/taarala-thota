// ============================================================
// HOME, GAMES, LOVED ONES
// ============================================================

// ------------------------------------------------------------
// HOME
// The painted Play and Family doors are tap areas. The app adds: the Settings gear (top right, opens with
// the passcode), the "Privacy & safety" link (bottom), and the music button over the painted note.
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
  // small "Privacy & safety" link at the bottom
  const pl = el('button', 'privacy-link'); pl.type = 'button'; pl.textContent = 'Privacy & safety';
  place(pl, 246, 1748, 360, 72, S); pl.style.fontSize = 'calc(var(--u) * 38)';
  pl.addEventListener('click', (ev) => { ev.stopPropagation(); go('privacy'); });
  S.art.appendChild(pl);
  S.onShow = () => {
    Music.paint();
    setTimeout(() => { if (CUR !== 'home-view') return; if (PWA.updateReady && !PWA.dismissed) showUpdateCard(); else maybeRemindBackup(S); }, 700);
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
