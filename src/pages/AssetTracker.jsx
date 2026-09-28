import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag } from '../components/ui';

const ACCENT = '#6C63FF';
const GREEN  = '#6ee772';

const CAR_FLEET = [
  { id:'c1', name:'Tesla #01', plate:'ABC-123', driver:'Martín R.', status:'en_ruta', speed:48, battery:82, location:'Palermo → Recoleta', lat:0.28, lng:0.42, color:'#2196F3' },
  { id:'c2', name:'Tesla #02', plate:'DEF-456', driver:'Sofía G.',  status:'en_ruta', speed:62, battery:71, location:'San Telmo → Puerto Madero', lat:0.55, lng:0.35, color:'#4CAF50' },
  { id:'c3', name:'Tesla #03', plate:'GHI-789', driver:'Carlos M.', status:'disponible', speed:0, battery:95, location:'Base Palermo', lat:0.40, lng:0.60, color:'#FF9800' },
  { id:'c4', name:'Porsche #01', plate:'JKL-012', driver:'Ana P.',  status:'en_ruta', speed:55, battery:65, location:'Recoleta → Microcentro', lat:0.22, lng:0.70, color:'#9C27B0' },
  { id:'c5', name:'Mercedes #01', plate:'MNO-345', driver:'Luis S.',status:'mantenimiento', speed:0, battery:30, location:'Taller Norte', lat:0.70, lng:0.25, color:'#F44336' },
];

const DRONE_FLEET = [
  { id:'d1', name:'DJI Agras #01', field:'Campo Pergamino A', status:'operando', battery:88, coverage:34, speed:18, lat:0.30, lng:0.35, color:'#6C63FF' },
  { id:'d2', name:'DJI Agras #02', field:'Campo Pergamino B', status:'operando', battery:72, coverage:51, speed:22, lat:0.50, lng:0.55, color:'#4ECDC4' },
  { id:'d3', name:'DJI Agras #03', field:'Campo Córdoba',     status:'en_base',  battery:100, coverage:0, speed:0, lat:0.65, lng:0.40, color:'#F5A623' },
  { id:'d4', name:'DJI Agras #04', field:'Campo Córdoba',     status:'operando', battery:54, coverage:67, speed:20, lat:0.75, lng:0.65, color:'#6ee772' },
  { id:'d5', name:'DJI Agras #05', field:'Campo Pergamino C', status:'sin_señal', battery:45, coverage:29, speed:0, lat:0.20, lng:0.75, color:'#ff5c5c' },
];

const STATUS_CFG = {
  en_ruta:       { label:'En ruta',        color:GREEN,   dot:GREEN    },
  disponible:    { label:'Disponible',     color:'#4ECDC4', dot:'#4ECDC4' },
  mantenimiento: { label:'Mantenimiento',  color:'#F5A623', dot:'#F5A623' },
  operando:      { label:'Operando',       color:GREEN,   dot:GREEN    },
  en_base:       { label:'En base',        color:'#4ECDC4', dot:'#4ECDC4' },
  sin_señal:     { label:'Sin señal',      color:'#ff5c5c', dot:'#ff5c5c' },
};

// ── Animated GPS map ──────────────────────────────────────────────────────────
function GPSMap({ assets, activeId, onSelect, type }) {
  const [positions, setPositions] = useState(() =>
    Object.fromEntries(assets.map(a => [a.id, { x: a.lng, y: a.lat }]))
  );

  useEffect(() => {
    const iv = setInterval(() => {
      setPositions(prev => {
        const next = { ...prev };
        assets.forEach(a => {
          if (a.speed > 0) {
            next[a.id] = {
              x: Math.max(0.05, Math.min(0.95, prev[a.id].x + (Math.random()-0.5)*0.02)),
              y: Math.max(0.05, Math.min(0.95, prev[a.id].y + (Math.random()-0.5)*0.02)),
            };
          }
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(iv);
  }, [assets]);

  const W = 500, H = 340;

  return (
    <div style={{ borderRadius:18, overflow:'hidden', background:'#0d1b2a', border:'1px solid rgba(255,255,255,0.08)', position:'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }}>
        {/* Background grid */}
        {[...Array(10)].map((_,i) => (
          <g key={i}>
            <line x1={i*55} y1={0} x2={i*55} y2={H} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            <line x1={0} y1={i*37} x2={W} y2={i*37} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          </g>
        ))}

        {/* Field/road shapes for drones */}
        {type === 'drones' && (
          <>
            <rect x={60} y={60} width={160} height={120} rx={8} fill="rgba(110,231,114,0.04)" stroke="rgba(110,231,114,0.12)" strokeWidth={1} strokeDasharray="6 4" />
            <text x={70} y={78} fill="rgba(110,231,114,0.4)" fontSize={9} fontFamily="monospace">Campo Pergamino</text>
            <rect x={260} y={140} width={140} height={110} rx={8} fill="rgba(108,99,255,0.04)" stroke="rgba(108,99,255,0.12)" strokeWidth={1} strokeDasharray="6 4" />
            <text x={270} y={158} fill="rgba(108,99,255,0.4)" fontSize={9} fontFamily="monospace">Campo Córdoba</text>
          </>
        )}

        {/* Roads for cars */}
        {type === 'autos' && (
          <>
            <path d="M 0 170 L 500 170" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
            <path d="M 0 240 L 500 240" stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
            <path d="M 180 0 L 180 340" stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
            <path d="M 350 0 L 350 340" stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
          </>
        )}

        {/* Asset dots */}
        {assets.map(a => {
          const pos = positions[a.id];
          const cx = pos.x * W, cy = pos.y * H;
          const isActive = a.id === activeId;
          const cfg = STATUS_CFG[a.status] || {};

          return (
            <motion.g key={a.id} animate={{ x: cx - a.lng*W, y: cy - a.lat*H }} transition={{ duration:1.3, ease:'easeInOut' }}
              onClick={() => onSelect(a.id)} style={{ cursor:'pointer' }}>
              {isActive && <circle cx={a.lng*W} cy={a.lat*H} r={20} fill={a.color} opacity={0.12} />}
              <circle cx={a.lng*W} cy={a.lat*H} r={isActive ? 8 : 6} fill={a.color} opacity={a.status==='sin_señal' ? 0.3 : 1} />
              {a.speed > 0 && (
                <circle cx={a.lng*W} cy={a.lat*H} r={12} fill="none" stroke={a.color} strokeWidth={1.5} opacity={0.35}>
                  <animate attributeName="r" from="8" to="22" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {isActive && (
                <text x={a.lng*W + 12} y={a.lat*H - 8} fill="#fff" fontSize={9} fontFamily="monospace" opacity={0.9}>{a.name}</text>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ position:'absolute', bottom:10, left:12, display:'flex', gap:12 }}>
        {Object.entries(STATUS_CFG).slice(0, type==='autos' ? 3 : 3).map(([k,v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:v.dot }} />
            <span style={{ fontFamily:'monospace', fontSize:9.5, color:'rgba(255,255,255,0.5)' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatteryBar({ value }) {
  const color = value > 60 ? GREEN : value > 30 ? '#F5A623' : '#ff5c5c';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:5, borderRadius:999, background:'var(--surface2)', overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', background:color, borderRadius:999 }} />
      </div>
      <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color, minWidth:28, textAlign:'right' }}>{value}%</span>
    </div>
  );
}

export default function AssetTracker({ nav }) {
  const [type, setType]     = useState('autos');
  const [activeId, setActiveId] = useState(null);

  const assets = type === 'autos' ? CAR_FLEET : DRONE_FLEET;
  const active = assets.find(a => a.id === activeId);

  const stats = type === 'autos'
    ? [['En ruta', assets.filter(a=>a.status==='en_ruta').length], ['Disponibles', assets.filter(a=>a.status==='disponible').length], ['Mantenimiento', assets.filter(a=>a.status==='mantenimiento').length]]
    : [['Operando', assets.filter(a=>a.status==='operando').length], ['En base', assets.filter(a=>a.status==='en_base').length], ['Sin señal', assets.filter(a=>a.status==='sin_señal').length]];

  return (
    <div style={{ padding:'28px 32px 40px', maxWidth:1200, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <span style={{ fontSize:28 }}>📡</span>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:30, color:'var(--text)', letterSpacing:'-0.03em' }}>Tracker GPS</div>
            <span style={{ fontSize:11, padding:'3px 8px', borderRadius:999, background:`${ACCENT}20`, color:ACCENT, fontWeight:700 }}>tiempo real</span>
          </div>
          <div style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)' }}>Seguimiento en tiempo real de activos tokenizados · autos y drones.</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[['autos','🚗 Autos'],['drones','🚁 Drones']].map(([id,label]) => (
            <button key={id} onClick={() => { setType(id); setActiveId(null); }}
              style={{ padding:'10px 18px', borderRadius:12, border:`1.5px solid ${type===id ? ACCENT : 'var(--border)'}`, background: type===id ? `${ACCENT}18` : 'transparent', color: type===id ? ACCENT : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:13.5, fontWeight: type===id ? 700 : 400 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:22 }}>
        {stats.map(([k,v]) => (
          <PCard key={k} style={{ padding:'14px 18px' }}>
            <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:28, color:'var(--text)' }}>{v}</div>
          </PCard>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
        {/* Map */}
        <div>
          <GPSMap assets={assets} activeId={activeId} onSelect={id => setActiveId(id===activeId ? null : id)} type={type} />
          <div style={{ marginTop:8, fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', textAlign:'center' }}>
            Haz clic en un punto para ver detalles del activo
          </div>
        </div>

        {/* Asset list */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {assets.map(a => {
            const cfg = STATUS_CFG[a.status] || {};
            const isActive = a.id === activeId;
            return (
              <PCard key={a.id} onClick={() => setActiveId(a.id===activeId ? null : a.id)}
                style={{ padding:'14px 18px', cursor:'pointer', border:`1.5px solid ${isActive ? ACCENT : 'var(--border)'}`, background: isActive ? `${ACCENT}06` : 'var(--surface)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:2 }}>{a.name}</div>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)' }}>
                      {type==='autos' ? `${a.plate} · ${a.driver}` : a.field}
                    </div>
                  </div>
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:cfg.color }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, display:'inline-block' }} />
                    {cfg.label}
                  </span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  {type === 'autos' ? (
                    <>
                      <div><div style={{ fontSize:10, color:'var(--ter)', marginBottom:2 }}>VELOCIDAD</div><div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)' }}>{a.speed} km/h</div></div>
                      <div><div style={{ fontSize:10, color:'var(--ter)', marginBottom:2 }}>UBICACIÓN</div><div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--sec)' }}>{a.location}</div></div>
                    </>
                  ) : (
                    <>
                      <div><div style={{ fontSize:10, color:'var(--ter)', marginBottom:2 }}>VELOCIDAD</div><div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)' }}>{a.speed} km/h</div></div>
                      <div><div style={{ fontSize:10, color:'var(--ter)', marginBottom:2 }}>COBERTURA</div><div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)' }}>{a.coverage} ha</div></div>
                    </>
                  )}
                </div>

                <div>
                  <div style={{ fontSize:10, color:'var(--ter)', marginBottom:4 }}>BATERÍA</div>
                  <BatteryBar value={a.battery} />
                </div>
              </PCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
