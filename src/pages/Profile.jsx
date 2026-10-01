import { useState } from 'react';
import { useMobile } from '../hooks/useMobile';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag, Icons } from '../components/ui';
import { IdentitySwitch } from '../components/IdentityAvatar';
import IdentityAvatar from '../components/IdentityAvatar';
import { AuroraCover } from '../components/ProfileHero';
import CompanyProfile from './CompanyProfile';
import { ME, MY_COMPANY } from '../lib/me';
import { holdingsOf, portfolioStats, personSocial } from '../lib/people';
import { useFollowing, useFollowingPeople, fmtCount } from '../lib/projectFeed';
import FollowListModal, { FollowButton } from '../components/FollowList';
import { fmtUSD } from '../data';
import AssetCard from '../components/AssetCard';

const TABS = [
  ['kyc',  'KYC / Identidad'],
  ['docs', 'Documentos'     ],
  ['2fa',  'Seguridad'      ],
  ['tax',  'Impuestos'      ],
  ['priv', 'Privacidad'     ],
];

const ACTIVITY = [
  { label: 'Yield cobrado — Edificio Palermo',  amount: '+$780',  time: 'Hoy, 09:32',       type: 'pos'    },
  { label: 'Inversión — La Rural Lotes SRL',    amount: '-$5,000',time: 'Hace 3 días',       type: 'invest' },
  { label: 'KYC verificado por Sumsub',         amount: null,     time: 'Hace 1 semana',     type: 'kyc'    },
  { label: 'Yield cobrado — AutoFleet AR',      amount: '+$620',  time: 'Hace 2 semanas',    type: 'pos'    },
  { label: 'Inversión — AutoFleet AR',          amount: '-$3,000',time: 'Hace 3 semanas',    type: 'invest' },
];

const ACHIEVEMENTS = [
  { label: 'Primera inversión', icon: '🏆', done: true  },
  { label: 'KYC completo',      icon: '🛡️', done: true  },
  { label: '6 meses activo',    icon: '⭐', done: true  },
  { label: '$50K invertido',    icon: '💎', done: false },
];

const KYC_CHECKS = [
  'Verificación de identidad (DNI)',
  'Verificación facial (liveness)',
  'Prueba de domicilio',
  'Verificación PEP / Sanciones',
  'Verificación de fondos',
];

const STAT_COLS = [
  ['$40,120',  'Portafolio RWA'   ],
  ['+15.6%',   'Rendimiento total'],
  ['$4,599',   'Yield cobrado'    ],
  ['4',        'Inversiones'      ],
];

const activityColor = { pos: '#22c55e', invest: '#8247E5', kyc: '#3b82f6' };
const activityDot   = { pos: '↑', invest: '⬡', kyc: '✓' };

const ACCOUNT_NOTE = 'Solo vos ves esta sección.';

// `person` / `company` / `onCompany`: show this same page for another user
// instead of me — a company's owner (the switch goes back to their company
// through `onCompany`) or a common investor without a company. Other people
// only show public data: investments, level and achievements. Same layout as
// the company profile: cover card with the photo, counts, then tabs.
export default function Profile({ nav, person, company: personCompany, onCompany, onBack }) {
  const isMobile = useMobile();
  // Personal / Empresa: users who run a company can flip between their own
  // profile and their company's (same page, no navigation).
  const [identity, setIdentity] = useState('personal');
  const [section, setSection] = useState('resumen');
  const isMe = !person;
  const user = person || ME;
  const company = isMe ? MY_COMPANY : personCompany;
  const toCompany = () => { if (!company) return; if (isMe) setIdentity('company'); else onCompany?.(); };
  const holdings = holdingsOf(isMe ? ME : person);
  const [myCompanies] = useFollowing();
  const [myPeople] = useFollowingPeople();
  const [listTab, setListTab] = useState(null);
  const social = personSocial(user.name, { iFollow: myPeople.includes(user.name), myPeople, myCompanies });
  const pf = portfolioStats(holdings);
  const level = isMe ? 4 : pf.invested >= 50000 ? 5 : pf.invested >= 25000 ? 4 : pf.invested >= 10000 ? 3 : pf.invested >= 3000 ? 2 : 1;
  const kpis = isMe ? STAT_COLS.map(([v, l]) => [l === 'Inversiones' ? String(holdings.length) : v, l]) : [
    [fmtUSD(pf.current), 'Portafolio RWA'],
    [`${pf.ret >= 0 ? '+' : ''}${pf.ret.toFixed(1)}%`, 'Rendimiento total'],
    [fmtUSD(pf.yieldEarned), 'Yield cobrado'],
    [String(pf.count), 'Inversiones'],
  ];
  const achievements = isMe ? ACHIEVEMENTS : ACHIEVEMENTS.map((a, i) => (i === 3 ? { ...a, done: pf.invested >= 50000 } : a));
  const levelHint = isMe ? '$9,880 para Nivel 5' : level >= 5 ? 'Nivel máximo' : `Nivel ${level} de 5`;
  const levelStats = isMe
    ? [['$40,120', 'invertido total'], ['16 meses', 'antigüedad'], ['4.8★', 'reputación']]
    : [[fmtUSD(pf.invested), 'invertido total'], [holdings[0]?.since ? `desde ${holdings[0].since}` : '—', 'antigüedad'], [`${(user.rep ?? 4.8).toFixed(1)}★`, 'reputación']];
  const [tab,   setTab]   = useState('kyc');
  const [twofa, setTwofa] = useState({ totp: true, passkey: false, sms: false });
  const [priv,  setPriv]  = useState([true, false, true, true]);

  if (identity === 'company' && MY_COMPANY) {
    return <CompanyProfile nav={nav} name={MY_COMPANY} embedded onPersonal={() => setIdentity('personal')} />;
  }

  const avatar = isMobile ? 84 : 112;
  const sections = [
    ['resumen', 'Resumen'],
    ['inversiones', `Inversiones (${holdings.length})`],
    ['logros', 'Nivel y logros'],
    ...(isMe ? [['actividad', 'Actividad'], ['cuenta', 'Cuenta y seguridad']] : []),
  ];
  const levelCard = <LevelCard lv={level} hint={levelHint} stats={levelStats} />;
  const achCard = <AchievementsCard achievements={achievements} />;
  const counts = [
    [String(holdings.length), 'Inversiones', () => setSection('inversiones')],
    [fmtCount(social.followersCount), 'Seguidores', () => setListTab('followers')],
    [fmtCount(social.followingCount), 'Seguidos', () => setListTab('following')],
  ];

  return (
    <div className="g-page" style={{ padding: isMobile ? '16px 16px 40px' : '24px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, minHeight: onBack || company ? 28 : 0 }}>
        {onBack ? (
          <button onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13 }}>
            {Icons.back} Volver
          </button>
        ) : <span />}
        {company && <IdentitySwitch value="personal" company={company} personalLabel={isMe ? 'Personal' : user.name} onChange={toCompany} />}
      </div>

      {/* Header — same card as the company profile, round photo instead of
          the hexagon (the company's hexagon is its badge) */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'relative', height: isMobile ? 150 : 230 }}>
          <AuroraCover />
          <div style={{ position: 'absolute', left: isMobile ? 16 : 28, bottom: -avatar / 2 }}>
            <IdentityAvatar mode="personal" company={company} size={avatar} user={user} onSwap={toCompany} />
          </div>
        </div>

        <div style={{ padding: isMobile ? '12px 16px 18px' : '14px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: avatar / 2 - 6 }}>
            {isMe
              ? <PBtn variant="secondary" small>Editar perfil</PBtn>
              : <FollowButton kind="person" name={user.name} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 22 : 26, color: 'var(--text)', letterSpacing: '-0.02em' }}>{user.name}</span>
            <PTag label="KYC ✓" color="green" />
            <PTag label={`Nivel ${level}`} color="purple" />
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--ter)', marginBottom: 12 }}>
            {isMe ? '@maxrodriguez · 0x4a9fE2b8…d82c · Miembro desde Mar 2025' : `@${user.handle}`}
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.55, maxWidth: 680, marginBottom: 16 }}>
            {isMe ? 'Inversor en activos reales tokenizados.' : company ? `Fundador y CEO de ${company}.` : user.bio}
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontFamily: 'var(--font-b)', fontSize: 14 }}>
            {counts.map(([v, l, onClick]) => (
              <button key={l} onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                <b style={{ color: 'var(--text)' }}>{v}</b> <span style={{ color: 'var(--ter)' }}>{l}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {listTab && (
        <FollowListModal title={user.name} initialTab={listTab} nav={nav} onClose={() => setListTab(null)}
          tabs={[
            { id: 'followers', label: `Seguidores (${social.followersCount})`, items: social.followers.map(name => ({ kind: 'person', name })), more: social.followersCount - social.followers.length },
            { id: 'following', label: `Seguidos (${social.followingCount})`, items: [
              ...social.followingCompanies.map(name => ({ kind: 'company', name })),
              ...social.followingPeople.map(name => ({ kind: 'person', name })),
            ] },
          ]} />
      )}

      {/* Tabs */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-l)', marginBottom: 18, overflowX: 'auto' }}>
        {sections.map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5,
              fontWeight: section === id ? 700 : 500, color: section === id ? 'var(--text)' : 'var(--ter)',
              borderBottom: `2px solid ${section === id ? 'var(--text)' : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {label}
          </button>
        ))}
      </div>

      {section === 'resumen' && (
        <>
          <KpiRow kpis={kpis} isMobile={isMobile} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 340px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
              <InvestmentsGrid holdings={holdings} stats={pf} isMe={isMe} nav={nav} limit={3} onMore={() => setSection('inversiones')} />
              {levelCard}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
              {achCard}
              {isMe && <QuickLinks nav={nav} />}
            </div>
          </div>
        </>
      )}

      {section === 'inversiones' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }}>
          <InvestmentsGrid holdings={holdings} stats={pf} isMe={isMe} nav={nav} />
          <CategoryBreakdown holdings={holdings} />
        </div>
      )}

      {section === 'logros' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
          {levelCard}
          {achCard}
        </div>
      )}

      {section === 'actividad' && isMe && <ActivityCard />}

      {section === 'cuenta' && isMe && (
        <>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 12 }}>{ACCOUNT_NOTE}</div>
          <AccountTabs tab={tab} setTab={setTab} twofa={twofa} setTwofa={setTwofa} priv={priv} setPriv={setPriv} />
        </>
      )}
    </div>
  );
}

function KpiRow({ kpis, isMobile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 14, marginBottom: 20 }}>
      {kpis.map(([val, lbl], i) => (
        <motion.div key={lbl} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
          <PCard style={{ padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{lbl}</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.03em' }}>{val}</div>
          </PCard>
        </motion.div>
      ))}
    </div>
  );
}

// Where the portfolio is, by category (share of current value).
function CategoryBreakdown({ holdings }) {
  const total = holdings.reduce((s, h) => s + h.current, 0) || 1;
  const byCat = Object.entries(holdings.reduce((m, h) => ({ ...m, [h.asset.cat]: (m[h.asset.cat] || 0) + h.current }), {}))
    .sort((a, b) => b[1] - a[1]);
  return (
    <PCard style={{ padding: '22px 24px' }}>
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Distribución por rubro</div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 16 }}>Porcentaje del valor actual</div>
      {byCat.map(([cat, v]) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-b)', fontSize: 13 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{cat}</span>
            <span style={{ color: 'var(--sec)' }}>{fmtUSD(v)} · <b style={{ color: 'var(--text)' }}>{((v / total) * 100).toFixed(0)}%</b></span>
          </div>
          <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 99, marginTop: 6 }}>
            <div style={{ width: `${(v / total) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </PCard>
  );
}


function ActivityCard() {
  return (
        <PCard className="dual-glow" style={{ padding: '22px 24px' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>Actividad reciente</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ACTIVITY.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 0',
                  borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--border-l)' : 'none',
                }}
              >
                {/* Dot */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: activityColor[a.type] + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: activityColor[a.type],
                }}>{activityDot[a.type]}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{a.label}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{a.time}</div>
                </div>
                {a.amount && (
                  <div style={{
                    fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14,
                    color: a.type === 'pos' ? 'var(--pos)' : 'var(--text)',
                  }}>{a.amount}</div>
                )}
              </motion.div>
            ))}
          </div>
        </PCard>
  );
}

function LevelCard({ lv, hint, stats }) {
  return (
        <div className="anim-border-slow" style={{ borderRadius: 18, padding: '1.5px' }}>
        <PCard style={{ padding: '22px 24px', border: 'none', borderRadius: 17 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Nivel de inversor</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>{hint}</div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8247E5, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 18, color: '#fff',
            }}>{lv}</div>
          </div>
          {/* Track */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 10 }}>
            {[1,2,3,4,5].map(n => { return (
              <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: n === 5 ? 'flex-end' : n === 1 ? 'flex-start' : 'center', gap: 6 }}>
                <div style={{
                  height: 6, width: '100%',
                  background: n <= lv ? 'linear-gradient(90deg, #8247E5, #3b82f6)' : 'var(--surface2)',
                  borderRadius: n === 1 ? '99px 0 0 99px' : n === 5 ? '0 99px 99px 0' : 0,
                }} />
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: n <= lv ? 'var(--accent-text)' : 'var(--ter)', fontWeight: n === lv ? 700 : 400 }}>N{n}</div>
              </div>
            ); })}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
            {stats.map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{v}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </PCard>
        </div>
  );
}

function AchievementsCard({ achievements }) {
  return (
        <div className="anim-border" style={{ borderRadius: 18, padding: '1.5px' }}>
        <PCard style={{ padding: '22px 22px', border: 'none', borderRadius: 17 }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Logros</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {achievements.map((ach, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                style={{
                  padding: '14px 12px', borderRadius: 14, textAlign: 'center',
                  background: ach.done ? 'var(--accent-bg)' : 'var(--surface2)',
                  border: `1.5px solid ${ach.done ? 'var(--accent)' : 'var(--border-l)'}`,
                  opacity: ach.done ? 1 : 0.45,
                }}
              >
                <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{ach.icon}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600, color: ach.done ? 'var(--text)' : 'var(--ter)' }}>{ach.label}</div>
              </motion.div>
            ))}
          </div>
        </PCard>
        </div>
  );
}

function QuickLinks({ nav }) {
  return (
    <>
        <PCard style={{ padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Accesos rápidos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['Mis inversiones',   () => nav('pertenencias'), 'var(--accent-bg)', 'var(--accent-text)'],
              ['Panel principal',   () => nav('dashboard'),    'var(--surface2)',  'var(--sec)'         ],
              ['Academia KEY CHAIN',() => nav('academia'),     'var(--surface2)',  'var(--sec)'         ],
              ['Centro de ayuda',   () => nav('ayuda'),        'var(--surface2)',  'var(--sec)'         ],
            ].map(([label, action, bg, color]) => (
              <button key={label} onClick={action} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12, border: 'none',
                background: bg, color, cursor: 'pointer',
                fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 600,
                transition: 'opacity 0.15s',
              }}>
                {label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>
        </PCard>

        {/* Referral card */}
        <div className="shimmer-surface" style={{
          borderRadius: 18, padding: '20px 22px',
          background: 'linear-gradient(135deg, oklch(0.20 0.03 265) 0%, oklch(0.28 0.08 270) 100%)',
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Invitá un amigo</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, opacity: 0.7, lineHeight: 1.55, marginBottom: 14 }}>
            Ganá $50 en USDC cuando tu referido haga su primera inversión.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, padding: '9px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.10)', fontFamily: 'var(--font-b)',
              fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em',
            }}>KEY-MAX2025</div>
            <button style={{
              padding: '9px 14px', borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.18)', color: '#fff',
              fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>Copiar</button>
          </div>
        </div>
    </>
  );
}

function AccountTabs({ tab, setTab, twofa, setTwofa, priv, setPriv }) {
  return (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', gap: 3, background: 'var(--surface2)', borderRadius: 14, padding: 4, width: 'fit-content', marginBottom: 20 }}>
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '9px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
                background: tab === id ? 'var(--surface)' : 'transparent',
                color: tab === id ? 'var(--text)' : 'var(--ter)',
                fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: tab === id ? 600 : 500,
                boxShadow: tab === id ? 'var(--sh-sm)' : 'none', transition: 'all 0.16s',
              }}>{label}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* KYC */}
            {tab === 'kyc' && (
              <motion.div key="kyc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <PCard style={{ padding: '22px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Estado KYC</div>
                      <PTag label="Verificado ✓" color="green" />
                    </div>
                    {KYC_CHECKS.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < KYC_CHECKS.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)' }}>{c}</span>
                      </div>
                    ))}
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 14 }}>Verificado por Sumsub · 1 Jun 2026</div>
                  </PCard>

                  <PCard style={{ padding: '22px 24px' }}>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>Información personal</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[['Nombre completo','Maximiliano Rodríguez'],['Fecha de nacimiento','14 Mar 1991'],['Nacionalidad','Argentina'],['Tipo de documento','DNI'],['Número de documento','38.421.764'],['País de residencia','Argentina']].map(([k,v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-l)', paddingBottom: 10 }}>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{k}</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </PCard>
                </div>
              </motion.div>
            )}

            {/* Docs */}
            {tab === 'docs' && (
              <motion.div key="docs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <PCard style={{ padding: '22px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>Documentos subidos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {[['DNI — frente','Documento de identidad','28 May 2026'],['DNI — reverso','Documento de identidad','28 May 2026'],['Prueba de domicilio','Factura de servicio','30 May 2026'],['Selfie con documento','Verificación facial','28 May 2026']].map(([name, type, date], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--border-l)', background: 'var(--surface2)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>{Icons.doc}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{name}</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{type} · {date}</div>
                        </div>
                        <PTag label="✓" color="green" />
                      </div>
                    ))}
                  </div>
                </PCard>
              </motion.div>
            )}

            {/* 2FA */}
            {tab === '2fa' && (
              <motion.div key="2fa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <PCard style={{ padding: '22px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>Autenticación de dos factores</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['totp',    'Autenticador TOTP',     'Google Authenticator, Authy, 1Password', '🔐'],
                      ['passkey', 'Passkey / Biométrico',  'Face ID, Touch ID, llave de seguridad',  '🪪'],
                      ['sms',     'SMS',                   'Código enviado a +54 9 11 XXXX XXXX',    '📱'],
                    ].map(([id, label, sub, icon]) => (
                      <div key={id} style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
                        borderRadius: 14, border: `1.5px solid ${twofa[id] ? 'var(--accent)' : 'var(--border-l)'}`,
                        background: twofa[id] ? 'var(--accent-bg)' : 'var(--surface2)',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 2 }}>{sub}</div>
                        </div>
                        {twofa[id] && <PTag label="Activo" color="green" />}
                        <PBtn variant={twofa[id] ? 'secondary' : 'accent'} small onClick={() => setTwofa(p => ({...p,[id]:!p[id]}))}>
                          {twofa[id] ? 'Desactivar' : 'Activar'}
                        </PBtn>
                      </div>
                    ))}
                  </div>
                </PCard>
              </motion.div>
            )}

            {/* Tax */}
            {tab === 'tax' && (
              <motion.div key="tax" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[['2025','$4,590','rendimiento RWA'],['2024','$2,130','rendimiento RWA']].map(([year, amount, desc]) => (
                    <PCard key={year} style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Año fiscal</div>
                          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 32, color: 'var(--text)', letterSpacing: '-0.03em' }}>{year}</div>
                        </div>
                        <PTag label="Disponible" color="green" />
                      </div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 4 }}>{desc}</div>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 18 }}>{amount}</div>
                      <PBtn variant="secondary" small style={{ width: '100%', justifyContent: 'center' }}>Descargar PDF</PBtn>
                    </PCard>
                  ))}
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 14, lineHeight: 1.65, padding: '0 4px' }}>
                  Los reportes incluyen todas las distribuciones recibidas, ganancias/pérdidas realizadas y costos de transacción deducibles. Consultá un asesor fiscal para tu situación particular.
                </div>
              </motion.div>
            )}

            {/* Privacy */}
            {tab === 'priv' && (
              <motion.div key="priv" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>Privacidad y datos</div>
                  {[
                    ['Portafolio público',          'Otros inversores pueden ver el valor de tus posiciones'],
                    ['Notificaciones de marketing', 'Recibir noticias, lanzamientos y promociones de KEY CHAIN'],
                    ['Compartir datos con Sumsub',  'Necesario para mantener la verificación KYC activa'],
                    ['Analítica de uso',             'Ayudar a mejorar la plataforma con datos anónimos'],
                  ].map(([label, desc], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 0', borderBottom: i < 3 ? '1px solid var(--border-l)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>{desc}</div>
                      </div>
                      <button
                        onClick={() => setPriv(p => { const n=[...p]; n[i]=!n[i]; return n; })}
                        style={{ width: 44, height: 24, borderRadius: 999, background: priv[i] ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, marginTop: 2, transition: 'background 0.2s' }}
                      >
                        <div style={{ position: 'absolute', top: 3, left: priv[i] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                      </button>
                    </div>
                  ))}
                </PCard>

                <PCard style={{ padding: '22px 24px', border: '1.5px solid var(--neg)' }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--neg)', marginBottom: 6 }}>Zona de peligro</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', marginBottom: 16 }}>Estas acciones son irreversibles. Procedé con cuidado.</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <PBtn variant="secondary" small style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }}>Descargar mis datos</PBtn>
                    <PBtn variant="secondary" small style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }}>Eliminar cuenta</PBtn>
                  </div>
                </PCard>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
  );
}


// Portfolio: the same project cards as the marketplace, each with the
// person's position (tokens, current value, return) underneath.
function InvestmentsGrid({ holdings, stats, isMe, nav, limit, onMore }) {
  const shown = limit ? holdings.slice(0, limit) : holdings;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{isMe ? 'Mis inversiones' : 'Inversiones'} <span style={{ color: 'var(--ter)', fontWeight: 600 }}>({holdings.length})</span></div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Valor actual <b style={{ color: 'var(--text)' }}>{fmtUSD(stats.current)}</b></div>
      </div>
      {holdings.length === 0 && (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>Todavía no tiene inversiones.</div>
      )}
      <div className="g-market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {shown.map(h => <AssetCard key={h.assetId} asset={h.asset} nav={nav} showCode holding={h} />)}
      </div>
      {onMore && holdings.length > shown.length && (
        <button onClick={onMore} style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600 }}>
          Ver las {holdings.length} inversiones →
        </button>
      )}
    </div>
  );
}
