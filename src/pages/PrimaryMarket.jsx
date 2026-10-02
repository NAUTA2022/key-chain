import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PSection, PTag, PChip, PStat, PImg, Icons, CompanyTag } from '../components/ui';
import { RWA_ASSETS, RWA_CATS, RWA_COUNTRIES, RWA_COMPANIES, fmtUSD, fmtUSD2 } from '../data';
import AssetCard from '../components/AssetCard';
import { useMobile } from '../hooks/useMobile';

// TEMP DEV FILTER — lets a developer jump straight to any of the 7 QA fixture
// states (see devNote on each asset in data/index.js) without hunting through
// the QA category. Remove this constant and the "Estado QA" FilterGroup below
// before shipping to production.
const QA_STATES = [
  { id: '51', label: 'Nuevo, sin financiar' },
  { id: '52', label: 'En financiamiento 40%' },
  { id: '53', label: '50% + Feed' },
  { id: '54', label: 'Financiado 100%' },
  { id: '55', label: 'Mi proyecto' },
  { id: '56', label: '40% + invertí' },
  { id: '57', label: '50% + Feed + invertí' },
];

// ─── Search + filter bar ──────────────────────────────────────────────────────
function FilterBar({ search, setSearch, cat, setCat, country, setCountry, company, setCompany, issuer, setIssuer, qaState, setQaState }) {
  const [open, setOpen] = useState(false);
  const hasFilters = cat !== 'Todos' || country !== 'Todos' || company !== 'Todos' || issuer !== 'Todos' || qaState !== 'Todos';

  return (
    <div style={{ marginBottom: 22 }}>
      {/* Search row */}
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--ter)', pointerEvents:'none', display:'flex' }}>
            {Icons.search || <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
          </span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proyectos, tokens, empresas..."
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px 10px 38px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, outline:'none' }}
          />
        </div>
        <button onClick={() => setOpen(o => !o)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 16px', borderRadius:12, border:`1.5px solid ${hasFilters ? 'var(--accent)' : 'var(--border)'}`, background: hasFilters ? 'var(--accent-bg)' : 'var(--surface)', color: hasFilters ? 'var(--accent-text)' : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:13, fontWeight:600, flexShrink:0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros {hasFilters && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }}/>}
        </button>
        {hasFilters && (
          <button onClick={() => { setCat('Todos'); setCountry('Todos'); setCompany('Todos'); setIssuer('Todos'); setQaState('Todos'); }}
            style={{ padding:'10px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'transparent', color:'var(--ter)', cursor:'pointer', fontSize:12, fontFamily:'var(--font-b)' }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Expandable filter panel */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:14, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:16 }}>
              <FilterGroup label="Categoría" value={cat} onChange={setCat} options={RWA_CATS} />
              <FilterGroup label="País" value={country} onChange={setCountry} options={RWA_COUNTRIES} />
              <FilterGroup label="Empresa" value={company} onChange={setCompany} options={RWA_COMPANIES} />
              <FilterGroup label="Tipo de emisor" value={issuer} onChange={setIssuer}
                options={['Todos','keychain','verified','community']}
                labels={['Todos','KEYCHAIN','Verificado','Comunidad']} />
              <FilterGroup label="Estado QA (temporal — dev)" value={qaState} onChange={setQaState}
                options={['Todos', ...QA_STATES.map(s => s.id)]}
                labels={['Todos', ...QA_STATES.map(s => s.label)]} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options, labels }) {
  return (
    <div>
      <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {options.map((opt, i) => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding:'5px 11px', borderRadius:999, border:`1.5px solid ${value===opt ? 'var(--accent)' : 'var(--border)'}`, background: value===opt ? 'var(--accent-bg)' : 'transparent', color: value===opt ? 'var(--accent-text)' : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12, fontWeight: value===opt ? 700 : 400 }}>
            {labels ? labels[i] : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PrimaryMarket({ nav, rubro = 'Todos' }) {
  const [search, setSearch] = useState('');
  const [cat, setCat]       = useState('Todos');
  const [country, setCountry] = useState('Todos');
  const [company, setCompany] = useState('Todos');
  const [issuer, setIssuer]   = useState('Todos');
  const [qaState, setQaState] = useState('Todos'); // TEMP DEV FILTER — see QA_STATES above

  const locked = rubro !== 'Todos';

  const filtered = useMemo(() => {
    const effectiveCat = locked ? rubro : cat;
    return RWA_ASSETS.filter(a => {
      if (qaState !== 'Todos') return String(a.id) === qaState;
      if (effectiveCat !== 'Todos' && a.cat !== effectiveCat) return false;
      if (country !== 'Todos' && a.country !== country) return false;
      if (company !== 'Todos' && a.company !== company) return false;
      if (issuer !== 'Todos' && a.issuer !== issuer) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.company?.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q) || a.location.toLowerCase().includes(q);
      }
      return true;
    // KEYCHAIN's own tokenizations always show first, then everyone else —
    // stable sort keeps each group's original relative order intact.
    }).sort((a, b) => (a.issuer === 'keychain' ? 0 : 1) - (b.issuer === 'keychain' ? 0 : 1));
  }, [search, cat, country, company, issuer, qaState, rubro, locked]);

  // Hero carousel — rotates through the top results (KEYCHAIN's own listings
  // sort first, see `filtered` above), auto-advancing every 5s and resetting
  // whenever the active filters change the result set. Index + direction are
  // tracked together so the slide animation knows which way to travel.
  const heroItems = useMemo(() => (filtered.length ? filtered : RWA_ASSETS).slice(0, 10), [filtered]);
  const [[heroIndex, heroDir], setHeroSlide] = useState([0, 1]);
  const [heroCountdown, setHeroCountdown] = useState(5);

  useEffect(() => {
    setHeroSlide([0, 1]);
    setHeroCountdown(5);
  }, [heroItems]);

  // Drag-to-advance — a real drag suppresses the card's own click-through to
  // the detail page (draggedRef) and pauses auto-advance (isDraggingRef) so
  // the timer doesn't fire mid-gesture; clearing past a threshold moves to
  // the next/previous slide in that direction, otherwise it springs back.
  const draggedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const handleDragStart = () => { draggedRef.current = false; isDraggingRef.current = true; };
  const handleDrag = (e, info) => { if (Math.abs(info.offset.x) > 5) draggedRef.current = true; };
  const handleDragEnd = (e, info) => {
    isDraggingRef.current = false;
    const n = heroItems.length;
    if (info.offset.x < -80 || info.velocity.x < -400) {
      goToHero((heroIndex + 1) % n);
    } else if (info.offset.x > 80 || info.velocity.x > 400) {
      goToHero((heroIndex - 1 + n) % n);
    }
  };

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const id = setInterval(() => {
      if (isDraggingRef.current) return;
      setHeroCountdown(c => {
        if (c <= 1) {
          setHeroSlide(([i]) => [(i + 1) % heroItems.length, 1]);
          return 5;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [heroItems]);

  const goToHero = (i) => {
    setHeroSlide(([current]) => [i, i > current ? 1 : i < current ? -1 : 1]);
    setHeroCountdown(5);
  };
  const handleHeroClick = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    nav('detalle', featured);
  };

  const featured = heroItems[heroIndex] || heroItems[0];
  const isMobile = useMobile();
  const heroH = isMobile ? 440 : 296;

  const heroCounter = heroItems.length > 1 && (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
      <div style={{ fontFamily:'var(--font-b)', fontSize:11, fontWeight:600, color:'var(--sec)',
        background:'var(--surface2)', padding:'4px 10px', borderRadius:999, border:'1px solid var(--border-l)' }}>
        Próximo en {heroCountdown}s
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {heroItems.map((item, i) => (
          <button key={item.id} onClick={() => goToHero(i)} title={item.name}
            style={{
              width: i === heroIndex ? 20 : 7, height:7, borderRadius:999,
              border:'none', padding:0, cursor:'pointer',
              background: i === heroIndex ? 'var(--accent)' : 'var(--border)',
              transition:'width 0.25s ease, background 0.25s ease',
            }} />
        ))}
      </div>
    </div>
  );

  const heroSlideVariants = {
    enter: dir => ({ x: dir > 0 ? '100%' : '-100%' }),
    center: { x: 0 },
    exit: dir => ({ x: dir > 0 ? '-100%' : '100%' }),
  };

  return (
    <div className="g-page" style={{ padding:'28px 32px 40px', maxWidth:1200, margin:'0 auto' }}>
      <PSection
        title="Mercado Primario"
        sub="Proyectos tokenizados en el ecosistema KEYCHAIN. Invertí desde la emisión."
        action={isMobile ? null : heroCounter}
      />

      {/* Hero carousel — rotates through heroItems, see state/effects above.
          Slides travel edge-to-edge (±100% of their own width) with no fade,
          clipped only by this viewport's overflow:hidden — not by any outer
          page margin — so the outgoing/incoming cards fully cross the frame. */}
      {featured && (
        <div style={{ position:'relative', overflow:'hidden', height:heroH, marginBottom: isMobile ? 14 : 28, borderRadius:20 }}>
          <AnimatePresence initial={false} custom={heroDir}>
            <motion.div key={featured.id}
              custom={heroDir}
              variants={heroSlideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration:0.45, ease:[0.4, 0, 0.2, 1] }}
              style={{ position:'absolute', inset:0 }}
              drag={heroItems.length > 1 ? 'x' : false}
              dragConstraints={{ left:0, right:0 }}
              dragElastic={0.35}
              dragMomentum={false}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
            >
              {isMobile ? (
              <PCard onClick={handleHeroClick} style={{ height:heroH, position:'relative', cursor:'grab', touchAction:'pan-y' }}>
                <PImg src={featured.img} height="100%" style={{ position:'absolute', inset:0 }}>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.88) 100%)' }} />
                  <div style={{ position:'absolute', top:14, left:14, right:14, display:'flex', justifyContent:'space-between', gap:8 }}>
                    <PTag label="Destacado" color="dark" />
                    <PTag label={featured.stage} color="green" />
                  </div>
                  <div style={{ position:'absolute', left:18, right:18, bottom:18, color:'#fff' }}>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:24, letterSpacing:'-0.03em', lineHeight:1.15, marginBottom:6 }}>{featured.name}</div>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:13, color:'rgba(255,255,255,0.75)', marginBottom:14, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', lineHeight:1.45 }}>{featured.desc}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:8, marginBottom:14 }}>
                      {[['Token', fmtUSD(featured.tokenPrice)], ['APY est.', `${featured.apy}%`], ['Financiado', `${featured.sold}%`]].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ fontFamily:'var(--font-b)', fontSize:10.5, textTransform:'uppercase', letterSpacing:'0.07em', color:'rgba(255,255,255,0.65)' }}>{l}</div>
                          <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <PBtn variant="accent" style={{ width:'100%', justifyContent:'center', background:'#fff', color:'#0b0b0f' }} onClick={e => { e.stopPropagation(); nav('detalle', featured); }}>Ver proyecto</PBtn>
                  </div>
                </PImg>
              </PCard>
              ) : (
              <PCard onClick={handleHeroClick}
                style={{ display:'flex', height:296, cursor:'grab', flexWrap:'wrap', touchAction:'pan-y',
                  ...(featured.issuer==='keychain' && { boxShadow:'var(--sh-lg)', background:'var(--surface)' }) }}>
                <PImg src={featured.img} height="auto" style={{ width:'44%', height:'auto', minHeight:200, flex:'1 1 240px' }}>
                  <div style={{ position:'absolute', top:14, left:14, display:'flex', gap:8 }}>
                    <PTag label="Destacado" color="dark" />
                  </div>
                </PImg>
                <div style={{ flex:1, padding:'28px 32px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                      <PTag label={featured.stage} color="green" />
                    </div>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:28, color:'var(--text)', letterSpacing:'-0.03em', marginBottom:10 }}>{featured.name}</div>
                    {featured.company && (
                      <CompanyTag company={featured.issuer === 'keychain' ? 'KEYCHAIN' : featured.company} cat={featured.cat} style={{ marginBottom:12 }} />
                    )}
                    <div style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)', lineHeight:1.6, maxWidth:480 }}>{featured.desc}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:20 }}>
                    <div style={{ display:'flex', gap:36 }}>
                      <PStat label="Valuación" value={fmtUSD(featured.valuation)} />
                      <PStat label="Token" value={fmtUSD(featured.tokenPrice)} />
                      <PStat label="APY est." value={`${featured.apy}%`} accent />
                      <PStat label="Financiado" value={`${featured.sold}%`} />
                    </div>
                    <PBtn variant="accent" onClick={e => { e.stopPropagation(); nav('detalle', featured); }}>Ver proyecto</PBtn>
                  </div>
                </div>
              </PCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
      {isMobile && featured && heroCounter && (
        <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
          <div style={{ display:'flex', gap:6 }}>
            {heroItems.map((item, i) => (
              <button key={item.id} onClick={() => goToHero(i)} aria-label={item.name}
                style={{ width: i === heroIndex ? 20 : 7, height:7, borderRadius:999, border:'none', padding:0, cursor:'pointer',
                  background: i === heroIndex ? 'var(--accent)' : 'var(--border)', transition:'width 0.25s ease, background 0.25s ease' }} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {locked ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
          <PTag label={`Rubro: ${rubro}`} color="green" />
          <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>Filtrado desde Personalización.</span>
        </div>
      ) : (
        <FilterBar search={search} setSearch={setSearch} cat={cat} setCat={setCat}
          country={country} setCountry={setCountry} company={company} setCompany={setCompany}
          issuer={issuer} setIssuer={setIssuer} qaState={qaState} setQaState={setQaState} />
      )}

      {/* Results count */}
      <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:16 }}>
        {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Grid */}
      <div className="g-market-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20 }}>
        {filtered.map(a => <AssetCard key={a.id} asset={a} nav={nav} />)}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:14 }}>
          No se encontraron proyectos con los filtros seleccionados.
        </div>
      )}
    </div>
  );
}
