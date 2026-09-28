import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PBtn, PSection, PTag, PChip, PStat, PProgress, PImg, Icons } from '../components/ui';
import { RWA_ASSETS, RWA_CATS, fmtUSD, fmtUSD2 } from '../data';

function AssetCard({ asset: a, nav }) {
  const left = a.totalTokens - Math.round(a.totalTokens * a.sold / 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: 'var(--sh-lg)' }}
      transition={{ duration: 0.2 }}
    >
      <PCard onClick={() => nav('detalle', a)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <PImg src={a.img} height={168} className="market-card-img">
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
            <PTag label={a.cat} color="dark" />
            <PTag label={a.stage} style={{ background: a.stage === 'Operativo' ? 'rgba(110,231,114,0.92)' : 'rgba(255,255,255,0.92)', color: '#0a2a0d' }} />
          </div>
        </PImg>
        <div className="market-card-body" style={{ padding: '15px 17px 17px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <div>
            <div className="market-card-title" style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.02em' }}>{a.name}</div>
            <div className="market-card-loc" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: 'var(--ter)' }}>
              {Icons.location}
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)' }}>{a.location}</span>
            </div>
          </div>
          <div className="market-card-stats" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <PStat label="Token" value={fmtUSD(a.tokenPrice)} />
            <PStat label="APY est." value={`${a.apy}%`} accent />
            <span className="market-stat-disp"><PStat label="Disponibles" value={left.toLocaleString()} style={{ alignItems: 'flex-end' }} /></span>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)' }}>Financiado</span>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700, color: 'var(--accent-text)' }}>{a.sold}%</span>
            </div>
            <PProgress value={a.sold} />
          </div>
        </div>
      </PCard>
    </motion.div>
  );
}

export default function PrimaryMarket({ nav, rubro = 'Todos' }) {
  const [cat, setCat] = useState('Todos');
  const locked = rubro !== 'Todos';
  const effective = locked ? rubro : cat;
  const filtered = effective === 'Todos' ? RWA_ASSETS : RWA_ASSETS.filter(a => a.cat === effective);
  const featured = locked ? (filtered[0] || RWA_ASSETS[2]) : RWA_ASSETS[2];

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PSection title="Mercado Primario" sub="Proyectos promovidos y verificados por FACTORACT. Invertí desde la emisión." />

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PCard onClick={() => nav('detalle', featured)} style={{ display: 'flex', marginBottom: 28, minHeight: 240, cursor: 'pointer', flexWrap: 'wrap' }}>
          <PImg src={featured.img} height="auto" style={{ width: '44%', height: 'auto', minHeight: 200, flex: '1 1 240px' }}>
            <div style={{ position: 'absolute', top: 14, left: 14 }}>
              <PTag label="Destacado" color="dark" />
            </div>
          </PImg>
          <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <PTag label={featured.cat} color="neutral" />
                <PTag label={featured.stage} color="green" />
              </div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 8 }}>{featured.name}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.6, maxWidth: 480 }}>{featured.desc}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 36 }}>
                <PStat label="Valuación" value={fmtUSD(featured.valuation)} />
                <PStat label="Token" value={fmtUSD(featured.tokenPrice)} />
                <PStat label="APY est." value={`${featured.apy}%`} accent />
                <PStat label="Financiado" value={`${featured.sold}%`} />
              </div>
              <PBtn variant="accent" onClick={e => { e.stopPropagation(); nav('detalle', featured); }}>Ver proyecto</PBtn>
            </div>
          </div>
        </PCard>
      </motion.div>

      {/* Filters */}
      {locked ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <PTag label={`Rubro: ${rubro}`} color="green" />
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Filtrado desde Personalización.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {RWA_CATS.map(c => <PChip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
        </div>
      )}

      {/* Grid */}
      <div className="g-market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {filtered.map(a => <AssetCard key={a.id} asset={a} nav={nav} />)}
      </div>
    </div>
  );
}
