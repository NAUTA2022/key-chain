import { useEffect, useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useT } from '~/i18n/useT';

type WalletModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Centered dialog over a blurred backdrop (same overlay as the Brikme Pay modal). */
export default function WalletModal({ title, onClose, children }: WalletModalProps) {
  const { t } = useT('portfolio');
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box',
          background: 'var(--bg)', border: '1px solid var(--border-l)', borderRadius: 22,
          boxShadow: '0 30px 90px rgba(0,0,0,0.6)', padding: '22px 22px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 id={titleId} style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={t('wallet.close')}
            style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-l)', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
            ×
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
