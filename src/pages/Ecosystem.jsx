import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes, FaFilter, FaShieldAlt, FaBolt, FaCoins, FaLock, FaCheckCircle, FaSortAmountDown, FaSortAmountUp, FaCube } from 'react-icons/fa';
import { playNodeHover, playNodeSelect, playZoomIn, playZoomOut } from '../lib/sound';
import { GOLD, AMBER, WHITE, BLUE, GREEN, BG, ICON_MAP, ICON_OPTIONS, COUNTRY_META, PROJECT_META, INITIAL_DATA, uid, cardColor } from '../lib/ecosystemData';
import { buildGraph } from '../lib/ecosystemGraph';
import { CoreCard, CountryCard, CategoryCard, CompanyCard, ProjectCard, CompanyGalleryOverlay } from '../components/EcosystemCards';

// Lazy-loaded: three.js + @react-three/fiber/drei are a heavy bundle that most
// visitors (who stay on the 2D graph) should never have to download or run.
// Only fetched — and only mounted — once the user explicitly opts into 3D.
const Ecosystem3D = lazy(() => import('./Ecosystem3D'));

// ─── GEOMETRY ────────────────────────────────────────────────────────────────
const hexPoints = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 6;
  return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
}).join(' ');
const hexVerts = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 6;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
function Ecosystem2D({ nav }) {
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pinchDist = useRef(null);
  const animFrameRef = useRef(null);

  const [data, setData] = useState(INITIAL_DATA);
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [card, setCard] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState('country');
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [form, setForm] = useState({
    country:  { name: '', flag: '🇺🇸' },
    category: { name: '', icon: 'autos', countryId: '' },
    company:  { name: '', categoryId: '' },
    project:  { name: '', companyId: '' },
  });

  useEffect(() => {
    const fn = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setContainerSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); if (!card) { (e.deltaY < 0 ? playZoomIn : playZoomOut)(); setZoom(z => Math.min(Math.max(z * (e.deltaY < 0 ? 1.1 : 0.9), 0.1), 6)); } };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [card]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (pinchDist.current !== null) setZoom(z => Math.min(Math.max(z * dist / pinchDist.current, 0.1), 6));
        pinchDist.current = dist;
      } else if (e.touches.length === 1 && dragging.current && !card) {
        setPan({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y });
      }
    };
    el.addEventListener('touchmove', fn, { passive: false });
    return () => el.removeEventListener('touchmove', fn);
  }, [card]);

  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0 || card) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan, card]);
  const onMouseMove = useCallback((e) => { if (!dragging.current) return; setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); }, []);
  const stopDrag = useCallback(() => { dragging.current = false; }, []);

  function animateTo(targetPan, targetZoom, onDone) {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    let cp = { x: pan.x, y: pan.y }, cz = zoom;
    const step = () => {
      const S = 0.13;
      cp = { x: cp.x + (targetPan.x - cp.x) * S, y: cp.y + (targetPan.y - cp.y) * S };
      cz += (targetZoom - cz) * S;
      setPan({ ...cp }); setZoom(cz);
      if (Math.abs(targetPan.x - cp.x) < 0.5 && Math.abs(targetPan.y - cp.y) < 0.5 && Math.abs(targetZoom - cz) < 0.003) {
        setPan(targetPan); setZoom(targetZoom); onDone?.();
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };
    animFrameRef.current = requestAnimationFrame(step);
  }

  const ZOOM_LEVELS = { country: 2.0, category: 2.6, company: 3.2, project: 4.0 };

  function handleNodeClick(node) {
    if (card?.node.id === node.id) { closeCard(); return; }
    playNodeSelect();
    playZoomIn();
    const tz = ZOOM_LEVELS[node.type] || 2.0;
    setCard({ node });
    animateTo({ x: -node.x * tz, y: -node.y * tz }, tz);
  }

  function handleCoreClick() {
    if (card?.node?.id === 'keychain') { closeCard(); return; }
    playNodeSelect();
    playZoomIn();
    const coreNode = { id: 'keychain', type: 'core', name: 'KEYCHAIN', x: 0, y: 0 };
    setCard({ node: coreNode });
    animateTo({ x: 0, y: 0 }, 2.0);
  }

  function closeCard() {
    playZoomOut();
    setCard(null);
    animateTo({ x: 0, y: 0 }, 0.72);
  }

  const addCountry = () => {
    if (!form.country.name.trim()) return;
    setData(d => ({ ...d, countries: [...d.countries, { id: uid(), name: form.country.name.trim(), flag: form.country.flag, angleOffset: (Math.random()-0.5)*0.4, radiusOffset: Math.floor((Math.random()-0.5)*20), categories: [] }] }));
    setForm(f => ({ ...f, country: { name: '', flag: '🇺🇸' } }));
  };
  const addCategory = () => {
    if (!form.category.name.trim() || !form.category.countryId) return;
    const nc = { id: uid(), name: form.category.name.trim(), icon: form.category.icon, angleOffset: (Math.random()-0.5)*0.2, radiusOffset: Math.floor((Math.random()-0.5)*15), companies: [] };
    setData(d => ({ ...d, countries: d.countries.map(c => c.id === form.category.countryId ? { ...c, categories: [...c.categories, nc] } : c) }));
    setForm(f => ({ ...f, category: { ...f.category, name: '' } }));
  };
  const addCompany = () => {
    if (!form.company.name.trim() || !form.company.categoryId) return;
    const [catId, countryId] = form.company.categoryId.split('::');
    const nc = { id: uid(), name: form.company.name.trim(), projects: [] };
    setData(d => ({ ...d, countries: d.countries.map(c => c.id === countryId ? { ...c, categories: c.categories.map(cat => cat.id === catId ? { ...cat, companies: [...cat.companies, nc] } : cat) } : c) }));
    setForm(f => ({ ...f, company: { ...f.company, name: '' } }));
  };
  const addProject = () => {
    if (!form.project.name.trim() || !form.project.companyId) return;
    const [compId, catId, countryId] = form.project.companyId.split('::');
    const np = { id: uid(), name: form.project.name.trim() };
    setData(d => ({ ...d, countries: d.countries.map(c => c.id === countryId ? { ...c, categories: c.categories.map(cat => cat.id === catId ? { ...cat, companies: cat.companies.map(comp => comp.id === compId ? { ...comp, projects: [...comp.projects, np] } : comp) } : cat) } : c) }));
    setForm(f => ({ ...f, project: { ...f.project, name: '' } }));
  };

  const graph = buildGraph(data);
  // Projects never render as graph nodes/edges — they only appear as the
  // stacked carousel inside a company's info card once it's selected.
  const visibleNodes = graph.nodes.filter(n => n.type !== 'project');
  const visibleEdges = graph.edges.filter(e => e.tier !== 'leaf');
  const cw = containerSize.w || vp.w, ch = containerSize.h || vp.h;
  const cx = cw / 2 + pan.x, cy = ch / 2 + pan.y;
  const allCategories = data.countries.flatMap(c => c.categories.map(cat => ({ id: `${cat.id}::${c.id}`, label: `${cat.name} (${c.name})` })));
  const allCompanies  = data.countries.flatMap(c => c.categories.flatMap(cat => cat.companies.map(comp => ({ id: `${comp.id}::${cat.id}::${c.id}`, label: `${comp.name} (${cat.name})` }))));

  return (
    <div style={{ position:'absolute', inset:0, background:BG, overflow:'hidden', fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>

      {/* CANVAS */}
      <div ref={containerRef}
        style={{ position:'absolute', inset:0, overflow:'hidden', cursor: card ? 'default' : 'grab', userSelect:'none', touchAction:'none' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopDrag} onMouseLeave={stopDrag}
        onTouchStart={e => {
          if (e.touches.length===2) { const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY; pinchDist.current=Math.sqrt(dx*dx+dy*dy); }
          else if (!card) { dragging.current=true; dragStart.current={x:e.touches[0].clientX-pan.x,y:e.touches[0].clientY-pan.y}; }
        }}
        onTouchEnd={() => { dragging.current=false; pinchDist.current=null; }}
      >
        <svg width="100%" height="100%" style={{ display:'block' }}>
          <defs>
            <style>{`
              @keyframes pulse-core { 0%{opacity:.4;transform:scale(1)} 100%{opacity:0;transform:scale(1.45)} }
              @keyframes pulse-node { 0%{opacity:.45;transform:scale(1)} 100%{opacity:0;transform:scale(1.55)} }
              @keyframes orbit-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              .pc1{animation:pulse-core 2.6s ease-out infinite;transform-origin:center;transform-box:fill-box}
              .pc2{animation:pulse-core 2.6s ease-out .9s infinite;transform-origin:center;transform-box:fill-box}
              .pn1{animation:pulse-node 2.1s ease-out infinite;transform-origin:center;transform-box:fill-box}
              .pn2{animation:pulse-node 2.1s ease-out .7s infinite;transform-origin:center;transform-box:fill-box}
              .moon-orbit{animation:orbit-spin 26s linear infinite;transform-origin:0px 0px}
            `}</style>
            <filter id="glow-gold" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="5.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-amber" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-white" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-blue" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-green" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <radialGradient id="grad-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#12100a" stopOpacity="0.45"/><stop offset="100%" stopColor={BG} stopOpacity="0"/></radialGradient>
            <radialGradient id="grad-core"><stop offset="0%" stopColor="#2a1e00"/><stop offset="100%" stopColor="#020100"/></radialGradient>
            <radialGradient id="grad-country"><stop offset="0%" stopColor="#1e1400"/><stop offset="100%" stopColor="#060400"/></radialGradient>
            <radialGradient id="grad-cat"><stop offset="0%" stopColor="#181818"/><stop offset="100%" stopColor="#080808"/></radialGradient>
            <radialGradient id="grad-comp"><stop offset="0%" stopColor="#061420"/><stop offset="100%" stopColor="#020608"/></radialGradient>
            <radialGradient id="grad-proj"><stop offset="0%" stopColor="#041208"/><stop offset="100%" stopColor="#020402"/></radialGradient>
          </defs>

          <ellipse cx={cx} cy={cy} rx={560*zoom} ry={420*zoom} fill="url(#grad-bg)"/>

          <g transform={`translate(${cx},${cy}) scale(${zoom})`}>
            {/* Edges */}
            {visibleEdges.map((e,i) => {
              if (e.tier==='cross') {
                return <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#ffffff" strokeWidth={0.6} strokeOpacity={0.18} strokeDasharray="5 8" strokeLinecap="round"/>;
              }
              const color = e.tier==='core'?GOLD:e.tier==='country'?AMBER:e.tier==='sub'?BLUE:GREEN;
              const op = e.tier==='core'?0.6:e.tier==='country'?0.45:e.tier==='sub'?0.35:0.22;
              const w = e.tier==='core'?1.2:e.tier==='country'?0.9:e.tier==='sub'?0.7:0.45;
              return <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={color} strokeWidth={w} strokeOpacity={op} strokeLinecap="round"/>;
            })}

            {/* Nodes */}
            {visibleNodes.map(node => <NodeShape key={node.id} node={node} active={card?.node.id===node.id} onSelect={handleNodeClick}/>)}

            {/* Core */}
            <CoreHex active={card?.node?.id==='keychain'} onSelect={handleCoreClick}/>
          </g>
        </svg>

        {/* Title pill */}
        <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:8, background:'#0a0a0ecc', border:`1px solid ${GOLD}18`, borderRadius:20, padding:'5px 16px', backdropFilter:'blur(12px)', pointerEvents:'none', whiteSpace:'nowrap' }}>
          <span style={{ color:GOLD, fontSize:8, letterSpacing:3, fontWeight:800, textTransform:'uppercase', opacity:0.55 }}>Factoract</span>
          <span style={{ color:'#333', fontSize:10 }}>·</span>
          <span style={{ color:'#666', fontSize:8, letterSpacing:2, textTransform:'uppercase' }}>Red Neuronal del Ecosistema</span>
        </div>

        {/* Legend card — top left */}
        <div style={{ position:'absolute', top:14, left:16, display:'flex', flexDirection:'column', gap:5, background:'#0a0a0ecc', border:`1px solid #ffffff0a`, borderRadius:12, padding:'10px 14px', backdropFilter:'blur(12px)', pointerEvents:'none' }}>
          {[[GOLD,'⬡','Núcleo'],[AMBER,'⬡','País'],[WHITE,'◼','Categoría'],[BLUE,'●','Empresa']].map(([c,s,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:12, color:c, opacity:0.8 }}>{s}</span>
              <span style={{ color:'#888', fontSize:8.5, letterSpacing:0.3 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Zoom + filter controls — right center */}
        <div style={{ position:'absolute', top:'50%', right:16, transform:'translateY(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'#0a0a0ecc', border:`1px solid #ffffff0d`, borderRadius:14, padding:'10px 6px', backdropFilter:'blur(12px)' }}>
          {[['+',()=>{playZoomIn();setZoom(z=>Math.min(z*1.2,6));},'Acercar'],['−',()=>{playZoomOut();setZoom(z=>Math.max(z*0.8,0.1));},'Alejar'],['⌂',()=>{ setCard(null); animateTo({x:0,y:0},0.72); },'Centrar']].map(([l,f,title])=>(
            <button key={l} title={title} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();f();}} style={{ width:34, height:34, borderRadius:9, border:`1px solid ${GOLD}28`, background:`${GOLD}08`, color:GOLD, fontSize:l==='⌂'?14:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>{l}</button>
          ))}
          <div style={{ color:GOLD, fontSize:7.5, textAlign:'center', opacity:0.35, margin:'2px 0', letterSpacing:0.5 }}>{Math.round(zoom*100)}%</div>
          <div style={{ width:22, height:1, background:'#ffffff0a', margin:'2px 0' }}/>
          <button title="Filtrar proyectos" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setFilterOpen(o=>!o);}} style={{ width:34, height:34, borderRadius:9, border:`1px solid ${filterOpen?GREEN+'60':GREEN+'20'}`, background:filterOpen?`${GREEN}18`:`${GREEN}06`, color:filterOpen?GREEN:`${GREEN}99`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}><FaFilter size={12}/></button>
        </div>

        {/* Info Card */}
        <AnimatePresence>
          {card && card.node.type === 'company' && (
            <CompanyGalleryOverlay key={card.node.id} node={card.node} onClose={closeCard} onNavigate={handleNodeClick} allNodes={graph.nodes} nav={nav} />
          )}
          {card && card.node.type !== 'company' && (
            <NodeInfoCard key={card.node.id} node={card.node} onClose={closeCard} nav={nav} data={data} pan={pan} zoom={zoom} vp={vp} cw={cw} ch={ch} allNodes={graph.nodes} onNavigate={handleNodeClick}/>
          )}
        </AnimatePresence>

        {/* Filter Panel */}
        <AnimatePresence>
          {filterOpen && <FilterPanel key="filter" data={data} onClose={()=>setFilterOpen(false)} nav={nav}/>}
        </AnimatePresence>

        {/* MANAGEMENT PANEL — floating draggable */}
        <ManagementPanel
          open={panelOpen} setOpen={setPanelOpen}
          tab={tab} setTab={setTab}
          form={form} setForm={setForm}
          data={data}
          allCategories={allCategories} allCompanies={allCompanies}
          addCountry={addCountry} addCategory={addCategory}
          addCompany={addCompany} addProject={addProject}
          containerRef={containerRef}
        />
      </div>
    </div>
  );
}

// ─── CORE HEX ─────────────────────────────────────────────────────────────
// Extruded hex prism: side quads between a top face and a face shifted down by
// DEPTH give it real volume; drawing the top face last hides the far side
// walls and only the near ones peek out, faking a 3D crystal viewed from above.
function CoreHex({ active, onSelect }) {
  const R = 63, DEPTH = 15;
  const top = hexVerts(0, 0, R);
  const bot = top.map(([x, y]) => [x, y + DEPTH]);
  return (
    <g style={{ cursor:'pointer' }} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect();}}>
      <polygon points={hexPoints(0,0,80)} fill={GOLD} fillOpacity={0.025} stroke="none"/>
      <polygon points={hexPoints(0,0,80)} fill="none" stroke={GOLD} strokeWidth={1.6} strokeOpacity={0.4} className="pc1"/>
      <polygon points={hexPoints(0,0,80)} fill="none" stroke={GOLD} strokeWidth={1.2} strokeOpacity={0.28} className="pc2"/>

      {/* KYCN moon — orbits the hex core forever */}
      <circle cx={0} cy={0} r={104} fill="none" stroke={GOLD} strokeWidth={0.5} strokeOpacity={0.16} strokeDasharray="1.5 6"/>
      <g className="moon-orbit">
        <g transform="translate(104,0)">
          <circle r={8.5} fill="url(#grad-core)" stroke={GOLD} strokeWidth={1.3} filter="url(#glow-gold)"/>
          <circle r={5} fill="none" stroke={GOLD} strokeWidth={0.5} strokeOpacity={0.5}/>
          <text textAnchor="middle" dominantBaseline="central" fontSize={4.2} fontWeight={900} fill={GOLD}>KYCN</text>
        </g>
      </g>

      {/* Prism side walls */}
      {top.map((p, i) => {
        const q = top[(i + 1) % 6];
        const bp = bot[i], bq = bot[(i + 1) % 6];
        const pts = `${p[0]},${p[1]} ${q[0]},${q[1]} ${bq[0]},${bq[1]} ${bp[0]},${bp[1]}`;
        return <polygon key={i} points={pts} fill="#000" fillOpacity={i>=2&&i<=4?0.55:0.32} stroke={GOLD} strokeOpacity={0.14} strokeWidth={0.5}/>;
      })}

      <polygon points={hexPoints(0,0,63)} fill="url(#grad-core)" stroke={active?'#fff':GOLD} strokeWidth={active?3:2} filter="url(#glow-gold)"/>
      <polygon points={hexPoints(0,0,54)} fill="none" stroke={GOLD} strokeWidth={0.6} strokeOpacity={0.4}/>
      <polygon points={hexPoints(0,0,45)} fill="none" stroke={GOLD} strokeWidth={0.3} strokeOpacity={0.2} strokeDasharray="4 5"/>
      <polygon points={hexPoints(0,0,27)} fill="#1e1600" stroke={GOLD} strokeWidth={1.6} filter="url(#glow-gold)"/>
      <text x={0} y={-1} textAnchor="middle" dominantBaseline="middle" fill={GOLD} fontSize={6.5} fontWeight={900} letterSpacing={0.8}>KYCN</text>
      <text x={0} y={10} textAnchor="middle" fill={GOLD} fontSize={4.5} fillOpacity={0.45}>COIN</text>
      <text x={0} y={79+DEPTH} textAnchor="middle" fill={GOLD} fontSize={10.5} fontWeight={900} letterSpacing={3}>KEYCHAIN</text>
      <text x={0} y={92+DEPTH} textAnchor="middle" fill={GOLD} fontSize={6} fillOpacity={0.4} letterSpacing={1.5}>ECOSYSTEM CORE</text>
    </g>
  );
}

// ─── NODE SHAPE ─────────────────────────────────────────────────────────────
function NodeShape({ node, active, onSelect }) {
  const click = useCallback((e) => { e.stopPropagation(); onSelect(node); }, [node, onSelect]);
  const stop = useCallback((e) => e.stopPropagation(), []);
  const hover = useCallback(() => { playNodeHover(); }, []);

  if (node.type === 'country') {
    const r = 27;
    return (
      <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer' }} onMouseDown={stop} onClick={click} onMouseEnter={hover}>
        {active && <><polygon points={hexPoints(0,0,r+7)} fill="none" stroke={AMBER} strokeWidth={2} strokeOpacity={0.6} className="pn1"/><polygon points={hexPoints(0,0,r+7)} fill="none" stroke={AMBER} strokeWidth={1.5} strokeOpacity={0.4} className="pn2"/></>}
        <polygon points={hexPoints(0,0,r+7)} fill={AMBER} fillOpacity={0.04} stroke="none"/>
        <polygon points={hexPoints(0,0,r)} fill="url(#grad-country)" stroke={active?'#fff':AMBER} strokeWidth={active?2.5:1.6} filter="url(#glow-amber)"/>
        <polygon points={hexPoints(0,0,r-6)} fill="none" stroke={AMBER} strokeWidth={0.4} strokeOpacity={0.3}/>
        <circle cx={0} cy={0} r={13} fill="#00000055" stroke={AMBER} strokeWidth={0.4} strokeOpacity={0.35}/>
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={17}>{node.flag}</text>
        <text x={0} y={r+14} textAnchor="middle" fill={AMBER} fontSize={8.5} fontWeight={700}>{node.name}</text>
      </g>
    );
  }
  if (node.type === 'category') {
    const s = 22;
    const Icon = ICON_MAP[node.icon];
    return (
      <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer' }} onMouseDown={stop} onClick={click} onMouseEnter={hover}>
        {active && <><rect x={-(s+5)} y={-(s+5)} width={(s+5)*2} height={(s+5)*2} fill="none" stroke={WHITE} strokeWidth={2} strokeOpacity={0.6} rx={4} className="pn1"/><rect x={-(s+5)} y={-(s+5)} width={(s+5)*2} height={(s+5)*2} fill="none" stroke={WHITE} strokeWidth={1.5} strokeOpacity={0.35} rx={4} className="pn2"/></>}
        <rect x={-(s+5)} y={-(s+5)} width={(s+5)*2} height={(s+5)*2} fill={WHITE} fillOpacity={0.02} rx={4}/>
        <rect x={-s} y={-s} width={s*2} height={s*2} fill="url(#grad-cat)" stroke={active?'#fff':WHITE} strokeWidth={active?2.5:1.3} filter="url(#glow-white)" rx={3}/>
        <rect x={-(s-4)} y={-(s-4)} width={(s-4)*2} height={(s-4)*2} fill="none" stroke={WHITE} strokeWidth={0.4} strokeOpacity={0.28} rx={2}/>
        {Icon && (
          <foreignObject x={-11} y={-11} width={22} height={22}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Icon size={15} color={WHITE}/>
            </div>
          </foreignObject>
        )}
        <text x={0} y={s+14} textAnchor="middle" fill={WHITE} fontSize={8} fontWeight={700}>{node.name}</text>
      </g>
    );
  }
  if (node.type === 'company') {
    const r = 15;
    const initials = node.name.split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase();
    return (
      <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer' }} onMouseDown={stop} onClick={click} onMouseEnter={hover}>
        {active && <><circle r={r+5} fill="none" stroke={BLUE} strokeWidth={2} strokeOpacity={0.6} className="pn1"/><circle r={r+5} fill="none" stroke={BLUE} strokeWidth={1.5} strokeOpacity={0.35} className="pn2"/></>}
        <circle r={r+5} fill={BLUE} fillOpacity={0.04}/>
        <circle r={r} fill="url(#grad-comp)" stroke={active?'#fff':BLUE} strokeWidth={active?2.5:1.3} filter="url(#glow-blue)"/>
        <circle r={r-4} fill="none" stroke={BLUE} strokeWidth={0.4} strokeOpacity={0.3}/>
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill={BLUE} fontSize={6} fontWeight={800}>{initials}</text>
        <text x={0} y={r+12} textAnchor="middle" fill={BLUE} fontSize={7} fillOpacity={0.8}>{node.name}</text>
      </g>
    );
  }
  return null;
}

// ─── NODE INFO CARD ──────────────────────────────────────────────────────────
function NodeInfoCard({ node, onClose, nav, data, pan, zoom, vp, cw, ch, allNodes, onNavigate }) {
  const CARD_W = 360;
  const svgX = cw / 2 + pan.x + node.x * zoom;
  const svgY = ch / 2 + pan.y + node.y * zoom;
  const nodeR = node.type==='country'?27*zoom:node.type==='category'?22*zoom:node.type==='company'?15*zoom:10*zoom;
  const rawLeft = svgX - nodeR - CARD_W - 28;
  const left = Math.max(8, Math.min(cw - CARD_W - 52, rawLeft));
  const top = Math.max(74, Math.min(ch - 80, svgY - 220));
  const color = cardColor(node.type);

  return (
    <motion.div
      initial={{ opacity:0, scale:0.9, x:-12 }} animate={{ opacity:1, scale:1, x:0 }} exit={{ opacity:0, scale:0.9, x:-12 }}
      transition={{ duration:0.18, ease:'easeOut' }}
      onMouseDown={e=>e.stopPropagation()}
      style={{ position:'absolute', left, top, width:CARD_W, zIndex:30, background:'linear-gradient(160deg,#0e0c0a,#08080f)', border:`1px solid ${color}22`, borderRadius:20, overflow:'hidden', boxShadow:`0 0 0 1px ${color}08, 0 0 50px ${color}10, 0 24px 64px rgba(0,0,0,0.85)` }}
    >
      <button onClick={onClose} style={{ position:'absolute', top:11, right:11, width:26, height:26, borderRadius:7, border:`1px solid ${color}25`, background:`${color}10`, color, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
        <FaTimes size={9}/>
      </button>

      {node.type==='core'     && <CoreCard/>}
      {node.type==='country'  && <CountryCard node={node} data={data} nav={nav}/>}
      {node.type==='category' && <CategoryCard node={node} nav={nav}/>}
      {node.type==='company'  && <CompanyCard node={node} nav={nav} data={data} allNodes={allNodes} onNavigate={onNavigate}/>}
      {node.type==='project'  && <ProjectCard node={node} nav={nav}/>}
    </motion.div>
  );
}

// ─── FILTER PANEL ────────────────────────────────────────────────────────────
function FilterPanel({ data, onClose, nav }) {
  const [sort, setSort] = useState('trust');
  const [statusF, setStatusF] = useState('all');

  const allProjects = [];
  data.countries.forEach(country => {
    const cm = COUNTRY_META[country.id] || {};
    country.categories.forEach(cat => {
      cat.companies.forEach(comp => {
        comp.projects.forEach(proj => {
          const pm = PROJECT_META[proj.id] || {};
          allProjects.push({ ...proj, pm, country, cat, comp, cm });
        });
      });
    });
  });

  const ratingMap = { BBB:3, 'BB+':2, 'BB-':1 };
  let sorted = [...allProjects];
  if (statusF !== 'all') sorted = sorted.filter(p=>p.pm.status===statusF);
  if (sort==='trust')       sorted.sort((a,b)=>(b.pm.trust_score||0)-(a.pm.trust_score||0));
  else if (sort==='apy_h')  sorted.sort((a,b)=>(b.pm.apy||0)-(a.pm.apy||0));
  else if (sort==='apy_l')  sorted.sort((a,b)=>(a.pm.apy||0)-(b.pm.apy||0));
  else if (sort==='min_l')  sorted.sort((a,b)=>(a.pm.min||0)-(b.pm.min||0));
  else if (sort==='reg')    sorted.sort((a,b)=>(ratingMap[b.cm.rating]||0)-(ratingMap[a.cm.rating]||0));
  else if (sort==='sec')    sorted.sort((a,b)=>(b.pm.security_score||0)-(a.pm.security_score||0));
  else if (sort==='defi')   sorted.sort((a,b)=>(b.pm.decentralization_score||0)-(a.pm.decentralization_score||0));

  const SORTS = [
    { k:'trust',  label:'+ Confianza',      icon:<FaShieldAlt size={9}/> },
    { k:'apy_h',  label:'Mayor APY',         icon:<FaSortAmountDown size={9}/> },
    { k:'apy_l',  label:'Menor APY',         icon:<FaSortAmountUp size={9}/> },
    { k:'min_l',  label:'+ Económico',       icon:<FaCoins size={9}/> },
    { k:'reg',    label:'+ Regulado',        icon:<FaLock size={9}/> },
    { k:'sec',    label:'+ Seguro',          icon:<FaCheckCircle size={9}/> },
    { k:'defi',   label:'+ Descentralizado', icon:<FaBolt size={9}/> },
  ];

  return (
    <motion.div
      initial={{ opacity:0, x:20, scale:0.95 }} animate={{ opacity:1, x:0, scale:1 }} exit={{ opacity:0, x:20, scale:0.95 }}
      transition={{ duration:0.18, ease:'easeOut' }}
      onMouseDown={e=>e.stopPropagation()}
      style={{ position:'absolute', bottom:80, right:56, width:300, zIndex:35, background:'linear-gradient(160deg,#0c0a0e,#080810)', border:`1px solid ${GREEN}22`, borderRadius:18, overflow:'hidden', boxShadow:`0 0 40px ${GREEN}10, 0 20px 60px rgba(0,0,0,0.85)` }}
    >
      <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${GREEN}10`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <FaFilter size={11} color={GREEN}/>
          <span style={{ color:'#ccc', fontSize:11, fontWeight:700 }}>Filtrar Proyectos</span>
        </div>
        <button onClick={onClose} style={{ width:22, height:22, borderRadius:6, border:`1px solid ${GREEN}25`, background:`${GREEN}10`, color:GREEN, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FaTimes size={8}/></button>
      </div>

      {/* Sort chips */}
      <div style={{ padding:'10px 14px 8px' }}>
        <div style={{ fontSize:8, color:'#444', letterSpacing:1, textTransform:'uppercase', marginBottom:7 }}>Ordenar por</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {SORTS.map(s => (
            <button key={s.k} onClick={()=>setSort(s.k)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', borderRadius:7, fontSize:8.5, fontWeight:600, cursor:'pointer', border:`1px solid ${sort===s.k?GREEN+'60':'#1e1e2e'}`, background:sort===s.k?`${GREEN}18`:'#0c0c18', color:sort===s.k?GREEN:'#555', transition:'all 0.15s' }}>{s.icon}{s.label}</button>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div style={{ padding:'0 14px 10px' }}>
        <div style={{ fontSize:8, color:'#444', letterSpacing:1, textTransform:'uppercase', marginBottom:7 }}>Estado</div>
        <div style={{ display:'flex', gap:5 }}>
          {[['all','Todos'],['Activo','Activos'],['Lanzando','Lanzando']].map(([k,l]) => (
            <button key={k} onClick={()=>setStatusF(k)} style={{ flex:1, padding:'5px 4px', borderRadius:7, fontSize:8.5, fontWeight:600, cursor:'pointer', border:`1px solid ${statusF===k?GREEN+'50':'#1e1e2e'}`, background:statusF===k?`${GREEN}14`:'#0c0c18', color:statusF===k?GREEN:'#555', transition:'all 0.15s' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ borderTop:`1px solid ${GREEN}10`, maxHeight:280, overflowY:'auto' }}>
        <div style={{ padding:'8px 14px 4px', fontSize:8, color:'#444', letterSpacing:1, textTransform:'uppercase', display:'flex', justifyContent:'space-between' }}>
          <span>Proyectos</span><span style={{ color:GREEN }}>{sorted.length} resultados</span>
        </div>
        {sorted.map((p,i) => {
          const sc = p.pm.status==='Activo'?GREEN:p.pm.status==='Lanzando'?AMBER:'#888';
          return (
            <div key={p.id} style={{ padding:'9px 14px', borderTop:'1px solid #ffffff04', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>nav('detalle',{id:p.id})}>
              <div style={{ width:24, height:24, borderRadius:6, background:`${GREEN}12`, border:`1px solid ${GREEN}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:GREEN, fontWeight:800, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:'#ccc', fontSize:9.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                <div style={{ color:'#444', fontSize:8 }}>{p.country.flag} {p.country.name} · {p.comp.name}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ color:GREEN, fontSize:10, fontWeight:800 }}>{p.pm.apy}%</div>
                <div style={{ color:sc, fontSize:7.5 }}>{p.pm.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── MANAGEMENT PANEL ─────────────────────────────────────────────────────────
function ManagementPanel({ open, setOpen, tab, setTab, form, setForm, data, allCategories, allCompanies, addCountry, addCategory, addCompany, addProject, containerRef }) {
  const [pos, setPos] = useState({ x: null, y: 70 });
  const panelRef = useRef(null);
  const dragging = useRef(false);
  const dragOff = useRef({ x:0, y:0 });

  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    const cRect = containerRef?.current?.getBoundingClientRect() || { left: 0, top: 0 };
    dragOff.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const onMove = (ev) => {
      if (!dragging.current) return;
      const cr = containerRef?.current?.getBoundingClientRect() || { left: 0, top: 0 };
      setPos({ x: ev.clientX - dragOff.current.x - cr.left, y: Math.max(0, ev.clientY - dragOff.current.y - cr.top) });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const posStyle = pos.x !== null ? { left: pos.x, top: pos.y } : { right: 20, top: 14 };

  return (
    <div
      ref={panelRef}
      onMouseDown={e => e.stopPropagation()}
      style={{ position:'absolute', ...posStyle, width:open?300:44, background:'#0a0a0e', border:`1px solid ${GOLD}28`, borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden', zIndex:40, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", transition:'width 0.2s', boxShadow:`0 12px 48px rgba(0,0,0,0.75), 0 0 0 1px ${GOLD}0a`, maxHeight:'calc(100vh - 90px)' }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        style={{ display:'flex', alignItems:'center', gap:8, padding: open ? '10px 12px 10px 10px' : '10px 8px', borderBottom: open ? `1px solid ${GOLD}15` : 'none', cursor:'grab', background:`${GOLD}07`, flexShrink:0, minHeight:44 }}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:2.5, flexShrink:0 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ display:'flex', gap:2 }}>
              {[0,1].map(j=><div key={j} style={{ width:2.5, height:2.5, borderRadius:'50%', background:GOLD, opacity:0.35 }}/>)}
            </div>
          ))}
        </div>
        {open && <span style={{ flex:1, color:GOLD, fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', opacity:0.6, whiteSpace:'nowrap', overflow:'hidden' }}>Gestionar Ecosistema</span>}
        <button
          onMouseDown={e=>e.stopPropagation()}
          onClick={()=>setOpen(o=>!o)}
          style={{ width:24, height:24, borderRadius:6, border:`1px solid ${GOLD}40`, background:'#111118', color:GOLD, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
        >{open ? '×' : '⋮'}</button>
      </div>

      {open && (
        <div style={{ padding:'12px 16px', overflowY:'auto', flex:1 }}>
          <div style={{ display:'flex', gap:4, marginBottom:18, flexWrap:'wrap' }}>
            {[['country','País'],['category','Categoría'],['company','Empresa'],['project','Proyecto']].map(([t,l]) => (
              <button key={t} onClick={()=>setTab(t)} style={{ padding:'4px 10px', borderRadius:6, fontSize:9, fontWeight:600, cursor:'pointer', border:'none', background:tab===t?GOLD:'#1a1a22', color:tab===t?'#000':'#888' }}>{l}</button>
            ))}
          </div>

          {tab==='country' && <>
            <PLabel color={AMBER}>Añadir País</PLabel>
            <SLab>Nombre</SLab><PIn value={form.country.name} onChange={v=>setForm(f=>({...f,country:{...f.country,name:v}}))} ph="Ej: México"/>
            <SLab>Bandera (emoji)</SLab><PIn value={form.country.flag} onChange={v=>setForm(f=>({...f,country:{...f.country,flag:v}}))} ph="🇲🇽"/>
            <PBt color={AMBER} onClick={addCountry}>+ Añadir País</PBt>
            <div style={{ marginTop:18 }}>
              <PLabel color={AMBER}>Países ({data.countries.length})</PLabel>
              {data.countries.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'#111118', borderRadius:8, marginBottom:5 }}>
                  <span style={{ fontSize:14 }}>{c.flag}</span><span style={{ color:'#ccc', fontSize:11 }}>{c.name}</span>
                  <span style={{ marginLeft:'auto', color:'#555', fontSize:9 }}>{c.categories.length} cats.</span>
                </div>
              ))}
            </div>
          </>}
          {tab==='category' && <>
            <PLabel color={WHITE}>Añadir Categoría</PLabel>
            <SLab>País</SLab>
            <PSel value={form.category.countryId} onChange={v=>setForm(f=>({...f,category:{...f.category,countryId:v}}))}>
              <option value="">Seleccionar país...</option>
              {data.countries.map(c=><option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
            </PSel>
            <SLab>Nombre</SLab><PIn value={form.category.name} onChange={v=>setForm(f=>({...f,category:{...f.category,name:v}}))} ph="Ej: Tecnología"/>
            <SLab>Ícono</SLab>
            <PSel value={form.category.icon} onChange={v=>setForm(f=>({...f,category:{...f.category,icon:v}}))}>
              {ICON_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
            </PSel>
            <PBt color={WHITE} onClick={addCategory}>+ Añadir Categoría</PBt>
          </>}
          {tab==='company' && <>
            <PLabel color={BLUE}>Añadir Empresa</PLabel>
            <SLab>Categoría</SLab>
            <PSel value={form.company.categoryId} onChange={v=>setForm(f=>({...f,company:{...f.company,categoryId:v}}))}>
              <option value="">Seleccionar categoría...</option>
              {allCategories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </PSel>
            <SLab>Nombre</SLab><PIn value={form.company.name} onChange={v=>setForm(f=>({...f,company:{...f.company,name:v}}))} ph="Ej: PropTech SA"/>
            <PBt color={BLUE} onClick={addCompany}>+ Añadir Empresa</PBt>
          </>}
          {tab==='project' && <>
            <PLabel color={GREEN}>Añadir Proyecto</PLabel>
            <SLab>Empresa</SLab>
            <PSel value={form.project.companyId} onChange={v=>setForm(f=>({...f,project:{...f.project,companyId:v}}))}>
              <option value="">Seleccionar empresa...</option>
              {allCompanies.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </PSel>
            <SLab>Nombre</SLab><PIn value={form.project.name} onChange={v=>setForm(f=>({...f,project:{...f.project,name:v}}))} ph="Ej: Token RWA"/>
            <PBt color={GREEN} onClick={addProject}>+ Añadir Proyecto</PBt>
          </>}
        </div>
      )}
    </div>
  );
}

function PLabel({ color, children }) { return <div style={{ color, fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:10, borderBottom:`1px solid ${color}20`, paddingBottom:6 }}>{children}</div>; }
function SLab({ children }) { return <div style={{ color:'#777', fontSize:9, fontWeight:600, letterSpacing:0.5, textTransform:'uppercase', marginBottom:4, marginTop:10 }}>{children}</div>; }
function PIn({ value, onChange, ph }) { return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:7, border:'1px solid #2a2a35', background:'#0e0e16', color:'#ddd', fontSize:12, outline:'none', fontFamily:'inherit' }}/>; }
function PSel({ value, onChange, children }) { return <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:7, border:'1px solid #2a2a35', background:'#0e0e16', color:'#ddd', fontSize:12, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>{children}</select>; }
function PBt({ color, onClick, children }) { return <button onClick={onClick} style={{ marginTop:14, width:'100%', padding:'8px', borderRadius:8, border:`1px solid ${color}50`, background:`${color}14`, color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{children}</button>; }

// ─── 2D / 3D SWITCH ─────────────────────────────────────────────────────────
// Both views render the exact same hierarchical, weighted-sunburst graph
// (buildGraph in ../lib/ecosystemGraph) over the exact same data, so switching
// never changes what's shown — only how it's rendered.
export default function Ecosystem({ nav }) {
  const [view, setView] = useState('2d');
  // Asking every time (rather than remembering "yes" for the session) is the
  // point — the user wants 3D to cost nothing until explicitly opted into,
  // and to fully give that cost back up the moment they leave it.
  const [confirming, setConfirming] = useState(false);

  const requestGoto3D = () => setConfirming(true);
  const cancel3D = () => setConfirming(false);
  const confirm3D = () => { setConfirming(false); setView('3d'); };
  const backTo2D = () => setView('2d');

  return (
    <div style={{ position:'absolute', inset:0 }}>
      {view === '2d' ? (
        <Ecosystem2D nav={nav} />
      ) : (
        <Suspense fallback={<Loader3D />}>
          <Ecosystem3D nav={nav} />
        </Suspense>
      )}

      <button
        onMouseDown={e=>e.stopPropagation()}
        onClick={() => view === '2d' ? requestGoto3D() : backTo2D()}
        style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', zIndex:100, display:'flex', alignItems:'center', gap:8, background:'#0a0a0ecc', border:`1px solid ${GOLD}30`, borderRadius:20, padding:'8px 18px', color:GOLD, fontSize:10, fontWeight:700, letterSpacing:1, cursor:'pointer', backdropFilter:'blur(12px)', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}
      >
        {view === '2d' ? '◈ Ver en 3D' : '◆ Ver en 2D'}
      </button>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.15 }}
            onMouseDown={e=>e.stopPropagation()} onClick={cancel3D}
            style={{ position:'absolute', inset:0, zIndex:150, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(4,4,7,0.72)', backdropFilter:'blur(4px)' }}
          >
            <motion.div
              initial={{ opacity:0, scale:0.94, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.94, y:8 }}
              transition={{ type:'spring', stiffness:340, damping:30 }}
              onClick={e=>e.stopPropagation()}
              style={{ width:340, background:'linear-gradient(160deg,#0e0c0a,#08080f)', border:`1px solid ${GOLD}30`, borderRadius:18, padding:'26px 24px', boxShadow:`0 24px 64px rgba(0,0,0,0.85)`, textAlign:'center' }}
            >
              <div style={{ width:44, height:44, borderRadius:12, background:`${GOLD}14`, border:`1px solid ${GOLD}30`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                <FaCube size={18} color={GOLD}/>
              </div>
              <div style={{ color:'#eee', fontWeight:800, fontSize:15, marginBottom:8 }}>¿Activar la vista 3D?</div>
              <div style={{ color:'#888', fontSize:12, lineHeight:1.6, marginBottom:20 }}>
                Usa más recursos gráficos que la vista 2D. Se descarga y arranca solo mientras la tengas abierta — al salir se libera por completo.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={cancel3D} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid #ffffff18', background:'transparent', color:'#ccc', fontSize:12, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
                <button onClick={confirm3D} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:GOLD, color:'#161200', fontSize:12, fontWeight:700, cursor:'pointer' }}>Activar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Loader3D() {
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, background:BG }}>
      <div style={{
        width:38, height:38, borderRadius:'50%', border:`3px solid ${GOLD}25`, borderTopColor:GOLD,
        animation:'ecosystem-spin 0.8s linear infinite',
      }}/>
      <style>{'@keyframes ecosystem-spin { to { transform: rotate(360deg); } }'}</style>
      <div style={{ color:'#999', fontSize:11.5, letterSpacing:0.5 }}>Cargando el ecosistema 3D…</div>
    </div>
  );
}
