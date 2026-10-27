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
