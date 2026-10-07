import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag, Icons } from '../components/ui';
import { goCheckout } from '../lib/checkout';

const ACCENT = '#6C63FF';
const GREEN  = '#6ee772';
const RED    = '#ff5c5c';

const PAYMENTS = [
  { id:1, concept:'Alquiler Julio 2026',    amount:1800, due:'2026-07-01', status:'pendiente' },
  { id:2, concept:'Alquiler Agosto 2026',   amount:1800, due:'2026-08-01', status:'pendiente' },
  { id:3, concept:'Alquiler Junio 2026',    amount:1800, due:'2026-06-01', status:'pagado'    },
  { id:4, concept:'Depósito de garantía',   amount:3600, due:'2026-05-01', status:'pagado'    },
];

const ISSUES = [
  { id:1, cat:'Plomería',   title:'Pérdida de agua en baño',       status:'en_progreso', date:'2026-06-18', priority:'alta',  tech:'Carlos Ríos' },
  { id:2, cat:'Electricidad', title:'Tomacorriente sin funcionamiento', status:'resuelto',   date:'2026-06-10', priority:'media', tech:'Ana Suárez'  },
  { id:3, cat:'Otros',       title:'Puerta principal con dificultad', status:'pendiente',  date:'2026-06-22', priority:'baja',  tech:null           },
];

const STATUS_CFG = {
  pendiente:    { label:'Pendiente',    color:'#F5A623', bg:'rgba(245,166,35,0.12)'   },
  en_progreso:  { label:'En progreso',  color:ACCENT,    bg:`${ACCENT}18`             },
  resuelto:     { label:'Resuelto',     color:GREEN,     bg:'rgba(110,231,114,0.12)'  },
  pagado:       { label:'Pagado',       color:GREEN,     bg:'rgba(110,231,114,0.12)'  },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { label:status, color:'#888', bg:'#ffffff10' };
  return <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, color:c.color, background:c.bg, fontFamily:'var(--font-b)' }}>{c.label}</span>;
}

function ReportForm({ onSubmit }) {
  const [form, setForm] = useState({ cat:'', title:'', desc:'', priority:'media' });
  const set = (k, v) => setForm(f => ({...f, [k]:v}));

  return (
    <PCard style={{ padding:'22px 24px' }}>
      <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:17, color:'var(--text)', marginBottom:18 }}>Reportar problema</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        <div>
          <label style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Categoría</label>
          <select value={form.cat} onChange={e => set('cat',e.target.value)}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, outline:'none', boxSizing:'border-box' }}>
            <option value="">Seleccionar...</option>
            {['Plomería','Electricidad','Climatización','Pintura','Carpintería','Limpieza','Seguridad','Otros'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Prioridad</label>
          <div style={{ display:'flex', gap:6 }}>
            {['baja','media','alta'].map(p => (
              <button key={p} onClick={() => set('priority',p)}
                style={{ flex:1, padding:'10px 4px', borderRadius:10, border:`1.5px solid ${form.priority===p ? (p==='alta' ? RED : p==='media' ? '#F5A623' : GREEN) : 'var(--border)'}`, background: form.priority===p ? 'var(--surface2)' : 'transparent', color: form.priority===p ? 'var(--text)' : 'var(--ter)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12, fontWeight: form.priority===p ? 700 : 400, textTransform:'capitalize' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Título</label>
        <input value={form.title} onChange={e => set('title',e.target.value)} placeholder="Ej: Pérdida de agua debajo del lavabo"
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, outline:'none', boxSizing:'border-box' }} />
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>Descripción</label>
        <textarea value={form.desc} onChange={e => set('desc',e.target.value)} rows={3} placeholder="Describí el problema con el mayor detalle posible..."
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, outline:'none', boxSizing:'border-box', resize:'vertical' }} />
      </div>
      {/* Photo upload UI (mock) */}
      <div style={{ border:'2px dashed var(--border)', borderRadius:12, padding:'20px', textAlign:'center', marginBottom:18, cursor:'pointer' }}>
        <div style={{ fontSize:24, marginBottom:6 }}>📷</div>
        <div style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>Adjuntar fotos o videos del problema</div>
        <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', marginTop:3 }}>PNG, JPG, MP4 · máx. 20MB</div>
      </div>
      <PBtn variant="accent" style={{ width:'100%', padding:'13px' }} onClick={() => onSubmit(form)}>
        Enviar reporte
      </PBtn>
    </PCard>
  );
}

export default function TenantPortal({ nav, property }) {
  const [tab, setTab]           = useState('pagos');
  const [payMethod, setPayMethod] = useState('usdc');
  const [submitted, setSubmitted] = useState(false);
  const [issues, setIssues]      = useState(ISSUES);

  const prop = property || { name:'Apartamento Palermo Soho', location:'Buenos Aires, Argentina', img:'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop&auto=format&q=80', owner:'PropChain' };

  const handleReport = (form) => {
    if (!form.cat || !form.title) return;
    setIssues(prev => [{
      id: prev.length + 1, cat: form.cat, title: form.title,
      status:'pendiente', date: new Date().toISOString().slice(0,10),
      priority: form.priority, tech: null,
    }, ...prev]);
    setSubmitted(true);
    setTab('reportes');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div style={{ padding:'28px 32px 40px', maxWidth:1000, margin:'0 auto' }}>
      {/* Property header */}
      <PCard style={{ display:'flex', gap:18, padding:'18px 22px', marginBottom:26, alignItems:'center' }}>
        <div style={{ width:72, height:72, borderRadius:14, overflow:'hidden', flexShrink:0 }}>
          <img src={prop.img} alt={prop.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:3 }}>{prop.name}</div>
          <div style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>📍 {prop.location} · Administrado por {prop.owner}</div>
        </div>
        <PTag label="Inquilino activo" color="green" />
      </PCard>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border-l)', marginBottom:24 }}>
        {[['pagos','💳 Pagos'],['metodos','Métodos de pago'],['reportes','🔧 Reportes'],['nuevo','+ Reportar problema']].map(([id,label]) => (
          <button key={id} onClick={() => { setTab(id); if(id!=='nuevo') setSubmitted(false); }}
            style={{ padding:'10px 18px', border:'none', background:'none', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:13.5, fontWeight:tab===id ? 700 : 450, color:tab===id ? 'var(--text)' : 'var(--ter)', borderBottom:`2px solid ${tab===id ? ACCENT : 'transparent'}`, marginBottom:-1 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Pagos */}
      {tab==='pagos' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
            {[['Próximo pago','$1,800 · 01 Jul'],['Estado','Al día ✓'],['Depósito','$3,600 retenido']].map(([k,v]) => (
              <PCard key={k} style={{ padding:'16px 20px' }}>
                <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, color:'var(--text)' }}>{v}</div>
              </PCard>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {PAYMENTS.map(p => (
              <PCard key={p.id} style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:42, height:42, borderRadius:12, background: p.status==='pagado' ? 'rgba(110,231,114,0.12)' : `${ACCENT}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {p.status==='pagado' ? '✓' : '📅'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:2 }}>{p.concept}</div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>Vencimiento: {p.due}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:17, color:'var(--text)', marginBottom:4 }}>${p.amount.toLocaleString()}</div>
                  <StatusBadge status={p.status} />
                </div>
                {p.status==='pendiente' && (
                  <PBtn variant="accent" small style={{ marginLeft:8, flexShrink:0 }} onClick={() => {
                    goCheckout(nav, {
                      title: 'Pago de alquiler', source: 'Portal del inquilino',
                      items: [{ name: `${p.concept} — ${prop.name}`, img: prop.img, qty: 1, unit: p.amount, meta: `Vence ${p.due}` }],
                      back: { route: 'inquilino', data: property }, done: { route: 'inquilino', data: property, label: 'Volver al portal' },
                    });
                  }}>Pagar</PBtn>
                )}
              </PCard>
            ))}
          </div>
        </motion.div>
      )}

      {/* Métodos de pago */}
      {tab==='metodos' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { id:'usdc',  label:'USDC on-chain',    desc:'Pago inmediato · sin comisiones adicionales', icon:'💎', tag:'Recomendado' },
              { id:'card',  label:'Tarjeta de crédito/débito', desc:'Visa · Mastercard · AMEX',           icon:'💳', tag:null          },
              { id:'bank',  label:'Transferencia bancaria', desc:'2–3 días hábiles',                      icon:'🏦', tag:null          },
            ].map(m => (
              <PCard key={m.id} onClick={() => setPayMethod(m.id)}
                style={{ padding:'18px 22px', cursor:'pointer', display:'flex', alignItems:'center', gap:16, border:`1.5px solid ${payMethod===m.id ? ACCENT : 'var(--border)'}`, background: payMethod===m.id ? `${ACCENT}08` : 'var(--surface)' }}>
                <div style={{ fontSize:28 }}>{m.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)' }}>{m.label}</span>
                    {m.tag && <span style={{ padding:'2px 8px', borderRadius:999, background:`${ACCENT}18`, color:ACCENT, fontSize:10.5, fontWeight:700 }}>{m.tag}</span>}
                  </div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>{m.desc}</div>
                </div>
                <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${payMethod===m.id ? ACCENT : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {payMethod===m.id && <div style={{ width:10, height:10, borderRadius:'50%', background:ACCENT }} />}
                </div>
              </PCard>
            ))}
          </div>
          <PBtn variant="accent" style={{ marginTop:20, padding:'13px 28px' }}>Guardar método</PBtn>
        </motion.div>
      )}

      {/* Reportes */}
      {tab==='reportes' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <AnimatePresence>
            {submitted && (
              <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                style={{ padding:'14px 18px', borderRadius:12, background:'rgba(110,231,114,0.12)', border:'1px solid rgba(110,231,114,0.3)', color:GREEN, fontFamily:'var(--font-b)', fontSize:13.5, marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                ✓ Reporte enviado. El equipo lo revisará en las próximas 24 horas.
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {issues.map(issue => (
              <PCard key={issue.id} style={{ padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontFamily:'var(--font-b)', fontSize:11, padding:'2px 8px', borderRadius:999, background:'var(--surface2)', color:'var(--sec)' }}>{issue.cat}</span>
                      <span style={{ fontFamily:'var(--font-b)', fontSize:11, color: issue.priority==='alta' ? RED : issue.priority==='media' ? '#F5A623' : GREEN }}>● {issue.priority}</span>
                    </div>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)' }}>{issue.title}</div>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
                <div style={{ display:'flex', gap:16, fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)' }}>
                  <span>📅 {issue.date}</span>
                  {issue.tech && <span>🔧 Técnico: {issue.tech}</span>}
                </div>
              </PCard>
            ))}
          </div>
        </motion.div>
      )}

      {/* Nuevo reporte */}
      {tab==='nuevo' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <ReportForm onSubmit={handleReport} />
        </motion.div>
      )}
    </div>
  );
}
