import { useState } from 'react';
import { useMobile } from '../hooks/useMobile';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag, Icons } from '../components/ui';
import IdentityAvatar from '../components/IdentityAvatar';
import LevelWidgets from '../components/LevelWidgets';
import { AuroraCover } from '../components/ProfileHero';
import CompanyProfile from './CompanyProfile';
import { ME, MY_COMPANY } from '../lib/me';
import { holdingsOf, portfolioStats, personSocial } from '../lib/people';
import { useFollowing, useFollowingPeople, fmtCount } from '../lib/projectFeed';
import FollowListModal, { FollowButton } from '../components/FollowList';
import { fmtUSD } from '../data';
import AssetCard from '../components/AssetCard';
import AchievementIcon from '../components/AchievementIcon';
import { achievementsOf } from '../lib/achievements';

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

const KYC_CHECKS = [
  'Verificación de identidad (DNI)',
  'Verificación facial (liveness)',
  'Prueba de domicilio',
  'Verificación PEP / Sanciones',
  'Verificación de fondos',
];

const activityColor = { pos: '#22c55e', invest: '#8247E5', kyc: '#3b82f6' };

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
  const levelHint = isMe ? '$9,880 para Nivel 5' : level >= 5 ? 'Nivel máximo' : `Nivel ${level} de 5`;
  const levelStats = isMe
    ? [[fmtUSD(40120), 'invertido total'], ['16 meses', 'antigüedad'], ['4.8', 'reputación']]
    : [[fmtUSD(pf.invested), 'invertido total'], [holdings[0]?.since ? `desde ${holdings[0].since}` : '—', 'antigüedad'], [(user.rep ?? 4.8).toFixed(1), 'reputación']];
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
  const cats = Object.entries(holdings.reduce((m, h) => ({ ...m, [h.asset.cat]: (m[h.asset.cat] || 0) + h.current }), {})).sort((x, y) => y[1] - x[1]);
  const firstSince = holdings.map(h => h.since).sort((x, y) => monthsSince(y) - monthsSince(x))[0];
  const levelData = {
    level, holdings: holdings.length, cats,
    invested: isMe ? 40120 : pf.invested,
    ret: isMe ? 15.6 : pf.ret,
    yieldEarned: isMe ? 4599 : pf.yieldEarned,
    rep: isMe ? 4.8 : (user.rep ?? 4.8),
    months: isMe ? 16 : Math.max(1, monthsSince(firstSince)),
    since: isMe ? 'Mar 2025' : firstSince || '—',
  };
  const ret = levelData.ret;
  const kpis = [
    { label: 'Portafolio RWA', value: fmtUSD(isMe ? 40120 : pf.current), sub: isMe ? 'Valor actual' : `Invertido ${fmtUSD(pf.invested)}`, icon: Icons.wallet },
    { label: 'Rendimiento total', value: `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`, tone: ret >= 0 ? 'pos' : 'neg', sub: 'Valorización + rentas', icon: IC.chart },
    { label: 'Yield cobrado', value: fmtUSD(levelData.yieldEarned), sub: 'Rentas en USDC', icon: Icons.receive },
    { label: 'Inversiones', value: String(holdings.length), sub: `${cats.length} ${cats.length === 1 ? 'rubro' : 'rubros'}`, icon: IC.grid },
  ];
  const achievements = achievementsOf(levelData).slice(0, 6);
  const levelCard = <LevelCard lv={level} hint={levelHint} stats={levelStats} onOpen={() => setSection('logros')} />;
  const achCard = <AchievementsCard achievements={achievements} onOpen={() => setSection('logros')} />;
  const counts = [
    [String(holdings.length), 'Inversiones', () => setSection('inversiones')],
    [fmtCount(social.followersCount), 'Seguidores', () => setListTab('followers')],
    [fmtCount(social.followingCount), 'Seguidos', () => setListTab('following')],
  ];

  return (
    <div className="g-page" style={{ padding: isMobile ? '16px 16px 40px' : '24px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Switching to the company is done from the hexagon on the photo's corner. */}
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, minHeight: 28 }}>
          <button onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13 }}>
            {Icons.back} Volver
          </button>
        </div>
      )}

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
            <PTag label={`Nivel ${level}`} />
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--ter)', marginBottom: 12 }}>
            {isMe ? '@maxrodriguez · 0x4a9fE2b8…d82c · Miembro desde Mar 2025' : `@${user.handle}`}
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.55, maxWidth: 680, marginBottom: 16 }}>
            {isMe ? 'Inversor en activos reales tokenizados.' : company ? `Fundador y CEO de ${company}.` : user.bio}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontFamily: 'var(--font-b)', fontSize: 14 }}>
              {counts.map(([v, l, onClick]) => (
                <button key={l} onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                  <b style={{ color: 'var(--text)' }}>{v}</b> <span style={{ color: 'var(--ter)' }}>{l}</span>
                </button>
              ))}
            </div>
            <LevelMini lv={level} hint={levelHint} onOpen={() => setSection('logros')} full={isMobile} />
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
      <div className="no-scrollbar" style={{ display: 'flex', gap: 4, boxShadow: 'inset 0 -1px 0 var(--border-l)', marginBottom: 18, overflowX: 'auto', overflowY: 'hidden' }}>
        {sections.map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5,
              fontWeight: section === id ? 700 : 500, color: section === id ? 'var(--text)' : 'var(--ter)',
              borderBottom: `2px solid ${section === id ? 'var(--text)' : 'transparent'}`, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {label}
          </button>
        ))}
      </div>

      {section === 'resumen' && (
        <>
          <KpiRow kpis={kpis} isMobile={isMobile} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px', gap: isMobile ? 14 : 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18, minWidth: 0 }}>
              <RecentInvestments holdings={holdings} nav={nav} isMe={isMe} onMore={() => setSection('inversiones')} />
              {holdings.length > 0 && <CategoryBreakdown holdings={holdings} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18, minWidth: 0 }}>
              {levelCard}
              {achCard}
              {isMe && <QuickLinks nav={nav} />}
            </div>
          </div>
        </>
      )}

      {section === 'inversiones' && (
        <InvestmentsMarket holdings={holdings} nav={nav} isMobile={isMobile} />
      )}

      {section === 'logros' && <LevelWidgets isMobile={isMobile} d={levelData} />}

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

// Months from a "Mar 2025"-style date to the demo's today (Jun 2026).
const MONTH_IDX = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 };
function monthsSince(label) {
  const [m, y] = String(label || '').split(' ');
  if (!(m in MONTH_IDX) || !y) return 0;
  return (2026 - Number(y)) * 12 + (5 - MONTH_IDX[m]);
}

// Compact level system for the profile header: badge, 5-step track and
// what's left for the next level. Opens the "Nivel y logros" tab.
function LevelMini({ lv, hint, onOpen, full }) {
  return (
    <button onClick={onOpen} title="Ver nivel y logros"
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: full ? '100%' : 340, padding: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'var(--text)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 16, color: 'var(--surface)',
      }}>{lv}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, fontFamily: 'var(--font-b)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Nivel de inversor</span>
          <span style={{ fontSize: 11.5, color: 'var(--ter)' }}>{hint}</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{ flex: 1 }}>
              <div style={{ height: 6, borderRadius: 99, background: n <= lv ? 'var(--text)' : 'var(--surface2)', opacity: n < lv ? 0.55 : 1 }} />
              <div style={{ marginTop: 4, fontFamily: 'var(--font-b)', fontSize: 10, textAlign: 'center', color: n === lv ? 'var(--text)' : 'var(--ter)', fontWeight: n === lv ? 700 : 400 }}>N{n}</div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

const IC = {
  chart: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16" /><path d="M5 15l4-4 3 3 7-7" /><path d="M15 7h4v4" /></svg>,
  grid: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>,
  arrowR: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
  star: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" /></svg>,
};

const cardTitle = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15.5, color: 'var(--text)', letterSpacing: '-0.01em' };
const cardSub = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 };

function KpiRow({ kpis, isMobile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
      {kpis.map((k, i) => (
        <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <PCard style={{ padding: isMobile ? '14px 14px' : '16px 18px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--surface2)', color: 'var(--sec)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{k.icon}</span>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'var(--ter)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 20 : 24, letterSpacing: '-0.03em',
              color: k.tone === 'pos' ? 'var(--pos)' : k.tone === 'neg' ? 'var(--neg, #ef4444)' : 'var(--text)' }}>{k.value}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 3 }}>{k.sub}</div>
          </PCard>
        </motion.div>
      ))}
    </div>
  );
}

// Compact rows of the latest investments for the summary tab.
function RecentInvestments({ holdings, nav, onMore, isMe }) {
  const rows = [...holdings].sort((a, b) => monthsSince(a.since) - monthsSince(b.since)).slice(0, 4);
  return (
    <PCard style={{ padding: '20px 20px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={cardTitle}>{isMe ? 'Mis inversiones' : 'Inversiones'}</div>
          <div style={cardSub}>Las más recientes</div>
        </div>
        {holdings.length > 0 && (
          <button onClick={onMore} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border-l)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Ver todas ({holdings.length}) {IC.arrowR}
          </button>
        )}
      </div>
      {holdings.length === 0 && <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '12px 0 16px' }}>Todavía no tiene inversiones.</div>}
      {rows.map((h, i) => {
        const a = h.asset;
        return (
          <button key={h.assetId} onClick={() => nav('detalle', a)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
            <img src={a.img} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.cat} · {a.location}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{a.apy}% <span style={{ fontFamily: 'var(--font-b)', fontWeight: 500, fontSize: 11, color: 'var(--ter)' }}>APY</span></div>
              <StagePill stage={a.stage} />
            </div>
          </button>
        );
      })}
    </PCard>
  );
}

function StagePill({ stage }) {
  const op = stage === 'Operativo';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 600, color: op ? 'var(--pos)' : 'var(--sec)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: op ? 'var(--pos)' : '#f5a623' }} />{stage}
    </span>
  );
}

// Where the portfolio is, by category: one stacked bar + legend.
const CAT_COLORS = ['#3b82f6', '#22c55e', '#f5a623', '#a78bfa', '#ef4444', '#06b6d4', '#ec4899'];
function CategoryBreakdown({ holdings }) {
  const total = holdings.reduce((s, h) => s + h.current, 0) || 1;
  const byCat = Object.entries(holdings.reduce((m, h) => ({ ...m, [h.asset.cat]: (m[h.asset.cat] || 0) + h.current }), {}))
    .sort((a, b) => b[1] - a[1]);
  return (
    <PCard style={{ padding: '20px 20px' }}>
      <div style={cardTitle}>Distribución por rubro</div>
      <div style={{ ...cardSub, marginBottom: 14 }}>Porcentaje del valor actual</div>
      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
        {byCat.map(([cat, v], i) => <div key={cat} style={{ width: `${(v / total) * 100}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {byCat.map(([cat, v], i) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-b)', fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text)', fontWeight: 600 }}>{cat}</span>
            <span style={{ color: 'var(--ter)' }}>{fmtUSD(v)}</span>
            <b style={{ color: 'var(--text)', minWidth: 38, textAlign: 'right' }}>{((v / total) * 100).toFixed(0)}%</b>
          </div>
        ))}
      </div>
    </PCard>
  );
}

const ACT_ICON = {
  pos: Icons.receive,
  invest: Icons.token,
  kyc: Icons.shield,
};

function ActivityCard() {
  return (
        <PCard style={{ padding: '22px 24px' }}>
          <div style={{ ...cardTitle, marginBottom: 12 }}>Actividad reciente</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ACTIVITY.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activityColor[a.type] }}>{ACT_ICON[a.type]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{a.label}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{a.time}</div>
                </div>
                {a.amount && (
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: a.type === 'pos' ? 'var(--pos)' : 'var(--text)' }}>{a.amount}</div>
                )}
              </motion.div>
            ))}
          </div>
        </PCard>
  );
}

// Level: badge, segmented track with the current step highlighted, and
// the three headline stats. Plain card, no rainbow border.
function LevelCard({ lv, hint, stats, onOpen }) {
  return (
    <PCard style={{ padding: '20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--text)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 19, flexShrink: 0 }}>{lv}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardTitle}>Nivel de inversor</div>
          <div style={{ ...cardSub, marginTop: 2 }}>{hint}</div>
        </div>
        {onOpen && (
          <button onClick={onOpen} aria-label="Ver nivel y logros" style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-l)', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.arrowR}</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{ flex: 1, height: 6, borderRadius: 99, background: n <= lv ? 'var(--text)' : 'var(--surface2)', opacity: n < lv ? 0.55 : 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 10.5, color: n === lv ? 'var(--text)' : 'var(--ter)', fontWeight: n === lv ? 700 : 500 }}>N{n}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        {stats.map(([v, l]) => (
          <div key={l} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {l === 'reputación' ? <>{v}<span style={{ color: '#f5a623', display: 'flex' }}>{IC.star}</span></> : v}
            </div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </PCard>
  );
}

// Achievement tiles with line icons; locked ones show a lock and progress.
function AchievementsCard({ achievements, onOpen }) {
  const done = achievements.filter(a => a.p >= 1).length;
  return (
    <PCard style={{ padding: '20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={cardTitle}>Logros</div>
        <button onClick={onOpen} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>
          <b style={{ color: 'var(--text)' }}>{done}</b> de {achievements.length}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
        {achievements.map((a, i) => {
          const ok = a.p >= 1;
          return (
            <motion.div key={a.label} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 14, background: 'var(--surface2)', minWidth: 0 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ok ? 'var(--text)' : 'transparent', color: ok ? 'var(--surface)' : 'var(--ter)', border: ok ? 'none' : '1px dashed var(--border)' }}>
                <AchievementIcon name={ok ? a.icon : 'lock'} size={17} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700, color: ok ? 'var(--text)' : 'var(--sec)', lineHeight: 1.25 }}>{a.label}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', marginTop: 2 }}>{ok ? 'Logrado' : `${Math.round(a.p * 100)}%`}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </PCard>
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


// Portfolio as a mini marketplace: the same project cards as the market,
// only the projects this person invested in, with search, category and
// stage filters and sorting. The person's position (tokens, value) is private.
const SORTS = [['recent', 'Más recientes'], ['apy', 'Mayor APY'], ['name', 'Nombre A–Z']];
function InvestmentsMarket({ holdings, nav, isMobile }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todos');
  const [stage, setStage] = useState('Todos');
  const [sort, setSort] = useState('recent');
  const cats = Object.entries(holdings.reduce((m, h) => ({ ...m, [h.asset.cat]: (m[h.asset.cat] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const stages = ['Todos', ...new Set(holdings.map(h => h.asset.stage))];
  const term = q.trim().toLowerCase();
  const list = holdings
    .filter(h => cat === 'Todos' || h.asset.cat === cat)
    .filter(h => stage === 'Todos' || h.asset.stage === stage)
    .filter(h => !term || `${h.asset.name} ${h.asset.location} ${h.asset.company} ${h.asset.cat}`.toLowerCase().includes(term))
    .sort((a, b) => sort === 'apy' ? b.asset.apy - a.asset.apy : sort === 'name' ? a.asset.name.localeCompare(b.asset.name) : monthsSince(a.since) - monthsSince(b.since));
  const clear = () => { setQ(''); setCat('Todos'); setStage('Todos'); };
  const chip = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${active ? 'var(--text)' : 'var(--border-l)'}`, background: active ? 'var(--text)' : 'var(--surface)',
    color: active ? 'var(--surface)' : 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600,
  });
  const sortSelect = (
    <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar"
      style={{ height: isMobile ? 32 : 42, padding: '0 10px', borderRadius: isMobile ? 9 : 12, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
      {SORTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
    </select>
  );
  const count = (n, active) => <span style={{ fontSize: 11, opacity: active ? 0.7 : 0.6 }}>{n}</span>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <label style={{ flex: 1, minWidth: isMobile ? '100%' : 0, display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border-l)', color: 'var(--ter)' }}>
          {Icons.search}
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en mis inversiones…"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13.5 }} />
          {q && <button onClick={() => setQ('')} aria-label="Borrar búsqueda" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ter)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>}
        </label>
        <div style={{ display: 'flex', padding: 3, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border-l)', height: 42, boxSizing: 'border-box', flexShrink: 0, flex: isMobile ? '1 1 100%' : 'none' }}>
          {stages.map(s => (
            <button key={s} onClick={() => setStage(s)}
              style={{ flex: isMobile ? 1 : 'none', padding: '0 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600,
                background: stage === s ? 'var(--surface)' : 'transparent', color: stage === s ? 'var(--text)' : 'var(--ter)', boxShadow: stage === s ? 'var(--sh-sm)' : 'none' }}>{s}</button>
          ))}
        </div>
        {!isMobile && sortSelect}
      </div>

      <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', overflowY: 'hidden', marginBottom: 16, paddingBottom: 2 }}>
        <button onClick={() => setCat('Todos')} style={chip(cat === 'Todos')}>Todos {count(holdings.length, cat === 'Todos')}</button>
        {cats.map(([c, n]) => <button key={c} onClick={() => setCat(c)} style={chip(cat === c)}>{c} {count(n, cat === c)}</button>)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 12 }}>
        <span>{list.length} {list.length === 1 ? 'proyecto' : 'proyectos'}{list.length !== holdings.length ? ` de ${holdings.length}` : ''}</span>
        {isMobile && sortSelect}
      </div>

      {list.length ? (
        <div className="g-market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {list.map(h => <AssetCard key={h.assetId} asset={h.asset} nav={nav} />)}
        </div>
      ) : (
        <PCard style={{ padding: '36px 20px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, margin: '0 auto 12px', background: 'var(--surface2)', color: 'var(--ter)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.search}</div>
          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{holdings.length ? 'Ningún proyecto coincide' : 'Todavía no tiene inversiones'}</div>
          {holdings.length > 0 && <button onClick={clear} style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', textDecoration: 'underline', fontFamily: 'var(--font-b)', fontSize: 13 }}>Limpiar filtros</button>}
        </PCard>
      )}
    </div>
  );
}
