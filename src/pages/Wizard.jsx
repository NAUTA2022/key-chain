import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag, PSection, PInput, Icons } from '../components/ui';

const STEPS = [
  { id: 0, label: 'Tipo de activo',   icon: Icons.primary  },
  { id: 1, label: 'Información',       icon: Icons.doc      },
  { id: 2, label: 'Tokenomics',        icon: Icons.token    },
  { id: 3, label: 'Documentos',        icon: Icons.shield   },
  { id: 4, label: 'Revisión',          icon: Icons.check    },
];

const ASSET_TYPES = [
  { id: 'auto',     label: 'Automóvil',         icon: '🚗', desc: 'Vehículos premium y de colección' },
  { id: 'campo',    label: 'Campo agrícola',     icon: '🌾', desc: 'Tierras productivas con rendimiento' },
  { id: 'drone',    label: 'Drones / Maquinaria',icon: '🚁', desc: 'Equipos con ingresos por servicio' },
  { id: 'inmueble', label: 'Inmueble',           icon: '🏢', desc: 'Oficinas, locales y residenciales' },
  { id: 'bodega',   label: 'Viñedo / Bodega',    icon: '🍷', desc: 'Producción vitivinícola y exportación' },
  { id: 'otro',     label: 'Otro activo',        icon: '📦', desc: 'Activo personalizado' },
];

export default function Wizard({ nav }) {
  const [step, setStep] = useState(0);
  const [assetType, setAssetType] = useState(null);
  const [info, setInfo] = useState({ name: '', location: '', totalValue: '', expectedYield: '', duration: '', description: '' });
  const [tok, setTok] = useState({ tokenSymbol: '', totalSupply: '', tokenPrice: '', minTokens: '1', currency: 'USDC' });
  const [docs, setDocs] = useState({ legal: false, insurance: false, valuation: false, audit: false });

  const next = () => setStep(s => Math.min(s + 1, 4));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 820, margin: '0 auto' }}>
      <button onClick={() => nav('admin')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13.5, marginBottom: 24, padding: 0 }}>
        {Icons.back} Volver al Admin
      </button>

      <PSection title="Tokenizar activo" sub="Creá un nuevo proyecto de inversión en 5 pasos." />

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36, gap: 0 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <motion.div
                animate={{ background: step === i ? 'var(--accent)' : step > i ? 'var(--pos)' : 'var(--surface2)', color: step >= i ? (step === i ? 'var(--accent-fg)' : '#fff') : 'var(--ter)' }}
                style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, transition: 'all 0.3s', border: `2px solid ${step === i ? 'var(--accent)' : step > i ? 'var(--pos)' : 'var(--border)'}` }}
              >
                {step > i ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : i + 1}
              </motion.div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: step === i ? 'var(--text)' : 'var(--ter)', fontWeight: step === i ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > i ? 'var(--pos)' : 'var(--border-l)', margin: '0 8px', marginBottom: 22, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Tipo */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>¿Qué tipo de activo querés tokenizar?</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', marginBottom: 24 }}>El tipo determina la estructura legal y los campos requeridos.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
              {ASSET_TYPES.map(a => (
                <motion.div key={a.id} whileHover={{ y: -3 }} onClick={() => setAssetType(a.id)}>
                  <PCard style={{ padding: '20px', cursor: 'pointer', border: `2px solid ${assetType === a.id ? 'var(--accent)' : 'var(--border)'}`, background: assetType === a.id ? 'var(--accent-bg)' : 'var(--surface)' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{a.icon}</div>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{a.label}</div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', lineHeight: 1.4 }}>{a.desc}</div>
                  </PCard>
                </motion.div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <PBtn variant="accent" onClick={next} disabled={!assetType}>Continuar →</PBtn>
            </div>
          </motion.div>
        )}

        {/* Step 1: Info */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PCard style={{ padding: '24px', marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>Información del activo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['name',          'Nombre del activo',    'Ej: Tesla Model S Plaid 2024'],
                  ['location',      'Ubicación',            'Ciudad, País'],
                  ['totalValue',    'Valor total (USD)',     '0.00'],
                  ['expectedYield', 'Rendimiento esperado (%)', '0.0'],
                  ['duration',      'Duración (meses)',      '24'],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 6 }}>{label}</div>
                    <PInput
                      value={info[key]}
                      onChange={e => setInfo(p => ({...p, [key]: e.target.value}))}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 6 }}>Descripción</div>
                <textarea
                  value={info.description}
                  onChange={e => setInfo(p => ({...p, description: e.target.value}))}
                  placeholder="Descripción detallada del activo, su potencial y características clave..."
                  rows={4}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </PCard>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <PBtn variant="secondary" onClick={back}>← Atrás</PBtn>
              <PBtn variant="accent" onClick={next}>Continuar →</PBtn>
            </div>
          </motion.div>
        )}

        {/* Step 2: Tokenomics */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PCard style={{ padding: '24px', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>Estructura de tokens</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['tokenSymbol', 'Símbolo del token', 'FACT-AUTO1'],
                  ['totalSupply', 'Oferta total (tokens)', '1000'],
                  ['tokenPrice',  'Precio por token (USD)', '0.00'],
                  ['minTokens',   'Mínimo de tokens por compra', '1'],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 6 }}>{label}</div>
                    <PInput value={tok[key]} onChange={e => setTok(p => ({...p, [key]: e.target.value}))} placeholder={placeholder} />
                  </div>
                ))}
                <div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 6 }}>Moneda de pago</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['USDC', 'MATIC', 'ETH'].map(c => (
                      <button key={c} onClick={() => setTok(p => ({...p, currency: c}))} style={{ padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${tok.currency === c ? 'var(--accent)' : 'var(--border)'}`, background: tok.currency === c ? 'var(--accent-bg)' : 'transparent', fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: tok.currency === c ? 'var(--accent-text)' : 'var(--sec)', cursor: 'pointer' }}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>
              {tok.totalSupply && tok.tokenPrice && (
                <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--accent-bg)', borderRadius: 12, display: 'flex', gap: 24 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)' }}>Capitalización total</div>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--accent-text)' }}>${(parseFloat(tok.totalSupply || 0) * parseFloat(tok.tokenPrice || 0)).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)' }}>Tokens ofrecidos</div>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--accent-text)' }}>{parseInt(tok.totalSupply || 0).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </PCard>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <PBtn variant="secondary" onClick={back}>← Atrás</PBtn>
              <PBtn variant="accent" onClick={next}>Continuar →</PBtn>
            </div>
          </motion.div>
        )}

        {/* Step 3: Documentos */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PCard style={{ padding: '24px', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Documentación requerida</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', marginBottom: 20 }}>Todos los documentos deben ser aprobados por el equipo legal antes de la emisión.</div>
              {[
                ['legal',    'Documentación legal',       'Escritura, título de propiedad o contrato de titularidad'],
                ['insurance','Póliza de seguro',          'Seguro del activo vigente y con cobertura adecuada'],
                ['valuation','Tasación independiente',    'Valuación por perito matriculado en los últimos 6 meses'],
                ['audit',    'Auditoría de contrato',     'Reporte de auditoría CertiK del smart contract del token'],
              ].map(([key, label, sub]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--border-l)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: docs[key] ? 'var(--accent-bg)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: docs[key] ? 'var(--accent-text)' : 'var(--ter)', flexShrink: 0 }}>
                    {docs[key]
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : Icons.doc}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{sub}</div>
                  </div>
                  {docs[key]
                    ? <PTag label="Subido" color="green" />
                    : <PBtn variant="secondary" small onClick={() => setDocs(p => ({...p, [key]: true}))}>Subir</PBtn>}
                </div>
              ))}
            </PCard>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <PBtn variant="secondary" onClick={back}>← Atrás</PBtn>
              <PBtn variant="accent" onClick={next}>Continuar →</PBtn>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <PCard style={{ padding: '24px', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>Revisión final</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[
                  ['Tipo de activo',       ASSET_TYPES.find(a => a.id === assetType)?.label || '—'],
                  ['Nombre',               info.name || '—'],
                  ['Ubicación',            info.location || '—'],
                  ['Valor total',          info.totalValue ? `$${parseFloat(info.totalValue).toLocaleString()}` : '—'],
                  ['Rendimiento esperado', info.expectedYield ? `${info.expectedYield}% anual` : '—'],
                  ['Duración',             info.duration ? `${info.duration} meses` : '—'],
                  ['Token símbolo',        tok.tokenSymbol || '—'],
                  ['Oferta total',         tok.totalSupply ? `${parseInt(tok.totalSupply).toLocaleString()} tokens` : '—'],
                  ['Precio por token',     tok.tokenPrice ? `$${parseFloat(tok.tokenPrice).toFixed(2)}` : '—'],
                  ['Moneda',               tok.currency],
                ].map(([k, v], i) => (
                  <div key={k} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-l)' }}>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(docs).map(([k, v]) => (
                  v ? <PTag key={k} label={k === 'legal' ? 'Legal ✓' : k === 'insurance' ? 'Seguro ✓' : k === 'valuation' ? 'Tasación ✓' : 'Auditoría ✓'} color="green" /> : null
                ))}
              </div>
            </PCard>

            <PCard style={{ padding: '20px 24px', marginBottom: 24, background: 'var(--accent-bg)', border: '1.5px solid var(--accent)' }}>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6 }}>
                Al emitir, se desplegará un contrato ERC-20 en Polygon Mainnet. El activo quedará en estado <strong style={{ color: 'var(--text)' }}>Pendiente de revisión</strong> hasta que el equipo legal apruebe toda la documentación.
              </div>
            </PCard>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <PBtn variant="secondary" onClick={back}>← Atrás</PBtn>
              <PBtn variant="accent" onClick={() => nav('admin')} style={{ padding: '12px 28px' }}>Emitir token 🚀</PBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
