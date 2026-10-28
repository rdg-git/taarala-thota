// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Tiny local web server for tests: serves public/ and applies the rules in public/_headers
// (the same file Cloudflare reads), so security rules are tested before they go live.
// Like Cloudflare, it redirects .../index.html to .../ (this once broke the offline helper, so tests must see it).
// Usage: node tests/serve.js [port]   or   require('./serve').start(port)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif',
  '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
function rules() {   // parse _headers: "path pattern" lines followed by indented "Name: value" lines
  const out = []; let cur = null;
  try { fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split(/\r?\n/).forEach(l => {
    if (!l.trim() || l.trim().startsWith('#')) return;
    if (/^\S/.test(l)) { cur = { re: new RegExp('^' + l.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'), h: [] }; out.push(cur); }
    else if (cur) { const i = l.indexOf(':'); cur.h.push([l.slice(0, i).trim(), l.slice(i + 1).trim()]); }
  }); } catch (e) {}
  return out;
}
function start(port) {
  const srv = http.createServer((req, res) => {
    // like Cloudflare Pages: an address ending in /index.html is permanently redirected to the folder address (/)
    const q = req.url.indexOf('?');
    if (/\/index\.html$/.test(req.url.split('?')[0])) { res.writeHead(308, { Location: req.url.split('?')[0].replace(/index\.html$/, '') + (q >= 0 ? req.url.slice(q) : '') }); res.end(); return; }
    let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    const file = path.join(ROOT, u);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' };
    const p = req.url.split('?')[0];
    rules().forEach(r => { if (r.re.test(p)) r.h.forEach(([k, v]) => { headers[k] = v; }); });
    res.writeHead(200, headers); fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => srv.listen(port || 8765, '127.0.0.1', () => r(srv)));
}
module.exports = { start };
if (require.main === module) start(+process.argv[2] || 8765).then(() => console.log('serving public/ on http://localhost:' + (+process.argv[2] || 8765)));
