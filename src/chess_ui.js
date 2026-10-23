// ============================================================
// CHESS screens (rules and computer player come from chess_engine.js)
// ============================================================
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

const CH = { ai: null, E: null, G: null, sel: null, legal: [], busy: false, gen: 0, S: null, flip: false, pendingLevel: null, justForfeited: false, declined: null };

function chsInit() {
  CH.ai = makeAI(makeChessEngine); CH.E = CH.ai.E;
}
function chsActive() { const g = Saved.get('chess'); return g && !Saved.expired(g) ? g : null; }
// if a saved game ran past 60 minutes, record Forfeited once and tidy up
function chsExpireIfNeeded() {
  const g = Saved.get('chess');
  if (g && Saved.expired(g) && !g.over) { Results.add('chess', 'forfeited', g.level); Saved.clear('chess'); CH.justForfeited = true; }
}

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
      if (CH.justForfeited) { CH.justForfeited = false; showPanel(S, { icon: '⏳', title: 'Game Forfeited', text: '60 minutes since your last move', buttons: [{ label: 'Chess Home' }] }); }
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

function chsPickLevel(level) {
  CH.pendingLevel = level;
  if (chsActive()) {
    showPanel(SCREENS[CUR], { title: 'Start a new game?', text: 'Starting a new game will forfeit your current game. Your current progress will be lost.',
      buttons: [{ label: 'Keep Current Game', secondary: true }, { label: 'Start New Game', fn: () => { chsForfeitCurrent(); go('chs-side'); } }] });
  } else go('chs-side');
}
function chsForfeitCurrent() { const old = Saved.get('chess'); if (old && !old.over) Results.add('chess', 'forfeited', old.level); Saved.clear('chess'); }
function chsStart(side) {
  const E = CH.E;
  CH.G = { state: E.initialState(), level: CH.pendingLevel || 'easy', side, last: nowMs(), undo: [], capHuman: [], capComp: [], over: false };
  Saved.set('chess', CH.G);
  go('chs-board', { fresh: true });
}
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
    const lm = CH.legal.find(m => m.to === idx); if (lm) cls += lm.capture ? ' destcap' : ' dest';
    if (last && (last.from === idx || last.to === idx)) cls += ' last';
    if (sts.inCheck && sts.kingSquare === idx) cls += ' chk';
    c.className = cls;
    c.innerHTML = p ? chessPieceSVG(p) : '';
  }
  // captured pieces on the two wooden planks
  const draw = (box, arr) => { box.innerHTML = ''; arr.slice().sort((a, b) => CH_VAL[b[1]] - CH_VAL[a[1]]).forEach(code => { const s = el('span', 'cap', chessPieceSVG(code)); box.appendChild(s); }); };
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
  S.undoTop.style.display = G.level === 'easy' ? '' : 'none';
  S.undoTop.classList.toggle('off', !chsCanUndo()); S.undoTop.disabled = !chsCanUndo();
}
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
const CHS_TEXT = {
  checkmate: ['Checkmate', ''], stalemate: ['Stalemate', 'No safe move is left, so it is a draw.'],
  insufficient: ['Draw', 'There are not enough pieces left to checkmate.'], fivefold: ['Draw', 'The same position happened five times.'],
  seventyfive: ['Draw', '75 moves passed without a capture or a pawn move.'],
  'claim-threefold': ['Draw', 'You claimed a draw: same position three times.'], 'claim-fifty': ['Draw', 'You claimed a draw: 50 moves without a capture or pawn move.']
};
function chsEnd(sts) {
  const G = CH.G, S = CH.S; G.over = true; CH.busy = false; CH.gen++;
  let res = 'draw', title, text;
  if (sts.result === 'checkmate') { res = sts.winner === G.side ? 'won' : 'lost'; title = res === 'won' ? 'You Won!' : 'You Lost'; text = res === 'won' ? 'Checkmate. Well played!' : 'Checkmate. Good try, play again soon!'; }
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
function chsTick() {
  const S = CH.S; if (!S) return;
  if (S.el.classList.contains('active') && CH.G && !CH.G.over && Saved.expired(CH.G)) {
    const G = CH.G; G.over = true; CH.gen++; CH.busy = false;
    Results.add('chess', 'forfeited', G.level); Saved.clear('chess');
    chsRender(); S.art.classList.add('dim'); closePanel(S);
    showPanel(S, { icon: '⏳', title: 'Game Forfeited', text: '60 minutes since your last move', buttons: [{ label: 'Chess Home', fn: () => go('chs-entry') }] });
  }
  ['chs-entry-r'].forEach(id => { const E = SCREENS[id]; if (E && E.el.classList.contains('active') && E.sub) { const g = chsActive(); if (g) E.sub.textContent = LEVEL_NAME[g.level] + ' · ' + Saved.minsLeft(g) + ' min left'; else go('chs-entry'); } });
}
