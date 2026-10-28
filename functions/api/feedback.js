// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// ANONYMOUS FEEDBACK (the app's only server code; runs on Cloudflare Pages Functions, free plan)
// Receives one message from the in-app feedback box and stores it in the FEEDBACK_DB database (Cloudflare D1).
// Stored with each message: the message, the date and time, the app release, and whether it came from the live app
// or the test preview. Never stored: name, email, IP address, browser details or anything else about the sender.
// Only accepted from the app itself (the browser's Origin must be the official address or its preview addresses),
// a few kilobytes at most, and no more than DAILY_CAP messages a day in total (a simple guard against spam).
// The creator reads messages in the Cloudflare dashboard (D1 > taarala-feedback > Console).
// ============================================================
const OFFICIAL = 'https://taarala-thota.pages.dev';
const PREVIEW = /^https:\/\/[a-z0-9-]+\.taarala-thota\.pages\.dev$/;
const MAX_CHARS = 10000;      // about four pages of text: generous, but stops someone pasting a whole book
const DAILY_CAP = 300;        // total messages per day (UTC), from everyone together

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  const source = origin === OFFICIAL ? 'app' : PREVIEW.test(origin) ? 'preview' : null;
  if (!source) return json(403, { ok: false, error: 'not-from-app' });
  if (!env.FEEDBACK_DB) return json(503, { ok: false, error: 'not-set-up' });
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > 64 * 1024) return json(413, { ok: false, error: 'too-long' });
  let body;
  try { body = await request.json(); } catch (e) { return json(400, { ok: false, error: 'bad-request' }); }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const release = typeof body.release === 'string' && /^\d{4}-\d{2}-\d{2}[a-z]?$/.test(body.release) ? body.release : '';
  if (!message) return json(400, { ok: false, error: 'empty' });
  if (Array.from(message).length > MAX_CHARS) return json(413, { ok: false, error: 'too-long' });
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
