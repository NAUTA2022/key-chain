import { PAvatar, CompanyAvatar, HEX_CLIP } from './ui';
import { ME } from '../lib/me';

// Simple round user photo (no vinyl ring) for small spots like badges.
export function UserAvatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: ME.gradient, color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: size * 0.42,
    }}>
      {ME.initial}
    </div>
  );
}

// Big identity photo with the other identity as a small badge at its bottom
// right: company view = big hexagon + small round user; personal view = big
// round user + small hexagon company. Tapping the badge switches identity.
// `ring` is the colour around the shapes (whatever they sit on).
export default function IdentityAvatar({ mode, company, size, onSwap, ring = 'var(--surface)' }) {
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
          <PAvatar name={ME.initial} size={size - 7} gradient={ME.gradient} />
        </div>
      )}
      {company && (
        <button onClick={onSwap}
          title={isCompany ? 'Cambiar a mi perfil personal' : `Cambiar al perfil de ${company}`}
          aria-label={isCompany ? 'Cambiar a mi perfil personal' : `Cambiar al perfil de ${company}`}
          style={{
            position: 'absolute', right: -2, bottom: -2, zIndex: 2, padding: 3, border: 'none', cursor: 'pointer', background: ring,
            display: 'flex', ...(isCompany ? { borderRadius: '50%' } : { clipPath: HEX_CLIP, padding: 4 }),
          }}>
          {isCompany ? <UserAvatar size={badge} /> : <CompanyAvatar company={company} size={badge} />}
        </button>
      )}
    </div>
  );
}

// Personal / Empresa switch for the signed-in user's own profiles.
export function IdentitySwitch({ value, onChange, company }) {
  const opt = (id, label, icon) => {
    const on = value === id;
    return (
      <button key={id} onClick={() => !on && onChange(id)} aria-pressed={on}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: on ? 'default' : 'pointer',
          background: on ? 'var(--text)' : 'transparent', color: on ? 'var(--bg)' : 'var(--sec)',
          fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 12.5, transition: 'background 0.2s ease, color 0.2s ease',
        }}>
        {icon}{label}
      </button>
    );
  };
  return (
    <div role="group" aria-label="Cambiar de perfil"
      style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999, background: 'var(--gl-panel-strong)', border: '1px solid var(--gl-bd)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      {opt('personal', 'Personal', <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.6px solid currentColor' }} />)}
      {opt('company', company || 'Empresa', <span style={{ width: 12, height: 12, clipPath: HEX_CLIP, background: 'currentColor' }} />)}
    </div>
  );
}
