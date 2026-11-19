import { useState, useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CompanyLogo, UserAvatar } from '~/components/social/IdentityAvatar';
import { fmtCount } from '~/lib/projectFeed';
import type { FollowEntry } from '~/lib/social/types';
import { useT } from '~/i18n/useT';

type FollowButtonProps = {
  following: boolean;
  onToggle: () => void;
  small?: boolean;
};

// Seguir / Siguiendo pill. Callers hide it on the viewer's own row.
export function FollowButton({ following, onToggle, small }: FollowButtonProps) {
  const { t } = useT('profile');
  return (
    <button onClick={e => { e.stopPropagation(); onToggle(); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }} aria-pressed={following}
      style={{
        height: small ? 30 : 36, padding: small ? '0 14px' : '0 22px', borderRadius: 999, cursor: 'pointer', flexShrink: 0,
        fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: small ? 12 : 13,
        border: following ? '1px solid var(--border-l)' : '1px solid var(--text)',
        background: following ? 'transparent' : 'var(--text)', color: following ? 'var(--text)' : 'var(--bg)',
      }}>
      {following ? t('social.follow.following') : t('social.follow.follow')}
    </button>
  );
}

export type FollowListTabId = 'followers' | 'following';

type SocialCountsProps = {
  followers: number;
  following?: number | null;
  onOpen: (tab: FollowListTabId) => void;
  style?: CSSProperties;
};

// "N Seguidores · M Seguidos" — each opens the list.
export function SocialCounts({ followers, following, onOpen, style }: SocialCountsProps) {
  const { t } = useT('profile');
  const item = (n: number, label: string, tab: FollowListTabId) => (
    <button onClick={() => onOpen(tab)}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--ter)' }}>
      <b style={{ color: 'var(--text)' }}>{fmtCount(n)}</b> {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', ...style }}>
      {item(followers, t('social.follow.followers'), 'followers')}
      {following != null && item(following, t('social.follow.followingCount'), 'following')}
    </div>
  );
}

export type FollowListTab = {
  id: FollowListTabId;
  label: string;
  items: readonly FollowEntry[];
  /** People not listed ("y N más"). */
  more?: number;
  loading?: boolean;
};

type FollowListModalProps = {
  title: string;
  tabs: readonly FollowListTab[];
  initialTab?: FollowListTabId;
  onClose: () => void;
  /** A row was opened (the modal closes first). */
  onOpen: (entry: FollowEntry) => void;
  onToggleFollow: (entry: FollowEntry) => void;
};

// Modal with one or more tabs of people / companies. Rows open the profile
// and carry their own Seguir button.
export default function FollowListModal({ title, tabs, initialTab, onClose, onOpen, onToggleFollow }: FollowListModalProps) {
  const { t } = useT('profile');
  const [tab, setTab] = useState<FollowListTabId | undefined>(initialTab ?? tabs[0]?.id);
  const current = tabs.find(x => x.id === tab) ?? tabs[0];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = (it: FollowEntry) => {
    onClose();
    onOpen(it);
  };

  return createPortal(
    <div onClick={onClose} role="presentation"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}
        initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}
        style={{ width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px 0' }}>
          <div style={{ flex: 1, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} aria-label={t('social.close')}
            style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 4, padding: '10px 18px 0', borderBottom: '1px solid var(--border-l)' }}>
          {tabs.map(x => (
            <button key={x.id} onClick={() => setTab(x.id)} role="tab" aria-selected={current?.id === x.id}
              style={{ padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13,
                fontWeight: current?.id === x.id ? 700 : 500, color: current?.id === x.id ? 'var(--text)' : 'var(--ter)',
                borderBottom: `2px solid ${current?.id === x.id ? 'var(--text)' : 'transparent'}`, marginBottom: -1 }}>
              {x.label}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', padding: '6px 18px 14px' }}>
          {current && current.items.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{current.loading ? t('social.loading') : t('social.follow.empty')}</div>
          )}
          {current?.items.map(it => (
            <div key={it.kind === 'company' ? `company-${it.slug}` : `person-${it.id}`} onClick={() => open(it)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') open(it); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-l)', cursor: 'pointer' }}>
              {it.kind === 'company'
                ? <CompanyLogo company={it.name} logoUrl={it.logoUrl} size={40} />
                : it.avatarUrl || it.anonymous
                  ? <UserAvatar size={40} user={it} />
                  : <div style={{ width: 40, height: 40, borderRadius: '50%', background: it.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{it.initial}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.kind === 'person' && it.isSelf ? t('social.follow.you', { name: it.name }) : it.name}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{it.kind === 'company' ? t('social.follow.company') : it.companyName ? t('social.follow.ownerOf', { name: it.companyName }) : it.handle ? `@${it.handle}` : it.anonymous ? t('social.follow.privateProfile') : t('social.follow.investor')}</div>
              </div>
              {!(it.kind === 'person' && it.isSelf) && !(it.kind === 'company' && it.isMine) && <FollowButton following={it.isFollowing} onToggle={() => onToggleFollow(it)} small />}
            </div>
          ))}
          {current?.more != null && current.more > 0 && (
            <div style={{ padding: '12px 0 0', textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{t('social.follow.andMore', { count: fmtCount(current.more) })}</div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
