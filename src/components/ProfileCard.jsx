import { CompanyAvatar } from './ui';

const VerifiedBadge = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-label="Verificado">
    <path fill="#3b82f6" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1z"/>
    <path d="M8 12.3l2.6 2.6L16.2 9" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const fmtCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n));

// Featured issuer profile — cover photo, avatar overlapping the cover,
// Seguir button, name + verified badge, handle, bio and follow counts.
export default function ProfileCard({ profile, following, onFollow, selected, onSelect }) {
  const followers = profile.followers + (following ? 1 : 0);
  return (
    <div onClick={onSelect} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onSelect(); }}
      style={{
        width: 272, flexShrink: 0, borderRadius: 22, overflow: 'hidden', cursor: 'pointer',
        background: 'var(--surface)', scrollSnapAlign: 'start',
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-l)'}`,
        boxShadow: selected ? '0 0 0 3px var(--accent-bg)' : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}>
      {/* Cover */}
      <div style={{ position: 'relative', height: 118 }}>
        <img src={profile.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.35) brightness(0.7)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', left: 16, bottom: -34, borderRadius: '50%', padding: 4, background: 'var(--surface)' }}>
          <CompanyAvatar company={profile.name} size={68} />
        </div>
      </div>

      <div style={{ padding: '10px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 32 }}>
          <button onClick={e => { e.stopPropagation(); onFollow(); }}
            style={{
              padding: '7px 20px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 12.5,
              border: following ? '1px solid var(--border-l)' : '1px solid var(--text)',
              background: following ? 'transparent' : 'var(--text)',
              color: following ? 'var(--text)' : 'var(--bg)',
            }}>
            {following ? 'Siguiendo' : 'Seguir'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
          <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 17, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</span>
          {profile.verified && VerifiedBadge}
        </div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 10 }}>@{profile.handle}</div>

        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)', lineHeight: 1.5, height: 36, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 12 }}>
          {profile.bio}
        </div>

        <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-b)', fontSize: 13 }}>
          <span><b style={{ color: 'var(--text)' }}>{profile.projects}</b> <span style={{ color: 'var(--ter)' }}>Proyectos</span></span>
          <span><b style={{ color: 'var(--text)' }}>{fmtCount(followers)}</b> <span style={{ color: 'var(--ter)' }}>Seguidores</span></span>
        </div>
      </div>
    </div>
  );
}
