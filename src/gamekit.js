// ============================================================
// GAME KIT shared by Chess and Checkers:
// computer-player helper (runs in the background so the screen never freezes),
// results history ("Stats"), 60-minute resume rule
// ============================================================
const RESUME_MS = 60 * 60 * 1000;
const PACE_MS = { easy: 2000, medium: 1000, hard: 0 };      // minimum time before the computer replies
const LEVEL_NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

function makeAI(factory) {
  let w = null, id = 0, pending = {};
  const E = factory();
  function fallback() { const p = pending; pending = {}; Object.keys(p).forEach(k => { try { p[k].cb(E.bestMove(p[k].state, p[k].level)); } catch (e) { p[k].cb(null); } }); }
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
const Results = {
  list(game) { return Store.get(game + ':stats', []); },
  add(game, result, level, extra) {
    const l = this.list(game); l.push(Object.assign({ r: result, d: level, t: nowMs() }, extra || {}));
    Store.set(game + ':stats', l.slice(-10));
  },
  counts(game) { const c = { won: 0, lost: 0, forfeited: 0, draw: 0 }; this.list(game).slice(-10).forEach(x => { if (c[x.r] != null) c[x.r]++; }); return c; }
};
const Totals = {
  get(game) { return Object.assign({ won: 0, lost: 0, forfeited: 0 }, Store.get(game + ':totals', {})); },
  bump(game, r) { const t = this.get(game); if (t[r] != null) t[r]++; Store.set(game + ':totals', t); }
};
function fmtDay(ts) { const d = new Date(ts); return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; }
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
function paintStats(S, game, geo) {
  const c = Results.counts(game);
  S.statEls.forEach(x => x.remove()); S.statEls = [];
  const push = (e) => { S.statEls.push(e); return e; };
  [['won', geo.tiles[0]], ['lost', geo.tiles[1]], ['forfeited', geo.tiles[2]], ['draw', geo.tiles[3]]].forEach(([k, r]) => {
    push(addText(S, 'stat-num', r[0], r[1], r[2], r[3], geo.numFs, String(c[k])));
  });
  const list = Results.list(game).slice(-10).reverse();
  for (let i = 0; i < 10; i++) {
    const x = list[i]; if (!x) continue;
    const y = geo.rowY + i * geo.rowH;
    const row = push(addText(S, 'stat-row', geo.rowX, y, geo.rowW, geo.rowH, geo.rowFs, ''));
    row.innerHTML = '<span class="sr-l"><b class="r-' + x.r + '">' + RESULT_WORD[x.r] + '</b> · ' + LEVEL_NAME[x.d] + '</span><span class="sr-r">' + fmtDay(x.t) + '</span>';
  }
}
