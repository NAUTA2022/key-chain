import { useState } from 'react';
import { motion } from 'framer-motion';
import { PBtn, PProgress, Icons } from '../components/ui';
import { fmtUSD } from '../data';
import FeedBrowser from '../components/FeedBrowser';
import { VerifiedBadge } from '../components/ProfileCard';
import { profileByName, useFollowing, useAssetsPosts, fmtCount } from '../lib/projectFeed';
import { useMobile } from '../hooks/useMobile';
import IdentityAvatar, { IdentitySwitch } from '../components/IdentityAvatar';
import Profile from './Profile';
import { CompanySummary, CompanyAnalytics, CompanyTrust, CompanyReviews } from '../components/CompanySections';
import { seedReviews } from '../lib/companyStats';
import { ProjectCode } from '../components/FeedPostCard';
import FollowListModal from '../components/FollowList';
import { companyFollowers } from '../lib/people';
import { MY_COMPANY, ME } from '../lib/me';

// Company (issuer) profile — opened from the Feed's featured profiles or any
// issuer name on a post. Cover, avatar, Seguir, bio and counts on top; then
// Resumen, Proyectos, Hitos (milestones of all its projects, browsed like the
// Feed), Analítica, Rentabilidad y confianza and Reseñas. For the signed-in user's own company it also shows the
// Personal / Empresa switch and the double avatar (hexagon + round badge).
// `embedded`: rendered inside the Perfil page (no "Volver"; switching to
// personal calls `onPersonal` instead of navigating).

export default function CompanyProfile({ nav, name, fromRoute, embedded, onPersonal }) {
  const isMobile = useMobile();
  const profile = profileByName(name);
  const [followed, toggleFollow] = useFollowing();
  const [tab, setTab] = useState('resumen');
  // Reviews live here so the tab count, the summary and the trust index
  // all see the ones written in this session.
  const [reviews, setReviews] = useState(() => seedReviews(profileByName(name)));
  const [showFollowers, setShowFollowers] = useState(false);
  // Other companies: 'company' or 'owner' (the founder's personal profile).
  const [view, setView] = useState('company');
  const posts = useAssetsPosts(profile?.liveAssets || []);
  // Routes that need routeData (a project, another profile) can't be
  // re-entered without it, so those fall back to the Feed.
  const back = () => nav(fromRoute && !['empresa', 'detalle'].includes(fromRoute) ? fromRoute : 'feed');
  const isMine = !!MY_COMPANY && name === MY_COMPANY;
  const toPersonal = () => (isMine ? (onPersonal ? onPersonal() : nav('perfil')) : setView('owner'));

  if (!profile) {
    return (
      <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto', fontFamily: 'var(--font-b)', color: 'var(--ter)' }}>
        No encontramos este perfil. <PBtn variant="secondary" small onClick={back}>Volver</PBtn>
      </div>
    );
  }

  const owner = isMine ? ME : profile.owner;
  if (view === 'owner') {
    // Exactly the same page as the sidebar's Perfil, with the owner's data.
    return <Profile nav={nav} person={owner} company={profile.name} onCompany={() => setView('company')} />;
  }

  const following = followed.includes(profile.name);
  const followers = profile.followers + (following ? 1 : 0);
  const avatar = isMobile ? 84 : 112;
  const milestones = posts.filter(p => p.post.milestone);
  const tabs = [
    ['resumen', 'Resumen'],
    ['proyectos', `Proyectos (${profile.allAssets.length})`],
    ['hitos', `Hitos (${milestones.length})`],
    ['analitica', 'Analítica'],
    ['confianza', 'Rentabilidad y confianza'],
    ['resenas', `Reseñas (${reviews.length})`],
  ];
  const sectionProps = { profile, posts, reviews, nav, isMobile };

  return (
    <div className="g-page" style={{ padding: isMobile ? '16px 16px 40px' : '24px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, minHeight: embedded && !isMine ? 0 : 28 }}>
        {!embedded ? (
          <button onClick={back}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13 }}>
            {Icons.back} Volver
          </button>
        ) : <span />}
        <IdentitySwitch value="company" company={profile.name} onChange={toPersonal} personalLabel={isMine ? 'Personal' : owner.name} />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'relative', height: isMobile ? 150 : 230 }}>
          <img src={profile.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.3) brightness(0.72)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />
          {/* Big company hexagon with its owner's round photo as a badge
              (tap it to switch to the owner's personal profile). */}
          <div style={{ position: 'absolute', left: isMobile ? 16 : 28, bottom: -avatar / 2 }}>
            <IdentityAvatar mode="company" company={profile.name} size={avatar} onSwap={toPersonal} user={owner} />
          </div>
        </div>

        <div style={{ padding: isMobile ? '12px 16px 18px' : '14px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: avatar / 2 - 6 }}>
            {!isMine && (
              <button onClick={() => toggleFollow(profile.name)}
                style={{
                  height: 38, padding: '0 26px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5,
                  border: following ? '1px solid var(--border-l)' : '1px solid var(--text)',
                  background: following ? 'transparent' : 'var(--text)',
                  color: following ? 'var(--text)' : 'var(--bg)',
                }}>
                {following ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 22 : 26, color: 'var(--text)', letterSpacing: '-0.02em' }}>{profile.name}</span>
            {profile.verified && <VerifiedBadge size={isMobile ? 18 : 20} />}
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--ter)', marginBottom: 12 }}>@{profile.handle}</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.55, maxWidth: 680, marginBottom: 16 }}>{profile.bio}</div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontFamily: 'var(--font-b)', fontSize: 14 }}>
            <span><b style={{ color: 'var(--text)' }}>{profile.allAssets.length}</b> <span style={{ color: 'var(--ter)' }}>Proyectos</span></span>
            <button onClick={() => setShowFollowers(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
              <b style={{ color: 'var(--text)' }}>{fmtCount(followers)}</b> <span style={{ color: 'var(--ter)' }}>Seguidores</span>
            </button>
            <span><b style={{ color: 'var(--text)' }}>{milestones.length}</b> <span style={{ color: 'var(--ter)' }}>Hitos</span></span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-l)', marginBottom: 18, overflowX: 'auto' }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5,
              fontWeight: tab === id ? 700 : 500, color: tab === id ? 'var(--text)' : 'var(--ter)',
              borderBottom: `2px solid ${tab === id ? 'var(--text)' : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {label}
          </button>
        ))}
      </div>

      {showFollowers && (() => {
        const f = companyFollowers(profile.name, following);
        return (
          <FollowListModal title={profile.name} nav={nav} onClose={() => setShowFollowers(false)}
            tabs={[{ id: 'followers', label: `Seguidores (${fmtCount(f.count)})`, items: f.people.map(n => ({ kind: 'person', name: n })), more: f.count - f.people.length }]} />
        );
      })()}

      {tab === 'resumen' && (
        <CompanySummary {...sectionProps} owner={owner} onOwner={toPersonal} onTab={setTab} />
      )}

      {tab === 'proyectos' && <ProjectsGrid nav={nav} assets={profile.allAssets} isMobile={isMobile} />}

      {/* Milestones of all its projects, with the same browser as the Feed
          (search, filters, magnet toolbar); each post carries the project
          code. The company header above is the magnet zone. */}
      {tab === 'hitos' && <FeedBrowser items={milestones} nav={nav} />}

      {tab === 'analitica' && <CompanyAnalytics {...sectionProps} />}

      {tab === 'confianza' && <CompanyTrust {...sectionProps} />}

      {tab === 'resenas' && (
        <CompanyReviews {...sectionProps} isMine={isMine} onAdd={r => setReviews(rs => [r, ...rs])} />
      )}
    </div>
  );
}

function ProjectsGrid({ nav, assets, isMobile }) {
  return (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {assets.map(a => (
            <button key={a.id} onClick={() => nav('detalle', a)}
              style={{ textAlign: 'left', padding: 0, cursor: 'pointer', background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 18, overflow: 'hidden', color: 'inherit' }}>
              <img src={a.img} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <ProjectCode asset={a} />
                  <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{a.name}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 12 }}>{a.cat} · {a.location} · {a.stage}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-b)', fontSize: 12.5, marginBottom: 8 }}>
                  <span style={{ color: 'var(--sec)' }}>Token <b style={{ color: 'var(--text)' }}>{fmtUSD(a.tokenPrice)}</b></span>
                  <span style={{ color: 'var(--sec)' }}>APY <b style={{ color: 'var(--pos)' }}>{a.apy}%</b></span>
                  <span style={{ color: 'var(--sec)' }}>{a.sold}% financiado</span>
                </div>
                <PProgress value={a.sold} />
              </div>
            </button>
          ))}
        </div>
  );
}
