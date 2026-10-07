// Landing sound design — everything is synthesized with WebAudio (no files):
// soft ticks on hover, a glassy pop on click, a whoosh when a section comes
// into view, a rising chime on the main CTAs and an optional ambient pad.
// Browsers only allow audio after a user gesture, so nothing plays until the
// first click/tap/key. Everything starts silent: the play button in the hero
// turns sounds + music on (and off again).

let ctx = null;
let master = null;
let muted = true;
let unlocked = false;
let pad = null;
const listeners = new Set();

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

function ready() {
  if (muted || !unlocked) return null;
  const a = ac();
  if (!a) return null;
  if (a.state === 'suspended') a.resume();
  return a;
}

export function unlockSound() {
  if (unlocked) return;
  unlocked = true;
  const a = ac();
  if (a && a.state === 'suspended') a.resume();
}

export const isMuted = () => muted;
export function onMuteChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function setMuted(m) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
  if (m) stopAmbient();
  listeners.forEach(fn => fn(m));
}

function tone({ freq, type = 'sine', dur = 0.12, vol = 0.08, attack = 0.005, slideTo, delay = 0, filter }) {
  const a = ready();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (filter) {
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

let lastHover = 0;
// Very soft, high tick — rate-limited so sweeping over a grid isn't noisy.
export function sHover() {
  const now = performance.now();
  if (now - lastHover < 70) return;
  lastHover = now;
  tone({ freq: 1800 + Math.random() * 400, type: 'sine', dur: 0.05, vol: 0.025 });
}

// Glassy pop for clicks (paired with the click sparks).
export function sClick() {
  tone({ freq: 620, slideTo: 1240, type: 'triangle', dur: 0.09, vol: 0.07 });
  tone({ freq: 2480, type: 'sine', dur: 0.12, vol: 0.02, delay: 0.02 });
}

// Rising three-note chime for the main calls to action.
export function sChime() {
  [523.25, 659.25, 987.77].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.45, vol: 0.06, delay: i * 0.07, filter: 3200 }));
}

// Airy whoosh: filtered noise sweep (sections entering the viewport).
export function sWhoosh() {
  const a = ready();
  if (!a) return;
  const t = a.currentTime;
  const len = 0.5;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(2600, t + len);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

// Ambient pad: two slow, detuned chords through a breathing low-pass.
export function startAmbient() {
  const a = ready();
  if (!a || pad) return;
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 3);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 500;
  lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
  const oscs = [130.81, 196.0, 246.94, 329.63].flatMap(f => [-4, 4].map(det => {
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = det;
    o.connect(lp);
    o.start();
    return o;
  }));
  lp.connect(out); out.connect(master);
  lfo.start();
  pad = { out, oscs, lfo };
}

export function stopAmbient() {
  if (!pad || !ctx) return;
  const { out, oscs, lfo } = pad;
  pad = null;
  const t = ctx.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  setTimeout(() => { oscs.forEach(o => o.stop()); lfo.stop(); out.disconnect(); }, 1400);
}

export const isAmbientOn = () => !!pad;

// Synthetic room: decaying stereo noise used as a convolution impulse.
let verbBuf = null;
function impulse(a, secs = 2.6, decay = 3.2) {
  if (verbBuf) return verbBuf;
  const len = Math.floor(a.sampleRate * secs);
  verbBuf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = verbBuf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return verbBuf;
}

// "Power on": a punchy click + sub thump, sent through a long reverb and a
// filtered feedback delay so it echoes away into the background.
export function sPower() {
  const a = ready();
  if (!a) return;
  const t = a.currentTime + 0.01;
  const bus = a.createGain();
  bus.gain.value = 1;

  // click transient (very short high-passed noise)
  const nb = a.createBuffer(1, Math.floor(a.sampleRate * 0.03), a.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 4);
  const click = a.createBufferSource(); click.buffer = nb;
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const cg = a.createGain(); cg.gain.value = 0.5;
  click.connect(hp); hp.connect(cg); cg.connect(bus);

  // sub thump
  const sub = a.createOscillator(); sub.type = 'sine';
  sub.frequency.setValueAtTime(140, t); sub.frequency.exponentialRampToValueAtTime(42, t + 0.35);
  const sg = a.createGain();
  sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.5, t + 0.006); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  sub.connect(sg); sg.connect(bus);

  // bright "charge" ping
  const ping = a.createOscillator(); ping.type = 'triangle';
  ping.frequency.setValueAtTime(880, t); ping.frequency.exponentialRampToValueAtTime(1760, t + 0.12);
  const pg = a.createGain();
  pg.gain.setValueAtTime(0.0001, t); pg.gain.exponentialRampToValueAtTime(0.09, t + 0.01); pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  ping.connect(pg); pg.connect(bus);

  // dry
  const dry = a.createGain(); dry.gain.value = 0.8;
  bus.connect(dry); dry.connect(master);
  // reverb
  const verb = a.createConvolver(); verb.buffer = impulse(a);
  const wet = a.createGain(); wet.gain.value = 0.55;
  bus.connect(verb); verb.connect(wet); wet.connect(master);
  // feedback delay, darker on every repeat
  const delay = a.createDelay(1); delay.delayTime.value = 0.27;
  const fb = a.createGain(); fb.gain.value = 0.48;
  const dlp = a.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
  const dOut = a.createGain(); dOut.gain.value = 0.42;
  bus.connect(delay); delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(dOut); dOut.connect(verb); dOut.connect(master);

  click.start(t); sub.start(t); sub.stop(t + 0.5); ping.start(t); ping.stop(t + 0.55);
  setTimeout(() => { fb.gain.value = 0; [bus, dry, verb, wet, delay, dlp, dOut].forEach(n => n.disconnect()); }, 5000);
}

// Soft descending blip played just before everything goes quiet.
export function sPowerOff() {
  tone({ freq: 900, slideTo: 260, type: 'triangle', dur: 0.22, vol: 0.06 });
}
