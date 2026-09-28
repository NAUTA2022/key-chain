import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PBtn, PSection, PTag, PAvatar, PArea, PDiv, Icons } from '../components/ui';
import { RWA_ASSETS, fmtUSD2 } from '../data';

const USERS = [
  { name: 'Ana Pereyra',    email: 'ana@gmail.com',      kyc: 'Aprobado',  role: 'Inversor', invested: '$24,500', joined: '12 Feb 2026' },
  { name: 'Lucas Giménez',  email: 'lucas@yahoo.com',    kyc: 'Pendiente', role: 'Inversor', invested: '$8,200',  joined: '03 Mar 2026' },
  { name: 'Sofía Brandán',  email: 'sofia@outlook.com',  kyc: 'Aprobado',  role: 'Inversor', invested: '$62,000', joined: '19 Ene 2026' },
  { name: 'Diego Funes',    email: 'diego@gmail.com',    kyc: 'Rechazado', role: 'Inversor', invested: '$0',      joined: '28 May 2026' },
  { name: 'Martín Quiroga', email: 'martin@gmail.com',   kyc: 'Aprobado',  role: 'Admin',    invested: '—',      joined: '01 Ene 2026' },
];

const TABS = ['Proyectos', 'Usuarios', 'KYC', 'Academia', 'Revenue'];

export default function Admin({ nav }) {
  const [tab, setTab] = useState('Proyectos');
  const [editId, setEditId] = useState(null);

  const kpis = [
    ['TVL',            '$28.4M', '+12.4% este mes'],
    ['Inversores',     '12,840', '+342 esta semana'],
    ['KYC pendientes', '14',     '3 rechazados'],
    ['Fee revenue',    '$142K',  'Mayo 2026'],
  ];

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <PSection
        title="Panel Admin"
        sub="Control total de la plataforma FACTORACT."
        action={<PBtn variant="accent" onClick={() => nav('config')}>{Icons.settings} Configuración</PBtn>}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {kpis.map(([k, v, s], i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <PCard style={{ padding: '18px 22px' }}>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k}</div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, color: 'var(--text)', letterSpacing: '-0.03em' }}>{v}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)', marginTop: 4 }}>{s}</div>
            </PCard>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart */}
      <PCard style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 14 }}>Revenue mensual de fees</div>
        <PArea data={[68000,72000,75000,80000,78000,85000,88000,92000,96000,105000,118000,142000]} height={120} id="adminRev" />
      </PCard>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-l)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: tab === t ? 700 : 450,
            color: tab === t ? 'var(--text)' : 'var(--ter)',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* Projects */}
      {tab === 'Proyectos' && (
        <motion.div key="proj" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <PBtn variant="accent" onClick={() => nav('wizard')}>+ Tokenizar activo</PBtn>
          </div>
          <PCard>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-l)' }}>
                  {['Proyecto','Categoría','Token','Vendido','APY','Recaudado','Estado',''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RWA_ASSETS.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: i < RWA_ASSETS.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={a.img} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                        <span style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{a.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><PTag label={a.cat} color="neutral" /></td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)' }}>${a.tokenPrice}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{a.sold}%</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--accent-text)', fontWeight: 600 }}>{a.apy}%</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)' }}>{fmtUSD2(a.tokenPrice * a.totalTokens * a.sold / 100)}</td>
                    <td style={{ padding: '12px 16px' }}><PTag label={a.stage} color={a.stage === 'Operativo' ? 'green' : 'neutral'} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <PBtn small variant="ghost" onClick={() => setEditId(editId === a.id ? null : a.id)}>Editar</PBtn>
                        <PBtn small variant="secondary">Pausar</PBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PCard>
        </motion.div>
      )}

      {/* Users */}
      {tab === 'Usuarios' && (
        <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <PBtn variant="accent">+ Crear usuario</PBtn>
          </div>
          <PCard>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-l)' }}>
                  {['Usuario','Email','KYC','Rol','Invertido','Desde',''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USERS.map((u, i) => (
                  <tr key={i} style={{ borderBottom: i < USERS.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <PAvatar name={u.name} size={32} />
                        <span style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}><PTag label={u.kyc} color={u.kyc === 'Aprobado' ? 'green' : u.kyc === 'Rechazado' ? 'red' : 'neutral'} /></td>
                    <td style={{ padding: '12px 16px' }}><PTag label={u.role} color={u.role === 'Admin' ? 'purple' : 'neutral'} /></td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{u.invested}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{u.joined}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <PBtn small variant="ghost">Editar</PBtn>
                        <PBtn small variant="secondary">Rol</PBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PCard>
        </motion.div>
      )}

      {/* KYC queue */}
      {tab === 'KYC' && (
        <motion.div key="kyc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '16px' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14, padding: '0 8px' }}>Cola de verificación KYC (Sumsub)</div>
            {USERS.filter(u => u.kyc !== 'Aprobado').concat(USERS.filter(u => u.kyc === 'Aprobado').slice(0, 2)).map((u, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 8px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <PAvatar name={u.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{u.name}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{u.email} · desde {u.joined}</div>
                </div>
                <PTag label={u.kyc} color={u.kyc === 'Aprobado' ? 'green' : u.kyc === 'Rechazado' ? 'red' : 'neutral'} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {u.kyc !== 'Aprobado' && <PBtn small variant="accent">Aprobar</PBtn>}
                  {u.kyc === 'Pendiente' && <PBtn small variant="ghost">Pedir docs</PBtn>}
                  {u.kyc !== 'Rechazado' && <PBtn small variant="secondary">Rechazar</PBtn>}
                  {u.kyc === 'Rechazado' && <PBtn small variant="ghost">Revisar</PBtn>}
                </div>
              </div>
            ))}
          </PCard>
        </motion.div>
      )}

      {/* Academia management */}
      {tab === 'Academia' && (
        <motion.div key="academia" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <PBtn variant="accent">+ Nuevo artículo</PBtn>
          </div>
          <PCard style={{ padding: '16px' }}>
            {[
              { title: '¿Qué es la tokenización de activos reales?', cat: 'Tokenización', status: 'Publicado', views: '2,340' },
              { title: 'Cómo invertir en tu primer proyecto',         cat: 'Guías',        status: 'Publicado', views: '1,890' },
              { title: 'Campos agrícolas: el RWA más demandado',      cat: 'RWA',          status: 'Borrador',  views: '—'     },
              { title: 'Vesting y cliffs: entendé tu token',          cat: 'DeFi',         status: 'Publicado', views: '1,120' },
            ].map((a, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 8px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <PTag label={a.cat} color="neutral" />
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{a.views} vistas</span>
                  </div>
                </div>
                <PTag label={a.status} color={a.status === 'Publicado' ? 'green' : 'neutral'} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <PBtn small variant="ghost">Editar</PBtn>
                  {a.status === 'Borrador' && <PBtn small variant="accent">Publicar</PBtn>}
                </div>
              </div>
            ))}
          </PCard>
        </motion.div>
      )}

      {/* Revenue */}
      {tab === 'Revenue' && (
        <motion.div key="rev" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PCard style={{ padding: '20px 22px' }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Breakdown de fees</div>
              {[['Mercado primario (0.5%)', '$84,200', '59%'],['Mercado secundario (1%)', '$38,400', '27%'],['Swap (0.3%)', '$19,400', '14%']].map(([k,v,pct]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-l)' }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{k}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{v}</div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)' }}>{pct}</div>
                  </div>
                </div>
              ))}
            </PCard>
            <PCard style={{ padding: '20px 22px' }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Revenue últimos 6 meses</div>
              <PArea data={[85000,88000,92000,96000,105000,142000]} height={120} id="revChart" />
            </PCard>
          </div>
        </motion.div>
      )}
    </div>
  );
}
