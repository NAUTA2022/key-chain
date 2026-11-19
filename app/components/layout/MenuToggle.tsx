import type { CSSProperties } from 'react';
import { motion, type Transition } from 'framer-motion';
import { useT } from '~/i18n/useT';

// Mobile menu button. Lives above the drawer: when the drawer opens, the
// hamburger glides to the drawer's right edge and its bars morph into an X
// (the drawer has no close button of its own).
export const DRAWER_W = 272;
const SIZE = 36;
const LEFT = 12; // topbar side padding
const OPEN_X = DRAWER_W - 12 - SIZE - LEFT;

const BAR: CSSProperties = { position: 'absolute', left: 9, width: 18, height: 2, borderRadius: 2, background: 'currentColor' };
const SPRING: Transition = { type: 'spring', damping: 26, stiffness: 320 };

type MenuToggleProps = {
  open: boolean;
  onToggle: () => void;
};

export default function MenuToggle({ open, onToggle }: MenuToggleProps) {
  const { t } = useT('common');
  return (
    <motion.button type="button" onClick={onToggle} aria-label={open ? t('menu.close') : t('menu.open')} aria-expanded={open}
      initial={false} animate={{ x: open ? OPEN_X : 0 }} transition={SPRING}
      style={{
        position: 'fixed', top: 10, left: LEFT, zIndex: 310, width: SIZE, height: SIZE, padding: 0,
        borderRadius: 10, border: '1.5px solid var(--border-l)', background: open ? 'var(--surface)' : 'transparent',
        cursor: 'pointer', color: 'var(--sec)', transition: 'background 0.2s',
      }}>
      <motion.span style={{ ...BAR, top: 10 }} initial={false} animate={open ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }} transition={SPRING} />
      <motion.span style={{ ...BAR, top: 16 }} initial={false} animate={{ opacity: open ? 0 : 1, scaleX: open ? 0.2 : 1 }} transition={{ duration: 0.15 }} />
      <motion.span style={{ ...BAR, top: 22 }} initial={false} animate={open ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }} transition={SPRING} />
    </motion.button>
  );
}
