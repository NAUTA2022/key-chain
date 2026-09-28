import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PBtn, PTag, PSection, Icons } from '../components/ui';

const TABS = [
  ['general',    'General',      Icons.settings],
  ['financial',  'Financiero',   Icons.token    ],
  ['features',   'Features',     Icons.star     ],
  ['blockchain', 'Blockchain',   Icons.shield   ],
  ['banners',    'Banners',      Icons.doc      ],
  ['danger',     'Zona Peligro', Icons.lock     ],
];

const Row = ({ label, sub, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border-l)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
      {sub && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 2 }}>{sub}</div>}
    </div>
    {children}
  </div>
);

const Toggle = ({ on, onChange }) => (
  <div onClick={() => onChange?.(!on)} style={{ width: 44, height: 24, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
  </div>
);

const Field = ({ value, onChange, prefix }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 10, border: '1.5px solid var(--border)', padding: '8px 12px', minWidth: 160 }}>
    {prefix && <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{prefix}</span>}
    <input value={value} onChange={e => onChange?.(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', width: 80 }} />
  </div>
);

export default function Config() {
  const [tab, setTab] = useState('general');
  const [g, setG] = useState({ platformName: 'FACTORACT', supportEmail: 'soporte@factoract.io', maxUsers: '10000', maintenanceMode: false, registrationOpen: true, emailNotif: true });
  const [fin, setFin] = useState({ platformFee: '1.5', minInvestment: '38', maxInvestment: '500000', autoDistribution: true, distributionDay: '15', usdcOnly: true });
  const [feat, setFeat] = useState({ academy: true, swap: true, secondaryMarket: true, staking: false, governance: false, referrals: true, demoMode: true });
  const [bc, setBc] = useState({ network: 'Polygon Mainnet', chainId: '137', rpcUrl: 'https://polygon-rpc.com', explorerUrl: 'https://polygonscan.com', contractRegistry: '0x4a9f…d82c', autoAudit: true });
  const [banners, setBanners] = useState([
    { id: 1, title: 'Nueva propiedad tokenizada en Miami', active: true, url: '' },
    { id: 2, title: 'ICO FACT Token — Ronda Pública abierta', active: true, url: '' },
    { id: 3, title: 'Rendimientos Q2 2026 distribuidos', active: false, url: '' },
  ]);

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 960, margin: '0 auto' }}>
      <PSection title="Configuración" sub="Ajustes globales de la plataforma FACTORACT." />

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-l)', marginBottom: 28 }}>
        {TABS.map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: tab === id ? 700 : 450,
            color: tab === id ? 'var(--text)' : 'var(--ter)',
            borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1,
          }}>
            <span style={{ color: tab === id ? 'var(--accent-text)' : 'var(--ter)' }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Configuración general</div>
            <Row label="Nombre de plataforma" sub="Aparece en emails y UI pública">
              <Field value={g.platformName} onChange={v => setG(p => ({...p, platformName: v}))} />
            </Row>
            <Row label="Email de soporte" sub="Para tickets y notificaciones">
              <Field value={g.supportEmail} onChange={v => setG(p => ({...p, supportEmail: v}))} />
            </Row>
            <Row label="Máximo de usuarios" sub="Límite de registros activos">
              <Field value={g.maxUsers} onChange={v => setG(p => ({...p, maxUsers: v}))} />
            </Row>
            <Row label="Modo mantenimiento" sub="Bloquea acceso a todos los usuarios no-admin">
              <Toggle on={g.maintenanceMode} onChange={v => setG(p => ({...p, maintenanceMode: v}))} />
            </Row>
            <Row label="Registro abierto" sub="Permite nuevos registros en la plataforma">
              <Toggle on={g.registrationOpen} onChange={v => setG(p => ({...p, registrationOpen: v}))} />
            </Row>
            <Row label="Notificaciones por email" sub="Enviar emails transaccionales a usuarios">
              <Toggle on={g.emailNotif} onChange={v => setG(p => ({...p, emailNotif: v}))} />
            </Row>
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Financial */}
      {tab === 'financial' && (
        <motion.div key="fin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Parámetros financieros</div>
            <Row label="Fee de plataforma (%)" sub="Comisión sobre cada inversión">
              <Field value={fin.platformFee} onChange={v => setFin(p => ({...p, platformFee: v}))} prefix="%" />
            </Row>
            <Row label="Inversión mínima (USD)" sub="Mínimo por transacción">
              <Field value={fin.minInvestment} onChange={v => setFin(p => ({...p, minInvestment: v}))} prefix="$" />
            </Row>
            <Row label="Inversión máxima (USD)" sub="Máximo por transacción individual">
              <Field value={fin.maxInvestment} onChange={v => setFin(p => ({...p, maxInvestment: v}))} prefix="$" />
            </Row>
            <Row label="Distribución automática" sub="Ejecutar smart contract de distribución automáticamente">
              <Toggle on={fin.autoDistribution} onChange={v => setFin(p => ({...p, autoDistribution: v}))} />
            </Row>
            <Row label="Día de distribución" sub="Día del mes para distribución de rendimientos">
              <Field value={fin.distributionDay} onChange={v => setFin(p => ({...p, distributionDay: v}))} />
            </Row>
            <Row label="Solo USDC" sub="Forzar pagos únicamente en USDC">
              <Toggle on={fin.usdcOnly} onChange={v => setFin(p => ({...p, usdcOnly: v}))} />
            </Row>
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Features */}
      {tab === 'features' && (
        <motion.div key="feat" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Módulos de plataforma</div>
            {[
              ['academy',         'Academia',           'Módulo educativo con artículos y guías'],
              ['swap',            'Swap DeFi',          'Intercambio de tokens via QuickSwap/Uniswap'],
              ['secondaryMarket', 'Mercado Secundario', 'P2P trading entre inversores'],
              ['staking',         'Staking FACT',       'APY 9-14% en token FACT'],
              ['governance',      'Gobernanza DAO',     'Votaciones on-chain para holders de FACT'],
              ['referrals',       'Programa referidos',  'Comisiones por referidos activos'],
              ['demoMode',        'Modo demo',          'Acceso sin wallet para explorar la plataforma'],
            ].map(([key, label, sub]) => (
              <Row key={key} label={label} sub={sub}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {feat[key] ? <PTag label="Activo" color="green" /> : <PTag label="Inactivo" color="neutral" />}
                  <Toggle on={feat[key]} onChange={v => setFeat(p => ({...p, [key]: v}))} />
                </div>
              </Row>
            ))}
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Blockchain */}
      {tab === 'blockchain' && (
        <motion.div key="bc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Configuración blockchain</div>
            {[
              ['network',          'Red',               bc.network],
              ['chainId',          'Chain ID',          bc.chainId],
              ['rpcUrl',           'RPC URL',           bc.rpcUrl],
              ['explorerUrl',      'Explorer URL',      bc.explorerUrl],
              ['contractRegistry', 'Contract Registry', bc.contractRegistry],
            ].map(([key, label, val]) => (
              <Row key={key} label={label}>
                <Field value={val} onChange={v => setBc(p => ({...p, [key]: v}))} />
              </Row>
            ))}
            <Row label="Auditoría automática" sub="Verificar contratos con CertiK antes de emisión">
              <Toggle on={bc.autoAudit} onChange={v => setBc(p => ({...p, autoAudit: v}))} />
            </Row>
          </PCard>
          <PCard style={{ padding: '16px 22px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}>Estado de red:</strong> Polygon Mainnet — Bloque #62,481,234 — Gas: 31 Gwei — Latencia: 1.2s
            </div>
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Banners */}
      {tab === 'banners' && (
        <motion.div key="ban" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Banners activos</div>
              <PBtn variant="accent" small>+ Nuevo banner</PBtn>
            </div>
            {banners.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < banners.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{b.title}</div>
                </div>
                {b.active ? <PTag label="Activo" color="green" /> : <PTag label="Inactivo" color="neutral" />}
                <Toggle on={b.active} onChange={v => setBanners(prev => prev.map(x => x.id === b.id ? {...x, active: v} : x))} />
                <PBtn variant="ghost" small>Editar</PBtn>
              </div>
            ))}
          </PCard>
        </motion.div>
      )}

      {/* Danger */}
      {tab === 'danger' && (
        <motion.div key="danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16, border: '1px solid var(--neg)' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--neg)', marginBottom: 4 }}>Zona de peligro</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', marginBottom: 20 }}>Estas acciones son irreversibles y pueden afectar toda la plataforma.</div>
            {[
              ['Pausar todas las inversiones', 'Bloquea nuevas compras en todos los proyectos activos.'],
              ['Pausar distribuciones', 'Suspende pagos de rendimientos hasta nuevo aviso.'],
              ['Suspender mercado secundario', 'Deshabilita el trading P2P entre usuarios.'],
              ['Congelar plataforma', 'Modo emergencia: solo admins pueden acceder.'],
            ].map(([label, sub]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--border-l)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 2 }}>{sub}</div>
                </div>
                <PBtn variant="secondary" small style={{ borderColor: 'var(--neg)', color: 'var(--neg)', flexShrink: 0 }}>Ejecutar</PBtn>
              </div>
            ))}
          </PCard>
        </motion.div>
      )}
    </div>
  );
}
