import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaArrowRight, FaExternalLinkAlt, FaStar, FaGlobe, FaTwitter, FaChevronLeft, FaChevronRight, FaFileAlt, FaCoins, FaBuilding, FaLock, FaTimes } from 'react-icons/fa';
import { GOLD, AMBER, WHITE, BLUE, GREEN, ICON_MAP, COUNTRY_META, CATEGORY_META, COMPANY_META, PROJECT_META, INITIAL_DATA } from '../lib/ecosystemData';

// Card content shared by the 2D (SVG) and 3D (three.js) Ecosystem views — each
// just docks these in its own positioning shell (screen-tracked vs. fixed).

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────
function CTabs({ tabs, labels, active, color, onChange }) {
  return (
    <div style={{ display:'flex', background:'#ffffff', borderBottom:`1px solid ${color}12` }}>
      {tabs.map((t,i) => (
        <button key={t} onClick={()=>onChange(t)} style={{ flex:1, padding:'8px 4px', fontSize:8.5, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', border:'none', borderBottom:active===t?`2px solid ${color}`:'2px solid transparent', background:'none', color:active===t?color:'#cbd5e1', cursor:'pointer', transition:'color 0.15s' }}>{labels[i]}</button>
      ))}
    </div>
  );
}
function CBody({ children, maxH=380 }) { return <div style={{ padding:'14px 18px', maxHeight:maxH, overflowY:'auto' }}>{children}</div>; }
function CFoot({ children }) { return <div style={{ padding:'10px 18px', borderTop:'1px solid #0f172a08', display:'flex', gap:7, flexWrap:'wrap' }}>{children}</div>; }
function CBtn({ color, children, onClick }) {
  return <button onClick={onClick} style={{ flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${color}40`, background:`${color}10`, color, fontSize:9.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'background 0.15s' }}>{children}</button>;
}
function CRow({ label, value, vc='#64748b' }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #0f172a05' }}>
      <span style={{ color:'#94a3b8', fontSize:9.5 }}>{label}</span>
      <span style={{ color:vc, fontSize:10, fontWeight:600 }}>{value}</span>
    </div>
  );
}
function CSection({ label, color='#94a3b8' }) {
  return <div style={{ color, fontSize:8.5, letterSpacing:1.2, textTransform:'uppercase', marginTop:14, marginBottom:7, display:'flex', alignItems:'center', gap:6 }}><span style={{ flex:1, height:1, background:`${color}30` }}/>{label}<span style={{ flex:1, height:1, background:`${color}30` }}/></div>;
}
function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'#94a3b8', fontSize:9 }}>{label}</span>
        <span style={{ color, fontSize:9, fontWeight:700 }}>{value}/100</span>
      </div>
      <div style={{ height:4, background:'#0f172a08', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', background:`linear-gradient(90deg,${color}80,${color})`, borderRadius:2 }}/>
      </div>
    </div>
  );
}
function StarRating({ value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
      {[1,2,3,4,5].map(i => (
        <FaStar key={i} size={10} color={i<=Math.round(value)?color:'#e2e8f0'}/>
      ))}
      <span style={{ color:'#64748b', fontSize:9, marginLeft:3 }}>{value.toFixed(1)}</span>
    </div>
  );
}
function PhotoCarousel({ photos, color }) {
  const [idx, setIdx] = useState(0);
  const ph = photos[idx];
  return (
    <div>
      <div style={{ height:130, background:`linear-gradient(135deg,${ph.bg},#f1f5f9)`, borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', border:`1px solid ${color}12` }}>
        {ph.url ? (
          <img
            src={ph.url} alt={ph.label}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize:48, filter:'drop-shadow(0 4px 12px rgba(15,23,42,0.16))' }}>{ph.emoji}</span>
        )}
        {ph.url && <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,transparent 55%,rgba(0,0,0,0.85))' }} />}
        <div style={{ color: ph.url ? '#eee' : '#666', fontSize:8.5, marginTop:6, letterSpacing:0.5, position:'relative', zIndex:1, textShadow: ph.url ? '0 1px 4px #000' : 'none' }}>{ph.label}</div>
        {photos.length > 1 && (
          <>
            <button onClick={e=>{e.stopPropagation();setIdx(i=>(i-1+photos.length)%photos.length);}} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', width:22, height:22, borderRadius:6, border:`1px solid ${color}30`, background:'#00000060', color, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FaChevronLeft size={8}/></button>
            <button onClick={e=>{e.stopPropagation();setIdx(i=>(i+1)%photos.length);}} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', width:22, height:22, borderRadius:6, border:`1px solid ${color}30`, background:'#00000060', color, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FaChevronRight size={8}/></button>
          </>
        )}
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:7 }}>
        {photos.map((_,i) => <span key={i} onClick={()=>setIdx(i)} style={{ width:i===idx?16:5, height:5, borderRadius:3, background:i===idx?color:'#e2e8f0', cursor:'pointer', transition:'width 0.2s,background 0.2s' }}/>)}
      </div>
    </div>
  );
}

// Stacked, swipeable deck of a company's projects — front card fully visible,
// the rest peeking out behind it. Clicking the front card cycles the deck;
// its button jumps straight to that project's own full card (via onNavigate),
// reusing the exact node the graph already computed for it (position included,
// even though projects no longer render as their own graph markers).
function ProjectStack({ node, allNodes, onNavigate, color }) {
  const projects = node.data.projects || [];
  const [order, setOrder] = useState(() => projects.map(p => p.id));
  if (!projects.length) return <div style={{ color:'#94a3b8', fontSize:9.5 }}>Sin proyectos.</div>;

  const byId = Object.fromEntries(projects.map(p => [p.id, p]));
  const advance = () => setOrder(o => [...o.slice(1), o[0]]);
  const stack = order.slice(0, 4).filter(id => byId[id]);

  return (
    <div style={{ position:'relative', height:236, margin:'2px 4px 20px' }}>
      {stack.slice().reverse().map((id, ri) => {
        const i = stack.length - 1 - ri; // 0 = front card
        const proj = byId[id];
        const pm = PROJECT_META[id] || {};
        const photo = pm.photos?.[0];
        const sc = pm.status === 'Activo' ? color : pm.status === 'Lanzando' ? AMBER : '#64748b';
        return (
          <div
            key={id}
            onClick={i === 0 ? advance : undefined}
            style={{
              position:'absolute', inset:0,
              transform:`translate(${i * 10}px, ${i * 13}px) scale(${1 - i * 0.05})`,
              zIndex: stack.length - i,
              borderRadius:16, overflow:'hidden', background:'#ffffff',
              border:`1px solid ${color}35`,
              boxShadow: i === 0 ? '0 18px 40px rgba(15,23,42,0.13)' : 'none',
              opacity: 1 - i * 0.18,
              cursor: i === 0 ? 'pointer' : 'default',
              transition:'transform 0.35s ease, opacity 0.35s ease',
            }}
          >
            {photo?.url ? (
              <img
                src={photo.url} alt={proj.name}
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, background:`linear-gradient(135deg,${color}22,#f1f5f9)` }}>{photo?.emoji || '▲'}</div>
            )}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0.08) 42%, rgba(0,0,0,0.92))' }} />
            {i === 0 && (
              <span style={{ position:'absolute', top:10, left:10, padding:'3px 9px', borderRadius:999, background:'rgba(0,0,0,0.55)', border:`1px solid ${sc}55`, color:sc, fontSize:8, fontWeight:700, backdropFilter:'blur(4px)' }}>{pm.status || 'Activo'}</span>
            )}
            <div style={{ position:'absolute', left:12, right:12, bottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'#111', border:`1.5px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{photo?.emoji || '▲'}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:'#fff', fontWeight:700, fontSize:11, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{proj.name}</div>
                <div style={{ color:'#aaa', fontSize:8.5 }}>{pm.apy != null ? `${pm.apy}% APY` : (pm.type || 'RWA')}</div>
              </div>
              {i === 0 && (
                <button
                  onClick={e => { e.stopPropagation(); const full = (allNodes || []).find(n => n.id === id); if (full) onNavigate?.(full); }}
                  style={{ padding:'6px 12px', borderRadius:999, border:'none', background:'#fff', color:'#111', fontSize:9, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}
                >
                  Ver →
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function DocList({ docs, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {docs.map((d,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#0f172a04', borderRadius:8, border:`1px solid ${color}10` }}>
          <FaFileAlt size={12} color={color} style={{ flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ color:'#334155', fontSize:9.5, fontWeight:600 }}>{d.title}</div>
            {d.date && <div style={{ color:'#94a3b8', fontSize:8 }}>{d.date}</div>}
          </div>
          <span style={{ color:'#94a3b8', fontSize:8, border:'1px solid #e2e8f0', borderRadius:4, padding:'2px 5px' }}>{d.type}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CORE CARD ────────────────────────────────────────────────────────────
export function CoreCard() {
  const tc = INITIAL_DATA.countries.length;
  const tcat = INITIAL_DATA.countries.reduce((a,c)=>a+c.categories.length,0);
  const tcomp = INITIAL_DATA.countries.reduce((a,c)=>a+c.categories.reduce((b,cat)=>b+cat.companies.length,0),0);
  const tproj = INITIAL_DATA.countries.reduce((a,c)=>a+c.categories.reduce((b,cat)=>b+cat.companies.reduce((d,co)=>d+co.projects.length,0),0),0);
  return (
    <>
      <div style={{ padding:'22px 18px 14px', borderBottom:`1px solid ${GOLD}12` }}>
        <div style={{ fontSize:8.5, color:GOLD, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:4 }}>Núcleo del Ecosistema</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>🔗</span>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', letterSpacing:-0.5 }}>KEYCHAIN</div>
            <div style={{ fontSize:9, color:GOLD, opacity:0.6 }}>Token KYCN · Polygon Layer 2</div>
          </div>
        </div>
      </div>
      <CBody>
        <div style={{ color:'#64748b', fontSize:9.5, lineHeight:1.75, marginBottom:14 }}>Plataforma de tokenización RWA para Latinoamérica. Conecta inversores con activos reales verificados a través de blockchain.</div>
        <CRow label="Token" value="KYCN · ERC-20" vc={GOLD}/>
        <CRow label="Red" value="Polygon · Layer 2" vc={GOLD}/>
        <CRow label="Protocolo" value="ERC-4626 + EIP-3525" vc={GOLD}/>
        <CRow label="Custodia" value="Multi-sig 3/5" vc={GOLD}/>
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          {[['Países',tc,AMBER],['Categorías',tcat,WHITE],['Empresas',tcomp,BLUE],['Proyectos',tproj,GREEN]].map(([l,v,c]) => (
            <div key={l} style={{ flex:1, textAlign:'center', background:'#0f172a04', borderRadius:10, padding:'10px 4px', border:`1px solid ${c}12` }}>
              <div style={{ color:c, fontSize:18, fontWeight:800 }}>{v}</div>
              <div style={{ color:'#94a3b8', fontSize:7.5, marginTop:1 }}>{l}</div>
            </div>
          ))}
        </div>
      </CBody>
      <CFoot><CBtn color={GOLD} onClick={()=>{}}><FaExternalLinkAlt size={8}/> Ver token KYCN</CBtn><CBtn color={GOLD} onClick={()=>{}}><FaCoins size={8}/> Tokenómica</CBtn></CFoot>
    </>
  );
}

// ─── COUNTRY CARD ────────────────────────────────────────────────────────────
export function CountryCard({ node, nav }) {
  const [tab, setTab] = useState('resumen');
  const country = node.data;
  const meta = COUNTRY_META[node.id] || {};
  const tcomp = country.categories.reduce((a,c)=>a+c.companies.length,0);
  const tproj = country.categories.reduce((a,c)=>a+c.companies.reduce((b,co)=>b+co.projects.length,0),0);
  return (
    <>
      <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${AMBER}12` }}>
        <div style={{ fontSize:8.5, color:AMBER, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:4 }}>País · Jurisdicción</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:30 }}>{country.flag}</span>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'#0f172a' }}>{country.name}</div>
            <div style={{ fontSize:9, color:AMBER, opacity:0.7 }}>{meta.rating||'N/D'} · {meta.status||'Activo'}</div>
          </div>
        </div>
      </div>
      <CTabs tabs={['resumen','regulacion','documentos']} labels={['Resumen','Marco Legal','Documentos']} active={tab} color={AMBER} onChange={setTab}/>
      {tab==='resumen' && (
        <CBody>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[['Categorías',country.categories.length,AMBER],['Empresas',tcomp,BLUE],['Proyectos',tproj,GREEN]].map(([l,v,c]) => (
              <div key={l} style={{ flex:1, textAlign:'center', background:'#0f172a04', borderRadius:9, padding:'9px 4px', border:`1px solid ${c}12` }}>
                <div style={{ color:c, fontSize:17, fontWeight:800 }}>{v}</div><div style={{ color:'#94a3b8', fontSize:7.5 }}>{l}</div>
              </div>
            ))}
          </div>
          <CRow label="Marco legal" value={meta.legal||'N/D'} vc={AMBER}/>
          <CRow label="Impuesto capital" value={meta.tax||'N/D'}/>
          <CRow label="PIB" value={meta.gdp||'N/D'}/>
          <CRow label="Población" value={meta.pop||'N/D'}/>
          <CSection label="Categorías activas" color={AMBER}/>
          {country.categories.map(cat => {
            const Icon = ICON_MAP[cat.icon] || FaBuilding;
            return (
              <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 10px', background:'#0f172a04', borderRadius:8, marginBottom:4 }}>
                <Icon size={10} color={AMBER}/><span style={{ color:'#475569', fontSize:10 }}>{cat.name}</span>
                <span style={{ marginLeft:'auto', color:'#94a3b8', fontSize:8.5 }}>{cat.companies.length} emp.</span>
              </div>
            );
          })}
        </CBody>
      )}
      {tab==='regulacion' && (
        <CBody>
          <CSection label="Puntuaciones" color={AMBER}/>
          <ScoreBar label="Nivel de Regulación" value={meta.regulation_score||0} color={AMBER}/>
          <ScoreBar label="Descentralización" value={meta.decentralization_score||0} color={BLUE}/>
          <ScoreBar label="Seguridad Jurídica" value={meta.security_score||0} color={GREEN}/>
          <div style={{ marginTop:14, padding:'11px 13px', background:`${AMBER}08`, borderRadius:10, border:`1px solid ${AMBER}12`, color:'#64748b', fontSize:9.5, lineHeight:1.8 }}>
            {meta.regulation_detail||'Información regulatoria no disponible.'}
          </div>
        </CBody>
      )}
      {tab==='documentos' && (
        <CBody>
          <div style={{ color:'#94a3b8', fontSize:9, marginBottom:12 }}>Documentos regulatorios oficiales disponibles para este país.</div>
          <DocList docs={meta.docs||[]} color={AMBER}/>
        </CBody>
      )}
      <CFoot><CBtn color={AMBER} onClick={()=>nav('primario')}><FaArrowRight size={8}/> Proyectos en {country.name}</CBtn></CFoot>
    </>
  );
}

// ─── CATEGORY CARD ───────────────────────────────────────────────────────────
export function CategoryCard({ node, nav }) {
  const cat = node.data;
  const meta = CATEGORY_META[cat.id] || CATEGORY_META[node.id?.split('_')[0]] || {};
  const tproj = cat.companies.reduce((a,c)=>a+c.projects.length,0);
  const Icon = ICON_MAP[cat.icon] || FaBuilding;
  const riskColor = meta.risk==='Bajo'?GREEN:meta.risk==='Alto'?'#ef4444':AMBER;
  return (
    <>
      <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${WHITE}12` }}>
        <div style={{ fontSize:8.5, color:WHITE, letterSpacing:2, textTransform:'uppercase', opacity:0.35, marginBottom:4 }}>Categoría · {node.countryFlag} {node.countryName}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:'#f1f5f9',border:`1px solid ${WHITE}18`,display:'flex',alignItems:'center',justifyContent:'center' }}><Icon size={18} color={WHITE}/></div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'#0f172a' }}>{cat.name}</div>
            <div style={{ fontSize:9, color:riskColor, opacity:0.8 }}>Riesgo {meta.risk||'Medio'}</div>
          </div>
        </div>
      </div>
      <CBody>
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[['Empresas',cat.companies.length,BLUE],['Proyectos',tproj,GREEN]].map(([l,v,c]) => (
            <div key={l} style={{ flex:1, textAlign:'center', background:'#0f172a04', borderRadius:9, padding:'9px 4px', border:`1px solid ${c}12` }}>
              <div style={{ color:c, fontSize:17, fontWeight:800 }}>{v}</div><div style={{ color:'#94a3b8', fontSize:7.5 }}>{l}</div>
            </div>
          ))}
          <div style={{ flex:1, textAlign:'center', background:'#0f172a04', borderRadius:9, padding:'9px 4px', border:`1px solid ${GREEN}12` }}>
            <div style={{ color:GREEN, fontSize:11, fontWeight:800 }}>{meta.growth||'N/D'}</div><div style={{ color:'#94a3b8', fontSize:7.5 }}>Proyección</div>
          </div>
        </div>
        <CRow label="Regulatorio" value={meta.legal||'N/D'} vc={WHITE}/>
        <div style={{ marginTop:12, padding:'10px 12px', background:'#0f172a04', borderRadius:9, color:'#64748b', fontSize:9.5, lineHeight:1.75 }}>
          <span style={{ color:WHITE, fontWeight:600 }}>Beneficios: </span>{meta.benefits||'Activos tokenizados'}
        </div>
        <CSection label="Empresas" color={WHITE}/>
        {cat.companies.map(comp => (
          <div key={comp.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 10px', background:'#0f172a04', borderRadius:8, marginBottom:4 }}>
            <span style={{ width:7,height:7,borderRadius:'50%',background:BLUE,display:'inline-block',flexShrink:0 }}/>
            <span style={{ color:'#475569', fontSize:10 }}>{comp.name}</span>
            <span style={{ marginLeft:'auto', color:'#94a3b8', fontSize:8.5 }}>{comp.projects.length} proy.</span>
          </div>
        ))}
      </CBody>
      <CFoot><CBtn color={WHITE} onClick={()=>nav('primario')}><FaArrowRight size={8}/> Marketplace {cat.name}</CBtn></CFoot>
    </>
  );
}

// ─── COMPANY CARD ────────────────────────────────────────────────────────────
export function CompanyCard({ node, nav, data, allNodes, onNavigate }) {
  const [tab, setTab] = useState('proyectos');
  const comp = node.data;
  const meta = COMPANY_META[node.id] || {};

  // Cross-category carousel
  const crossGroup = comp.groupId && data?.crossLinks?.find(g => g.groupId === comp.groupId);
  const siblings = crossGroup ? (allNodes || []).filter(n => crossGroup.nodeIds.includes(n.id) && n.id !== node.id) : [];
  const allInGroup = crossGroup ? [node, ...siblings.sort((a,b) => crossGroup.nodeIds.indexOf(a.id) - crossGroup.nodeIds.indexOf(b.id))] : [];
  const currentIdx = allInGroup.findIndex(n => n.id === node.id);
  const initials = comp.name.slice(0,2).toUpperCase();
  return (
    <>
      {/* Banner */}
      <div style={{ position:'relative' }}>
        <div style={{ height:68, background:meta.bannerBg||`linear-gradient(135deg,${BLUE}18,#eef4ff)`, position:'relative', overflow:'hidden' }}>
          <span style={{ fontSize:36, opacity:0.18, position:'absolute', right:16, top:'50%', transform:'translateY(-50%)' }}>{meta.bannerEmoji||'🏢'}</span>
        </div>
        <div style={{ width:54,height:54,borderRadius:14,background:'#f8fafc',border:`2px solid ${BLUE}50`,display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',bottom:-27,left:18,fontSize:15,fontWeight:800,color:BLUE,boxShadow:`0 4px 16px rgba(15,23,42,0.12)`, zIndex:2 }}>
          {initials}
        </div>
      </div>
      <div style={{ padding:'32px 18px 12px', borderBottom:`1px solid ${BLUE}12` }}>
        <div style={{ fontSize:8.5, color:BLUE, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:2 }}>{node.countryFlag} {node.catName}</div>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:800, color:'#0f172a' }}>{comp.name}</div>
          {meta.rating && <StarRating value={meta.rating} color={GOLD}/>}
        </div>
        {meta.social && (
          <div style={{ display:'flex', gap:8, marginTop:7 }}>
            {meta.social.twitter && <a style={{ color:'#1da1f2', fontSize:9, display:'flex', alignItems:'center', gap:3, textDecoration:'none' }}><FaTwitter size={10}/> {meta.social.twitter}</a>}
            {meta.social.web && <a style={{ color:BLUE, fontSize:9, display:'flex', alignItems:'center', gap:3, textDecoration:'none' }}><FaGlobe size={10}/> {meta.social.web}</a>}
          </div>
        )}
      </div>
      {/* Cross-category carousel */}
      {crossGroup && allInGroup.length > 1 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:`${BLUE}0a`, borderBottom:`1px solid ${BLUE}18` }}>
          <button onClick={() => { const prev = allInGroup[(currentIdx - 1 + allInGroup.length) % allInGroup.length]; onNavigate && onNavigate(prev); }}
            style={{ width:22, height:22, borderRadius:6, border:`1px solid ${BLUE}30`, background:'transparent', color:BLUE, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11 }}>
            ‹
          </button>
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <div style={{ fontSize:8, color:'#64748b', letterSpacing:1.5, textTransform:'uppercase' }}>Esta empresa opera en</div>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {allInGroup.map((n, i) => (
                <button key={n.id} onClick={() => i !== currentIdx && onNavigate && onNavigate(n)}
                  title={`${n.countryFlag} ${n.catName}`}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor: i === currentIdx ? 'default' : 'pointer', padding:'2px 4px' }}>
                  <div style={{ width: i===currentIdx ? 8 : 6, height: i===currentIdx ? 8 : 6, borderRadius:'50%', background: i===currentIdx ? BLUE : '#94a3b8', transition:'all 0.2s' }}/>
                  <span style={{ fontSize:7.5, color: i===currentIdx ? BLUE : '#94a3b8', lineHeight:1 }}>{n.countryFlag}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize:8, color:BLUE, opacity:0.7 }}>{node.countryFlag} {node.catName}</div>
          </div>
          <button onClick={() => { const next = allInGroup[(currentIdx + 1) % allInGroup.length]; onNavigate && onNavigate(next); }}
            style={{ width:22, height:22, borderRadius:6, border:`1px solid ${BLUE}30`, background:'transparent', color:BLUE, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11 }}>
            ›
          </button>
        </div>
      )}
      <CTabs tabs={['perfil','proyectos','hitos','opiniones']} labels={['Perfil','Proyectos','Hitos','Opiniones']} active={tab} color={BLUE} onChange={setTab}/>
      {tab==='perfil' && (
        <CBody>
          {meta.bio && <div style={{ color:'#64748b', fontSize:9.5, lineHeight:1.8, marginBottom:14 }}>{meta.bio}</div>}
          <CRow label="Token" value={meta.tokens||'N/D'} vc={BLUE}/>
          <CRow label="APY promedio" value={meta.apy?`${meta.apy}%`:'N/D'} vc={GREEN}/>
          <CRow label="Fundada" value={meta.since||'N/D'}/>
          <CRow label="Proyectos activos" value={comp.projects.length} vc={GREEN}/>
          {meta.rating && (
            <div style={{ marginTop:12, padding:'10px 12px', background:`${GOLD}08`, borderRadius:9, border:`1px solid ${GOLD}12` }}>
              <div style={{ fontSize:8.5, color:GOLD, marginBottom:5 }}>Calificación general</div>
              <StarRating value={meta.rating} color={GOLD}/>
              <div style={{ color:'#94a3b8', fontSize:8.5, marginTop:4 }}>{meta.reviews?.length||0} opiniones verificadas</div>
            </div>
          )}
        </CBody>
      )}
      {tab==='proyectos' && (
        <CBody>
          <ProjectStack node={node} allNodes={allNodes} onNavigate={onNavigate} color={BLUE} />
        </CBody>
      )}
      {tab==='hitos' && (
        <CBody>
          <div style={{ position:'relative', paddingLeft:16 }}>
            <div style={{ position:'absolute', left:5, top:8, bottom:8, width:1, background:`${BLUE}20` }}/>
            {(meta.milestones||[]).map((m,i) => (
              <div key={i} style={{ position:'relative', marginBottom:14 }}>
                <div style={{ position:'absolute', left:-13, top:3, width:7, height:7, borderRadius:'50%', background:BLUE, boxShadow:`0 0 8px ${BLUE}80` }}/>
                <div style={{ fontSize:8.5, color:BLUE, fontWeight:700, marginBottom:2 }}>{m.year}</div>
                <div style={{ color:'#64748b', fontSize:9.5 }}>{m.label}</div>
              </div>
            ))}
            {!(meta.milestones?.length) && <div style={{ color:'#94a3b8', fontSize:9.5 }}>Sin hitos disponibles.</div>}
          </div>
        </CBody>
      )}
      {tab==='opiniones' && (
        <CBody>
          {(meta.reviews||[]).map((r,i) => (
            <div key={i} style={{ padding:'10px 12px', background:'#0f172a04', borderRadius:10, marginBottom:8, border:`1px solid #0f172a08` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:'#475569', fontSize:9.5, fontWeight:600 }}>{r.user}</span>
                <StarRating value={r.stars} color={GOLD}/>
              </div>
              <div style={{ color:'#64748b', fontSize:9.5, lineHeight:1.7 }}>"{r.text}"</div>
            </div>
          ))}
          {!(meta.reviews?.length) && <div style={{ color:'#94a3b8', fontSize:9.5 }}>Sin opiniones disponibles.</div>}
        </CBody>
      )}
      <CFoot>
        <CBtn color={BLUE} onClick={()=>nav('primario')}><FaExternalLinkAlt size={8}/> Perfil completo</CBtn>
        <CBtn color={GREEN} onClick={()=>nav('primario')}><FaArrowRight size={8}/> Invertir</CBtn>
      </CFoot>
    </>
  );
}

// ─── PROJECT CARD ────────────────────────────────────────────────────────────
export function ProjectCard({ node, nav }) {
  const [tab, setTab] = useState('resumen');
  const proj = node.data;
  const meta = PROJECT_META[node.id] || {};
  const sc = meta.status==='Activo'?GREEN:meta.status==='Lanzando'?AMBER:'#64748b';
  return (
    <>
      <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${GREEN}12` }}>
        <div style={{ fontSize:8.5, color:GREEN, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:4 }}>Proyecto · {node.countryFlag} {node.compName}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ color:GREEN, fontSize:14 }}>▲</span>
          <div style={{ fontSize:16, fontWeight:800, color:'#0f172a' }}>{proj.name}</div>
          <span style={{ marginLeft:'auto', padding:'3px 8px', borderRadius:5, background:`${sc}14`, color:sc, fontSize:8, fontWeight:700, border:`1px solid ${sc}30` }}>{meta.status||'Activo'}</span>
        </div>
        {meta.filled !== undefined && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ color:'#94a3b8', fontSize:8.5 }}>Fondeado</span>
              <span style={{ color:GREEN, fontSize:8.5, fontWeight:700 }}>{meta.filled}%</span>
            </div>
            <div style={{ height:5, background:'#0f172a08', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${meta.filled}%`, height:'100%', background:`linear-gradient(90deg,${GREEN}80,${GREEN})`, borderRadius:3 }}/>
            </div>
          </div>
        )}
      </div>
      <CTabs tabs={['resumen','galeria','tokenomica','documentos']} labels={['Resumen','Galería','Tokenómica','Docs']} active={tab} color={GREEN} onChange={setTab}/>
      {tab==='resumen' && (
        <CBody>
          {meta.description && <div style={{ color:'#64748b', fontSize:9.5, lineHeight:1.8, marginBottom:12 }}>{meta.description}</div>}
          <CRow label="Tipo de activo" value={meta.type||'RWA'} vc={GREEN}/>
          <CRow label="APY" value={meta.apy?`${meta.apy}%`:'N/D'} vc={GREEN}/>
          <CRow label="Inversión mínima" value={meta.min?`$${meta.min} USDC`:'N/D'}/>
          <CRow label="Duración" value={meta.dur||'N/D'}/>
          <CRow label="Categoría" value={node.catName||'N/D'} vc={WHITE}/>
          <CSection label="Scores" color={GREEN}/>
          <ScoreBar label="Confianza" value={meta.trust_score||0} color={GOLD}/>
          <ScoreBar label="Seguridad" value={meta.security_score||0} color={BLUE}/>
          <ScoreBar label="Descentralización" value={meta.decentralization_score||0} color={GREEN}/>
          {meta.apy && (
            <div style={{ marginTop:12, padding:'10px 12px', background:`${GREEN}08`, borderRadius:9, border:`1px solid ${GREEN}12` }}>
              <div style={{ color:GREEN, fontSize:9, fontWeight:600, marginBottom:2 }}>Retorno estimado a {meta.dur||'12m'}</div>
              <div style={{ color:'#64748b', fontSize:9 }}>Sobre $1,000 → <span style={{ color:GREEN, fontWeight:800 }}>${Math.round(1000*meta.apy/100)} USDC</span></div>
            </div>
          )}
        </CBody>
      )}
      {tab==='galeria' && (
        <CBody>
          {meta.photos?.length ? <PhotoCarousel photos={meta.photos} color={GREEN}/> : <div style={{ color:'#94a3b8', fontSize:9.5 }}>Sin imágenes disponibles.</div>}
        </CBody>
      )}
      {tab==='tokenomica' && (
        <CBody>
          {meta.tokenomics ? (
            <>
              <CRow label="Supply total" value={meta.tokenomics.supply} vc={GREEN}/>
              <CRow label="Precio token" value={meta.tokenomics.price} vc={GREEN}/>
              <CRow label="Holders" value={meta.tokenomics.holders} vc={BLUE}/>
              <CRow label="Liquidez" value={meta.tokenomics.liquidity} vc={AMBER}/>
              <CSection label="Distribución" color={GREEN}/>
              {meta.tokenomics.distribution.map(([label,pct]) => (
                <div key={label} style={{ marginBottom:7 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ color:'#64748b', fontSize:9 }}>{label}</span>
                    <span style={{ color:GREEN, fontSize:9, fontWeight:700 }}>{pct}</span>
                  </div>
                  <div style={{ height:3, background:'#0f172a08', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:pct, height:'100%', background:`linear-gradient(90deg,${GREEN}60,${GREEN})`, borderRadius:2 }}/>
                  </div>
                </div>
              ))}
            </>
          ) : <div style={{ color:'#94a3b8', fontSize:9.5 }}>Tokenómica no disponible.</div>}
        </CBody>
      )}
      {tab==='documentos' && (
        <CBody>
          <DocList docs={meta.docs||[]} color={GREEN}/>
        </CBody>
      )}
      <CFoot>
        <CBtn color={WHITE} onClick={()=>nav('detalle',{id:node.id})}><FaExternalLinkAlt size={8}/> Detalle</CBtn>
        <CBtn color={GREEN} onClick={()=>nav('checkout',{id:node.id})}><FaArrowRight size={8}/> Invertir</CBtn>
      </CFoot>
    </>
  );
}

// ─── COMPANY GALLERY OVERLAY ─────────────────────────────────────────────────
// Full-screen "browser" view opened when a company is selected: an address
// bar showing the company's own realworldassets.lat slug, and its projects
// as a centered card carousel with the neighbors peeking on each side —
// replaces the regular docked info card for company nodes specifically.
function GalleryPill({ children, style }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:999,
        background:'rgba(15,23,42,0.18)', border:'1px solid rgba(15,23,42,0.12)',
        backdropFilter:'blur(18px) saturate(160%)', WebkitBackdropFilter:'blur(18px) saturate(160%)',
        boxShadow:'0 12px 30px rgba(15,23,42,0.1)', ...style,
      }}
    >
      {children}
    </div>
  );
}
function GalleryIconBtn({ children, onClick, title }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick?.(e); }} title={title} style={{
      width:30, height:30, borderRadius:'50%', border:'none', background:'rgba(15,23,42,0.08)',
      color:'#1e293b', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0,
    }}>
      {children}
    </button>
  );
}
// Full project card — same content/shape whether it's the focused center
// slide or a dimmed neighbor; the parent (ProjectTrackItem) is what animates
// its position/scale/opacity, so this component never has to know which one
// it is. Mirrors the marketplace listing card (tags, stats, funded bar), minus
// the issuer badge — the company's own identity already lives in the bar
// below the carousel, so that top-right slot is the "Ver producto" button.
function ProjectCardFull({ proj, pm, node, onView, interactive }) {
  const photo = pm.photos?.[0];
  const sc = pm.status==='Activo'?GREEN:pm.status==='Lanzando'?AMBER:'#475569';
  const supplyNum = pm.tokenomics?.supply ? parseInt(pm.tokenomics.supply.replace(/[^0-9]/g,''), 10) : null;
  const disponibles = supplyNum != null && pm.filled != null ? Math.round(supplyNum * (100 - pm.filled) / 100) : null;
  return (
    <div style={{
      width:340, borderRadius:22, overflow:'hidden', position:'relative',
      border:'1px solid rgba(15,23,42,0.18)', boxShadow:'0 30px 70px rgba(15,23,42,0.14)',
      background:'#ffffff',
    }}>
      <div style={{ height:260, position:'relative' }}>
        {photo?.url
          ? <img src={photo.url} alt={proj.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.currentTarget.style.display='none';}}/>
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:60, background:`linear-gradient(135deg,${BLUE}22,#eef4ff)` }}>{photo?.emoji||'▲'}</div>}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:6 }}>
          <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,0.95)', color:'#111', fontSize:10, fontWeight:700 }}>{node.catName}</span>
          <span style={{ padding:'4px 10px', borderRadius:999, background:`${sc}e6`, color:'#052e16', fontSize:10, fontWeight:700 }}>{pm.status||'Activo'}</span>
        </div>
        {interactive && (
          <button
            onClick={e => { e.stopPropagation(); onView?.(); }}
            style={{ position:'absolute', top:12, right:12, padding:'6px 12px', borderRadius:999, border:'none', background:'#fff', color:'#111', fontSize:10.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}
          >
            Ver producto <FaArrowRight size={8}/>
          </button>
        )}
      </div>
      <div style={{ padding:'16px 20px 20px' }}>
        <div style={{ color:'#0f172a', fontWeight:800, fontSize:18 }}>{proj.name}</div>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4, color:'#8a9a90', fontSize:11 }}>
          <span>{node.countryFlag}</span><span>{node.catName}</span>
        </div>
        {pm.description && (
          <div style={{ color:'#64748b', fontSize:11, lineHeight:1.5, marginTop:8 }}>
            {pm.description.length > 100 ? pm.description.slice(0,100) + '…' : pm.description}
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:14 }}>
          <div>
            <div style={{ color:'#64748b', fontSize:8, textTransform:'uppercase', letterSpacing:0.4 }}>Token</div>
            <div style={{ color:'#0f172a', fontWeight:700, fontSize:13 }}>{pm.tokenomics?.price || '$1'}</div>
          </div>
          <div>
            <div style={{ color:'#64748b', fontSize:8, textTransform:'uppercase', letterSpacing:0.4 }}>APY est.</div>
            <div style={{ color:GREEN, fontWeight:700, fontSize:13 }}>{pm.apy != null ? `${pm.apy}%` : 'N/D'}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'#64748b', fontSize:8, textTransform:'uppercase', letterSpacing:0.4 }}>Disponibles</div>
            <div style={{ color:'#0f172a', fontWeight:700, fontSize:13 }}>{disponibles != null ? disponibles.toLocaleString() : 'N/D'}</div>
          </div>
        </div>
        {pm.filled != null && (
          <div style={{ marginTop:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ color:'#64748b', fontSize:10 }}>Financiado</span>
              <span style={{ color:GREEN, fontSize:10, fontWeight:700 }}>{pm.filled}%</span>
            </div>
            <div style={{ height:4, background:'#0f172a12', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${pm.filled}%`, height:'100%', background:`linear-gradient(90deg,${GREEN}80,${GREEN})` }}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Positions one project at `distance` slots (in card-widths) from the active
// center slide. Because items keep a stable key (their own id) across re-
// renders, Framer Motion smoothly interpolates position/scale/opacity/blur
// as `distance` changes — the actual "card slides into center" motion the
// old AnimatePresence-by-key version couldn't do (that swapped a whole DOM
// subtree on every step, which is what read as a flicker/blink).
const TRACK_STEP = 300;
function ProjectTrackItem({ proj, pm, node, distance, onView, onSelect }) {
  const centered = distance === 0;
  return (
    <motion.div
      initial={{ x: distance * TRACK_STEP, opacity: 0, scale: 0.8 }}
      animate={{
        x: distance * TRACK_STEP,
        opacity: centered ? 1 : 0.5,
        scale: centered ? 1 : 0.82,
        filter: centered ? 'blur(0px) brightness(1)' : 'blur(1.5px) brightness(0.55)',
      }}
      transition={{ type:'spring', stiffness:340, damping:32, mass:0.9 }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      style={{ position:'absolute', left:0, top:0, zIndex: centered ? 3 : 2, cursor:'pointer' }}
    >
      <ProjectCardFull proj={proj} pm={pm} node={node} onView={onView} interactive={centered} />
    </motion.div>
  );
}
export function CompanyGalleryOverlay({ node, onClose, onNavigate, allNodes, nav }) {
  const comp = node.data;
  const meta = COMPANY_META[node.id] || {};
  const projects = comp.projects || [];
  const [idx, setIdx] = useState(0);
  const dragRef = useRef({ x: 0, dragging: false });
  const go = (d) => setIdx(i => (i + d + projects.length) % projects.length);
  const cur = projects[idx];
  const pmFor = (p) => (p ? PROJECT_META[p.id] || {} : {});
  const slug = `realworldassets.lat/${node.id}`;
  const openFull = (p) => { const full = (allNodes || []).find(n => n.id === p.id); if (full) onNavigate?.(full); };
  const openProfile = () => nav?.('detalle', { id: node.id });

  // Other companies in the same category — the top-bar arrows cycle between them.
  const siblings = (allNodes || []).filter(n => n.type === 'company' && n.catId === node.catId);
  const siblingIdx = siblings.findIndex(n => n.id === node.id);
  const goCompany = (d) => {
    if (siblings.length < 2) return;
    const target = siblings[(siblingIdx + d + siblings.length) % siblings.length];
    onNavigate?.(target);
  };

  // Categories this company also operates in (cross-links like LogiGlobal/FinTrust
  // span country/category pairs) — switching the dropdown jumps to that instance,
  // which brings its own project list along.
  const crossGroup = comp.groupId ? (allNodes || []).filter(n => n.type === 'company' && n.data?.groupId === comp.groupId) : [];
  const categoryOptions = crossGroup.length > 1 ? crossGroup : [node];

  // Drag-to-swipe: works with mouse and touch alike via pointer events.
  const onPointerDown = (e) => {
    dragRef.current.x = e.clientX;
    dragRef.current.dragging = true;
    // Pointer capture keeps move/up events targeting this element even once
    // the cursor crosses over a child card's own boundary mid-drag.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = () => {};
  const onPointerUp = (e) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const delta = e.clientX - dragRef.current.x;
    if (Math.abs(delta) > 50 && projects.length > 1) go(delta < 0 ? 1 : -1);
  };

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
      onClick={onClose}
      style={{
        position:'absolute', inset:0, zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:'radial-gradient(circle at 50% 30%, rgba(15,23,42,0.18), rgba(15,23,42,0.25) 70%)',
        backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', cursor:'default',
      }}
    >
      {/* Browser-chrome address bar — arrows cycle companies in this category,
          the address text is a real link to this company's profile, and a
          single close button replaces the old +/share/copy trio. */}
      <GalleryPill style={{ position:'absolute', top:28, width:'min(640px, 86vw)', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:6 }}>
          <GalleryIconBtn title="Empresa anterior en esta categoría" onClick={() => goCompany(-1)}><FaChevronLeft size={11}/></GalleryIconBtn>
          <GalleryIconBtn title="Empresa siguiente en esta categoría" onClick={() => goCompany(1)}><FaChevronRight size={11}/></GalleryIconBtn>
        </div>
        <div
          onClick={openProfile} title="Ver perfil de la empresa"
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'#1e293b', fontSize:13, minWidth:0, cursor:'pointer' }}
        >
          <FaLock size={10} color="#64748b"/>
          <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration:'underline', textDecorationColor:'rgba(15,23,42,0.25)' }}>{slug}</span>
        </div>
        <GalleryIconBtn title="Cerrar" onClick={onClose}><FaTimes size={12}/></GalleryIconBtn>
      </GalleryPill>

      {/* Project carousel — a real sliding track (stable keys, animated
          position) so moving between projects reads as the card gliding
          into center, not a blink-and-swap. Draggable with the mouse; side
          arrows only show up when there's actually somewhere to go. */}
      {cur ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18 }}>
          {projects.length > 1 && (
            <GalleryIconBtn title="Proyecto anterior" onClick={() => go(-1)}>
              <FaChevronLeft size={13}/>
            </GalleryIconBtn>
          )}
          <div
            onClick={e => e.stopPropagation()}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            style={{ position:'relative', width:340, height:430, cursor: projects.length > 1 ? 'grab' : 'default', touchAction:'pan-y' }}
          >
            {projects.map((p, i) => {
              const distance = i - idx;
              if (Math.abs(distance) > 1) return null;
              return (
                <ProjectTrackItem
                  key={p.id}
                  proj={p} pm={pmFor(p)} node={node} distance={distance}
                  onView={() => openFull(p)}
                  onSelect={() => { if (distance !== 0) setIdx(i); }}
                />
              );
            })}
          </div>
          {projects.length > 1 && (
            <GalleryIconBtn title="Proyecto siguiente" onClick={() => go(1)}>
              <FaChevronRight size={13}/>
            </GalleryIconBtn>
          )}
        </div>
      ) : (
        <div style={{ color:'#64748b', fontSize:13 }}>Esta empresa todavía no tiene proyectos.</div>
      )}

      {/* Bottom company identity bar — photo (opens the full profile), name +
          since, and a dropdown of the categories this company operates in. */}
      <GalleryPill style={{ position:'absolute', bottom:36, gap:14, padding:'10px 18px 10px 10px' }}>
        <button
          onClick={openProfile} title="Ver perfil de la empresa"
          style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden', border:`2px solid ${BLUE}`, flexShrink:0, background:'#ffffff', padding:0, cursor:'pointer' }}
        >
          {meta.logo && <img src={meta.logo} alt={comp.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
        </button>
        <div style={{ minWidth:120 }}>
          <div style={{ color:'#0f172a', fontWeight:700, fontSize:13.5 }}>{comp.name}</div>
          <div style={{ color:'#64748b', fontSize:10.5 }}>{meta.since ? `Desde ${meta.since}` : ''}</div>
        </div>
        {categoryOptions.length > 1 ? (
          <select
            value={node.id}
            onChange={e => { const target = categoryOptions.find(n => n.id === e.target.value); if (target) onNavigate?.(target); }}
            style={{ background:'rgba(15,23,42,0.08)', color:'#1e293b', border:'1px solid rgba(15,23,42,0.14)', borderRadius:999, padding:'7px 12px', fontSize:11.5, cursor:'pointer' }}
          >
            {categoryOptions.map(n => <option key={n.id} value={n.id}>{n.countryFlag} {n.catName}</option>)}
          </select>
        ) : (
          <span style={{ color:'#64748b', fontSize:11.5, whiteSpace:'nowrap' }}>{node.catName}</span>
        )}
      </GalleryPill>

      {/* Pagination dots */}
      {projects.length > 1 && (
        <div style={{ position:'absolute', bottom:14, display:'flex', gap:6 }}>
          {projects.map((p, i) => (
            <span key={p.id} onClick={() => setIdx(i)} style={{ width:i===idx?18:6, height:6, borderRadius:3, background:i===idx?BLUE:'rgba(15,23,42,0.25)', cursor:'pointer', transition:'width 0.2s' }} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
