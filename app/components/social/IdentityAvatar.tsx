import { PAvatar, CompanyAvatar, HEX_CLIP } from '~/components/ui';
import { identicon } from '~/lib/social/identity';
import { useT } from '~/i18n/useT';

/**
 * A person drawn as an initial on a gradient (demo users, company owners, the viewer).
 * Live people may carry their photo, or be `anonymous` (private profile: identicon seeded by `id`).
 */
export type AvatarUser = { name: string; initial: string; gradient: string; id?: string; avatarUrl?: string | null; anonymous?: boolean };

/** Live people with a photo or a private profile are drawn differently from the demo's initials. */
const hasLiveFace = (user: AvatarUser): boolean => !!user.avatarUrl || !!user.anonymous;

// Mirrored 5×5 pattern for people who keep their profile private.
export function Identicon({ seed, size }: { seed: string; size: number }) {
  const { t } = useT('profile');
  const { cells, hue } = identicon(seed);
  return (
    <svg width={size} height={size} viewBox="-1 -1 7 7" role="img" aria-label={t('social.anonymous')} style={{ borderRadius: '50%', flexShrink: 0, display: 'block', background: `hsl(${hue} 45% 92%)` }}>
      {cells.map((on, i) => on && <rect key={i} x={i % 5} y={Math.floor(i / 5)} width={1.02} height={1.02} fill={`hsl(${hue} 55% 45%)`} />)}
    </svg>
  );
}

// A live person's face at any size: their photo, an identicon (private profile) or their initial.
function LiveFace({ size, user }: { size: number; user: AvatarUser }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />;
  }
  return <Identicon seed={user.id ?? user.name} size={size} />;
}

// Simple round user photo (no vinyl ring) for small spots like badges.
export function UserAvatar({ size = 32, user }: { size?: number; user: AvatarUser }) {
  if (hasLiveFace(user)) return <LiveFace size={size} user={user} />;
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

/** A company hexagon: its uploaded logo (live) or the lettered hexagon. */
export function CompanyLogo({ company, logoUrl, size }: { company: string; logoUrl?: string | null; size: number }) {
  if (!logoUrl) return <CompanyAvatar company={company} size={size} />;
  return <img src={logoUrl} alt="" width={size} height={size} style={{ width: size, height: size, clipPath: HEX_CLIP, objectFit: 'cover', flexShrink: 0, display: 'block' }} />;
}

type IdentityAvatarProps = {
  mode: 'company' | 'personal';
  /** Company name; without one there is no badge to switch identity. */
  company?: string | null;
  /** The company's uploaded logo (live). */
  companyLogoUrl?: string | null;
  size: number;
  onSwap?: () => void;
  /** Colour around the shapes (whatever they sit on). */
  ring?: string;
  /** The person: the company's owner, or the signed-in user. */
  user: AvatarUser;
  /** `user` is the signed-in user ("mi cuenta personal" in the badge label). */
  self?: boolean;
  /** Draw the other identity's badge (false: a company nobody manages yet). */
  badge?: boolean;
};

// Big identity photo with the other identity as a small badge at its bottom
// right: company view = big hexagon + small round user; personal view = big
// round user + small hexagon company. Tapping the badge switches identity.
export default function IdentityAvatar({ mode, company, companyLogoUrl, size, onSwap, ring = 'var(--surface)', user, self, badge: withBadge = true }: IdentityAvatarProps) {
  const { t } = useT('profile');
  const badge = Math.round(size * 0.38);
  const pad = Math.max(3, Math.round(size * 0.05));
  const isCompany = mode === 'company';
  const label = t('social.avatar.viewProfileOf', { name: isCompany ? (self ? t('social.avatar.myPersonalAccount') : user.name) : company ?? '' });

  return (
    <div style={{ position: 'relative', width: size + pad * 2, height: size + pad * 2, flexShrink: 0 }}>
      {isCompany ? (
        <div style={{ clipPath: HEX_CLIP, background: ring, padding: pad }}>
          {companyLogoUrl ? <CompanyLogo company={company ?? ''} logoUrl={companyLogoUrl} size={size} /> : <CompanyAvatar company={company ?? undefined} size={size} />}
        </div>
      ) : (
        <div style={{ borderRadius: '50%', background: ring, padding: pad }}>
          {hasLiveFace(user) ? <LiveFace size={size} user={user} /> : <PAvatar name={user.initial} size={size - 7} gradient={user.gradient} />}
        </div>
      )}
      {company && withBadge && (
        <button onClick={onSwap} title={label} aria-label={label}
          style={{
            position: 'absolute', right: -2, bottom: -2, zIndex: 2, padding: 3, border: 'none', cursor: 'pointer', background: ring,
            display: 'flex', ...(isCompany ? { borderRadius: '50%' } : { clipPath: HEX_CLIP, padding: 4 }),
          }}>
          {isCompany ? <UserAvatar size={badge} user={user} /> : <CompanyLogo company={company} logoUrl={companyLogoUrl} size={badge} />}
        </button>
      )}
    </div>
  );
}
