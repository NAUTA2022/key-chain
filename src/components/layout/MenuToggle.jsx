import { motion } from 'framer-motion';

// Mobile menu button. Lives above the drawer: when the drawer opens, the
// hamburger glides to the drawer's right edge and its bars morph into an X
// (the drawer has no close button of its own).
export const DRAWER_W = 272;
const SIZE = 36;
const LEFT = 12; // topbar side padding
const OPEN_X = DRAWER_W - 12 - SIZE - LEFT;

export default function MenuToggle({ open, onToggle }) {
  const bar = { position: 'absolute', left: 9, width: 18, height: 2, borderRadius: 2, background: 'currentColor' };
  const spring = { type: 'spring', damping: 26, stiffness: 320 };
  return (
    <motion.button onClick={onToggle} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}
      initial={false} animate={{ x: open ? OPEN_X : 0 }} transition={spring}
      style={{
        position: 'fixed', top: 10, left: LEFT, zIndex: 310, width: SIZE, height: SIZE, padding: 0,
        borderRadius: 10, border: '1.5px solid var(--border-l)', background: open ? 'var(--surface)' : 'transparent',
        cursor: 'pointer', color: 'var(--sec)', transition: 'background 0.2s',
      }}>
      <motion.span style={{ ...bar, top: 10 }} initial={false} animate={open ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }} transition={spring} />
      <motion.span style={{ ...bar, top: 16 }} initial={false} animate={{ opacity: open ? 0 : 1, scaleX: open ? 0.2 : 1 }} transition={{ duration: 0.15 }} />
      <motion.span style={{ ...bar, top: 22 }} initial={false} animate={open ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }} transition={spring} />
    </motion.button>
  );
}
