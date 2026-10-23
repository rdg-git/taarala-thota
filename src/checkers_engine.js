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
