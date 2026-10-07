import { useEffect, useRef, useState } from 'react';

// An image that can dissolve into particles (sampled from its own pixels and
// colours) and assemble back. At rest the crisp <img> is shown; when the
// cursor enters, it swaps to the particle version (pixel-identical in place),
// which the cursor pushes around. Clicking — or every `burstEvery` ms — blows
// it apart and re-forms it. Once the particles settle the crisp image fades
// back in and the animation loop stops, so it costs nothing while idle.
export default function ParticleImage({
  src, alt = '', width, gap = 3, bleed = 90, burstEvery = 9000, imgStyle, onHoverStart, onBurst,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const api = useRef({});
  const [showImg, setShowImg] = useState(false);
  const [height, setHeight] = useState(width);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext('2d');
    let alive = true, raf = 0, running = false, timer = 0;
    let W = 0, H = 0, buf = null, img32 = null, parts = [];
    let phase = 'form', phaseStart = performance.now(), hovering = false;
    const mouse = { x: -1e4, y: -1e4 };

    const image = new Image();
    image.decoding = 'async';
    image.src = src;

    const setup = () => {
      const h = Math.round(width * image.naturalHeight / image.naturalWidth);
      setHeight(h);
      W = Math.round((width + bleed * 2) * dpr);
      H = Math.round((h + bleed * 2) * dpr);
      canvas.width = W; canvas.height = H;
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const o = off.getContext('2d', { willReadFrequently: true });
      o.drawImage(image, bleed * dpr, bleed * dpr, width * dpr, h * dpr);
      const d = o.getImageData(0, 0, W, H).data;
      const step = Math.max(2, Math.round(gap * dpr));
      parts = [];
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          const k = (y * W + x) * 4;
          if (d[k + 3] < 90) continue;
          // packed ABGR for a little-endian Uint32 view
          const col = (d[k + 3] << 24) | (d[k + 2] << 16) | (d[k + 1] << 8) | d[k];
          parts.push({ tx: x, ty: y, x, y, vx: 0, vy: 0, col, s: step });
        }
      }
      buf = ctx.createImageData(W, H);
      img32 = new Uint32Array(buf.data.buffer);
    };

    const draw = () => {
      img32.fill(0);
      for (const p of parts) {
        const x0 = p.x | 0, y0 = p.y | 0;
        for (let yy = 0; yy < p.s; yy++) {
          const y = y0 + yy;
          if (y < 0 || y >= H) continue;
          const row = y * W;
          for (let xx = 0; xx < p.s; xx++) {
            const x = x0 + xx;
            if (x >= 0 && x < W) img32[row + x] = p.col;
          }
        }
      }
      ctx.putImageData(buf, 0, 0);
    };

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dtF = dt * 60;
      let maxD = 0;
      const R = 70 * dpr;
      for (const p of parts) {
        if (phase === 'burst') {
          p.x += p.vx * dtF; p.y += p.vy * dtF;
          const damp = Math.exp(-dt * 2.8);
          p.vx *= damp; p.vy = p.vy * damp + 0.03 * dpr * dtF;
        } else {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const dd = Math.sqrt(d2) || 1, f = (1 - dd / R) * 3.2 * dpr;
            p.vx += (dx / dd) * f; p.vy += (dy / dd) * f;
          }
          const k = Math.min(1, (now - phaseStart) / 900);
          const follow = 1 - Math.exp(-dt * (2.5 + 8 * k * k));
          const damp = Math.exp(-dt * 6);
          p.vx *= damp; p.vy *= damp;
          p.x += p.vx * dtF + (p.tx - p.x) * follow;
          p.y += p.vy * dtF + (p.ty - p.y) * follow;
          const e = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y);
          if (e > maxD) maxD = e;
        }
      }
      draw();
      // settled and nobody is touching it → hand back to the crisp image
      if (phase === 'form' && !hovering && maxD < 0.6 && now - phaseStart > 500) {
        for (const p of parts) { p.x = p.tx; p.y = p.ty; p.vx = 0; p.vy = 0; }
        draw();
        setShowImg(true);
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const run = () => {
      if (!parts.length) return;
      setShowImg(false);
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const burst = () => {
      if (!parts.length || reduce) return;
      phase = 'burst'; phaseStart = performance.now();
      for (const p of parts) {
        const a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 5) * dpr;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp * 0.8;
      }
      onBurst?.();
      run();
      setTimeout(() => { if (alive) { phase = 'form'; phaseStart = performance.now(); } }, 650);
    };

    const schedule = () => {
      clearTimeout(timer);
      if (burstEvery && !reduce) timer = setTimeout(() => { if (!hovering) burst(); schedule(); }, burstEvery);
    };

    api.current = {
      move(e) {
        const r = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) * (W / r.width);
        mouse.y = (e.clientY - r.top) * (H / r.height);
        if (!hovering) { hovering = true; onHoverStart?.(); }
        if (!reduce) run();
      },
      leave() { hovering = false; mouse.x = mouse.y = -1e4; if (running) phaseStart = performance.now() - 900; },
      click() { burst(); schedule(); },
    };

    image.onload = () => {
      if (!alive) return;
      setup();
      if (reduce) { draw(); setShowImg(true); return; }
      // first appearance: assemble from a loose cloud
      for (const p of parts) {
        const a = Math.random() * Math.PI * 2, r = (60 + Math.random() * 160) * dpr;
        p.x = p.tx + Math.cos(a) * r; p.y = p.ty + Math.sin(a) * r * 0.7;
      }
      phase = 'form'; phaseStart = performance.now() - 200;
      run();
      schedule();
    };

    return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [src, width, gap, bleed, burstEvery, onHoverStart, onBurst]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width, height, cursor: 'pointer', touchAction: 'pan-y' }}
      onPointerMove={e => api.current.move?.(e)} onPointerLeave={() => api.current.leave?.()} onClick={() => api.current.click?.()}>
      <img src={src} alt={alt} draggable={false}
        style={{ ...imgStyle, width, height, display: 'block', opacity: showImg ? 1 : 0, transition: showImg ? 'opacity .45s ease' : 'none' }} />
      <canvas ref={canvasRef} aria-hidden="true"
        style={{ position: 'absolute', left: -bleed, top: -bleed, width: width + bleed * 2, height: height + bleed * 2, pointerEvents: 'none', filter: imgStyle?.filter,
          opacity: showImg ? 0 : 1, transition: showImg ? 'opacity .45s ease' : 'none' }} />
    </div>
  );
}
