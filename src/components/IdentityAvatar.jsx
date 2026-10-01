import { PAvatar, CompanyAvatar, HEX_CLIP } from './ui';
import { ME } from '../lib/me';

// Simple round user photo (no vinyl ring) for small spots like badges.
export function UserAvatar({ size = 32, user = ME }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: user.gradient, color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: size * 0.42,
    }}>
      {user.initial}
    </div>
  );
}

// Big identity photo with the other identity as a small badge at its bottom
// right: company view = big hexagon + small round user; personal view = big
// round user + small hexagon company. Tapping the badge switches identity.
// `ring` is the colour around the shapes (whatever they sit on); `user` is
// the company's owner (defaults to the signed-in user).
export default function IdentityAvatar({ mode, company, size, onSwap, ring = 'var(--surface)', user = ME }) {
  const badge = Math.round(size * 0.38);
  const pad = Math.max(3, Math.round(size * 0.05));
  const isCompany = mode === 'company';

  return (
    <div style={{ position: 'relative', width: size + pad * 2, height: size + pad * 2, flexShrink: 0 }}>
      {isCompany ? (
        <div style={{ clipPath: HEX_CLIP, background: ring, padding: pad }}>
          <CompanyAvatar company={company} size={size} />
        </div>
      ) : (
        <div style={{ borderRadius: '50%', background: ring, padding: pad }}>
          <PAvatar name={user.initial} size={size - 7} gradient={user.gradient} />
        </div>
      )}
      {company && (
        <button onClick={onSwap}
          title={isCompany ? `Ver perfil de ${user === ME ? 'mi cuenta personal' : user.name}` : `Ver perfil de ${company}`}
          aria-label={isCompany ? `Ver perfil de ${user === ME ? 'mi cuenta personal' : user.name}` : `Ver perfil de ${company}`}
          style={{
            position: 'absolute', right: -2, bottom: -2, zIndex: 2, padding: 3, border: 'none', cursor: 'pointer', background: ring,
            display: 'flex', ...(isCompany ? { borderRadius: '50%' } : { clipPath: HEX_CLIP, padding: 4 }),
          }}>
          {isCompany ? <UserAvatar size={badge} user={user} /> : <CompanyAvatar company={company} size={badge} />}
        </button>
      )}
    </div>
  );
}
