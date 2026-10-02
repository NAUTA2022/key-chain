import { useEffect, useRef } from 'react';

// A word drawn with particles that, every `interval` ms, blows apart and
// re-forms as the next word. The cursor/finger pushes particles away.
// Each word is rasterised off-screen and sampled into target points; the
// same particle pool flies between the targets of consecutive words.
const EDGE_MASK = 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent), linear-gradient(180deg, transparent, #000 26%, #000 74%, transparent)';

export default function ParticleWord({
  words,
  interval = 2800,
  fontSize = 64,
  fontWeight = 800,
  colors = ['#7fb2ff', '#a78bfa', '#f0abfc'],
  gap = 3,
  height,
  className,
  onMorph,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // The canvas is taller than the word (BLEED above and below) and its
    // edges are masked out, so bursting particles fade away instead of being
    // clipped by a hard rectangle.
    const BLEED = Math.round(fontSize * 0.9);
    let W = 0, H = 0, raf = 0, timer = 0, alive = true;
    let targets = [];       // per word: [{x, y}]
    let particles = [];
    let wordIdx = 0;
    let phase = 'form';     // 'form' | 'burst'
    let phaseStart = performance.now();
    const mouse = { x: -9999, y: -9999 };

    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-h').trim() || 'sans-serif';
    const font = `${fontWeight} ${fontSize * dpr}px ${fontFamily}`; // canvas works in device pixels

    const sample = (word) => {
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const o = off.getContext('2d');
      o.font = font;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillStyle = '#fff';
      o.fillText(word, W / 2, H / 2 + fontSize * dpr * 0.04);
      const data = o.getImageData(0, 0, W, H).data;
      const pts = [];
      const step = Math.max(2, Math.round(gap * dpr));
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (data[(y * W + x) * 4 + 3] > 140) pts.push({ x, y });
        }
      }
      // shuffle so particles don't sweep in raster order
      for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
      return pts;
    };

    const colorAt = (x) => {
      const t = Math.min(1, Math.max(0, x / W)) * (colors.length - 1);
      return colors[Math.min(colors.length - 1, Math.round(t))];
    };

    const assign = (pts) => {
      particles.forEach((p, i) => {
        const t = pts[i % pts.length];
        p.tx = t.x; p.ty = t.y;
        p.hidden = i >= pts.length; // extra particles fade out
        p.c = colorAt(t.x);
      });
    };

    const setup = () => {
      const rect = wrap.getBoundingClientRect();
      const cssH = (height || fontSize * 1.35) + BLEED * 2;
      W = Math.max(1, Math.round(rect.width * dpr));
      H = Math.max(1, Math.round(cssH * dpr));
      canvas.width = W; canvas.height = H;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${cssH}px`;
      ctx.font = font;
      targets = words.map(sample);
      const count = Math.min(2600, Math.max(...targets.map(t => t.length), 1));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, tx: 0, ty: 0, hidden: false, c: colors[0], a: 0,
      }));
      assign(targets[wordIdx] || [{ x: W / 2, y: H / 2 }]);
    };

    const next = () => {
      if (!alive) return;
      phase = 'burst';
      phaseStart = performance.now();
      particles.forEach(p => {
        const ang = Math.random() * Math.PI * 2;
        const sp = (1.2 + Math.random() * 4) * dpr;
        p.vx = Math.cos(ang) * sp;
        p.vy = Math.sin(ang) * sp * 0.7;
      });
      onMorph?.();
      setTimeout(() => {
        if (!alive) return;
        wordIdx = (wordIdx + 1) % words.length;
        assign(targets[wordIdx]);
        phase = 'form';
        phaseStart = performance.now();
      }, 520);
      timer = setTimeout(next, interval);
    };

    // Time-based physics so it looks the same at 120 fps or on a slow phone.
    let last = performance.now();
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();
      const dtS = Math.min(0.1, (now - last) / 1000);
      last = now;
      const dtF = dtS * 60;
      const size = Math.max(1.4, gap * dpr * 0.62);
      const fade = 1 - Math.exp(-dtS * 9);
      for (const p of particles) {
        if (phase === 'burst') {
          p.x += p.vx * dtF; p.y += p.vy * dtF;
          const damp = Math.exp(-dtS * 3.6);
          p.vx *= damp; p.vy = p.vy * damp + 0.02 * dpr * dtF;
          p.a += (0.45 - p.a) * fade;
        } else {
          const k = Math.min(1, (now - phaseStart) / 900);
          const follow = 1 - Math.exp(-dtS * (3 + 9 * k * k));
          // cursor repulsion
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy, R = 46 * dpr;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 6 * dpr;
            p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          }
          const damp = Math.exp(-dtS * 7);
          p.vx *= damp; p.vy *= damp;
          p.x += p.vx * dtF + (p.tx - p.x) * follow;
          p.y += p.vy * dtF + (p.ty - p.y) * follow;
          p.a += ((p.hidden ? 0 : 1) - p.a) * fade;
        }
        if (p.a < 0.02) continue;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, size, size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * dpr;
      mouse.y = (e.clientY - r.top) * dpr;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    const start = () => {
      setup();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      clearTimeout(timer);
      if (!reduce && words.length > 1) timer = setTimeout(next, interval);
    };
    // wait for the heading font so the sampled glyphs match the page
    (document.fonts?.ready || Promise.resolve()).then(() => { if (alive) start(); });

    let rt = 0;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => alive && setup(), 150); });
    ro.observe(wrap);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer); clearTimeout(rt);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [words, interval, fontSize, fontWeight, colors, gap, height, onMorph]);

  return (
    <div ref={wrapRef} className={className} style={{ width: '100%', position: 'relative', margin: `${-Math.round(fontSize * 0.9)}px 0`, pointerEvents: 'none' }} aria-live="polite">
      <canvas ref={canvasRef} aria-hidden="true" style={{
        display: 'block', touchAction: 'pan-y', pointerEvents: 'auto',
        WebkitMaskImage: EDGE_MASK, maskImage: EDGE_MASK, WebkitMaskComposite: 'source-in', maskComposite: 'intersect',
      }} />
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{words.join(', ')}</span>
    </div>
  );
}
