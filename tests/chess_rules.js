const mk = require('../src/chess_engine.js'); const E = mk();
function fen(f){ const p=f.split(' '), b=new Array(64).fill(null); let i=0;
  for (const ch of p[0]) { if (ch==='/') continue; if (/\d/.test(ch)) i+=+ch; else { b[i++]=(ch===ch.toUpperCase()?'w':'b')+ch.toUpperCase(); } }
  const c=p[2]||'-'; const ep=p[3]&&p[3]!=='-'?(8-(+p[3][1]))*8+(p[3].charCodeAt(0)-97):null;
  const s={board:b,turn:p[1],castling:{wK:c.includes('K'),wQ:c.includes('Q'),bK:c.includes('k'),bQ:c.includes('q')},ep,halfmove:+(p[4]||0),fullmove:+(p[5]||1),keys:[],lastMove:null,captured:null};
  return s; }
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('PASS',m)}else{fail++;console.log('FAIL',m)} };
const pf=[['start','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',4,197281],
 ['kiwipete','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',3,97862],
 ['pos3','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',4,43238],
 ['pos4','r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',3,9467],
 ['pos5','rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',3,62379]];
for (const [n,f,d,e] of pf) { const got=E.perft(fen(f),d); ok(got===e, 'perft '+n+' depth '+d+' = '+e+' (got '+got+')'); }
const st=(f,keys)=>{const s=fen(f); if(keys) s.keys=keys; return E.status(s);};
ok(st('8/8/8/8/8/5k2/8/5K2 w - - 0 1').result==='insufficient','K v K dead');
ok(st('8/8/8/8/8/5k2/8/4BK2 w - - 0 1').result==='insufficient','K+B v K dead');
ok(st('8/8/8/8/8/5k2/8/3NK3 w - - 0 1').result==='insufficient','K+N v K dead');
ok(st('8/8/8/8/8/3k4/8/2NNK3 w - - 0 1').over===false,'K+N+N v K not automatic');
ok(st('8/8/8/8/8/3k1n2/8/3NK3 w - - 0 1').over===false,'K+N v K+N not automatic');
ok(st('8/8/8/8/8/2bk4/8/2B1K3 w - - 0 1').result==='insufficient','K+B v K+B same colour bishops dead');
ok(st('8/8/8/8/8/3k1b2/8/2B1K3 w - - 0 1').over===false,'K+B v K+B opposite colour not automatic');
ok(st('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').result==='stalemate','stalemate');
ok(st('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1').result==='checkmate','checkmate');
ok(st('4k3/8/8/8/8/8/4P3/4K3 w - - 100 80').claimable==='fifty','50-move claimable at 100 halfmoves');
ok(st('4k3/8/8/8/8/8/4P3/4K3 w - - 99 80').claimable===null,'not claimable at 99');
ok(st('4k3/8/8/8/8/8/4P3/4K3 w - - 150 80').result==='seventyfive','75-move automatic at 150');
ok(st('R5k1/8/6K1/8/8/8/8/8 b - - 150 80').result==='checkmate','checkmate on the 75th move beats 75-move draw');
const s0=fen('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'); const k='x'; 
const s3=Object.assign({},s0,{keys:[]}); load3(); function load3(){ const key=(function(){const t=E.applyMove(s0,E.legalMoves(s0).find(m=>m.from===60&&m.to===61)); return null;})(); }
// repetition by shuffling kings
let s=E.initialState(); const mv=(s,f,t)=>E.applyMove(s,E.legalMoves(s).find(m=>m.from===f&&m.to===t));
const seq=[[62,45],[6,21],[45,62],[21,6]]; let cnt=0, claim=null, over=null;
for (let r=0;r<5;r++){ for (const [f,t] of seq){ s=mv(s,f,t); const q=E.status(s); if(q.claimable&&!claim) claim=[r,q.claimable]; if(q.over&&!over) over=[r,q.result]; } }
ok(claim&&claim[1]==='threefold','threefold repetition becomes claimable ('+JSON.stringify(claim)+')');
ok(over&&over[1]==='fivefold','fivefold repetition automatic draw ('+JSON.stringify(over)+')');
// castling: not through/out of/into check, rights lost
ok(E.legalMoves(fen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')).filter(m=>m.flag&&m.flag.startsWith('castle')).length===2,'castling both sides available');
ok(E.legalMoves(fen('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1')).filter(m=>m.flag==='castleK').length===0,'cannot castle through attacked f1');
ok(E.legalMoves(fen('r3k2r/8/8/8/8/8/8/R3K2R w Q - 0 1')).filter(m=>m.flag==='castleK').length===0,'no castling without right');
ok(E.legalMoves(fen('r3k2r/8/8/8/8/1r6/8/R3K2R w KQkq - 0 1')).filter(m=>m.flag==='castleQ').length===1,'queenside castle allowed when b1 attacked but not c1/d1');
ok(E.legalMoves(fen('r3k2r/8/8/8/4r3/8/8/R3K2R w KQkq - 0 1')).filter(m=>m.flag&&m.flag.startsWith('castle')).length===0,'cannot castle out of check');
// en passant
ok(E.legalMoves(fen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1')).some(m=>m.flag==='ep'),'en passant available');
console.log('RESULT',pass,'passed',fail,'failed');
