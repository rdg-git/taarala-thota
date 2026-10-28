// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// QR CODE (drawn by the app itself; no outside service is ever asked to make it)
// Used by the "Best on your phone" card on laptops: the code holds this site's own address,
// so a phone camera can open the app. Standard QR (ISO 18004): byte mode, error correction level M,
// sizes 1 to 9 (addresses up to about 180 characters). Returns SVG markup, or '' if the text is too long.
// ============================================================
const QR_EC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22];   // level M, by size (version)
const QR_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5];

function qrMul(x, y) {                       // multiply in the QR number field GF(256)
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
  return z & 0xFF;
}
function qrDivisor(deg) {
  const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1;
  for (let k = 0; k < deg; k++) {
    for (let j = 0; j < deg; j++) { r[j] = qrMul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; }
    root = qrMul(root, 2);
  }
  return r;
}
function qrRemainder(data, div) {             // the error-correction bytes for one block
  const r = new Array(div.length).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= qrMul(c, f); }); }
  return r;
}
function qrRawModules(v) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
}
function qrAlignPositions(v, size) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, r = [6];
  for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p);
  return r;
}
function qrSvg(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let v = 1;
  const dataCap = (ver) => Math.floor(qrRawModules(ver) / 8) - QR_EC_PER_BLOCK[ver] * QR_BLOCKS[ver];
  while (v <= 9 && 4 + 8 + bytes.length * 8 > dataCap(v) * 8) v++;
  if (v > 9) return '';
  const size = v * 4 + 17, cap = dataCap(v);
  // 1. the message as bits: mode (byte), length, the bytes, end marker, padding
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xEC; data.length < cap; pad ^= 0xEC ^ 0x11) data.push(pad);
  // 2. split into blocks, add error correction, interleave
  const nb = QR_BLOCKS[v], ecl = QR_EC_PER_BLOCK[v], raw = Math.floor(qrRawModules(v) / 8);
  const nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = qrDivisor(ecl), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - ecl + (i < nShort ? 0 : 1)); k += dat.length;
    const ec = qrRemainder(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ec));
  }
  const all = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecl || j >= nShort) all.push(b[i]); });
  // 3. the fixed patterns (corner squares, timing lines, alignment squares, size information)
  const M = [], F = [];
  for (let y = 0; y < size; y++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
  const fn = (x, y, dark) => { M[y][x] = dark; F[y][x] = true; };
  for (let i = 0; i < size; i++) { fn(6, i, i % 2 === 0); fn(i, 6, i % 2 === 0); }
  [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) fn(x, y, d !== 2 && d !== 4);
    }
  });
  const al = qrAlignPositions(v, size), last = al.length - 1;
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask) => {
    const d = (0 << 3) | mask; let r = d;                       // level M = 0
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) fn(8, i, bit(i));
    fn(8, 7, bit(6)); fn(8, 8, bit(7)); fn(7, 8, bit(8));
    for (let i = 9; i < 15; i++) fn(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) fn(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) fn(8, size - 15 + i, bit(i));
    fn(8, size - 8, true);
  };
  drawFormat(0);                                                // reserve the format areas
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const dark = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); fn(a, c, dark); fn(c, a, dark); }
  }
  // 4. place the message bits in the zigzag order
  let n = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!F[y][x] && n < all.length * 8) { M[y][x] = ((all[n >>> 3] >>> (7 - (n & 7))) & 1) === 1; n++; }
    }
  }
  // 5. try the 8 standard masks and keep the easiest one to scan
  const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && maskFn[m](x, y)) M[y][x] = !M[y][x]; };
  const penalty = () => {
    let p = 0, dark = 0;
    for (let a = 0; a < 2; a++) for (let i = 0; i < size; i++) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const c = a ? M[j][i] : M[i][j], pr = a ? M[j - 1][i] : M[i][j - 1];
        if (c === pr) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
      }
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (M[y][x]) dark++;
      if (x < size - 1 && y < size - 1 && M[y][x] === M[y][x + 1] && M[y][x] === M[y + 1][x] && M[y][x] === M[y + 1][x + 1]) p += 3;
    }
    return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } applyMask(m); }
  applyMask(best); drawFormat(best);
  // 6. draw it (4 squares of quiet space around it, as the standard asks)
  let path = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (M[y][x]) path += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
  return '<svg viewBox="0 0 ' + (size + 8) + ' ' + (size + 8) + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="100%" height="100%" fill="#fff6e0"/><path d="' + path + '" fill="#1a1208"/></svg>';
}
