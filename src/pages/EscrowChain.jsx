import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag, Icons } from '../components/ui';

const ACCENT = '#6C63FF';
const GREEN  = '#6ee772';
const GOLD   = '#F5A623';

const LISTINGS = [
  { id:1, role:'importador', title:'Busco 500 TN de Soja Argentina', country:'🇧🇷 Brasil', company:'GrãoFuture Ltda.', product:'Soja', qty:'500 TN', budget:'$180,000', deadline:'Ago 2026', verified:true, escrow_status:'abierto', tags:['Granos','Agricultura'] },
  { id:2, role:'exportador', title:'Ofrezco contenedores de manzanas Patagonia', country:'🇦🇷 Argentina', company:'FrutasPatagonia SA', product:'Frutas', qty:'200 TN', price:'$95,000', deadline:'Jul 2026', verified:true, escrow_status:'abierto', tags:['Frutas','Premium'] },
  { id:3, role:'importador', title:'Necesito maquinaria agrícola usada', country:'🇨🇱 Chile', company:'AgroCentral SPA', product:'Maquinaria', qty:'15 unidades', budget:'$240,000', deadline:'Sep 2026', verified:false, escrow_status:'abierto', tags:['Maquinaria'] },
  { id:4, role:'exportador', title:'Exporto litio procesado grado batería', country:'🇦🇷 Argentina', company:'LitioAndino SA', product:'Minerales', qty:'50 TN', price:'$1,200,000', deadline:'Dic 2026', verified:true, escrow_status:'en_escrow', tags:['Minerales','EV','Premium'] },
  { id:5, role:'importador', title:'Importo vinos premium chilenos para EE.UU.', country:'🇺🇸 EE.UU.', company:'WineVault LLC', product:'Vinos', qty:'50,000 botellas', budget:'$320,000', deadline:'Oct 2026', verified:true, escrow_status:'abierto', tags:['Vinos','Premium'] },
  { id:6, role:'exportador', title:'Ofrezco tokens de exportación de carne', country:'🇺🇾 Uruguay', company:'CarneToken DAO', product:'Carne', qty:'100 TN', price:'$450,000', deadline:'Ago 2026', verified:false, escrow_status:'completado', tags:['Carne','Tokenizado'] },
];

const ESCROW_STEPS = [
  { id:1, icon:'📋', title:'Propuesta creada',      desc:'Importador y exportador acuerdan términos'         },
  { id:2, icon:'🔒', title:'Fondos en escrow',       desc:'El comprador deposita USDC en contrato on-chain'   },
  { id:3, icon:'🚢', title:'Carga en tránsito',      desc:'Exportador embarca la mercadería'                  },
  { id:4, icon:'🛃', title:'Verificación de llegada', desc:'Oracle confirma recepción o inspección de terceros'},
  { id:5, icon:'✅', title:'Fondos liberados',        desc:'El contrato transfiere USDC al exportador'         },
];

function EscrowSteps({ active = 2 }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {ESCROW_STEPS.map((s, i) => (
        <div key={s.id} style={{ display:'flex', gap:14, paddingBottom: i < ESCROW_STEPS.length-1 ? 16 : 0 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
              background: s.id < active ? GREEN : s.id===active ? ACCENT : 'var(--surface2)',
              border: `2px solid ${s.id < active ? GREEN : s.id===active ? ACCENT : 'var(--border)'}`,
              color: s.id <= active ? '#fff' : 'var(--ter)',
            }}>{s.id < active ? '✓' : s.icon}</div>
            {i < ESCROW_STEPS.length-1 && <div style={{ width:2, flex:1, background: s.id < active ? GREEN : 'var(--border)', margin:'4px 0', minHeight:16 }} />}
          </div>
          <div style={{ paddingTop:6 }}>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color: s.id <= active ? 'var(--text)' : 'var(--ter)', marginBottom:2 }}>{s.title}</div>
            <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)' }}>{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingCard({ l, onClick }) {
  const isImport = l.role === 'importador';
  const roleColor = isImport ? ACCENT : GREEN;
  const statusCfg = { abierto:{ color:GREEN, label:'Abierto' }, en_escrow:{ color:GOLD, label:'En Escrow' }, completado:{ color:'#888', label:'Completado' } }[l.escrow_status];

  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} whileHover={{ y:-3 }} transition={{ duration:0.18 }}>
      <PCard onClick={onClick} style={{ padding:'18px 22px', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={{ padding:'3px 10px', borderRadius:999, background:`${roleColor}18`, color:roleColor, fontSize:11, fontWeight:700 }}>
              {isImport ? '📥 Importador' : '📤 Exportador'}
            </span>
            {l.verified && <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(110,231,114,0.12)', color:GREEN, fontSize:11, fontWeight:700 }}>✓ Verificado</span>}
            <span style={{ padding:'3px 10px', borderRadius:999, background:'var(--surface2)', color:statusCfg.color, fontSize:11, fontWeight:700 }}>⬡ {statusCfg.label}</span>
          </div>
          <span style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)' }}>{l.deadline}</span>
        </div>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>{l.title}</div>
        <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:10 }}>{l.country} · {l.company}</div>
        <div style={{ display:'flex', gap:16, marginBottom:10 }}>
          <div><div style={{ fontSize:11, color:'var(--ter)', marginBottom:2 }}>PRODUCTO</div><div style={{ fontFamily:'var(--font-b)', fontWeight:600, fontSize:13, color:'var(--text)' }}>{l.product}</div></div>
          <div><div style={{ fontSize:11, color:'var(--ter)', marginBottom:2 }}>CANTIDAD</div><div style={{ fontFamily:'var(--font-b)', fontWeight:600, fontSize:13, color:'var(--text)' }}>{l.qty}</div></div>
          <div><div style={{ fontSize:11, color:'var(--ter)', marginBottom:2 }}>{isImport ? 'PRESUPUESTO' : 'PRECIO'}</div><div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:15, color:'var(--text)' }}>{isImport ? l.budget : l.price}</div></div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {l.tags.map(t => <span key={t} style={{ fontSize:10.5, padding:'2px 8px', borderRadius:999, background:'var(--surface2)', color:'var(--sec)' }}>{t}</span>)}
        </div>
      </PCard>
    </motion.div>
  );
}

export default function EscrowChain({ nav }) {
  const [role, setRole]       = useState('todos');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = LISTINGS.filter(l => {
    if (role !== 'todos' && l.role !== role) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.product.toLowerCase().includes(q) || l.company.toLowerCase().includes(q);
    }
    return true;
  });

  const sel = LISTINGS.find(l => l.id === selected);

  return (
    <div style={{ padding:'28px 32px 40px', maxWidth:1200, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <span style={{ fontSize:28 }}>🚢</span>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:30, color:'var(--text)', letterSpacing:'-0.03em' }}>Escrow Chain</div>
            <span style={{ fontSize:11, padding:'3px 8px', borderRadius:999, background:`${ACCENT}20`, color:ACCENT, fontWeight:700 }}>by KEYCHAIN</span>
          </div>
          <div style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)' }}>Mercado de importaciones y exportaciones protegido por contratos escrow on-chain.</div>
        </div>
        <PBtn variant="accent" onClick={() => setShowNew(true)}>+ Publicar operación</PBtn>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[['Volumen total','$4.2M'],['Operaciones activas','28'],['En escrow','$890K'],['Completadas','142']].map(([k,v]) => (
          <PCard key={k} style={{ padding:'14px 18px' }}>
            <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k}</div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)' }}>{v}</div>
          </PCard>
        ))}
      </div>

      {/* Escrow flow explainer */}
      <PCard style={{ padding:'20px 24px', marginBottom:24, background:`linear-gradient(135deg,${ACCENT}08,transparent)`, border:`1px solid ${ACCENT}25` }}>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:14 }}>¿Cómo funciona el escrow on-chain?</div>
        <div style={{ display:'flex', gap:0, alignItems:'center', overflowX:'auto' }}>
          {ESCROW_STEPS.map((s, i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:0, flexShrink:0 }}>
              <div style={{ textAlign:'center', padding:'0 10px' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--sec)', maxWidth:80, lineHeight:1.4 }}>{s.title}</div>
              </div>
              {i < ESCROW_STEPS.length-1 && <div style={{ width:32, height:1.5, background:'var(--border)', flexShrink:0 }} />}
            </div>
          ))}
        </div>
      </PCard>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--ter)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto, empresa, país..."
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px 10px 36px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, outline:'none' }} />
        </div>
        {[['todos','Todos'],['importador','📥 Importadores'],['exportador','📤 Exportadores']].map(([id,label]) => (
          <button key={id} onClick={() => setRole(id)}
            style={{ padding:'10px 16px', borderRadius:12, border:`1.5px solid ${role===id ? ACCENT : 'var(--border)'}`, background: role===id ? `${ACCENT}18` : 'transparent', color: role===id ? ACCENT : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:13, fontWeight: role===id ? 700 : 400, flexShrink:0 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:20, alignItems:'start' }}>
        {/* Listings */}
        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(auto-fill,minmax(380px,1fr))', gap:14 }}>
          {filtered.map(l => <ListingCard key={l.id} l={l} onClick={() => setSelected(selected===l.id ? null : l.id)} />)}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {sel && (
            <motion.div key={sel.id} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }}
              style={{ position:'sticky', top:88 }}>
              <PCard style={{ padding:'22px 24px', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--text)' }}>Detalle de operación</div>
                  <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ter)', fontSize:18 }}>×</button>
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, color:'var(--text)', marginBottom:4 }}>{sel.title}</div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>{sel.country} · {sel.company}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                  {[['Producto',sel.product],['Cantidad',sel.qty],['Valor',sel.budget||sel.price],['Plazo',sel.deadline]].map(([k,v]) => (
                    <div key={k} style={{ background:'var(--surface2)', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontFamily:'var(--font-b)', fontSize:10.5, color:'var(--ter)', marginBottom:3 }}>{k}</div>
                      <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:12 }}>Estado del escrow</div>
                <EscrowSteps active={sel.escrow_status==='abierto' ? 1 : sel.escrow_status==='en_escrow' ? 3 : 5} />
                <PBtn variant="accent" style={{ width:'100%', padding:'13px', marginTop:20 }}>
                  {sel.escrow_status==='abierto' ? 'Iniciar escrow · Depositar USDC' : sel.escrow_status==='en_escrow' ? 'Ver contrato on-chain' : 'Operación completada'}
                </PBtn>
              </PCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
