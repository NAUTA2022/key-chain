import { useState } from 'react';
import { PCard, PBtn } from './ui';
import { ProjectCode } from './FeedPostCard';
import ProjectBrowser from './ProjectBrowser';
import { VerifiedBadge } from './ProfileCard';
import { fmtUSD } from '../data';
import { fmtCount } from '../lib/projectFeed';
import { hashOf } from '../lib/people';
import { companyMetrics, fmtShort, trustLabel, raisedOf, investorsOf } from '../lib/companyStats';
import { ME } from '../lib/me';

// The sections of a company profile besides its projects and milestones:
// Resumen, Analítica, Rentabilidad y confianza and Reseñas. Every number is
// derived from the company's projects (demo data until there's a backend).

// ─── Small building blocks ────────────────────────────────────────────────────
const H = ({ children, sub }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{children}</div>
    {sub && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>{sub}</div>}
  </div>
);

function Kpis({ items, isMobile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : `repeat(${items.length}, minmax(0,1fr))`, gap: 12, marginBottom: 18 }}>
      {items.map(([v, l, hint]) => (
        <PCard key={l} style={{ padding: '14px 18px' }}>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{l}</div>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.03em' }}>{v}</div>
          {hint && <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 3 }}>{hint}</div>}
        </PCard>
      ))}
    </div>
  );
}

export function Stars({ value, size = 14, onPick }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }} aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} onClick={onPick ? () => onPick(n) : undefined}
          style={{ fontSize: size, lineHeight: 1, color: n <= Math.round(value) ? '#F5A623' : 'var(--border)', cursor: onPick ? 'pointer' : 'default' }}>★</span>
      ))}
    </span>
  );
}

// Hover tooltip shared by the charts.
function Tip({ tip }) {
  if (!tip) return null;
  return (
    <div style={{
      position: 'absolute', left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 8px))', pointerEvents: 'none', zIndex: 3,
      background: 'var(--text)', color: 'var(--bg)', borderRadius: 8, padding: '6px 10px', whiteSpace: 'nowrap',
      fontFamily: 'var(--font-b)', fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
    }}>
      {tip.lines.map((l, i) => <div key={i} style={{ fontWeight: i === 0 ? 700 : 400 }}>{l}</div>)}
    </div>
  );
}

// Horizontal bars, one series (magnitude → one hue), value labelled at the end.
function HBarChart({ rows, fmt, tipFor }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setTip(null)}>
      {rows.map(r => (
        <div key={r.key}
          onMouseMove={e => { const box = e.currentTarget.parentElement.getBoundingClientRect(); setTip({ x: e.clientX - box.left, y: e.clientY - box.top, lines: tipFor(r) }); }}
          style={{ display: 'grid', gridTemplateColumns: '72px 1fr 64px', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'default' }}>
          <span>{r.label}</span>
          <div style={{ height: 14, background: 'var(--surface2)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${Math.max(2, (r.value / max) * 100)}%`, background: 'var(--accent)', borderRadius: 4 }} />
          </div>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{fmt(r.value)}</span>
        </div>
      ))}
      <Tip tip={tip} />
    </div>
  );
}

// Vertical columns over time, one series, recessive baseline + 2 gridlines.
function ColumnChart({ points, fmt, height = 160 }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...points.map(p => p.value)) * 1.15;
  return (
    <div style={{ position: 'relative', paddingTop: 18 }} onMouseLeave={() => setTip(null)}>
      <div style={{ position: 'relative', height, display: 'flex', alignItems: 'flex-end', gap: 6, borderBottom: '1px solid var(--border)' }}>
        {[0.5, 1].map(f => (
          <div key={f} style={{ position: 'absolute', left: 0, right: 0, bottom: `${f * 100}%`, borderTop: '1px dashed var(--border-l)', zIndex: 0 }}>
            <span style={{ position: 'absolute', left: 0, top: -16, fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)' }}>{fmt(max * f)}</span>
          </div>
        ))}
        {points.map((p, i) => (
          <div key={p.label + i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default', position: 'relative', zIndex: 1 }}
            onMouseMove={e => { const box = e.currentTarget.parentElement.parentElement.getBoundingClientRect(); setTip({ x: e.clientX - box.left, y: e.clientY - box.top, lines: [p.label, fmtUSD(p.value)] }); }}>
            <div style={{ width: '100%', height: `${(p.value / max) * 100}%`, minHeight: p.value ? 2 : 0, background: 'var(--accent)', borderRadius: '4px 4px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {points.map((p, i) => <span key={p.label + i} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)' }}>{p.label}</span>)}
      </div>
      <Tip tip={tip} />
    </div>
  );
}

function Sparkline({ values, width = 90, height = 26 }) {
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / (max - min || 1)) * (height - 4)}`).join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Resumen ──────────────────────────────────────────────────────────────────
export function CompanySummary({ profile, posts, reviews, owner, nav, isMobile, onOwner, onTab }) {
  const m = companyMetrics(profile, posts, reviews);
  const latest = posts.filter(p => p.post.milestone).slice(0, 3);
  return (
    <div>
      <Kpis isMobile={isMobile} items={[
        [fmtShort(m.raised), 'Capital recaudado'],
        [fmtCount(m.investors), 'Inversores'],
        [`${m.assets.length}`, 'Proyectos', `${m.operating.length} operativos · ${m.assets.length - m.operating.length} en recaudación`],
        [`${m.apy.toFixed(1)}%`, 'APY promedio'],
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <PCard style={{ padding: '20px 22px' }}>
            <H>Sobre {profile.name}</H>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.6, marginBottom: 16 }}>{profile.bio}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                ['Fundada', String(m.founded)],
                ['Países', m.countries.join(', ')],
                ['Rubros', m.cats.join(', ')],
                ['Verificación', profile.verified ? 'Empresa verificada (KYB)' : 'Sin verificar'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
          </PCard>

          <PCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <H>Últimos hitos</H>
              <button onClick={() => onTab('hitos')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600 }}>Ver todos →</button>
            </div>
            {latest.length === 0 && <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>Todavía no publicó hitos.</div>}
            {latest.map(({ post, asset }, i) => (
              <button key={post.id} onClick={() => nav('detalle', { ...asset, focusPostId: post.id })}
                style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', color: 'inherit', borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
                <img src={post.media?.[0]?.url || asset.img} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <ProjectCode asset={asset} />
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{asset.name} · {post.date}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.text}</div>
                </div>
              </button>
            ))}
          </PCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <PCard style={{ padding: '20px 22px' }}>
            <H>Dueño</H>
            <button onClick={onOwner} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: owner.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{owner.initial}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{owner.name}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>Fundador y CEO · Ver perfil</div>
              </div>
            </button>
          </PCard>

          <PCard style={{ padding: '20px 22px' }}>
            <H>Confianza</H>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <TrustRing value={m.trust} size={72} />
              <div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{trustLabel(m.trust)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Stars value={m.rating} /> <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>{m.rating.toFixed(1)} · {reviews.length} reseñas</span>
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 4 }}>{m.onTime.toFixed(0)}% de pagos a tiempo</div>
              </div>
            </div>
            <PBtn variant="secondary" small style={{ marginTop: 14 }} onClick={() => onTab('confianza')}>Ver rentabilidad y confianza</PBtn>
          </PCard>

        </div>
      </div>

      {/* Projects — mini marketplace with search and filters (first 6) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '24px 0 12px' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Proyectos <span style={{ color: 'var(--ter)', fontWeight: 600 }}>({m.assets.length})</span></div>
      </div>
      <ProjectBrowser items={m.assets.map(asset => ({ asset }))} nav={nav} isMobile={isMobile} showCode minCard={300} limit={6} onMore={() => onTab('proyectos')} placeholder="Buscar proyectos de la empresa…" />
    </div>
  );
}

function TrustRing({ value, size = 72 }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: size * 0.3, color: 'var(--text)', lineHeight: 1 }}>{value}</span>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 9.5, color: 'var(--ter)' }}>/100</span>
      </div>
    </div>
  );
}

// ─── Analítica ────────────────────────────────────────────────────────────────
export function CompanyAnalytics({ profile, posts, reviews, isMobile }) {
  const m = companyMetrics(profile, posts, reviews);
  const rows = [...m.assets].sort((x, y) => raisedOf(y) - raisedOf(x)).map(a => ({
    key: a.id, value: raisedOf(a), asset: a, label: <ProjectCode asset={a} />,
  }));
  const investorRows = [...m.assets].sort((x, y) => investorsOf(y) - investorsOf(x)).map(a => ({
    key: a.id, value: investorsOf(a), asset: a, label: <ProjectCode asset={a} />,
  }));
  return (
    <div>
      <Kpis isMobile={isMobile} items={[
        [fmtShort(m.raised), 'Capital recaudado', `${m.funded.toFixed(0)}% financiado en promedio`],
        [fmtShort(m.distributed), 'Distribuido a inversores'],
        [fmtCount(m.investors), 'Inversores'],
        [`${m.milestones}`, 'Hitos publicados', `${fmtCount(m.likes)} me gusta · ${m.comments} comentarios`],
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 18 }}>
        <PCard style={{ padding: '20px 22px' }}>
          <H sub="USD recaudados por proyecto">Capital por proyecto</H>
          <HBarChart rows={rows} fmt={fmtShort}
            tipFor={r => [r.asset.name, `${fmtUSD(r.value)} · ${r.asset.sold}% financiado`]} />
        </PCard>
        <PCard style={{ padding: '20px 22px' }}>
          <H sub="Personas con tokens de cada proyecto">Inversores por proyecto</H>
          <HBarChart rows={investorRows} fmt={v => fmtCount(v)}
            tipFor={r => [r.asset.name, `${fmtCount(r.value)} inversores`]} />
        </PCard>
        <PCard style={{ padding: '20px 22px', gridColumn: isMobile ? 'auto' : '1 / -1' }}>
          <H sub="Rentas pagadas a los inversores, últimos 12 meses (USD)">Distribuciones por mes</H>
          <ColumnChart points={m.monthly} fmt={fmtShort} />
        </PCard>
      </div>
    </div>
  );
}

// ─── Rentabilidad y confianza ─────────────────────────────────────────────────
export function CompanyTrust({ profile, posts, reviews, nav, isMobile }) {
  const m = companyMetrics(profile, posts, reviews);
  const factors = [
    ['Verificación de la empresa', m.verifiedScore, profile.verified ? 'KYB aprobado por KEYCHAIN' : 'Pendiente de verificación'],
    ['Pagos a tiempo', Math.round(m.onTime), m.payments ? `${m.payments - m.late} de ${m.payments} distribuciones en fecha` : 'Sin distribuciones todavía'],
    ['Financiamiento de proyectos', Math.round(m.funded), 'Promedio vendido de sus proyectos'],
    ['Reseñas de inversores', Math.round((m.rating / 5) * 100), `${m.rating.toFixed(1)} de 5 en ${reviews.length} reseñas`],
    ['Transparencia', Math.round(m.transparency), `${posts.length} actualizaciones publicadas`],
  ];
  const signals = [
    [profile.verified, 'Empresa verificada (KYB)'],
    [true, 'Dueño con identidad verificada (KYC)'],
    [m.assets.every(a => a.contract), 'Contratos inteligentes publicados'],
    [m.late === 0, 'Sin pagos atrasados'],
    [m.milestones > 0, 'Reporta hitos de avance'],
  ];
  return (
    <div>
      <Kpis isMobile={isMobile} items={[
        [`${m.apy.toFixed(1)}%`, 'APY promedio', 'Ponderado por capital'],
        [fmtShort(m.distributed), 'Rentas distribuidas'],
        [`${m.onTime.toFixed(0)}%`, 'Pagos a tiempo'],
        [`${m.trust}/100`, 'Índice de confianza', trustLabel(m.trust)],
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 18, marginBottom: 18 }}>
        <PCard style={{ padding: '20px 22px' }}>
          <H sub="Cómo se calcula el índice">Índice de confianza</H>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <TrustRing value={m.trust} size={84} />
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--text)' }}>{trustLabel(m.trust)}</b>. Combina verificación, puntualidad de pagos, financiamiento, reseñas y transparencia.
            </div>
          </div>
          {factors.map(([label, v, hint]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-b)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{v}</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, margin: '5px 0 3px' }}>
                <div style={{ width: `${v}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
              </div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{hint}</div>
            </div>
          ))}
        </PCard>

        <PCard style={{ padding: '20px 22px' }}>
          <H>Señales de confianza</H>
          {signals.map(([ok, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-l)' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
                background: ok ? 'color-mix(in oklab, var(--pos) 15%, transparent)' : 'var(--surface2)', color: ok ? 'var(--pos)' : 'var(--ter)' }}>{ok ? '✓' : '–'}</span>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: ok ? 'var(--text)' : 'var(--ter)' }}>{label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-b)', fontSize: 11.5, color: ok ? 'var(--pos)' : 'var(--ter)', fontWeight: 600 }}>{ok ? 'Cumple' : 'No cumple'}</span>
            </div>
          ))}
          {profile.verified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>
              <VerifiedBadge /> Verificada por KEYCHAIN
            </div>
          )}
        </PCard>
      </div>

      <PCard style={{ padding: '20px 22px' }}>
        <H sub="Rendimiento de cada proyecto de la empresa">Rentabilidad por proyecto</H>
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-b)', fontSize: 13, minWidth: 620 }}>
            <thead>
              <tr style={{ color: 'var(--ter)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                {['Proyecto', 'Estado', 'APY', 'Financiado', 'Valor 12 m', 'Tendencia'].map(h => <th key={h} style={{ padding: '6px 8px', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {m.assets.map(a => {
                const perf = a.perf || [1, 1];
                const chg = ((perf[perf.length - 1] - perf[0]) / perf[0]) * 100;
                return (
                  <tr key={a.id} onClick={() => nav('detalle', a)} style={{ borderTop: '1px solid var(--border-l)', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ProjectCode asset={a} /><span style={{ color: 'var(--text)', fontWeight: 600 }}>{a.name}</span></div>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--sec)' }}>{a.stage}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--text)', fontWeight: 700 }}>{a.apy}%</td>
                    <td style={{ padding: '10px 8px', color: 'var(--sec)' }}>{a.sold}%</td>
                    <td style={{ padding: '10px 8px', color: chg >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>{chg >= 0 ? '+' : ''}{chg.toFixed(1)}%</td>
                    <td style={{ padding: '10px 8px' }}><Sparkline values={perf} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PCard>
    </div>
  );
}

// ─── Reseñas ──────────────────────────────────────────────────────────────────
export function CompanyReviews({ profile, reviews, onAdd, isMine, nav, isMobile }) {
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState({ assetId: profile.allAssets[0]?.id, rating: 5, text: '' });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const shown = filter === 'all' ? reviews : reviews.filter(r => r.asset.id === filter);
  const projects = profile.allAssets.filter(a => reviews.some(r => r.asset.id === a.id));
  const submit = () => {
    const asset = profile.allAssets.find(a => a.id === Number(draft.assetId));
    if (!asset || !draft.text.trim()) return;
    onAdd({ id: `me-${Date.now()}`, asset, rating: draft.rating, author: ME.name, text: draft.text.trim(), date: 'Ahora', ts: 1 });
    setDraft(d => ({ ...d, text: '', rating: 5 }));
  };
  const chip = (id, label) => (
    <button key={id} onClick={() => setFilter(id)}
      style={{ padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600,
        border: `1px solid ${filter === id ? 'var(--text)' : 'var(--border-l)'}`, background: filter === id ? 'var(--surface2)' : 'transparent', color: filter === id ? 'var(--text)' : 'var(--sec)' }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,2fr)', gap: 18, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PCard style={{ padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 40, color: 'var(--text)', lineHeight: 1 }}>{avg.toFixed(1)}</div>
          <div style={{ margin: '6px 0 4px' }}><Stars value={avg} size={18} /></div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 14 }}>{reviews.length} reseñas de inversores</div>
          {[5, 4, 3, 2, 1].map(n => {
            const c = reviews.filter(r => r.rating === n).length;
            return (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 24px', gap: 8, alignItems: 'center', marginBottom: 5, fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)' }}>
                <span>{n}★</span>
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99 }}>
                  <div style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%`, height: '100%', background: '#F5A623', borderRadius: 99 }} />
                </div>
                <span style={{ textAlign: 'right' }}>{c}</span>
              </div>
            );
          })}
        </PCard>

        {!isMine && (
          <PCard style={{ padding: '20px 22px' }}>
            <H sub="Contá tu experiencia como inversor">Escribir una reseña</H>
            <select value={draft.assetId} onChange={e => setDraft(d => ({ ...d, assetId: e.target.value }))}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13, marginBottom: 10 }}>
              {profile.allAssets.map(a => <option key={a.id} value={a.id}>{`${a.name}`}</option>)}
            </select>
            <div style={{ marginBottom: 10 }}><Stars value={draft.rating} size={22} onPick={n => setDraft(d => ({ ...d, rating: n }))} /></div>
            <textarea value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} rows={3} placeholder="¿Cómo fue tu experiencia con este proyecto?"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13, outline: 'none' }} />
            <PBtn variant="accent" small style={{ marginTop: 10, opacity: draft.text.trim() ? 1 : 0.5 }} disabled={!draft.text.trim()} onClick={submit}>Publicar reseña</PBtn>
          </PCard>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {chip('all', 'Todos los proyectos')}
          {projects.map(a => chip(a.id, a.name))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(r => (
            <PCard key={r.id} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <button onClick={() => (r.author === ME.name ? nav('perfil') : nav('usuario', r.author))} aria-label={`Ver perfil de ${r.author}`}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, color: '#fff', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14,
                    background: r.author === ME.name ? ME.gradient : `hsl(${hashOf(r.author) % 360} 55% 50%)` }}>
                  {r.author.slice(0, 1)}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{r.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Stars value={r.rating} size={12} /><span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{r.date}</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ProjectCode asset={r.asset} onClick={() => nav('detalle', r.asset)} />
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)' }}>{r.asset.name}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>{r.text}</div>
            </PCard>
          ))}
          {shown.length === 0 && <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>Todavía no hay reseñas.</div>}
        </div>
      </div>
    </div>
  );
}

