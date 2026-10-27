// Taarala Thota (Garden of Stars) © 2026 Rukmini Gandepalli (@rdg-git). All rights reserved.
// ============================================================
// MUSIC ENGINE: 432 Hz Veena + Bansuri flute, made live (no audio files)
// - Tuning: A4 = 432 Hz (so the note D, our "Sa", is exactly 288 Hz).
// - Raga: Bhoopali-style five-note scale (Sa Re Ga Pa Dha).
// - Veena = plucked string (Karplus-Strong). Bansuri = breathy flute with vibrato.
// - On/off choice is remembered for the whole session (sessionStorage).
// - Browsers only allow sound after a tap, so it starts on the first tap.
// ============================================================
const Music = (function () {
  const A4 = 432;
  const SCALE = [0, 2, 4, 7, 9];                 // semitones above Sa: Sa Re Ga Pa Dha
  const SA_FROM_A4 = -7;                          // D is 7 semitones below A
  function hz(octave, degree) {                   // octave 0 = middle (Sa=288Hz)
    const semis = SA_FROM_A4 + SCALE[degree % 5] + 12 * octave;
    return A4 * Math.pow(2, semis / 12);
  }
  let ctx = null, master = null, wet = null, comp = null, timer = null;
  let on = false, started = false, nextVeena = 0, nextFlute = 0, step = 0, pos = 2, fpos = 7, phraseLeft = 0, restUntil = 0;
  const cache = {};

  // on/off choice is kept on this device (localStorage) so "off" stays off until the button is tapped again
  function getPref() { try { const v = localStorage.getItem('tt:music'); return v == null ? 'on' : v; } catch (e) { return 'on'; } }
  function setPref(v) { try { localStorage.setItem('tt:music', v); } catch (e) {} }
  function saveState() { try { sessionStorage.setItem('tt:music_pos', JSON.stringify({ pos, fpos, step })); } catch (e) {} }
  function loadState() { try { const s = JSON.parse(sessionStorage.getItem('tt:music_pos') || 'null'); if (s) { pos = s.pos; fpos = s.fpos; step = s.step; } } catch (e) {} }

  // plucked string: Karplus-Strong, rendered once per note and reused
  function pluckBuffer(freq) {
    const k = Math.round(freq * 10);
    if (cache[k]) return cache[k];
    const sr = ctx.sampleRate, len = Math.floor(sr * 4.2);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq)), line = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) { const n = Math.random() * 2 - 1; lp = lp * 0.55 + n * 0.45; line[i] = lp; }
    let idx = 0, prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx], nxt = line[(idx + 1) % N];
      const v = (cur + nxt) * 0.5 * 0.9965;
      line[idx] = v; idx = (idx + 1) % N;
      d[i] = cur * (1 - Math.exp(-i / (sr * 0.004)));
      prev = cur;
    }
    cache[k] = buf; return buf;
  }
  function pluck(freq, when, vol) {
    const s = ctx.createBufferSource(); s.buffer = pluckBuffer(freq);
    const g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(5200, freq * 9);
    s.connect(f); f.connect(g); g.connect(master); g.connect(wet);
    s.start(when);
    s.stop(when + 4.3);
  }
  // breathy flute note
  function flute(freq, when, dur, vol) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sine'; o2.type = 'sine'; o3.type = 'sine';
    o1.frequency.setValueAtTime(freq * 0.985, when); o1.frequency.exponentialRampToValueAtTime(freq, when + 0.12);
    o2.frequency.setValueAtTime(freq * 2 * 0.985, when); o2.frequency.exponentialRampToValueAtTime(freq * 2, when + 0.12);
    o3.frequency.setValueAtTime(freq * 3 * 0.985, when); o3.frequency.exponentialRampToValueAtTime(freq * 3, when + 0.12);
    const g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
    g1.gain.value = 1; g2.gain.value = 0.22; g3.gain.value = 0.07;
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5.1; vg.gain.setValueAtTime(0, when); vg.gain.linearRampToValueAtTime(freq * 0.006, when + Math.min(dur * 0.6, 0.9));
    vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency); vg.connect(o3.frequency);
    // breath
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 2; bp.Q.value = 3;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    ns.connect(bp); bp.connect(ng);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(vol, when + 0.18);
    env.gain.setValueAtTime(vol, when + Math.max(0.2, dur - 0.5));
    env.gain.linearRampToValueAtTime(0.0001, when + dur + 0.45);
    o1.connect(g1); o2.connect(g2); o3.connect(g3); g1.connect(env); g2.connect(env); g3.connect(env); ng.connect(env);
    env.connect(master); env.connect(wet);
    const end = when + dur + 0.6;
    [o1, o2, o3, vib, ns].forEach(n => { n.start(when); n.stop(end); });
  }
  function makeReverb() {
    const sr = ctx.sampleRate, len = Math.floor(sr * 3.2), buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    wet = ctx.createGain(); wet.gain.value = 0.32;
    wet.connect(conv); conv.connect(master);
  }
  // choose the next scale degree: gentle random walk, favouring steps
  function walk(p, lo, hi) {
    const r = Math.random(); let d = r < 0.34 ? -1 : r < 0.68 ? 1 : r < 0.8 ? -2 : r < 0.92 ? 2 : 0;
    p = clamp(p + d, lo, hi); return p;
  }
  function degHz(p) { return hz(Math.floor(p / 5), ((p % 5) + 5) % 5); }
  function schedule() {
    if (!ctx || !on) return;
    const t = ctx.currentTime;
    // veena: steady unhurried pluck pattern + a soft drone of Sa and Pa
    while (nextVeena < t + 1.8) {
      if (nextVeena < t) nextVeena = t + 0.05;
      const k = step % 8;
      if (k === 0) pluck(hz(-1, 0), nextVeena, 0.30);               // Sa (low)
      else if (k === 4) pluck(hz(-1, 3), nextVeena, 0.20);          // Pa (low)
      else if (k % 2 === 0) { pos = walk(pos, -3, 6); pluck(degHz(pos), nextVeena, 0.26); }
      else if (Math.random() < 0.6) { pos = walk(pos, -3, 6); pluck(degHz(pos), nextVeena, 0.16); }
      nextVeena += 0.82 + (k === 7 ? 0.25 : 0);
      step++;
      if (step % 8 === 0) saveState();
    }
    // bansuri: phrases of 3-5 long notes, then a rest
    while (nextFlute < t + 1.8) {
      if (nextFlute < t) nextFlute = t + 0.1;
      if (phraseLeft <= 0) {
        if (restUntil && nextFlute < restUntil) { nextFlute = restUntil; continue; }
        phraseLeft = 3 + Math.floor(Math.random() * 3);
      }
      fpos = walk(fpos, 5, 11);
      const dur = 1.6 + Math.random() * 2.2;
      flute(degHz(fpos), nextFlute, dur, 0.13);
      nextFlute += dur + 0.15;
      phraseLeft--;
      if (phraseLeft <= 0) restUntil = nextFlute + 4 + Math.random() * 6;
    }
  }
  function ensureCtx() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
      makeReverb();
      if (typeof TEST_MODE !== 'undefined' && TEST_MODE) { const an = ctx.createAnalyser(); an.fftSize = 8192; comp.connect(an); window.__an = an; }
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function start() {
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!started) {
      started = true;
      loadState();
      nextVeena = ctx.currentTime + 0.2;
      nextFlute = ctx.currentTime + 3;
      timer = setInterval(schedule, 300);
    }
    on = true; setPref('on');
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.7, ctx.currentTime, 0.8);
    schedule(); paint();
  }
  function stop() {
    on = false; setPref('off');
    if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.25); }
    paint();
  }
  function wantsOn() { return on || (!started && getPref() === 'on'); }
  function toggle() { if (wantsOn()) stop(); else start(); }
  function paint() {
    const w = wantsOn();
    document.querySelectorAll('.music-state,.music-btn').forEach(e => e.classList.toggle('off', !w));
    document.querySelectorAll('.music-btn').forEach(e => e.setAttribute('aria-pressed', w ? 'true' : 'false'));
  }
  // small sound effects (pop, tap) share the same sound system
  function blip(f0, f1, dur, vol) {
    if (!on || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  // first tap anywhere starts the music (if it is switched on).
  // Phones only allow sound after a COMPLETED tap (finger lifted), so we listen for the end of the tap,
  // not the moment the finger touches the screen.
  const TAP_END = ['pointerup', 'touchend', 'click', 'keydown'];
  function armFirstTap() {
    const h = (e) => {
      TAP_END.forEach(t => document.removeEventListener(t, h, true));
      if (e.target && e.target.closest && e.target.closest('[data-music]')) { armFirstTap(); return; }   // the music button decides by itself
      if (getPref() === 'on' && !on) start();
    };
    TAP_END.forEach(t => document.addEventListener(t, h, true));
  }
  // safety net: if the phone paused the sound system (call, lock screen, another app), the next tap wakes it again
  TAP_END.forEach(t => document.addEventListener(t, () => { try { if (on && ctx && ctx.state !== 'running') ctx.resume(); } catch (e) {} }, true));
  // silence without changing the person's on/off choice
  function pause() {
    on = false;
    if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.15); }
    paint();
  }
  return { start, stop, pause, toggle, wantsOn, isOn: () => on, ctxState: () => ctx && ctx.state, blip, armFirstTap, paint, hz, A4 };
})();
