let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

/* ── Viento reactivo al mouse (viento.wav) ────────────────── */
let _windBuf   = null;
let _windSrc   = null;
let _windGain  = null;
let _windLoaded = false;
let _stopTimer  = null;

async function loadWind() {
  if (_windLoaded) return;
  _windLoaded = true;
  try {
    const a = ac();
    const res = await fetch('/viento.wav');
    const arr = await res.arrayBuffer();
    _windBuf = await a.decodeAudioData(arr);
  } catch { _windLoaded = false; }
}

function ensureWind() {
  const a = ac();
  if (_windSrc) return;
  if (!_windBuf) return;
  _windGain = a.createGain();
  _windGain.gain.setValueAtTime(0, a.currentTime);
  _windGain.connect(a.destination);
  _windSrc = a.createBufferSource();
  _windSrc.buffer = _windBuf;
  _windSrc.loop = true;
  _windSrc.connect(_windGain);
  _windSrc.start();
}

export function playMouseMove(dx, dy) {
  try {
    const a = ac();
    if (a.state === 'suspended') { a.resume(); return; }
    if (a.state !== 'running') return;

    // Cargar el archivo la primera vez que el contexto esté desbloqueado
    if (!_windLoaded) { loadWind(); return; }
    if (!_windBuf) return;

    ensureWind();

    const speed = Math.sqrt(dx * dx + dy * dy);
    // Mapeo: speed 0→5 = silencio, 5→60+ = 0 a volumen máximo 0.30
    const vol = Math.min(Math.max((speed - 5) / 55, 0) * 0.30, 0.30);

    const now = a.currentTime;
    _windGain.gain.cancelScheduledValues(now);
    _windGain.gain.setValueAtTime(_windGain.gain.value, now);
    _windGain.gain.linearRampToValueAtTime(vol, now + 0.08);

    // Silenciar gradualmente si el mouse se detiene
    clearTimeout(_stopTimer);
    _stopTimer = setTimeout(() => {
      if (!_windGain) return;
      const t = ac().currentTime;
      _windGain.gain.cancelScheduledValues(t);
      _windGain.gain.setValueAtTime(_windGain.gain.value, t);
      _windGain.gain.linearRampToValueAtTime(0, t + 0.35);
    }, 120);
  } catch {}
}

/* ── Carga de habilidad para botones principales ─────────── */
export function playAction() {
  try {
    const a = ac();

    // Tono ascendente con armónico — "cargando skill"
    const osc1 = a.createOscillator();
    const osc2 = a.createOscillator();
    const g1 = a.createGain();
    const g2 = a.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(320, a.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(720, a.currentTime + 0.14);
    g1.gain.setValueAtTime(0, a.currentTime);
    g1.gain.linearRampToValueAtTime(0.10, a.currentTime + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.18);
    osc1.connect(g1); g1.connect(a.destination);
    osc1.start(a.currentTime);
    osc1.stop(a.currentTime + 0.19);

    // Segundo armónico quinta arriba
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(480, a.currentTime + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(1080, a.currentTime + 0.16);
    g2.gain.setValueAtTime(0, a.currentTime + 0.03);
    g2.gain.linearRampToValueAtTime(0.048, a.currentTime + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.19);
    osc2.connect(g2); g2.connect(a.destination);
    osc2.start(a.currentTime + 0.03);
    osc2.stop(a.currentTime + 0.20);

    // Impacto de ruido con highpass — punch final
    const len = Math.floor(a.sampleRate * 0.06);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const dt = buf.getChannelData(0);
    for (let i = 0; i < len; i++) dt[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const filt = a.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 4800;
    const gn = a.createGain();
    gn.gain.setValueAtTime(0.06, a.currentTime + 0.12);
    gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.18);
    src.connect(filt); filt.connect(gn); gn.connect(a.destination);
    src.start(a.currentTime + 0.12);
    src.stop(a.currentTime + 0.19);
  } catch {}
}

/* ── Hover de nodo en el ecosistema ─────────────────────── */
export function playNodeHover() {
  try {
    const a = ac();
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, a.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, a.currentTime + 0.06);
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(0.025, a.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.09);
    osc.connect(g); g.connect(a.destination);
    osc.start(a.currentTime); osc.stop(a.currentTime + 0.1);
  } catch {}
}

/* ── Selección de nodo en el ecosistema ──────────────────── */
export function playNodeSelect() {
  try {
    const a = ac();
    // Tono principal sci-fi "lock-on"
    const o1 = a.createOscillator(), g1 = a.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(440, a.currentTime);
    o1.frequency.exponentialRampToValueAtTime(880, a.currentTime + 0.08);
    g1.gain.setValueAtTime(0, a.currentTime);
    g1.gain.linearRampToValueAtTime(0.12, a.currentTime + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.22);
    o1.connect(g1); g1.connect(a.destination);
    o1.start(a.currentTime); o1.stop(a.currentTime + 0.23);
    // Armónico superior
    const o2 = a.createOscillator(), g2 = a.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(880, a.currentTime + 0.05);
    o2.frequency.exponentialRampToValueAtTime(1320, a.currentTime + 0.15);
    g2.gain.setValueAtTime(0, a.currentTime + 0.05);
    g2.gain.linearRampToValueAtTime(0.055, a.currentTime + 0.07);
    g2.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.25);
    o2.connect(g2); g2.connect(a.destination);
    o2.start(a.currentTime + 0.05); o2.stop(a.currentTime + 0.26);
  } catch {}
}

/* ── Zoom in ─────────────────────────────────────────────── */
export function playZoomIn() {
  try {
    const a = ac();
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, a.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, a.currentTime + 0.12);
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(0.07, a.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.15);
    osc.connect(g); g.connect(a.destination);
    osc.start(a.currentTime); osc.stop(a.currentTime + 0.16);
  } catch {}
}

/* ── Zoom out ────────────────────────────────────────────── */
export function playZoomOut() {
  try {
    const a = ac();
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, a.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, a.currentTime + 0.14);
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(0.07, a.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.17);
    osc.connect(g); g.connect(a.destination);
    osc.start(a.currentTime); osc.stop(a.currentTime + 0.18);
  } catch {}
}

/* ── Selector / click suave para botones secundarios ─────── */
export function playHover() {
  try {
    const a = ac();

    // Click mecánico sutil — dos transientes rápidos
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, a.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, a.currentTime + 0.035);
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(0.038, a.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.04);
    osc.connect(g); g.connect(a.destination);
    osc.start(a.currentTime);
    osc.stop(a.currentTime + 0.045);

    // Pequeño ruido de clic
    const len2 = Math.floor(a.sampleRate * 0.022);
    const buf2 = a.createBuffer(1, len2, a.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < len2; i++) d2[i] = Math.random() * 2 - 1;
    const src2 = a.createBufferSource();
    src2.buffer = buf2;
    const filt2 = a.createBiquadFilter();
    filt2.type = 'bandpass';
    filt2.frequency.value = 3200;
    filt2.Q.value = 1.8;
    const g2 = a.createGain();
    g2.gain.setValueAtTime(0.028, a.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.022);
    src2.connect(filt2); filt2.connect(g2); g2.connect(a.destination);
    src2.start(a.currentTime);
    src2.stop(a.currentTime + 0.025);
  } catch {}
}
