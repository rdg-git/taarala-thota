// ============================================================
// INTERNATIONAL CHECKERS 10x10 screens (rules and computer player: checkers_engine.js)
// You play White (light pieces, move first, start at the bottom).
// ============================================================
function ckPieceSVG(p) {
  const white = p === 'w' || p === 'W', king = p === 'W' || p === 'B';
  const f1 = white ? '#fbf3dc' : '#4a4a55', f2 = white ? '#d9c590' : '#17171d', ring = white ? '#a8873f' : '#c9ac68';
  let s = '<svg class="dk" viewBox="0 0 100 100"><defs><radialGradient id="g' + (white ? 'w' : 'b') + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="' + f1 + '"/><stop offset="1" stop-color="' + f2 + '"/></radialGradient></defs>' +
    '<circle cx="50" cy="54" r="42" fill="#0006"/><circle cx="50" cy="50" r="42" fill="url(#g' + (white ? 'w' : 'b') + ')" stroke="' + ring + '" stroke-width="4"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke="' + ring + '" stroke-width="2" opacity=".7"/>';
  if (king) s += '<path d="M28 62 24 38l14 12 12-18 12 18 14-12-4 24z" fill="#f2c14e" stroke="#8a5a10" stroke-width="2.500" stroke-linejoin="round"/>';
  return s + '</svg>';
}
const CK = { ai: null, E: null, G: null, sel: null, cands: [], step: 0, busy: false, gen: 0, S: null, pendingLevel: null, justForfeited: false };

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
  for (let i = 0; i < 100; i++) { const c = el('button', 'kcell'); c.type = 'button'; c.addEventListener('click', () => ckTap(i)); B.boardEl.appendChild(c); }
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
  if (g && Saved.expired(g) && !g.over) { Results.add('checkers', 'forfeited', g.level); CK.lastLevel = g.level; Saved.clear('checkers'); CK.justForfeited = true; }
}
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
function ckRender() {
  const S = CK.S, G = CK.G, E = CK.E, st = G.state, cells = S.boardEl.children;
  const sts = E.status(st), last = st.lastMove;
  // squares to highlight as destinations
  const dest = {};
  if (CK.sel != null) CK.cands.forEach(m => { const sq = CK.step === 0 ? m.to : m.path[CK.step]; dest[sq] = 1; });
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
function ckCanUndo() { const G = CK.G; return !!(G && !G.over && !CK.busy && G.level === 'easy' && G.undo.length && G.state.turn === 'w'); }
function ckUndoTap() { if (ckCanUndo()) ckUndo(); }
function ckUndo() {
  const G = CK.G; if (!G || G.over || CK.busy || G.level !== 'easy' || !G.undo.length) return;
  const u = G.undo.pop(); G.state = u.state; G.capHuman = u.capHuman; G.capComp = u.capComp; G.last = nowMs();
  CK.sel = null; CK.cands = []; CK.step = 0; Saved.set('checkers', G); ckRender();
}
function ckTick() {
  const S = CK.S; if (!S) return;
  if (S.el.classList.contains('active') && CK.G && !CK.G.over && Saved.expired(CK.G)) {
    const G = CK.G; G.over = true; CK.gen++; CK.busy = false;
    Results.add('checkers', 'forfeited', G.level); CK.lastLevel = G.level; Saved.clear('checkers');
    ckRender(); S.art.classList.add('dim'); go('ck-result-forfeit');
  }
  const E = SCREENS['ck-entry-r'];
  if (E && E.el.classList.contains('active') && E.sub) { const g = ckActive(); if (g) E.sub.textContent = LEVEL_NAME[g.level] + ' · ' + Saved.minsLeft(g) + ' min left'; else go('ck-entry'); }
}
