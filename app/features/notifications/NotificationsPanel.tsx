import { useEffect, useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Icons, PDiv } from '~/components/ui';
import { useT } from '~/i18n/useT';
import type { LiveNotificationType } from './useNotifications';

export type PanelItem = {
  id: string | number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  /** Live notifications get a type-specific icon; demo items keep the bell. */
  type?: LiveNotificationType;
  onSelect?: () => void;
};

type Visual = { icon: ReactNode; bg: string; color: string };

const DEFAULT_VISUAL: Visual = { icon: Icons.bell, bg: 'var(--accent-bg)', color: 'var(--accent-text)' };

const VISUALS: Record<LiveNotificationType, Visual> = {
  kyc:        { icon: Icons.shield,  bg: 'rgba(59,130,246,0.14)',  color: '#3b82f6' },
  investment: { icon: Icons.wallet,  bg: 'rgba(130,71,229,0.14)',  color: '#8247E5' },
  yield:      { icon: Icons.receive, bg: 'rgba(34,197,94,0.14)',   color: '#22c55e' },
  market:     { icon: Icons.primary, bg: 'rgba(245,166,35,0.14)',  color: '#F5A623' },
  system:     DEFAULT_VISUAL,
  support:    { icon: Icons.help,    bg: 'rgba(91,196,190,0.14)',  color: '#5BC4BE' },
  sale:       { icon: Icons.swap,    bg: 'rgba(224,91,76,0.14)',   color: '#E05B4C' },
  vesting:    { icon: Icons.lock,    bg: 'rgba(39,117,202,0.14)',  color: '#2775CA' },
  social:     { icon: Icons.users,   bg: 'rgba(130,71,229,0.14)',  color: '#8247E5' },
};

type Props = {
  onClose: () => void;
  items: PanelItem[];
  /** Phone layout: full-width sheet under the top bar (rendered at <body> level). */
  mobile?: boolean;
  /** Live mode: real "mark all as read" action. Demo keeps the static label. */
  onMarkAll?: () => void;
  /** Live mode only: header label when there is nothing to mark. */
  live?: boolean;
  loading?: boolean;
  /** Text when there are no items (default: the translated "no notifications yet"). */
  emptyText?: string;
};

export default function NotificationsPanel({ onClose, items, mobile, onMarkAll, live, loading, emptyText }: Props) {
  const { t } = useT('common');
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Close on Escape and on any press outside the panel and its trigger.
  useEffect(() => {
    const scope = panelRef.current?.parentElement ?? null;
    const onDown = (e: PointerEvent) => {
      if (scope && e.target instanceof Node && scope.contains(e.target)) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const placement: CSSProperties = mobile
    ? { position: 'fixed', top: 64, left: 12, right: 12, width: 'auto', maxWidth: 'none' }
    : { position: 'absolute', top: 52, right: 0, width: 360, maxWidth: 'calc(100vw - 24px)' };

  const panel = (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-label={t('notifications.title')}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        style={{
          ...placement, zIndex: 95,
          background: 'var(--gl-panel-strong)', backdropFilter: 'blur(28px) saturate(160%) brightness(1.02)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%) brightness(1.02)',
          borderRadius: 18, boxShadow: 'var(--sh-lg)',
          border: '1px solid var(--gl-bd)', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{t('notifications.title')}</span>
          {onMarkAll ? (
            <button type="button" onClick={onMarkAll} style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent-text)', cursor: 'pointer', fontWeight: 600 }}>{t('notifications.markAll')}</button>
          ) : !live && (
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent-text)', cursor: 'pointer', fontWeight: 600 }}>{t('notifications.markAll')}</span>
          )}
        </div>
        <PDiv />
        <div style={{ maxHeight: mobile ? 'calc(100vh - 220px)' : 380, overflowY: 'auto' }}>
          {items.length === 0 && (
            <div role="status" style={{ padding: '28px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ter)' }}>{Icons.bell}</div>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{loading ? t('notifications.loading') : (emptyText ?? t('notifications.empty'))}</span>
            </div>
          )}
          {items.map((n, i) => {
            const v = n.type ? VISUALS[n.type] : DEFAULT_VISUAL;
            const select = n.onSelect;
            return (
              <div
                key={n.id}
                {...(select ? {
                  role: 'button',
                  tabIndex: 0,
                  onClick: select,
                  onKeyDown: (e: ReactKeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select();
                    }
                  },
                } : {})}
                style={{
                  padding: '13px 18px', display: 'flex', gap: 12,
                  background: n.unread ? 'var(--surface2)' : 'transparent',
                  borderBottom: i < items.length - 1 ? '1px solid var(--border-l)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: '50%', background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: v.color, flexShrink: 0 }}>
                  {v.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{n.title}</span>
                    {n.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
                  </div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', marginTop: 2, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{n.desc}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', marginTop: 3 }}>{n.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </>
  );

  // The top bar uses backdrop-filter (a containing block for fixed children), so the phone
  // sheet is mounted at <body> level to cover the viewport.
  return mobile ? createPortal(<div>{panel}</div>, document.body) : panel;
}
