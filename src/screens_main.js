// ============================================================
// HOME, GAMES, LOVED ONES
// ============================================================
function buildHome() {
  const S = defScreen('home-view', 'home', { name: 'Home' });
  addHot(S, 130, 1010, 260, 380, () => go('games'), 'Play');
  addHot(S, 500, 1010, 240, 380, () => go('contact-view'), 'Family');
  // music button (sound on/off) with a slash when off
  const mb = addHot(S, 45, 1600, 105, 105, () => { Music.toggle(); }, 'Music'); mb.dataset.music = '1';
  const slash = el('div', 'music-state'); slash.innerHTML = '<svg viewBox="0 0 100 100"><path d="M18 82 82 18" stroke="#ffd9a0" stroke-width="7" stroke-linecap="round"/></svg>';
  mb.appendChild(slash);
  S.onShow = () => { Music.paint(); };
}

function buildGames() {
  const S = defScreen('games', 'games', { parent: 'home-view', name: 'Games' });
  const box = el('div', 'hotbox'); box.id = 'gamesContainer';     // required id, keeps the games list in one place
  place(box, 0, 0, S.W, S.H, S); S.art.appendChild(box);
  const GAME_LIST = [
    { id: 'bubble', label: 'Bubble Pop', rect: [40, 320, 380, 440], plaque: [90, 676, 276, 76], fn: () => go('bubble-home') },
    { id: 'minesweeper', label: 'Minesweeper', rect: [520, 540, 400, 390], plaque: [590, 842, 262, 70], fn: () => go('ms-home') },
    { id: 'checkers', label: 'Checkers', rect: [60, 905, 410, 300], plaque: [106, 1110, 304, 82], fn: () => go('ck-entry') },
    { id: 'chess', label: 'Chess', rect: [520, 1075, 395, 430], plaque: [562, 1404, 322, 84], fn: () => go('chs-entry') }
  ];
  GAME_LIST.forEach(g => {
    const b = addHot(S, g.rect[0], g.rect[1], g.rect[2], g.rect[3], g.fn, g.label);
    b.dataset.game = g.id; box.appendChild(b);
    addText(S, 'game-label', g.plaque[0], g.plaque[1], g.plaque[2], g.plaque[3], g.label.length > 9 ? 34 : 44, g.label);
  });
  addText(S, 'game-title', 150, 128, 520, 70, 46, 'Choose Your Adventure');
  addIconBtn(S, 30, 36, 64, 'home', goHome, 'Home'); addIconBtn(S, 106, 36, 64, 'back', goBack, 'Back');
  addTopMusic(S);
}

function buildLoved() {
  const S = defScreen('contact-view', 'loved', { parent: 'home-view', name: 'Loved Ones' });
  addNav(S, { icons: true });
  addText(S, 'loved-title', 100, 150, 520, 140, 100, 'Loved Ones');
  const scroll = el('div', 'loved-scroll'); place(scroll, 70, 360, 711, 1280, S); S.art.appendChild(scroll);
  S.scroll = scroll;
  S.onShow = () => renderLoved(S);
}
// Contacts are kept only on this phone. (Adding/editing them arrives with the Settings screen.)
let CONTACTS = [];
function lovedPeople() {
  return CONTACTS.filter(m => m && !!sanitizePhone(m.phone || ''))          // only people with a valid WhatsApp number
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
function renderLoved(S) {
  const sc = S.scroll; if (!sc) return;
  sc.innerHTML = '';
  const people = lovedPeople();
  if (!people.length) {
    sc.appendChild(el('div', 'loved-empty', 'No one is here yet.<br>When someone is added, they will appear here.'));
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
    ring.style.background = accentFor(m);
    ring.textContent = initialOf(m.name);                                   // plain text, never read as code
    card.appendChild(ring);
    const nm = el('div', 'med-name'); nm.textContent = m.name || ''; card.appendChild(nm);
    card.addEventListener('click', () => {
      const digits = (sanitizePhone(m.phone || '') || '').replace(/\D/g, '');
      if (!digits) return;
      window.open('https://wa.me/' + digits, '_blank', 'noopener');
    });
    grid.appendChild(card);
  });
  sc.appendChild(grid);
}
