import { useState } from 'react';
import { motion } from 'framer-motion';
import { PBtn, PProgress, CompanyAvatar, Icons, HEX_CLIP } from '../components/ui';
import { fmtUSD } from '../data';
import FeedBrowser from '../components/FeedBrowser';
import { VerifiedBadge } from '../components/ProfileCard';
import { profileByName, useFollowing, useAssetsPosts, fmtCount } from '../lib/projectFeed';
import { useMobile } from '../hooks/useMobile';
import IdentityAvatar, { IdentitySwitch } from '../components/IdentityAvatar';
import { MY_COMPANY } from '../lib/me';

// Company (issuer) profile — opened from the Feed's featured profiles or any
// issuer name on a post. Cover, avatar, Seguir, bio and counts on top; then
// its posts (every update from its live projects, browsed like the Feed) and
// all its projects. For the signed-in user's own company it also shows the
// Personal / Empresa switch and the double avatar (hexagon + round badge).
// `embedded`: rendered inside the Perfil page (no "Volver"; switching to
// personal calls `onPersonal` instead of navigating).

export default function CompanyProfile({ nav, name, fromRoute, embedded, onPersonal }) {
  const isMobile = useMobile();
  const profile = profileByName(name);
  const [followed, toggleFollow] = useFollowing();
  const [tab, setTab] = useState('posts');
  const posts = useAssetsPosts(profile?.liveAssets || []);
  // Routes that need routeData (a project, another profile) can't be
  // re-entered without it, so those fall back to the Feed.
  const back = () => nav(fromRoute && !['empresa', 'detalle'].includes(fromRoute) ? fromRoute : 'feed');
  const isMine = !!MY_COMPANY && name === MY_COMPANY;
  const toPersonal = () => (onPersonal ? onPersonal() : nav('perfil'));

  if (!profile) {
    return (
      <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto', fontFamily: 'var(--font-b)', color: 'var(--ter)' }}>
        No encontramos este perfil. <PBtn variant="secondary" small onClick={back}>Volver</PBtn>
      </div>
    );
  }

  const following = followed.includes(profile.name);
  const followers = profile.followers + (following ? 1 : 0);
  const avatar = isMobile ? 84 : 112;
  const tabs = [['posts', `Publicaciones (${posts.length})`], ['projects', `Proyectos (${profile.allAssets.length})`]];

  return (
    <div className="g-page" style={{ padding: isMobile ? '16px 16px 40px' : '24px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, minHeight: embedded && !isMine ? 0 : 28 }}>
        {!embedded ? (
          <button onClick={back}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13 }}>
            {Icons.back} Volver
          </button>
        ) : <span />}
        {isMine && <IdentitySwitch value="company" company={profile.name} onChange={toPersonal} />}
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ position: 'relative', height: isMobile ? 150 : 230 }}>
          <img src={profile.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.3) brightness(0.72)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />
          {isMine ? (
            // My company: big hexagon with my round photo as a badge (tap it
            // to switch to my personal profile).
            <div style={{ position: 'absolute', left: isMobile ? 16 : 28, bottom: -avatar / 2 }}>
              <IdentityAvatar mode="company" company={profile.name} size={avatar} onSwap={toPersonal} />
            </div>
          ) : (
            <div style={{ position: 'absolute', left: isMobile ? 16 : 28, bottom: -avatar / 2, clipPath: HEX_CLIP, padding: 5, background: 'var(--surface)' }}>
              <CompanyAvatar company={profile.name} size={avatar} />
            </div>
          )}
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
            <span><b style={{ color: 'var(--text)' }}>{fmtCount(followers)}</b> <span style={{ color: 'var(--ter)' }}>Seguidores</span></span>
            <span><b style={{ color: 'var(--text)' }}>{posts.length}</b> <span style={{ color: 'var(--ter)' }}>Publicaciones</span></span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-l)', marginBottom: 18 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5,
              fontWeight: tab === id ? 700 : 500, color: tab === id ? 'var(--text)' : 'var(--ter)',
              borderBottom: `2px solid ${tab === id ? 'var(--text)' : 'transparent'}`, marginBottom: -1,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Same posts browser as the Feed: search, filters and the magnet
          toolbar; the company header above is the magnet zone. */}
      {tab === 'posts' && <FeedBrowser items={posts} nav={nav} />}

      {tab === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {profile.allAssets.map(a => (
            <button key={a.id} onClick={() => nav('detalle', a)}
              style={{ textAlign: 'left', padding: 0, cursor: 'pointer', background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 18, overflow: 'hidden', color: 'inherit' }}>
              <img src={a.img} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14.5, color: 'var(--text)', marginBottom: 2 }}>{a.name}</div>
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
      )}
    </div>
  );
}
