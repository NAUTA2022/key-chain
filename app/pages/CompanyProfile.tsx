import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { PBtn, Icons } from '~/components/ui';
import FeedBrowser from '~/components/social/FeedBrowser';
import { VerifiedBadge } from '~/components/social/ProfileCard';
import IdentityAvatar from '~/components/social/IdentityAvatar';
import { CompanySummary, CompanyAnalytics, CompanyTrust, CompanyReviews, type CompanySectionTab } from '~/components/social/CompanySections';
import ProjectBrowser from '~/components/social/ProjectBrowser';
import FollowListModal from '~/components/social/FollowList';
import CompanyEditModal from '~/components/social/CompanyEditModal';
import { useMobile } from '~/hooks/useMobile';
import { useHoldings } from '~/lib/onchain';
import { fmtCount } from '~/lib/projectFeed';
import { NO_FEED_FILTERS, useFollowToggle, useSocialQuery, useSocialSource } from '~/lib/social/source';
import type { NavFn, RouteKey } from '~/lib/navigation';
import GuideButton from '~/features/guide/GuideButton';
import { useT } from '~/i18n/useT';
import type { CompanyProfile as Company, FeedQuery, FollowEntry, FollowTarget, Review, ReviewInput, SocialAsset, SocialSource } from '~/lib/social/types';

// Company (issuer) profile — opened from the Feed's featured profiles or any
// issuer name on a post. Cover, avatar, Seguir, bio and counts on top; then
// Resumen, Proyectos, Hitos (milestones of all its projects, browsed like the
// Feed), Analítica, Rentabilidad y confianza and Reseñas. For the signed-in user's own company it also shows the
// Personal / Empresa switch and the double avatar (hexagon + round badge).
// `embedded`: rendered inside the Perfil page (no "Volver"; switching to
// personal calls `onPersonal` instead of navigating).

type CompanyProfileProps = {
  nav: NavFn;
  /** Company slug (`/empresas/<slug>`). */
  slug: string;
  /** Page the user came from (enables "Volver" to it). */
  fromRoute?: RouteKey | null;
  embedded?: boolean;
  onPersonal?: () => void;
};

/** Every post of a company (for its summary and metrics), newest first. */
const LIVE_POSTS_LIMIT = 100;
const allPostsOf = (slug: string): FeedQuery => ({ ...NO_FEED_FILTERS, scope: { kind: 'company', slug }, milestonesOnly: false });

// Labels by id: companyPage.tabs.<id>.
const TABS_BASE: readonly CompanySectionTab[] = ['resumen', 'proyectos', 'hitos', 'analitica', 'confianza', 'resenas'];

export default function CompanyProfile({ nav, slug, fromRoute, embedded, onPersonal }: CompanyProfileProps) {
  const { t } = useT('profile');
  const isMobile = useMobile();
  const navigate = useNavigate();
  const source = useSocialSource();
  const companyQ = useSocialQuery(source, `company:${slug}`, s => s.company(slug), src => src.getCompany(slug));
  const postsQ = useSocialQuery(source, `company-posts:${slug}`,
    s => s.feed(allPostsOf(slug), null, Number.MAX_SAFE_INTEGER).items,
    src => src.listFeed(allPostsOf(slug), null, LIVE_POSTS_LIMIT).then(p => p.items));
  // Reviews live in the source so the tab count, the summary and the trust
  // index all see the ones written in this session.
  const reviewsQ = useSocialQuery(source, `reviews:${slug}`, s => s.reviews(slug), src => src.listReviews(slug));
  const follow = useFollowToggle(source);
  // Live: only the projects the viewer holds can be reviewed (the API checks it too).
  const { data: holdings } = useHoldings();
  const [tab, setTab] = useState<CompanySectionTab>('resumen');
  const [showFollowers, setShowFollowers] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const profile = companyQ.data ?? null;
  const posts = postsQ.data ?? [];
  const reviews = reviewsQ.data ?? [];
  // Back to wherever the user came from inside the app (the URL keeps its
  // data: a project, another profile), or to the Feed.
  const back = () => (fromRoute ? navigate(-1) : nav('feed'));

  if (!profile) {
    return (
      <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto', fontFamily: 'var(--font-b)', color: 'var(--ter)' }}>
        {companyQ.loading
          ? <span role="status">{t('companyPage.loading')}</span>
          : <>{t('companyPage.notFound')} <PBtn variant="secondary" small onClick={back}>{t('companyPage.back')}</PBtn></>}
      </div>
    );
  }

  const isMine = profile.isMine;
  const owner = profile.owner;
  const live = profile.live;
  // Switching to the owner's personal profile: mine is the Perfil page; anyone else's is their public profile.
  const toPersonal = () => {
    if (isMine) return onPersonal ? onPersonal() : nav('perfil');
    if (owner) nav('usuario', owner.id);
  };

  const target: FollowTarget = { kind: 'company', slug: profile.slug };
  const base = { following: profile.isFollowing, followers: profile.followers };
  const { following, followers } = follow.stateOf(profile.slug, base);
  const avatar = isMobile ? 84 : 112;
  const milestones = posts.filter(p => p.post.milestone);
  // Live: the API counts every milestone (the posts list is only the latest page).
  const milestoneCount = live ? live.stats.milestones : milestones.length;
  const counts: Partial<Record<CompanySectionTab, number>> = { proyectos: profile.allAssets.length, hitos: milestoneCount, resenas: reviews.length };
  const tabs = TABS_BASE.map(id => {
    const label = t(`companyPage.tabs.${id}`);
    const n = counts[id];
    return [id, n === undefined ? label : t('companyPage.tabWithCount', { label, count: n })] as const;
  });
  const sectionProps = { profile, posts, reviews, nav, isMobile };
  const reviewFailed = (e: unknown) => {
    setReviewError(e instanceof Error ? e.message : t('companyPage.reviewSaveError'));
    return false;
  };
  const addReview = (input: ReviewInput): Promise<boolean> => {
    if (!source) return Promise.resolve(false);
    setReviewError(null);
    return source.addReview(profile.slug, input).then(() => { reviewsQ.reload(); return true; }, reviewFailed);
  };
  const editReview = source?.updateReview && ((r: Review, input: Omit<ReviewInput, 'assetId'>): Promise<boolean> => {
    setReviewError(null);
    return (source.updateReview?.(r.id, input) ?? Promise.reject(new Error(t('companyPage.unavailable')))).then(() => { reviewsQ.reload(); return true; }, reviewFailed);
  });
  const deleteReview = source?.deleteReview && ((r: Review) => {
    if (!window.confirm(t('companyPage.confirmDeleteReview'))) return;
    setReviewError(null);
    source.deleteReview?.(r.id).then(() => reviewsQ.reload(), reviewFailed);
  });
  // Live: the projects of this company the viewer holds.
  const reviewable = live ? profile.allAssets.filter(a => holdings?.some(h => h.assetId === a.id && h.tokens > 0)) : undefined;
  const canEdit = !!live?.canEdit && !!source?.updateCompany;
  // Live without an owner: the hexagon alone (no personal badge to switch to).
  const ownerFace = owner ?? { name: profile.name, initial: profile.name.slice(0, 1), gradient: 'var(--surface2)' };

  return (
    <div className="g-page" style={{ padding: isMobile ? '16px 16px 40px' : '24px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Switching to the owner's personal profile is done from the round
          photo on the hexagon's corner. */}
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, minHeight: 28 }}>
          <button onClick={back}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13 }}>
            {Icons.back} {t('companyPage.back')}
          </button>
        </div>
      )}

      {/* Header */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'relative', height: isMobile ? 150 : 230 }}>
          <img src={profile.cover} alt="" fetchPriority="high" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.3) brightness(0.72)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />
          {/* Big company hexagon with its owner's round photo as a badge
              (tap it to switch to the owner's personal profile). */}
          <div style={{ position: 'absolute', left: isMobile ? 16 : 28, bottom: -avatar / 2 }}>
            <IdentityAvatar mode="company" company={profile.name} companyLogoUrl={profile.logoUrl} size={avatar} onSwap={toPersonal} user={ownerFace} self={isMine} badge={!!owner} />
          </div>
        </div>

        <div style={{ padding: isMobile ? '12px 16px 18px' : '14px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, minHeight: avatar / 2 - 6 }}>
            {canEdit && (
              <PBtn variant="secondary" small onClick={() => setEditing(true)} style={{ height: 38 }}>{t('companyPage.editProfile')}</PBtn>
            )}
            {/* Live only: the owner's shortcut to the tokenization wizard. */}
            {live && isMine && (
              <PBtn variant="accent" small onClick={() => nav('wizard')} style={{ height: 38 }}>{t('companyPage.tokenize')}</PBtn>
            )}
            {!isMine && (
              <button onClick={() => follow.toggle(profile.slug, target, base)} aria-pressed={following} data-guide="company-follow"
                style={{
                  height: 38, padding: '0 26px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5,
                  border: following ? '1px solid var(--border-l)' : '1px solid var(--text)',
                  background: following ? 'transparent' : 'var(--text)',
                  color: following ? 'var(--text)' : 'var(--bg)',
                }}>
                {following ? t('social.follow.following') : t('social.follow.follow')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <h1 data-guide="company-title" style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 22 : 26, color: 'var(--text)', letterSpacing: '-0.02em' }}>{profile.name}</h1>
            {profile.verified && <VerifiedBadge size={isMobile ? 18 : 20} guide="company-verified" />}
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--ter)', marginBottom: 12 }}>@{profile.handle}<GuideButton tour="companies" /></div>
          <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-b)', fontSize: 14, color: profile.bio ? 'var(--sec)' : 'var(--ter)', lineHeight: 1.55, maxWidth: 680 }}>{profile.bio || (canEdit ? t('companyPage.addBio') : '')}</p>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontFamily: 'var(--font-b)', fontSize: 14 }}>
            <span><b style={{ color: 'var(--text)' }}>{profile.allAssets.length}</b> <span style={{ color: 'var(--ter)' }}>{t('companyPage.projects')}</span></span>
            <button onClick={() => setShowFollowers(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
              <b style={{ color: 'var(--text)' }}>{fmtCount(followers)}</b> <span style={{ color: 'var(--ter)' }}>{t('companyPage.followers')}</span>
            </button>
            <span><b style={{ color: 'var(--text)' }}>{milestoneCount}</b> <span style={{ color: 'var(--ter)' }}>{t('companyPage.milestones')}</span></span>
          </div>
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="no-scrollbar" role="tablist" data-guide="company-tabs" style={{ display: 'flex', gap: 4, boxShadow: 'inset 0 -1px 0 var(--border-l)', marginBottom: 18, overflowX: 'auto', overflowY: 'hidden' }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} role="tab" aria-selected={tab === id}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5,
              fontWeight: tab === id ? 700 : 500, color: tab === id ? 'var(--text)' : 'var(--ter)',
              borderBottom: `2px solid ${tab === id ? 'var(--text)' : 'transparent'}`, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {label}
          </button>
        ))}
      </div>

      {canEdit && source && <CompanyEditModal open={editing} onClose={() => setEditing(false)} profile={profile} source={source} />}

      {showFollowers && (
        <CompanyFollowers source={source} profile={profile} followers={followers} nav={nav} onClose={() => setShowFollowers(false)} />
      )}

      {tab === 'resumen' && (
        <CompanySummary {...sectionProps} owner={owner} onOwner={toPersonal} onTab={setTab} />
      )}

      {tab === 'proyectos' && <ProjectsGrid nav={nav} assets={profile.allAssets} isMobile={isMobile} />}

      {/* Milestones of all its projects, with the same browser as the Feed
          (search, filters, magnet toolbar); each post carries the project
          code. The company header above is the magnet zone. */}
      {tab === 'hitos' && <FeedBrowser source={source} scope={{ kind: 'company', slug: profile.slug }} nav={nav} />}

      {tab === 'analitica' && <CompanyAnalytics {...sectionProps} />}

      {tab === 'confianza' && <CompanyTrust {...sectionProps} />}

      {tab === 'resenas' && (
        <CompanyReviews {...sectionProps} isMine={isMine} viewer={source?.viewer ?? null} onAdd={addReview}
          reviewable={reviewable} onEdit={editReview} onDelete={deleteReview} error={reviewError} />
      )}
    </div>
  );
}

// Mini marketplace of the company's projects (search, Rubro / Estado, sort),
// same cards as the market with each project's identifier.
function ProjectsGrid({ nav, assets, isMobile }: { nav: NavFn; assets: readonly SocialAsset[]; isMobile: boolean }) {
  const { t } = useT('profile');
  return <ProjectBrowser items={assets.map(asset => ({ asset }))} nav={nav} isMobile={isMobile} showCode minCard={300} placeholder={t('social.company.searchProjects')} />;
}

type EntryTarget = { key: string; target: FollowTarget };

type CompanyFollowersProps = { source: SocialSource | null; profile: Company; followers: number; nav: NavFn; onClose: () => void };

// "Seguidores" list of the company, with a Seguir button per person.
function CompanyFollowers({ source, profile, followers, nav, onClose }: CompanyFollowersProps) {
  const { t } = useT('profile');
  const target: FollowTarget = { kind: 'company', slug: profile.slug };
  const list = useSocialQuery(source, `followers:${profile.slug}:${followers}`, s => s.followers(target), src => src.listFollowers(target, null));
  const follow = useFollowToggle(source);
  const entryTarget = (e: FollowEntry): EntryTarget => (e.kind === 'company' ? { key: `company-${e.slug}`, target: { kind: 'company', slug: e.slug } } : { key: `person-${e.id}`, target: { kind: 'person', id: e.id } });
  const items = (list.data?.items ?? []).map(e => {
    const { key } = entryTarget(e);
    return { ...e, isFollowing: follow.stateOf(key, { following: e.isFollowing, followers: 0 }).following };
  });
  const count = list.data?.count ?? followers;
  const open = (e: FollowEntry) => {
    if (e.kind === 'company') nav('empresa', e.slug);
    else if (e.isSelf) nav('perfil');
    else nav('usuario', e.id);
  };
  const toggle = (e: FollowEntry) => {
    const { key, target: tg } = entryTarget(e);
    follow.toggle(key, tg, { following: e.isFollowing, followers: 0 });
  };
  return (
    <FollowListModal title={profile.name} onClose={onClose} onOpen={open} onToggleFollow={toggle}
      tabs={[{ id: 'followers', label: t('companyPage.followersTab', { count: fmtCount(count) }), items, more: count - items.length, loading: list.loading }]} />
  );
}
