// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
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
