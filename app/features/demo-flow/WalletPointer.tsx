import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Rect = { top: number; left: number; width: number; height: number };

/** Points at the wallet in the top bar (where the balance goes up), wherever the layout puts it. */
export default function WalletPointer({ label }: { label: string }) {
  const still = useReducedMotion() ?? false;
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector('[data-guide="topbar-wallet"]');
      const r = el?.getBoundingClientRect();
      setRect(r && r.width ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
    };
    measure();
    const id = setInterval(measure, 1000);
    window.addEventListener('resize', measure);
    return () => { clearInterval(id); window.removeEventListener('resize', measure); };
  }, []);
  if (!rect) return null;
  const right = rect.left + rect.width / 2 > window.innerWidth / 2;
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
      <motion.div animate={still ? undefined : { scale: [1, 1.08, 1], opacity: [1, 0.55, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
        style={{ position: 'absolute', top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 999, border: '2.5px solid var(--pos)', boxShadow: '0 0 0 6px rgba(52,199,123,.18)' }} />
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: 'absolute', top: rect.top + rect.height + 16, ...(right ? { right: Math.max(12, window.innerWidth - rect.left - rect.width) } : { left: Math.max(12, rect.left) }), background: 'var(--pos)', color: '#fff', borderRadius: 12, padding: '8px 12px', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 700, boxShadow: 'var(--sh-md)', whiteSpace: 'nowrap' }}>
        <span style={{ position: 'absolute', top: -6, ...(right ? { right: 28 } : { left: 28 }), width: 12, height: 12, background: 'var(--pos)', transform: 'rotate(45deg)' }} />
        {label}
      </motion.div>
    </div>
  );
}
