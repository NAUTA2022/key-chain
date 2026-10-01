import { motion } from 'framer-motion';
import { fmtUSD } from '../data';

// "Nivel y logros" as a set of widget tiles (weather-app style): level
// progress line, invested-amount wave, reputation gauge, return scale,
// diversification compass and seniority arc, then every achievement with its
// progress. `d` = { level, invested, ret, rep, months, since, cats: [[cat, value]], yieldEarned, holdings }.

const LEVELS = [
  { n: 1, name: 'Explorador', min: 0 },
  { n: 2, name: 'Inversor', min: 3000 },
  { n: 3, name: 'Constructor', min: 10000 },
  { n: 4, name: 'Estratega', min: 25000 },
  { n: 5, name: 'Visionario', min: 50000 },
];
const fmtK = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function Tile({ icon, color, title, children, span = 1, style }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{
        gridColumn: `span ${span}`, background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 22,
        padding: '16px 18px', position: 'relative', overflow: 'hidden', minHeight: 170, display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)', ...style,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative', zIndex: 2 }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </motion.div>
  );
}

const Knob = ({ color = '#fff', ring, size = 18, style }) => (
  <div style={{
    position: 'absolute', width: size, height: size, borderRadius: '50%', transform: 'translate(-50%, -50%)',
    background: `radial-gradient(circle at 35% 30%, #fff 0%, ${color} 70%)`,
    boxShadow: `0 0 0 3px ${ring || 'rgba(255,255,255,0.85)'}, 0 2px 10px rgba(0,0,0,0.18)`, zIndex: 3, ...style,
  }} />
);

// ─── Icons (line, 16px) ───────────────────────────────────────────────────────
const I = {
  level: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>,
  wave: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/></svg>,
  gauge: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/></svg>,
  ret: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  compass: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 18a7 7 0 0114 0"/><path d="M2 18h20M12 4v3M4.2 9.2l2 1.6M19.8 9.2l-2 1.6"/></svg>,
  trophy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/></svg>,
};

// ─── Level progress (temperature-style line) ──────────────────────────────────
function LevelLine({ d }) {
  const idx = d.level - 1;
  const next = LEVELS[Math.min(idx + 1, 4)];
  const frac = d.level >= 5 ? 0 : clamp((d.invested - LEVELS[idx].min) / (next.min - LEVELS[idx].min));
  const X = (i) => 10 + i * 20;                // % across — centred over each label column
  const Y = (i) => 86 - i * 17;                // % down the plot (higher level = higher)
  const cx = X(idx + frac), cy = Y(idx + frac);
  const pts = LEVELS.map((_, i) => `${X(i)},${Y(i)}`);
  return (
    <>
      <div style={{ position: 'relative', height: 92, margin: '0 -18px' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="lvl-line" x1="0" x2="1"><stop offset="0" stopColor="#8247E5" /><stop offset="1" stopColor="#3b82f6" /></linearGradient>
          </defs>
          {LEVELS.map((_, i) => (
            <line key={i} x1={X(i)} x2={X(i)} y1={Y(i)} y2="100" stroke="var(--border)" strokeWidth="0.4" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2="100" y1="99.5" y2="99.5" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <polyline points={pts.join(' ')} fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <polyline points={[...pts.slice(0, idx + 1), `${cx},${cy}`].join(' ')} fill="none" stroke="url(#lvl-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <Knob color="#a78bfa" style={{ left: `${cx}%`, top: `${cy}%` }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', margin: '8px -18px 0', padding: '0 0' }}>
        {LEVELS.map(l => {
          const on = l.n === d.level;
          return (
            <div key={l.n} style={{ textAlign: 'center', fontFamily: 'var(--font-b)' }}>
              <div style={{ fontSize: 11.5, color: on ? 'var(--text)' : 'var(--ter)', fontWeight: on ? 700 : 500 }}>N{l.n} · {l.name}</div>
              <div style={{ fontSize: 13, color: on ? 'var(--text)' : 'var(--sec)', fontWeight: on ? 800 : 600, marginTop: 2 }}>{fmtK(l.min)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Invested amount (humidity-style wave) ────────────────────────────────────
function WaveFill({ pct, label, sub }) {
  const h = 22 + pct * 0.5; // % of tile filled
  const wave = 'M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 40 H 0 Z';
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${h}%`, zIndex: 0 }}>
        <motion.svg viewBox="0 0 200 40" preserveAspectRatio="none" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', top: -16, left: 0, width: '200%', height: 22 }}>
          <path d={wave} fill="#14c8b4" />
        </motion.svg>
        <div style={{ position: 'absolute', inset: 0, top: 4, background: 'linear-gradient(180deg, #14c8b4, #0fb3a1)' }} />
      </div>
      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{sub}</div>
      </div>
    </>
  );
}

// ─── Reputation (pressure-style gauge) ────────────────────────────────────────
function Gauge({ value, max = 5 }) {
  const a0 = 150, sweep = 240;
  const r = 40, cx = 50, cy = 50;
  const pt = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const arc = (from, to) => {
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const end = a0 + sweep * clamp(value / max);
  const [kx, ky] = pt(end);
  return (
    <div style={{ position: 'relative', width: 130, height: 112, margin: '-2px auto 0' }}>
      <svg viewBox="0 0 100 86" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="g-rep" x1="0" x2="1"><stop offset="0" stopColor="#fda4af" /><stop offset="1" stopColor="#e11d48" /></linearGradient>
        </defs>
        <path d={arc(a0, a0 + sweep)} fill="none" stroke="var(--surface2)" strokeWidth="9" strokeLinecap="round" />
        <path d={arc(a0, end)} fill="none" stroke="url(#g-rep)" strokeWidth="9" strokeLinecap="round" />
      </svg>
      <Knob color="#fb7185" size={16} style={{ left: `${kx}%`, top: `${(ky / 86) * 100}%` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '38%', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, color: 'var(--text)', lineHeight: 1 }}>{value.toFixed(1)}</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 3 }}>de 5 ★</div>
      </div>
    </div>
  );
}

// ─── Return (UV-index-style scale) ────────────────────────────────────────────
function ReturnScale({ ret }) {
  const pos = clamp((ret + 10) / 40); // -10% … +30%
  const label = ret >= 15 ? 'Excelente' : ret >= 8 ? 'Muy bueno' : ret >= 0 ? 'Positivo' : 'Negativo';
  return (
    <>
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, color: 'var(--text)', letterSpacing: '-0.02em' }}>{ret >= 0 ? '+' : ''}{ret.toFixed(1)}%</div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{label}</div>
      <div style={{ position: 'relative', marginTop: 'auto', height: 8, borderRadius: 99, background: 'linear-gradient(90deg, #ef4444, #f59e0b 30%, #eab308 45%, #22c55e 70%, #10b981)' }}>
        <Knob color="#fde68a" size={16} style={{ left: `${pos * 100}%`, top: '50%' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)' }}>
        <span>-10%</span><span>+30%</span>
      </div>
    </>
  );
}

// ─── Diversification (wind-style compass) ─────────────────────────────────────
function Compass({ cats }) {
  const total = cats.reduce((s, [, v]) => s + v, 0) || 1;
  const top = cats.slice(0, 4);
  const dirs = [-90, 0, 90, 180];
  const lead = top[0];
  const needle = dirs[0];
  return (
    <>
      <div style={{ position: 'relative', width: 124, height: 124, margin: '-6px auto 0' }}>
        <svg viewBox="-8 -8 116 116" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180, long = i % 9 === 0;
            return <line key={i} x1={50 + Math.cos(a) * (long ? 30 : 33)} y1={50 + Math.sin(a) * (long ? 30 : 33)} x2={50 + Math.cos(a) * 37} y2={50 + Math.sin(a) * 37} stroke="var(--border)" strokeWidth={long ? 1.6 : 1} />;
          })}
          {top.map(([c], i) => {
            const a = (dirs[i] * Math.PI) / 180;
            return <text key={c} x={50 + Math.cos(a) * 48} y={50 + Math.sin(a) * 48 + 3} textAnchor="middle" style={{ fontFamily: 'var(--font-b)', fontSize: 8.5, fontWeight: 700, fill: i === 0 ? '#6366f1' : 'var(--sec)' }}>{c.slice(0, 3).toUpperCase()}</text>;
          })}
          <g transform={`rotate(${needle + 90} 50 50)`}>
            <line x1="50" y1="64" x2="50" y2="26" stroke="#6366f1" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M50 18 L45 27 L55 27 Z" fill="#6366f1" />
            <circle cx="50" cy="66" r="4" fill="#6366f1" />
          </g>
          <circle cx="50" cy="50" r="2.4" fill="var(--surface)" stroke="#6366f1" strokeWidth="1.2" />
        </svg>
      </div>
      <div style={{ marginTop: 'auto', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
        {cats.length} {cats.length === 1 ? 'rubro' : 'rubros'}{lead ? <span style={{ fontWeight: 500, color: 'var(--ter)', fontSize: 13 }}> · {lead[0]} {Math.round((lead[1] / total) * 100)}%</span> : null}
      </div>
    </>
  );
}

// ─── Seniority (sunrise-style arc) ────────────────────────────────────────────
function SeniorityArc({ months, since }) {
  const goal = months >= 24 ? 36 : 24;
  const t = clamp(months / goal);
  // Sine arc across the tile: y = 70 - 46*sin(pi*x)
  const path = (from, to) => Array.from({ length: 41 }, (_, i) => {
    const x = from + ((to - from) * i) / 40;
    return `${i ? 'L' : 'M'} ${x * 100} ${70 - 46 * Math.sin(Math.PI * x)}`;
  }).join(' ');
  return (
    <>
      <div style={{ position: 'relative', height: 92, margin: '0 -18px' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="sen-arc" x1="0" x2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#f97316" /></linearGradient>
          </defs>
          <line x1="0" x2="100" y1="70" y2="70" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={path(0, 1)} fill="none" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={path(0, t)} fill="none" stroke="url(#sen-arc)" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <Knob color="#fbbf24" size={22} style={{ left: `${t * 100}%`, top: `${70 - 46 * Math.sin(Math.PI * t)}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 13 }}>
        <span style={{ color: 'var(--sec)' }}>↑ <b style={{ color: 'var(--text)' }}>{since}</b> · alta</span>
        <span style={{ color: 'var(--ter)' }}><b style={{ color: 'var(--text)' }}>{months}</b> de {goal} meses</span>
        <span style={{ color: 'var(--sec)' }}><b style={{ color: 'var(--text)' }}>{goal / 12} años</b> · insignia ↓</span>
      </div>
    </>
  );
}

// ─── Achievements ─────────────────────────────────────────────────────────────
function achievementsOf(d) {
  return [
    { icon: '🏆', label: 'Primera inversión', desc: 'Invertiste en tu primer proyecto', p: d.holdings > 0 ? 1 : 0 },
    { icon: '🛡️', label: 'KYC completo', desc: 'Identidad verificada', p: 1 },
    { icon: '⭐', label: '6 meses activo', desc: 'Medio año invirtiendo', p: clamp(d.months / 6) },
    { icon: '🧭', label: 'Diversificado', desc: 'Proyectos en 3 rubros o más', p: clamp(d.cats.length / 3) },
    { icon: '💧', label: 'Primer $1K de yield', desc: 'Rentas cobradas acumuladas', p: clamp(d.yieldEarned / 1000) },
    { icon: '🎂', label: '1 año en KEYCHAIN', desc: 'Doce meses de antigüedad', p: clamp(d.months / 12) },
    { icon: '💎', label: '$50K invertido', desc: 'Llegá al Nivel 5', p: clamp(d.invested / 50000) },
    { icon: '🚀', label: '10 proyectos', desc: 'Un portafolio amplio', p: clamp(d.holdings / 10) },
  ];
}

function AchievementTile({ a }) {
  const done = a.p >= 1;
  return (
    <div style={{
      background: done ? 'linear-gradient(160deg, color-mix(in oklab, #8247E5 10%, var(--surface)), var(--surface))' : 'var(--surface)',
      border: `1px solid ${done ? 'color-mix(in oklab, #8247E5 35%, var(--border-l))' : 'var(--border-l)'}`,
      borderRadius: 20, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: done ? 'rgba(130,71,229,0.12)' : 'var(--surface2)', filter: done ? 'none' : 'grayscale(0.8)', opacity: done ? 1 : 0.7 }}>{a.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{a.label}</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{a.desc}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface2)' }}>
          <div style={{ width: `${a.p * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #8247E5, #3b82f6)' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700, color: done ? 'var(--pos)' : 'var(--sec)', minWidth: 72, textAlign: 'right' }}>
          {done ? '✓ Logrado' : `${Math.round(a.p * 100)}%`}
        </span>
      </div>
    </div>
  );
}

export default function LevelWidgets({ d, isMobile }) {
  const next = LEVELS[Math.min(d.level, 4)];
  const toNext = Math.max(0, next.min - d.invested);
  const pctNext = d.level >= 5 ? 100 : clamp(d.invested / next.min) * 100;
  const achievements = achievementsOf(d);
  const doneCount = achievements.filter(a => a.p >= 1).length;
  const cols = isMobile ? 2 : 4;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14 }}>
        <Tile icon={I.level} color="#8247E5" title={`Nivel ${d.level} · ${LEVELS[d.level - 1].name}`} span={2}>
          <LevelLine d={d} />
        </Tile>
        <Tile icon={I.wave} color="#14b8a6" title="Invertido">
          <WaveFill pct={pctNext} label={fmtUSD(d.invested)} sub={d.level >= 5 ? 'Nivel máximo' : `${fmtUSD(toNext)} para N${d.level + 1}`} />
        </Tile>
        <Tile icon={I.gauge} color="#e11d48" title="Reputación">
          <Gauge value={d.rep} />
        </Tile>
        <Tile icon={I.ret} color="#d946ef" title="Rendimiento">
          <ReturnScale ret={d.ret} />
        </Tile>
        <Tile icon={I.compass} color="#6366f1" title="Diversificación">
          <Compass cats={d.cats} />
        </Tile>
        <Tile icon={I.sun} color="#f59e0b" title="Antigüedad" span={2}>
          <SeniorityArc months={d.months} since={d.since} />
        </Tile>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '26px 0 12px' }}>
        <span style={{ color: '#f59e0b', display: 'flex' }}>{I.trophy}</span>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Logros</span>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{doneCount} de {achievements.length} desbloqueados</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {achievements.map(a => <AchievementTile key={a.label} a={a} />)}
      </div>
    </div>
  );
}
