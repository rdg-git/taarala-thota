// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
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
