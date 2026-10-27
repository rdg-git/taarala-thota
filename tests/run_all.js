// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// Runs every test file one after another with the local server. Usage: node tests/run_all.js
const { start } = require('./serve'), { execFile } = require('child_process'), path = require('path');
const run = (f) => new Promise(r => execFile('node', [f], { encoding: 'utf8', timeout: 400000 }, (e, so, se) => r((so || '') + (e ? (se || '') + '\nCRASHED' : ''))));   // async, so the server keeps answering
const TESTS = ['func', 'func2', 'chess_rules', 'music_off', 'music_firsttap', 'privacy', 'contacts', 'backup', 'pictures', 'preload', 'pwa', 'security', 'fill', 'hints', 'steady', 'taps', 'upright'];
(async () => {
  const srv = await start(8765); let bad = 0;
  for (const t of TESTS) {
    let out = '';
    out = await run(path.join(__dirname, t + '.js'));
    const fails = out.split('\n').filter(l => /^FAIL|CRASHED|Error/.test(l));
    const summary = (out.match(/RESULT.*|ALL PASSED|FAILED/g) || ['?']).pop();
    console.log((fails.length ? 'XX ' : 'ok ') + t.padEnd(16) + summary + (fails.length ? '\n   ' + fails.join('\n   ') : ''));
    if (fails.length) bad++;
  }
  srv.close(); console.log(bad ? bad + ' test file(s) with problems' : 'ALL TEST FILES PASSED'); process.exit(bad ? 1 : 0);
})();
