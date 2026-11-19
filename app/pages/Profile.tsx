import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag, Icons } from '~/components/ui';
import IdentityAvatar, { type AvatarUser } from '~/components/social/IdentityAvatar';
import LevelWidgets, { type LevelData } from '~/components/social/LevelWidgets';
import { AuroraCover } from '~/components/social/ProfileHero';
import AchievementIcon from '~/components/social/AchievementIcon';
import ProjectBrowser from '~/components/social/ProjectBrowser';
import FollowListModal, { FollowButton, type FollowListTabId } from '~/components/social/FollowList';
import CompanyProfile from '~/pages/CompanyProfile';
import KycLive from '~/features/kyc/KycLive';
import MyCompanySection from '~/features/company/MyCompanySection';
import { kycStatusTag } from '~/features/kyc/status';
import DocumentsTab from '~/features/profile/DocumentsTab';
import SecurityTab from '~/features/profile/SecurityTab';
import StatementsTab from '~/features/profile/StatementsTab';
import PrivacyTab from '~/features/profile/PrivacyTab';
import EditProfileModal from '~/features/profile/EditProfileModal';
import { ReferralSoon } from '~/features/profile/ProfileCardsLive';
import { CopyButton, EmptyState, Notice, Skeleton } from '~/features/profile/kit';
import { fmtDate, fmtRelative } from '~/features/profile/api';
import { useActivity, useAvatarActions, useStats, type ActivityItem, type Stats } from '~/features/profile/hooks';
import { statementYears } from '~/features/profile/statements';
import { fmtUSD, type AssetCategory } from '~/data';
import { useMobile } from '~/hooks/useMobile';
import { achievementsOf, type Achievement, type AchievementIconName } from '~/lib/achievements';
import { mediaUrl, useCatalog } from '~/lib/catalog';
import { ME } from '~/lib/me';
import type { NavFn } from '~/lib/navigation';
import { useHoldings } from '~/lib/onchain';
import { holdingsOf, portfolioStats } from '~/lib/people';
import { fmtCount } from '~/lib/projectFeed';
import { useSession } from '~/lib/session';
import { useFollowToggle, useSocialQuery, useSocialSource } from '~/lib/social/source';
import type { CompanyRef, FollowEntry, FollowTarget, PersonProfile, SocialAsset, SocialSource } from '~/lib/social/types';
import { localMonthLabel } from '~/lib/social/identity';
import GuideButton from '~/features/guide/GuideButton';
import { useT, type Translator } from '~/i18n/useT';
import { useDataText } from '~/i18n/data';

// Personal profile — mine (/perfil) or someone else's (/usuarios/:slug).
// Same layout as the company profile: cover card with the round photo (the
// company's hexagon is its badge, tapping it switches to the company), counts
// and level, then tabs: Resumen, Inversiones, Nivel y logros and, for me,
// Actividad and Cuenta y seguridad (KYC, documents, security, taxes, privacy).
// Demo mode shows the design's data; live mode reads the session, /v1/me/*,
// the on-chain holdings and the social API. Other people only show what their
// privacy settings allow, and never amounts.

type AccountTab = 'kyc' | 'docs' | '2fa' | 'tax' | 'priv';
type Section = 'resumen' | 'inversiones' | 'logros' | 'actividad' | 'cuenta' | 'empresa';

/** Account sub-tabs; labels at `page.accountTabs.<id>`. */
const TABS: readonly AccountTab[] = ['kyc', 'docs', '2fa', 'tax', 'priv'];

type ActivityTone = 'pos' | 'invest' | 'kyc' | 'support' | 'account';
type ActivityRow = { key: string; label: string; amount: string | null; time: ReactNode; type: ActivityTone };

/** The design's demo history (project names are data). */
const demoActivity = (t: TFn): ActivityRow[] => [
  { key: 'a1', label: t('page.demo.activity.yield', { name: 'Edificio Palermo' }),      amount: '+$780',   time: t('page.demo.time.today', { time: '09:32' }),  type: 'pos'    },
  { key: 'a2', label: t('page.demo.activity.investment', { name: 'La Rural Lotes SRL' }), amount: '-$5,000', time: t('page.demo.time.daysAgo', { count: 3 }),     type: 'invest' },
  { key: 'a3', label: t('page.demo.activity.kyc'),                                        amount: null,      time: t('page.demo.time.weekAgo'),                   type: 'kyc'    },
  { key: 'a4', label: t('page.demo.activity.yield', { name: 'AutoFleet AR' }),            amount: '+$620',   time: t('page.demo.time.weeksAgo', { count: 2 }),    type: 'pos'    },
  { key: 'a5', label: t('page.demo.activity.investment', { name: 'AutoFleet AR' }),       amount: '-$3,000', time: t('page.demo.time.weeksAgo', { count: 3 }),    type: 'invest' },
];

const activityColor: Record<ActivityTone, string> = { pos: '#22c55e', invest: '#8247E5', kyc: '#3b82f6', support: '#F5A623', account: '#5BC4BE' };

const CATEGORY_LABEL: Record<Stats['categories'][number]['category'], AssetCategory> = {
  autos: 'Autos', campos: 'Campos', drones: 'Drones', inmuebles: 'Inmuebles', edificios: 'Edificios',
};
const ACHIEVEMENT_ICON: Record<Stats['achievements'][number]['id'], AchievementIconName> = {
  first_investment: 'trophy', kyc_complete: 'shield', six_months: 'star', diversified: 'compass',
  yield_1k: 'drop', one_year: 'calendar', invested_50k: 'diamond', ten_projects: 'rocket',
};
const LIVE_RING = 'linear-gradient(135deg, #8247E5, #3b82f6)';
/** Month labels of the data format ("Mar 2025"), not shown as-is. */
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ACTIVITY_PAGE = 6;

type TFn = Translator['t'];
type LevelStatId = 'invested' | 'seniority' | 'reputation';

/** One project in the person's portfolio. Amounts are null when they are private (someone else, live). */
type Investment = { asset: SocialAsset; since?: string; invested: number | null; current: number | null };

type Kpi = { id: string; label: string; value: string; sub: string; icon: ReactNode; tone?: 'pos' | 'neg' };

type ProfileProps = {
  nav: NavFn;
  /** Someone else's profile (`/usuarios/:slug`); omitted = mine. */
  person?: PersonProfile;
  /** Opens the person's company (their hexagon badge). */
  onCompany?: () => void;
  /** "Volver" (someone else's profile). */
  onBack?: () => void;
};

/** "Mar 2025" in the active language; `months` = the 12 short month names (`raw('social.months')`). */
const monthLabel = (iso: string | null | undefined, months: readonly string[]): string => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${months[d.getMonth()]} ${d.getFullYear()}` : '—';
};
const monthsBetween = (iso: string | null | undefined, now: number): number => {
  if (!iso) return 0;
  const d = new Date(iso), n = new Date(now);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth() - (n.getDate() < d.getDate() ? 1 : 0));
};
const monthsText = (m: number, t: TFn) => (m < 1 ? t('page.levelInfo.monthsLess') : t(m === 1 ? 'page.levelInfo.monthsOne' : 'page.levelInfo.monthsOther', { count: m }));
const toAchievement = (a: Stats['achievements'][number]): Achievement => ({
  icon: ACHIEVEMENT_ICON[a.id], label: a.label, desc: a.description, p: a.done ? 1 : Math.max(0, Math.min(1, a.progress)),
});
/** [category, value] pairs, largest first. */
const categoriesOf = (rows: readonly Investment[], value: (r: Investment) => number): Array<[string, number]> =>
  Object.entries(rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.asset.cat]: (m[r.asset.cat] || 0) + value(r) }), {})).sort((x, y) => y[1] - x[1]);

export default function Profile({ nav, person, onCompany, onBack }: ProfileProps) {
  const { t, raw, locale } = useT('profile');
  const dataText = useDataText();
  const months12 = raw<string[]>('social.months');
  const isMobile = useMobile();
  const source = useSocialSource();
  const { status, user: sessionUser } = useSession();
  const live = status !== 'disabled';
  const isMe = !person;
  const { byId } = useCatalog();
  // Personal / Empresa: users who run a company can flip between their own
  // profile and their company's (same page, no navigation).
  const [identity, setIdentity] = useState<'personal' | 'company'>('personal');
  // `/perfil?seccion=empresa` opens the company section (live only: links from the onboarding and notifications).
  const [searchParams] = useSearchParams();
  const [section, setSection] = useState<Section>(() => (live && !person && searchParams.get('seccion') === 'empresa' ? 'empresa' : 'resumen'));
  const [listTab, setListTab] = useState<FollowListTabId | null>(null);
  const [tab, setTab] = useState<AccountTab>('kyc');
  const [twofa, setTwofa] = useState({ totp: true, passkey: false, sms: false });
  const [priv, setPriv] = useState([true, false, true, true]);
  const [editing, setEditing] = useState(false);
  const avatarActions = useAvatarActions();
  const follow = useFollowToggle(source);
  // Live, mine: real positions, stats, history.
  const { data: liveHoldings, loading: holdingsLoading } = useHoldings();
  const { data: stats, loading: statsLoading } = useStats();
  const { data: activity, loading: activityLoading, error: activityError } = useActivity();
  const [now] = useState(() => Date.now());
  const years = statementYears(stats?.memberSince ?? sessionUser?.createdAt, new Date(now).getFullYear());
  const [taxYear, setTaxYear] = useState<number | null>(null);

  // My social profile (followers, following, my company); someone else's comes in `person`.
  const selfId = live ? sessionUser?.id ?? null : ME.name;
  const selfQ = useSocialQuery(source, `person:${isMe ? selfId ?? '' : ''}`,
    s => (isMe && selfId ? s.person(selfId) : null),
    src => (isMe && selfId ? src.getPerson(selfId) : Promise.resolve(null)));
  const social: PersonProfile | null = person ?? selfQ.data ?? null;
  const company: CompanyRef | null = social?.company ?? null;
  const toCompany = () => {
    if (!company) return;
    if (isMe) setIdentity('company');
    else onCompany?.();
  };

  if (identity === 'company' && company) {
    return <CompanyProfile nav={nav} slug={company.slug} embedded onPersonal={() => setIdentity('personal')} />;
  }

  // ─── Who is shown ─────────────────────────────────────────────────────────
  const shortWallet = sessionUser ? `${sessionUser.walletAddress.slice(0, 6)}…${sessionUser.walletAddress.slice(-4)}` : '';
  const user: AvatarUser = person
    ? person
    : live
      ? (() => {
          const name = sessionUser?.displayName || shortWallet || t('page.myProfile');
          return { name, initial: name.slice(0, 1).toUpperCase(), gradient: LIVE_RING, id: sessionUser?.id, avatarUrl: sessionUser?.avatarUrl ? mediaUrl(sessionUser.avatarUrl) : null };
        })()
      : ME;
  const personLive = person?.live;

  // ─── Portfolio ────────────────────────────────────────────────────────────
  const investments: Investment[] | null = !live
    ? holdingsOf(isMe ? ME : { name: user.name }).map(h => ({ asset: dataText.asset(h.asset), since: h.since, invested: h.invested, current: h.current }))
    : isMe
      ? (liveHoldings ?? []).filter(h => h.tokens > 0).map(h => ({
          asset: byId(h.assetId) ?? fallbackAsset(h.assetId, h.assetName, CATEGORY_LABEL[h.category], h.location, h.imageUrl),
          invested: h.invested, current: h.value,
        }))
      : personLive?.investments?.map(i => ({ asset: i.asset, since: i.since, invested: null, current: null })) ?? null;
  const holdings = investments ?? [];
  const demoHoldings = !live ? holdingsOf(isMe ? ME : { name: user.name }) : [];
  const pf = portfolioStats(demoHoldings);
  const invested = live ? (isMe ? stats?.invested ?? null : null) : isMe ? 40120 : pf.invested;
  const current = live ? (isMe && liveHoldings ? holdings.reduce((t, h) => t + (h.current ?? 0), 0) : null) : isMe ? 40120 : pf.current;
  const yieldEarned = live ? (isMe ? stats?.dividendsEarned ?? null : null) : isMe ? 4599 : pf.yieldEarned;
  const ret = live
    ? (invested && current !== null && yieldEarned !== null ? ((current + yieldEarned - invested) / invested) * 100 : null)
    : isMe ? 15.6 : pf.ret;
  const cats: Array<[string, number]> = live
    ? (isMe ? (stats?.categories ?? []).map(c => [CATEGORY_LABEL[c.category], c.invested] as [string, number]).sort((x, y) => y[1] - x[1]) : categoriesOf(holdings, () => 1))
    : categoriesOf(holdings, h => h.current ?? 0);
  const amountsKnown = !live || isMe;

  // ─── Level ────────────────────────────────────────────────────────────────
  const demoLevel = isMe ? 4 : pf.invested >= 50000 ? 5 : pf.invested >= 25000 ? 4 : pf.invested >= 10000 ? 3 : pf.invested >= 3000 ? 2 : 1;
  const level: number | null = live ? (isMe ? stats?.level.level ?? null : personLive?.level?.level ?? null) : demoLevel;
  const firstSince = holdings.map(h => h.since).filter((s): s is string => !!s).sort((x, y) => monthsSince(y) - monthsSince(x))[0];
  const months = live
    ? monthsBetween(isMe ? stats?.memberSince ?? sessionUser?.createdAt : personLive?.memberSince, now)
    : isMe ? 16 : Math.max(1, monthsSince(firstSince));
  const rep = live ? null : isMe ? 4.8 : (person?.rep ?? 4.8);
  const levelHint = live
    ? isMe
      ? !stats ? (statsLoading ? t('page.levelInfo.loading') : t('page.levelInfo.noData')) : stats.level.nextLevelAt !== null ? t('page.levelInfo.toNext', { amount: fmtUSD(Math.max(0, stats.level.nextLevelAt - stats.invested)), level: stats.level.level + 1 }) : t('page.levelInfo.max')
      : level === null ? t('page.levelInfo.private') : level >= 5 ? t('page.levelInfo.max') : t('page.levelInfo.ofTotal', { level })
    : isMe ? t('page.levelInfo.toNext', { amount: '$9,880', level: 5 }) : demoLevel >= 5 ? t('page.levelInfo.max') : t('page.levelInfo.ofTotal', { level: demoLevel });
  const levelStats: ReadonlyArray<readonly [string, LevelStatId]> = live
    ? isMe
      ? [[stats ? fmtUSD(stats.invested) : '—', 'invested'], [stats ? monthsText(months, t) : '—', 'seniority'], ['—', 'reputation']]
      : [['—', 'invested'], [personLive?.memberSince ? t('page.levelInfo.since', { date: monthLabel(personLive.memberSince, months12) }) : '—', 'seniority'], ['—', 'reputation']]
    : isMe
      ? [[fmtUSD(40120), 'invested'], [monthsText(16, t), 'seniority'], ['4.8', 'reputation']]
      : [[fmtUSD(pf.invested), 'invested'], [demoHoldings[0]?.since ? t('page.levelInfo.since', { date: localMonthLabel(demoHoldings[0].since, months12) }) : '—', 'seniority'], [(person?.rep ?? 4.8).toFixed(1), 'reputation']];
  const levelData: LevelData = {
    level: level ?? 1,
    holdings: live && isMe ? stats?.assetsCount ?? holdings.length : holdings.length,
    cats,
    invested: invested ?? 0,
    ret: amountsKnown ? ret : null,
    yieldEarned: yieldEarned ?? 0,
    rep,
    months,
    // Data format ("Mar 2025", Spanish months): LevelWidgets parses it and shows it in the active language.
    since: live ? monthLabel(isMe ? stats?.memberSince ?? sessionUser?.createdAt : personLive?.memberSince, MONTHS_ES) : isMe ? 'Mar 2025' : firstSince || '—',
  };
  // Live: the API's achievements (mine only; other people's are private).
  const achievements: Achievement[] | null = live ? (isMe && stats ? stats.achievements.map(toAchievement) : null) : achievementsOf(levelData).map(dataText.achievement);

  // ─── Header data ──────────────────────────────────────────────────────────
  const kyc = live
    ? isMe
      ? (() => { const tag = kycStatusTag(sessionUser?.kycStatus); return sessionUser?.kycStatus === 'verified' ? { label: t('kyc.tagVerified'), color: tag.color } : { label: t('kyc.tag', { status: t(tag.labelKey) }), color: tag.color }; })()
      : personLive?.kycVerified ? { label: t('kyc.tagVerified'), color: 'green' as const } : null
    : { label: t('kyc.tagVerified'), color: 'green' as const };
  const followTarget: FollowTarget | null = person ? { kind: 'person', id: person.id } : null;
  const followKey = person ? `person-${person.id}` : '';
  const followBase = { following: person?.isFollowing ?? false, followers: social?.followersCount ?? 0 };
  const followState = person ? follow.stateOf(followKey, followBase) : followBase;
  const followersCount = person ? followState.followers : social?.followersCount ?? 0;
  const followingCount = social?.followingCount ?? 0;
  const investmentsCount = investments ? String(holdings.length) : '—';
  const bio = live
    ? company ? t('page.bio.manager', { company: company.name }) : holdings.length ? t('page.bio.investor') : ''
    : isMe ? t('page.bio.investor') : company ? t('page.bio.founder', { company: company.name }) : person?.bio ?? '';

  const avatar = isMobile ? 84 : 112;
  const sections: ReadonlyArray<readonly [Section, string]> = [
    ['resumen', t('page.sections.summary')],
    ['inversiones', t('page.sections.investments', { count: investmentsCount })],
    ['logros', t('page.sections.achievements')],
    ...(isMe ? [['actividad', t('page.sections.activity')], ['cuenta', t('page.sections.account')]] as const : []),
    // Live only: company account (register / status / KYB). Demo keeps the design's tabs.
    ...(isMe && live ? [['empresa', sessionUser?.company ? t('page.sections.myCompany') : t('page.sections.registerCompany')]] as const : []),
  ];
  const loadingMine = live && isMe && (holdingsLoading || statsLoading);
  const money = (v: number | null) => (v === null ? (loadingMine ? '…' : '—') : fmtUSD(v));
  const privateText = t('page.kpis.private');
  const kpis: Kpi[] = [
    { id: 'portfolio', label: t('page.kpis.portfolio'), value: money(current), sub: !amountsKnown ? privateText : isMe ? t('page.kpis.currentValue') : t('page.kpis.investedAmount', { amount: fmtUSD(pf.invested) }), icon: Icons.wallet },
    { id: 'return', label: t('page.kpis.return'), value: ret === null || !amountsKnown ? (loadingMine ? '…' : '—') : `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`, tone: ret !== null && amountsKnown ? (ret >= 0 ? 'pos' : 'neg') : undefined, sub: amountsKnown ? t('page.kpis.returnSub') : privateText, icon: IC.chart },
    { id: 'yield', label: t('page.kpis.yield'), value: money(yieldEarned), sub: amountsKnown ? t('page.kpis.yieldSub') : privateText, icon: Icons.receive },
    { id: 'investments', label: t('page.kpis.investments'), value: investmentsCount, sub: investments ? t(cats.length === 1 ? 'page.kpis.categoryOne' : 'page.kpis.categoryOther', { count: cats.length }) : privateText, icon: IC.grid },
  ];
  const counts: ReadonlyArray<readonly [string, string, string, () => void]> = [
    ['investments', investmentsCount, t('page.counts.investments'), () => setSection('inversiones')],
    ['followers', fmtCount(followersCount), t('page.counts.followers'), () => setListTab('followers')],
    ['following', fmtCount(followingCount), t('page.counts.following'), () => setListTab('following')],
  ];
  const levelCard = <LevelCard lv={level} hint={levelHint} stats={levelStats} onOpen={() => setSection('logros')} />;
  const achCard = achievements
    ? <AchievementsCard achievements={achievements.slice(0, 6)} onOpen={() => setSection('logros')} />
    : <PCard style={{ padding: '20px 20px' }}><div style={cardTitle}>{t('page.achievements.title')}</div><div style={cardSub}>{live && isMe ? (statsLoading ? t('page.achievements.loading') : t('page.achievements.error')) : t('page.achievements.private')}</div></PCard>;
  const liveActivity: ActivityRow[] | null = activity ? activity.map(a => toActivityRow(a, now, t, locale)) : null;
  const subtitle: ReactNode = live
    ? isMe
      ? sessionUser && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span title={sessionUser.walletAddress} style={{ fontVariantNumeric: 'tabular-nums' }}>{shortWallet}</span>
          <CopyButton value={sessionUser.walletAddress} label={t('page.copy')} />
          {sessionUser.email && (
            <>
              <span aria-hidden="true">·</span>
              <span style={{ overflowWrap: 'anywhere' }}>{sessionUser.email}</span>
              {!sessionUser.emailVerified && (
                <button type="button" onClick={() => setEditing(true)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} aria-label={t('page.verifyEmail')}>
                  <PTag label={t('page.unverified')} color="neutral" />
                </button>
              )}
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{t('page.memberSince', { date: fmtDate(stats?.memberSince ?? sessionUser.createdAt, { month: 'long', year: 'numeric' }, locale) })}</span>
        </span>
      )
      : personLive?.isPublic
        ? personLive.memberSince ? t('page.memberSince', { date: fmtDate(personLive.memberSince, { month: 'long', year: 'numeric' }, locale) }) : ''
        : t('page.privateProfile')
    : isMe ? `@maxrodriguez · 0x4a9fE2b8…d82c · ${t('page.memberSince', { date: localMonthLabel('Mar 2025', months12) })}` : `@${person?.handle ?? ''}`;

  return (
    <div className="g-page" style={{ padding: isMobile ? '16px 16px 40px' : '24px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Switching to the company is done from the hexagon on the photo's corner. */}
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, minHeight: 28 }}>
          <button onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13 }}>
            {Icons.back} {t('page.back')}
          </button>
        </div>
      )}

      {/* Header — same card as the company profile, round photo instead of
          the hexagon (the company's hexagon is its badge) */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'relative', height: isMobile ? 150 : 230 }}>
          <AuroraCover />
          <div style={{ position: 'absolute', left: isMobile ? 16 : 28, bottom: -avatar / 2 }}>
            <IdentityAvatar mode="personal" company={company?.name} companyLogoUrl={company?.logoUrl} size={avatar} user={user} onSwap={toCompany} self={isMe} />
          </div>
        </div>

        <div style={{ padding: isMobile ? '12px 16px 18px' : '14px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: avatar / 2 - 6 }}>
            {isMe
              ? <PBtn variant="secondary" small onClick={live ? () => setEditing(true) : undefined}>{t('page.editProfile')}</PBtn>
              : person && followTarget && <FollowButton following={followState.following} onToggle={() => follow.toggle(followKey, followTarget, followBase)} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 22 : 26, color: 'var(--text)', letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>{user.name}</h1>
            {kyc && <PTag label={kyc.label} color={kyc.color} />}
            {level !== null && <PTag label={t('page.levelTag', { level })} />}
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--ter)', marginBottom: 12 }}>{subtitle}{isMe && <GuideButton tour="profile" />}</div>
          {avatarActions.error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)', marginBottom: 8 }}>{avatarActions.error}</div>}
          {bio && (
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.55, maxWidth: 680, marginBottom: 16 }}>{bio}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontFamily: 'var(--font-b)', fontSize: 14 }}>
              {counts.map(([id, v, l, onClick]) => (
                <button key={id} onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                  <b style={{ color: 'var(--text)' }}>{v}</b> <span style={{ color: 'var(--ter)' }}>{l}</span>
                </button>
              ))}
            </div>
            <LevelMini lv={level} hint={levelHint} onOpen={() => setSection('logros')} full={isMobile} />
          </div>
        </div>
      </motion.header>

      {live && isMe && <EditProfileModal open={editing} onClose={() => setEditing(false)} avatar={avatarActions} />}

      {listTab && social && (
        <PersonFollowLists source={source} person={social} title={user.name} initialTab={listTab} followers={followersCount}
          following={followingCount} nav={nav} onClose={() => setListTab(null)} />
      )}

      {/* Tabs */}
      <div className="no-scrollbar" role="tablist" data-guide="profile-tabs" style={{ display: 'flex', gap: 4, boxShadow: 'inset 0 -1px 0 var(--border-l)', marginBottom: 18, overflowX: 'auto', overflowY: 'hidden' }}>
        {sections.map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} role="tab" aria-selected={section === id}
            data-guide={id === 'empresa' ? 'profile-company-tab' : id === 'cuenta' ? 'profile-account-tab' : undefined}
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
              <RecentInvestments holdings={holdings} nav={nav} isMe={isMe} onMore={() => setSection('inversiones')}
                emptyText={investments ? undefined : t('page.investments.hidden')} loading={live && isMe && holdingsLoading && !liveHoldings} />
              {holdings.length > 0 && amountsKnown && <CategoryBreakdown holdings={holdings} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18, minWidth: 0 }}>
              {levelCard}
              {achCard}
              {isMe && <QuickLinks nav={nav} live={live} />}
            </div>
          </div>
        </>
      )}

      {section === 'inversiones' && (
        <ProjectBrowser items={holdings} nav={nav} isMobile={isMobile} placeholder={t('page.investments.searchPlaceholder')}
          emptyText={investments ? t('page.investments.browserEmpty') : t('page.investments.browserHidden')} />
      )}

      {section === 'logros' && (
        live && !isMe
          ? level === null
            ? <PCard style={{ padding: '22px 24px' }}><div style={cardTitle}>{t('page.sections.achievements')}</div><div style={cardSub}>{t('page.levelSection.privateProfile')}</div></PCard>
            : <LevelWidgets isMobile={isMobile} d={levelData} privateStats />
          : live && !stats
            ? <PCard style={{ padding: '22px 24px' }}>{statsLoading ? <Skeleton rows={3} /> : <Notice tone="error">{t('page.levelSection.error')}</Notice>}</PCard>
            : <LevelWidgets isMobile={isMobile} d={levelData} achievements={live ? achievements : undefined} />
      )}

      {section === 'actividad' && isMe && (
        live
          ? <ActivityCard items={liveActivity} loading={activityLoading} error={Boolean(activityError)} paged />
          : <ActivityCard items={demoActivity(t)} />
      )}

      {section === 'empresa' && isMe && live && <MyCompanySection nav={nav} />}

      {section === 'cuenta' && isMe && (
        <>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 12 }}>{t('page.accountNote')}</div>
          <AccountTabs live={live} isMobile={isMobile} tab={tab} setTab={setTab} twofa={twofa} setTwofa={setTwofa} priv={priv} setPriv={setPriv}
            years={years} taxYear={taxYear ?? years[0] ?? new Date(now).getFullYear()} setTaxYear={setTaxYear} />
        </>
      )}
    </div>
  );
}

/** A catalog-less project card (a holding of a project the catalog no longer lists). */
function fallbackAsset(id: number, name: string, cat: AssetCategory, location: string, imageUrl: string | null): SocialAsset {
  const img = mediaUrl(imageUrl);
  return {
    id, name, cat, location, img, images: [img], country: '', company: '', issuer: 'community', valuation: 0, tokenPrice: 0,
    totalTokens: 0, sold: 0, apy: 0, stage: 'Operativo', lifespan: '', contract: '', desc: '', perf: [], live: true,
  };
}

function toActivityRow(a: ActivityItem, now: number, t: TFn, locale: string): ActivityRow {
  const type: ActivityTone = a.type === 'dividend' ? 'pos' : a.type === 'investment' ? 'invest' : a.type;
  return {
    key: a.id,
    label: a.detail ? `${a.title} — ${a.detail}` : a.title,
    amount: a.amount === null ? null : `${a.type === 'dividend' ? '+' : ''}${fmtUSD(a.amount)}`,
    time: <time dateTime={a.at}>{fmtRelative(a.at, now, t, locale)}</time>,
    type,
  };
}

// ─── Followers / following of a person ──────────────────────────────────────
type FollowListsProps = {
  source: SocialSource | null;
  person: PersonProfile;
  title: string;
  initialTab: FollowListTabId;
  followers: number;
  following: number;
  nav: NavFn;
  onClose: () => void;
};

function PersonFollowLists({ source, person, title, initialTab, followers, following, nav, onClose }: FollowListsProps) {
  const { t } = useT('profile');
  const target: FollowTarget = { kind: 'person', id: person.id };
  const followersQ = useSocialQuery(source, `followers:${person.id}:${followers}`, s => s.followers(target), src => src.listFollowers(target, null));
  const followingQ = useSocialQuery(source, `following:${person.id}:${following}`, s => s.following(target), src => src.listFollowing(target, null));
  const follow = useFollowToggle(source);
  const keyOf = (e: FollowEntry) => (e.kind === 'company' ? `company-${e.slug}` : `person-${e.id}`);
  const targetOf = (e: FollowEntry): FollowTarget => (e.kind === 'company' ? { kind: 'company', slug: e.slug } : { kind: 'person', id: e.id });
  const withState = (items: readonly FollowEntry[]) => items.map(e => ({ ...e, isFollowing: follow.stateOf(keyOf(e), { following: e.isFollowing, followers: 0 }).following }));
  const followerItems = withState(followersQ.data?.items ?? []);
  const followingItems = withState(followingQ.data?.items ?? []);
  const followersCount = followersQ.data?.count ?? followers;
  const followingCount = followingQ.data?.count ?? following;
  const open = (e: FollowEntry) => {
    if (e.kind === 'company') nav('empresa', e.slug);
    else if (e.isSelf) nav('perfil');
    else nav('usuario', e.id);
  };
  return (
    <FollowListModal title={title} initialTab={initialTab} onClose={onClose} onOpen={open}
      onToggleFollow={e => follow.toggle(keyOf(e), targetOf(e), { following: e.isFollowing, followers: 0 })}
      tabs={[
        { id: 'followers', label: t('page.followTabs.followers', { count: fmtCount(followersCount) }), items: followerItems, more: followersCount - followerItems.length, loading: followersQ.loading },
        { id: 'following', label: t('page.followTabs.following', { count: fmtCount(followingCount) }), items: followingItems, loading: followingQ.loading },
      ]} />
  );
}

// Months from a "Mar 2025"-style date to the demo's today (Jun 2026).
const MONTH_IDX: Record<string, number> = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 };
function monthsSince(label: string | undefined): number {
  const [m, y] = String(label || '').split(' ');
  if (!(m in MONTH_IDX) || !y) return 0;
  return (2026 - Number(y)) * 12 + (5 - MONTH_IDX[m]);
}

// Compact level system for the profile header: badge, 5-step track and
// what's left for the next level. Opens the "Nivel y logros" tab.
function LevelMini({ lv, hint, onOpen, full }: { lv: number | null; hint: string; onOpen: () => void; full: boolean }) {
  const { t } = useT('profile');
  const level = lv ?? 0;
  return (
    <button onClick={onOpen} title={t('page.levelInfo.open')}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: full ? '100%' : 340, padding: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'var(--text)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 16, color: 'var(--surface)',
      }}>{lv ?? '—'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, fontFamily: 'var(--font-b)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('page.levelInfo.title')}</span>
          <span style={{ fontSize: 11.5, color: 'var(--ter)' }}>{hint}</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{ flex: 1 }}>
              <div style={{ height: 6, borderRadius: 99, background: n <= level ? 'var(--text)' : 'var(--surface2)', opacity: n < level ? 0.55 : 1 }} />
              <div style={{ marginTop: 4, fontFamily: 'var(--font-b)', fontSize: 10, textAlign: 'center', color: n === level ? 'var(--text)' : 'var(--ter)', fontWeight: n === level ? 700 : 400 }}>{t('page.levelInfo.short', { n })}</div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

const IC = {
  chart: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19h16" /><path d="M5 15l4-4 3 3 7-7" /><path d="M15 7h4v4" /></svg>,
  grid: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>,
  arrowR: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>,
  star: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" /></svg>,
};

const cardTitle = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15.5, color: 'var(--text)', letterSpacing: '-0.01em' } as const;
const cardSub = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 } as const;

function KpiRow({ kpis, isMobile }: { kpis: readonly Kpi[]; isMobile: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
      {kpis.map((k, i) => (
        <motion.div key={k.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <PCard style={{ padding: isMobile ? '14px 14px' : '16px 18px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--surface2)', color: 'var(--sec)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{k.icon}</span>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'var(--ter)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 20 : 24, letterSpacing: '-0.03em', overflowWrap: 'anywhere',
              color: k.tone === 'pos' ? 'var(--pos)' : k.tone === 'neg' ? 'var(--neg, #ef4444)' : 'var(--text)' }}>{k.value}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 3 }}>{k.sub}</div>
          </PCard>
        </motion.div>
      ))}
    </div>
  );
}

// Compact rows of the latest investments for the summary tab.
function RecentInvestments({ holdings, nav, onMore, isMe, emptyText, loading }: {
  holdings: readonly Investment[]; nav: NavFn; onMore: () => void; isMe: boolean; emptyText?: string; loading?: boolean;
}) {
  const { t } = useT('profile');
  const { t: tc } = useT('common');
  const rows = [...holdings].sort((a, b) => monthsSince(a.since) - monthsSince(b.since)).slice(0, 4);
  return (
    <PCard style={{ padding: '20px 20px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={cardTitle}>{isMe ? t('page.investments.mine') : t('page.investments.title')}</div>
          <div style={cardSub}>{t('page.investments.recent')}</div>
        </div>
        {holdings.length > 0 && (
          <button onClick={onMore} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border-l)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {t('page.investments.seeAll', { count: holdings.length })} {IC.arrowR}
          </button>
        )}
      </div>
      {holdings.length === 0 && (
        loading
          ? <div style={{ padding: '12px 0 16px' }}><Skeleton rows={2} /></div>
          : <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '12px 0 16px' }}>{emptyText ?? t('page.investments.none')}</div>
      )}
      {rows.map((h, i) => {
        const a = h.asset;
        return (
          <button key={a.id} onClick={() => nav('detalle', a)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
            <img src={a.img} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tc(`categories.${a.cat}`)} · {a.location}</div>
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

function StagePill({ stage }: { stage: SocialAsset['stage'] }) {
  const { t: tc } = useT('common');
  const op = stage === 'Operativo';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 600, color: op ? 'var(--pos)' : 'var(--sec)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: op ? 'var(--pos)' : '#f5a623' }} />{tc(`stages.${stage}`)}
    </span>
  );
}

// Where the portfolio is, by category: one stacked bar + legend.
const CAT_COLORS = ['#3b82f6', '#22c55e', '#f5a623', '#a78bfa', '#ef4444', '#06b6d4', '#ec4899'];
function CategoryBreakdown({ holdings }: { holdings: readonly Investment[] }) {
  const { t } = useT('profile');
  const { t: tc } = useT('common');
  const total = holdings.reduce((s, h) => s + (h.current ?? 0), 0) || 1;
  const byCat = categoriesOf(holdings, h => h.current ?? 0);
  return (
    <PCard style={{ padding: '20px 20px' }}>
      <div style={cardTitle}>{t('page.breakdown.title')}</div>
      <div style={{ ...cardSub, marginBottom: 14 }}>{t('page.breakdown.sub')}</div>
      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
        {byCat.map(([cat, v], i) => <div key={cat} style={{ width: `${(v / total) * 100}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {byCat.map(([cat, v], i) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-b)', fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text)', fontWeight: 600 }}>{tc(`categories.${cat}`)}</span>
            <span style={{ color: 'var(--ter)' }}>{fmtUSD(v)}</span>
            <b style={{ color: 'var(--text)', minWidth: 38, textAlign: 'right' }}>{((v / total) * 100).toFixed(0)}%</b>
          </div>
        ))}
      </div>
    </PCard>
  );
}

const ACT_ICON: Record<ActivityTone, ReactNode> = {
  pos: Icons.receive,
  invest: Icons.token,
  kyc: Icons.shield,
  support: Icons.help,
  account: Icons.profile,
};

// `items` null: still loading (live) or failed; `paged`: long histories show the first rows with "Ver toda".
function ActivityCard({ items, loading, error, paged }: { items: readonly ActivityRow[] | null; loading?: boolean; error?: boolean; paged?: boolean }) {
  const { t } = useT('profile');
  const [all, setAll] = useState(false);
  const list = items ?? [];
  const shown = paged && !all ? list.slice(0, ACTIVITY_PAGE) : list;
  return (
        <PCard style={{ padding: '22px 24px' }}>
          <h2 style={{ ...cardTitle, margin: '0 0 12px' }}>{t('page.activity.title')}</h2>
          {!items ? (
            loading ? <Skeleton rows={4} /> : error ? <Notice tone="error">{t('page.activity.error')}</Notice> : null
          ) : list.length === 0 ? (
            <EmptyState title={t('page.activity.emptyTitle')} text={t('page.activity.emptyText')} />
          ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', listStyle: 'none', margin: 0, padding: 0 }}>
            {shown.map((a, i) => (
              <motion.li key={a.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + Math.min(i, ACTIVITY_PAGE) * 0.06 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < shown.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activityColor[a.type] }}>{ACT_ICON[a.type]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)', overflowWrap: 'anywhere' }}>{a.label}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{a.time}</div>
                </div>
                {a.amount && (
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: a.type === 'pos' ? 'var(--pos)' : 'var(--text)', flexShrink: 0 }}>{a.amount}</div>
                )}
              </motion.li>
            ))}
          </ul>
          )}
          {paged && list.length > ACTIVITY_PAGE && (
            <button type="button" onClick={() => setAll(v => !v)} aria-expanded={all} style={{ marginTop: 12, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>
              {all ? t('page.activity.showLess') : t('page.activity.showAll', { count: list.length })}
            </button>
          )}
        </PCard>
  );
}

// Level: badge, segmented track with the current step highlighted, and
// the three headline stats. Plain card, no rainbow border.
function LevelCard({ lv, hint, stats, onOpen }: { lv: number | null; hint: string; stats: ReadonlyArray<readonly [string, LevelStatId]>; onOpen?: () => void }) {
  const { t } = useT('profile');
  const level = lv ?? 0;
  return (
    <PCard style={{ padding: '20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--text)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 19, flexShrink: 0 }}>{lv ?? '—'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardTitle}>{t('page.levelInfo.title')}</div>
          <div style={{ ...cardSub, marginTop: 2 }}>{hint}</div>
        </div>
        {onOpen && (
          <button onClick={onOpen} aria-label={t('page.levelInfo.open')} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-l)', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{IC.arrowR}</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{ flex: 1, height: 6, borderRadius: 99, background: n <= level ? 'var(--text)' : 'var(--surface2)', opacity: n < level ? 0.55 : 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 10.5, color: n === level ? 'var(--text)' : 'var(--ter)', fontWeight: n === level ? 700 : 500 }}>{t('page.levelInfo.short', { n })}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        {stats.map(([v, l]) => (
          <div key={l} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {l === 'reputation' && v !== '—' ? <>{v}<span style={{ color: '#f5a623', display: 'flex' }}>{IC.star}</span></> : v}
            </div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', marginTop: 2 }}>{t(`page.levelInfo.stats.${l}`)}</div>
          </div>
        ))}
      </div>
    </PCard>
  );
}

// Achievement tiles with line icons; locked ones show a lock and progress.
function AchievementsCard({ achievements, onOpen }: { achievements: readonly Achievement[]; onOpen: () => void }) {
  const { t } = useT('profile');
  const done = achievements.filter(a => a.p >= 1).length;
  return (
    <PCard style={{ padding: '20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={cardTitle}>{t('page.achievements.title')}</div>
        <button onClick={onOpen} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>
          <b style={{ color: 'var(--text)' }}>{done}</b> {t('page.achievements.ofTotal', { total: achievements.length })}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
        {achievements.map((a, i) => {
          const ok = a.p >= 1;
          return (
            <motion.div key={a.label} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}
              aria-label={t('page.achievements.aria', { label: a.label, state: ok ? t('page.achievements.achievedAria') : `${Math.round(a.p * 100)}%` })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 14, background: 'var(--surface2)', minWidth: 0 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ok ? 'var(--text)' : 'transparent', color: ok ? 'var(--surface)' : 'var(--ter)', border: ok ? 'none' : '1px dashed var(--border)' }}>
                <AchievementIcon name={ok ? a.icon : 'lock'} size={17} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700, color: ok ? 'var(--text)' : 'var(--sec)', lineHeight: 1.25 }}>{a.label}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', marginTop: 2 }}>{ok ? t('page.achievements.achieved') : `${Math.round(a.p * 100)}%`}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </PCard>
  );
}

function QuickLinks({ nav, live }: { nav: NavFn; live: boolean }) {
  const { t } = useT('profile');
  return (
    <>
        <PCard style={{ padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>{t('page.quickLinks.title')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {([
              ['investments', () => nav('pertenencias'), 'var(--accent-bg)', 'var(--accent-text)'],
              ['dashboard',   () => nav('dashboard'),    'var(--surface2)',  'var(--sec)'         ],
              ['academy',     () => nav('academia'),     'var(--surface2)',  'var(--sec)'         ],
              ['help',        () => nav('ayuda'),        'var(--surface2)',  'var(--sec)'         ],
            ] as const).map(([id, action, bg, color]) => (
              <button key={id} onClick={action} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12, border: 'none',
                background: bg, color, cursor: 'pointer',
                fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 600,
                transition: 'opacity 0.15s',
              }}>
                {t(`page.quickLinks.${id}`)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>
        </PCard>

        {/* Referral card (live: the programme doesn't exist yet) */}
        {live ? <ReferralSoon /> : (
        <div className="shimmer-surface" style={{
          borderRadius: 18, padding: '20px 22px',
          background: 'linear-gradient(135deg, oklch(0.20 0.03 265) 0%, oklch(0.28 0.08 270) 100%)',
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{t('page.referral.title')}</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, opacity: 0.7, lineHeight: 1.55, marginBottom: 14 }}>
            {t('page.referral.text')}
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
            }}>{t('page.referral.copy')}</button>
          </div>
        </div>
        )}
    </>
  );
}

type TwoFa = { totp: boolean; passkey: boolean; sms: boolean };
type AccountTabsProps = {
  live: boolean;
  isMobile: boolean;
  tab: AccountTab;
  setTab: (t: AccountTab) => void;
  twofa: TwoFa;
  setTwofa: (f: (p: TwoFa) => TwoFa) => void;
  priv: boolean[];
  setPriv: (f: (p: boolean[]) => boolean[]) => void;
  years: number[];
  taxYear: number;
  setTaxYear: (y: number) => void;
};

function AccountTabs({ live, isMobile, tab, setTab, twofa, setTwofa, priv, setPriv, years, taxYear, setTaxYear }: AccountTabsProps) {
  const { t, raw } = useT('profile');
  const { t: tc } = useT('common');
  const months12 = raw<string[]>('social.months');
  const kycChecks = raw<string[]>('page.demo.kyc.checks');
  const privacyItems = raw<{ label: string; desc: string }[]>('page.demo.privacy.items');
  const openYear = (y: number) => {
    setTaxYear(y);
    setTab('tax');
  };
  return (
        <div style={{ marginTop: 28 }}>
          <div role="tablist" aria-label={t('page.accountTabs.aria')} style={{ display: 'flex', gap: 3, background: 'var(--surface2)', borderRadius: 14, padding: 4, width: 'fit-content', marginBottom: 20, ...(isMobile ? { maxWidth: '100%', overflowX: 'auto', scrollbarWidth: 'none' } : null) }}>
            {TABS.map(id => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{
                padding: '9px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
                background: tab === id ? 'var(--surface)' : 'transparent',
                color: tab === id ? 'var(--text)' : 'var(--ter)',
                fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: tab === id ? 600 : 500,
                boxShadow: tab === id ? 'var(--sh-sm)' : 'none', transition: 'all 0.16s',
                ...(isMobile ? { flexShrink: 0, whiteSpace: 'nowrap', padding: '9px 14px' } : null),
              }}>{t(`page.accountTabs.${id}`)}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* KYC */}
            {tab === 'kyc' && (
              <motion.div key="kyc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {live ? <KycLive /> : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <PCard style={{ padding: '22px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{t('page.demo.kyc.title')}</div>
                      <PTag label={t('page.demo.kyc.verified')} color="green" />
                    </div>
                    {kycChecks.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < kycChecks.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)' }}>{c}</span>
                      </div>
                    ))}
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 14 }}>{t('page.demo.kyc.verifiedBy', { date: localMonthLabel('1 Jun 2026', months12) })}</div>
                  </PCard>

                  <PCard style={{ padding: '22px 24px' }}>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>{t('page.demo.kyc.personalInfo')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {([['fullName','Maximiliano Rodríguez'],['birthDate',localMonthLabel('14 Mar 1991', months12)],['nationality',tc('countries.Argentina')],['docType','DNI'],['docNumber','38.421.764'],['residence',tc('countries.Argentina')]] as const).map(([k,v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-l)', paddingBottom: 10 }}>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{t(`page.demo.kyc.fields.${k}`)}</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </PCard>
                </div>
                )}
              </motion.div>
            )}

            {/* Docs */}
            {tab === 'docs' && (
              <motion.div key="docs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {live ? <DocumentsTab years={years} onOpenYear={openYear} /> : (
                <PCard style={{ padding: '22px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>{t('page.demo.docs.title')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
                    {([['idFront','id','28 May 2026'],['idBack','id','28 May 2026'],['address','utility','30 May 2026'],['selfie','face','28 May 2026']] as const).map(([name, type, date], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--border-l)', background: 'var(--surface2)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>{Icons.doc}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{t(`page.demo.docs.items.${name}`)}</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{t(`page.demo.docs.types.${type}`)} · {localMonthLabel(date, months12)}</div>
                        </div>
                        <PTag label="✓" color="green" />
                      </div>
                    ))}
                  </div>
                </PCard>
                )}
              </motion.div>
            )}

            {/* 2FA */}
            {tab === '2fa' && (
              <motion.div key="2fa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {live ? <SecurityTab /> : (
                <PCard style={{ padding: '22px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>{t('page.demo.twofa.title')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {([
                      ['totp',    t('page.demo.twofa.totp'),    t('page.demo.twofa.totpSub'),                                  '🔐'],
                      ['passkey', t('page.demo.twofa.passkey'), t('page.demo.twofa.passkeySub'),                               '🪪'],
                      ['sms',     t('page.demo.twofa.sms'),     t('page.demo.twofa.smsSub', { phone: '+54 9 11 XXXX XXXX' }), '📱'],
                    ] as const).map(([id, label, sub, icon]) => (
                      <div key={id} style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
                        borderRadius: 14, border: `1.5px solid ${twofa[id] ? 'var(--accent)' : 'var(--border-l)'}`,
                        background: twofa[id] ? 'var(--accent-bg)' : 'var(--surface2)',
                        transition: 'all 0.2s',
                        ...(isMobile ? { flexWrap: 'wrap', gap: 12, padding: '14px' } : null),
                      }}>
                        <div style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{icon}</div>
                        <div style={{ flex: 1, ...(isMobile ? { minWidth: 160 } : null) }}>
                          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 2 }}>{sub}</div>
                        </div>
                        {twofa[id] && <PTag label={t('page.demo.twofa.active')} color="green" />}
                        <PBtn variant={twofa[id] ? 'secondary' : 'accent'} small onClick={() => setTwofa(p => ({...p,[id]:!p[id]}))}>
                          {twofa[id] ? t('page.demo.twofa.disable') : t('page.demo.twofa.enable')}
                        </PBtn>
                      </div>
                    ))}
                  </div>
                </PCard>
                )}
              </motion.div>
            )}

            {/* Tax */}
            {tab === 'tax' && (
              <motion.div key="tax" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {live ? <StatementsTab year={taxYear} years={years} onYear={setTaxYear} /> : (<>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  {[['2025','$4,590',t('page.demo.tax.yieldRwa')],['2024','$2,130',t('page.demo.tax.yieldRwa')]].map(([year, amount, desc]) => (
                    <PCard key={year} style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{t('page.demo.tax.fiscalYear')}</div>
                          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 32, color: 'var(--text)', letterSpacing: '-0.03em' }}>{year}</div>
                        </div>
                        <PTag label={t('page.demo.tax.available')} color="green" />
                      </div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 4 }}>{desc}</div>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 18 }}>{amount}</div>
                      <PBtn variant="secondary" small style={{ width: '100%', justifyContent: 'center' }}>{t('page.demo.tax.download')}</PBtn>
                    </PCard>
                  ))}
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 14, lineHeight: 1.65, padding: '0 4px' }}>
                  {t('page.demo.tax.note')}
                </div>
                </>)}
              </motion.div>
            )}

            {/* Privacy */}
            {tab === 'priv' && (
              <motion.div key="priv" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {live ? <PrivacyTab /> : (<>
                <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>{t('page.demo.privacy.title')}</div>
                  {privacyItems.map(({ label, desc }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 0', borderBottom: i < privacyItems.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>{desc}</div>
                      </div>
                      <button
                        role="switch" aria-checked={priv[i]} aria-label={label}
                        onClick={() => setPriv(p => { const n=[...p]; n[i]=!n[i]; return n; })}
                        style={{ width: 44, height: 24, borderRadius: 999, background: priv[i] ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, marginTop: 2, transition: 'background 0.2s' }}
                      >
                        <div style={{ position: 'absolute', top: 3, left: priv[i] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                      </button>
                    </div>
                  ))}
                </PCard>

                <PCard style={{ padding: '22px 24px', border: '1.5px solid var(--neg)' }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--neg)', marginBottom: 6 }}>{t('page.demo.privacy.danger')}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', marginBottom: 16 }}>{t('page.demo.privacy.dangerText')}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : undefined }}>
                    <PBtn variant="secondary" small style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }}>{t('page.demo.privacy.download')}</PBtn>
                    <PBtn variant="secondary" small style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }}>{t('page.demo.privacy.delete')}</PBtn>
                  </div>
                </PCard>
                </>)}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
  );
}
