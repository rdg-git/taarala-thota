// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// The feedback receiver (functions/api/feedback.js), tested with a pretend database:
// only from the app, nothing about the sender stored, size and daily limits, preview marked as preview.
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const fn = await import('../functions/api/feedback.js');
  const rows = []; let cap = 0;
  const DB = { prepare(sql) { const st = { args: [], bind(...a) { st.args = a; return st; },
      async run() { if (/^INSERT/.test(sql)) rows.push(st.args); return {}; },
      async first() { return { n: cap }; } }; return st; } };
  const send = (origin, body, extra = {}) => fn.onRequestPost({ env: { FEEDBACK_DB: DB, ...extra },
    request: new Request('https://taarala-thota.pages.dev/api/feedback', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, origin ? { Origin: origin } : {}), body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  let r = await send('https://taarala-thota.pages.dev', { message: '  I love Bubble Pop!  ', release: '2026-10-28e', name: 'Should be ignored', email: 'x@y.z' });
  ok(r.status === 200 && rows.length === 1, 'a message from the app is stored');
  ok(rows[0].length === 4 && rows[0][1] === '2026-10-28e' && rows[0][2] === 'app' && rows[0][3] === 'I love Bubble Pop!', 'only time, release, source and the message are stored (nothing about the sender)');
  ok(!JSON.stringify(rows).includes('x@y.z') && !JSON.stringify(rows).includes('Should be ignored'), 'extra fields (like a name or email) are never stored');
  r = await send('https://test.taarala-thota.pages.dev', { message: 'preview check' });
  ok(r.status === 200 && rows[1][2] === 'preview', 'messages from the test preview are marked "preview"');
  for (const o of ['https://evil.example', 'https://taarala-thota.pages.dev.evil.example', '']) {
    r = await send(o, { message: 'spam' }); ok(r.status === 403, 'refused when not sent from the app (' + (o || 'no origin') + ')');
  }
  ok((await send('https://taarala-thota.pages.dev', { message: '   ' })).status === 400, 'empty message refused');
  ok((await send('https://taarala-thota.pages.dev', 'not json')).status === 400, 'broken request refused');
  ok((await send('https://taarala-thota.pages.dev', { message: 'x'.repeat(10001) })).status === 413, 'over 10,000 characters refused');
  cap = 300; ok((await send('https://taarala-thota.pages.dev', { message: 'one more' })).status === 429, 'daily total limit reached: politely refused');
  cap = 0; ok((await send('https://taarala-thota.pages.dev', { message: 'hi' }, { FEEDBACK_DB: undefined })).status === 503, 'database not connected yet: refused safely');
  ok((await fn.onRequest({})).status === 405, 'anything other than sending is refused (no reading from outside)');
  console.log('RESULT', n - f, 'passed', f, 'failed');
})();
