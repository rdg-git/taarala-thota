// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// The feedback receiver (functions/api/feedback.js), tested with a pretend database and a pretend Turnstile check:
// only from the app, nothing about the sender stored, size and daily limits, preview marked as preview, and the
// Production Turnstile rules (mandatory, fails closed, hostname checked).
let f = 0, n = 0; const ok = (c, m) => { n++; console.log(c ? 'PASS' : 'FAIL', m); if (!c) f++; };
(async () => {
  const fn = await import('../functions/api/feedback.js');
  const rows = []; let cap = 0;
  const DB = { prepare(sql) { const st = { args: [], bind(...a) { st.args = a; return st; },
      async run() { if (/^INSERT/.test(sql)) rows.push(st.args); return {}; },
      async first() { return { n: cap }; } }; return st; } };

  // Pretend Turnstile "siteverify": returns whatever we set, or throws when we ask it to.
  let sv = { success: true, hostname: 'taarala-thota.pages.dev' };   // default: a good check on the official host
  let svThrow = false;
  global.fetch = async (url) => {
    if (String(url).includes('siteverify')) { if (svThrow) throw new Error('network down'); return { json: async () => sv }; }
    throw new Error('unexpected fetch: ' + url);
  };

  const SECRET = 'test-secret';
  // One call. host decides the environment; origin defaults to match the host unless overridden; secret/ts optional.
  const send = (o = {}) => {
    const host = o.host || 'taarala-thota.pages.dev';
    const headers = { 'Content-Type': 'application/json' };
    headers.Origin = o.origin !== undefined ? o.origin : 'https://' + host;
    const env = { FEEDBACK_DB: ('db' in o ? o.db : DB) };
    if (o.secret !== undefined) env.TURNSTILE_SECRET = o.secret;
    const bodyStr = typeof o.body === 'string' ? o.body : JSON.stringify(o.body || {});
    return fn.onRequestPost({ env, request: new Request('https://' + host + '/api/feedback', { method: 'POST', headers, body: bodyStr }) });
  };
  // A valid Production submission needs the secret, a token, and a good siteverify result.
  const prod = (body) => send({ secret: SECRET, body });

  // ---- Production happy path + privacy ----
  sv = { success: true, hostname: 'taarala-thota.pages.dev' };
  let r = await prod({ message: '  I love Bubble Pop!  ', release: '2026-10-28e', ts: 'good-token', name: 'Should be ignored', email: 'x@y.z' });
  ok(r.status === 200 && rows.length === 1, 'a valid message from the app is stored');
  ok(rows[0].length === 4 && rows[0][1] === '2026-10-28e' && rows[0][2] === 'app' && rows[0][3] === 'I love Bubble Pop!', 'only time, release, source and the message are stored (nothing about the sender)');
  ok(!JSON.stringify(rows).includes('x@y.z') && !JSON.stringify(rows).includes('Should be ignored') && !JSON.stringify(rows).includes('good-token'), 'extra fields (name, email, anti-spam token) are never stored');

  // ---- Preview: separate space, no secret, skips Turnstile, marked "preview" ----
  r = await send({ host: 'test.taarala-thota.pages.dev', body: { message: 'preview check' } });
  ok(r.status === 200 && rows[1][2] === 'preview', 'a message from the test preview is accepted and marked "preview"');

  // ---- Not from the app: bad origin or unknown host ----
  for (const o of ['https://evil.example', 'https://taarala-thota.pages.dev.evil.example', '']) {
    r = await send({ origin: o, secret: SECRET, body: { message: 'spam', ts: 'good-token' } });
    ok(r.status === 403, 'refused when the Origin is not the app (' + (o || 'no origin') + ')');
  }
  r = await send({ host: 'evil.example', body: { message: 'spam' } });
  ok(r.status === 403, 'refused when served on an unrecognised host (fails closed)');

  // ---- Basic validation (these refuse before Turnstile) ----
  ok((await send({ body: { message: '   ' } })).status === 400, 'empty message refused');
  ok((await send({ body: 'not json' })).status === 400, 'broken request refused');
  ok((await send({ body: { message: 'x'.repeat(10001) } })).status === 413, 'over 10,000 characters refused');

  // ---- The six Turnstile scenarios ----
  sv = { success: true, hostname: 'taarala-thota.pages.dev' };
  ok((await prod({ message: 'valid', ts: 'good-token' })).status === 200, 'Turnstile: valid token + approved hostname -> accepted');
  sv = { success: true, hostname: 'evil.example' };
  ok((await prod({ message: 'valid but wrong host', ts: 'good-token' })).status === 403, 'Turnstile: valid token on an UNAUTHORISED hostname -> refused');
  sv = { success: true };   // no hostname field
  ok((await prod({ message: 'no host', ts: 'good-token' })).status === 403, 'Turnstile: MISSING hostname -> refused');
  sv = { success: false, 'error-codes': ['invalid-input-response'] };
  ok((await prod({ message: 'bad token', ts: 'bad-token' })).status === 403, 'Turnstile: INVALID token -> refused');
  ok((await prod({ message: 'no token' })).status === 403, 'Turnstile: MISSING token -> refused');
  sv = { success: true, hostname: 'taarala-thota.pages.dev' }; svThrow = true;
  ok((await prod({ message: 'verify down', ts: 'good-token' })).status === 403, 'Turnstile: siteverify FAILS/unreachable -> refused (fails closed)');
  svThrow = false;

  // ---- Production fails closed when its secret is missing (never silently skips verification) ----
  ok((await send({ body: { message: 'secret gone', ts: 'good-token' } })).status === 503, 'Production with NO secret -> refused with a configuration error (never bypassed)');

  // ---- Daily total cap, no database, and method guard ----
  sv = { success: true, hostname: 'taarala-thota.pages.dev' };
  cap = 300; ok((await prod({ message: 'one more', ts: 'good-token' })).status === 429, 'daily total limit reached: politely refused');
  cap = 0;
  ok((await send({ db: undefined, body: { message: 'hi' } })).status === 503, 'database not connected yet: refused safely');
  ok((await fn.onRequest({})).status === 405, 'anything other than sending is refused (no reading from outside)');

  console.log('RESULT', n - f, 'passed', f, 'failed');
  if (f) process.exit(1);
})();
