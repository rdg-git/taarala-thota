// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// ANONYMOUS FEEDBACK (the app's only server code; runs on Cloudflare Pages Functions, free plan)
// Receives one message from the in-app feedback box and stores it in the FEEDBACK_DB database (Cloudflare D1).
// Stored with each message: the message, the date and time, the app release, and whether it came from the live app
// ("app") or the test preview ("preview"). Never stored: name, email, IP address, browser details or the anti-spam
// token, nor anything else about the sender.
// Which environment a request is in is decided by the hostname Cloudflare actually served it on (not the Origin
// header, which a script can forge). Production (taarala-thota.pages.dev) and preview (*.taarala-thota.pages.dev)
// use SEPARATE databases, bound to the same name FEEDBACK_DB in each environment.
// Protections: a blocked honeypot field (handled client-side), the browser Origin must be the app's own address,
// a few kilobytes at most, no more than DAILY_CAP messages a day in total, and — in Production — a mandatory
// Cloudflare Turnstile check. Production FAILS CLOSED: a missing secret, a missing or invalid token, or a token
// solved on any host other than the official one is refused. Preview is a sign-in-protected, separate-database
// test space, so it may run without Turnstile when no Secret is set there.
// The creator reads messages in the Cloudflare dashboard (D1 > taarala-feedback > Console; preview in
// taarala-feedback-preview).
// ============================================================
const PROD_HOST = 'taarala-thota.pages.dev';                                  // the one official production host
const PREVIEW_HOST = /^[a-z0-9-]+\.taarala-thota\.pages\.dev$/;               // test. or <hash>. preview deployments
const OFFICIAL_ORIGIN = 'https://' + PROD_HOST;
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.taarala-thota\.pages\.dev$/;
const MAX_CHARS = 10000;      // about four pages of text: generous, but stops someone pasting a whole book
const DAILY_CAP = 300;        // total messages per day (UTC), from everyone together

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  // 1) Which environment served this request? Decided by the real hostname, which Cloudflare routing sets and a
  //    client cannot forge into the other environment. An unrecognised host fails closed.
  let host = '';
  try { host = new URL(request.url).hostname; } catch (e) { host = ''; }
  const isProd = host === PROD_HOST;
  const isPreview = !isProd && PREVIEW_HOST.test(host);
  if (!isProd && !isPreview) return json(403, { ok: false, error: 'bad-host' });
  const source = isProd ? 'app' : 'preview';

  // 2) Secondary guard: the browser's Origin must still be the app's own address (blocks cross-site form posts).
  const origin = request.headers.get('Origin') || '';
  if (origin !== OFFICIAL_ORIGIN && !PREVIEW_ORIGIN.test(origin)) return json(403, { ok: false, error: 'not-from-app' });

  if (!env.FEEDBACK_DB) return json(503, { ok: false, error: 'not-set-up' });
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 64 * 1024) return json(413, { ok: false, error: 'too-long' });
  let body;
  try { body = await request.json(); } catch (e) { return json(400, { ok: false, error: 'bad-request' }); }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const release = typeof body.release === 'string' && /^\d{4}-\d{2}-\d{2}[a-z]?$/.test(body.release) ? body.release : '';
  if (!message) return json(400, { ok: false, error: 'empty' });
  if (Array.from(message).length > MAX_CHARS) return json(413, { ok: false, error: 'too-long' });

  // 3) Turnstile. Mandatory in Production (and in any environment that has a Secret set). Fails closed: if this
  //    environment must verify but has no Secret, refuse rather than silently accept. A real person's token passes;
  //    a script has none. The token is verified server-side and must have been solved on the official host.
  const mustVerify = isProd || !!env.TURNSTILE_SECRET;
  if (mustVerify) {
    if (!env.TURNSTILE_SECRET) return json(503, { ok: false, error: 'misconfigured' });   // never bypass verification
    const token = typeof body.ts === 'string' ? body.ts : '';
    if (!token) return json(403, { ok: false, error: 'turnstile' });
    let human = false;
    try {
      const form = new URLSearchParams();
      form.append('secret', env.TURNSTILE_SECRET);
      form.append('response', token);
      const ip = request.headers.get('CF-Connecting-IP');
      if (ip) form.append('remoteip', ip);
      const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
      const vj = await vr.json();
      // Accept only a successful check whose hostname is the official production host (defence in depth: reject a
      // token minted for another site, and reject a missing or unexpected hostname).
      human = !!(vj && vj.success === true && vj.hostname === PROD_HOST);
    } catch (e) { human = false; }
    if (!human) return json(403, { ok: false, error: 'turnstile' });
  }

  try {
    await env.FEEDBACK_DB.prepare('CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, release TEXT, source TEXT, message TEXT NOT NULL)').run();
    const today = new Date().toISOString().slice(0, 10);
    const row = await env.FEEDBACK_DB.prepare('SELECT COUNT(*) AS n FROM feedback WHERE created_at >= ?').bind(today).first();
    if (row && row.n >= DAILY_CAP) return json(429, { ok: false, error: 'busy' });
    await env.FEEDBACK_DB.prepare('INSERT INTO feedback (created_at, release, source, message) VALUES (?, ?, ?, ?)')
      .bind(new Date().toISOString().slice(0, 16).replace('T', ' '), release, source, message).run();
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { ok: false, error: 'server' });
  }
}
// anything other than sending a message is refused
export async function onRequest() { return json(405, { ok: false, error: 'method' }); }
