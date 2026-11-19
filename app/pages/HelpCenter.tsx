import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PSection, Icons } from '~/components/ui';
import HelpCenterLive from '~/features/support/HelpCenterLive';
import { pluralKey } from '~/features/support/schema';
import { useSession } from '~/lib/session';
import { useT } from '~/i18n/useT';
import esHelp from '~/i18n/locales/es/help.json';

export type Faq = { q: string; a: string };

// The FAQ copy lives in the `help` dictionaries (`faqs`). The Spanish source also feeds the
// FAQPage JSON-LD in app/routes/ayuda.tsx (the prerendered page is Spanish).
// eslint-disable-next-line react-refresh/only-export-components -- FAQS also feeds the FAQPage JSON-LD in app/routes/ayuda.tsx
export const FAQS: Faq[] = esHelp.faqs;

/** Help topics of the demo page: icon + article count; the title is `help:helpCenter.topics.<id>`. */
const CATEGORIES = [
  { id: 'invest',    icon: Icons.primary,   count: 5 },
  { id: 'wallet',    icon: Icons.wallet,    count: 8 },
  { id: 'kyc',       icon: Icons.shield,    count: 4 },
  { id: 'token',     icon: Icons.token,     count: 6 },
  { id: 'swap',      icon: Icons.swap,      count: 3 },
  { id: 'secondary', icon: Icons.secondary, count: 4 },
] as const;

export default function HelpCenter() {
  const { status } = useSession();
  // With the API: real FAQ, tickets and assistant. Without it: the original demo page, unchanged.
  return status === 'disabled' ? <HelpCenterDemo /> : <HelpCenterLive />;
}

function HelpCenterDemo() {
  const [open, setOpen] = useState<number | null>(null);
  const { t, raw } = useT('help');
  const faqs = raw<Faq[]>('faqs');

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <PSection title={t('helpCenter.title')} sub={t('helpCenter.sub')} />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', borderRadius: 16, padding: '14px 20px', border: '1.5px solid var(--border)', marginBottom: 32, boxShadow: 'var(--sh-sm)' }}>
        {Icons.search}
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 15, color: 'var(--ter)' }}>{t('helpCenter.searchPlaceholder')}</span>
      </div>

      {/* Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 36 }}>
        {CATEGORIES.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }}>
            <PCard style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>{c.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{t(`helpCenter.topics.${c.id}`)}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{t(pluralKey('helpCenter.articles', c.count), { count: c.count })}</div>
              </div>
            </PCard>
          </motion.div>
        ))}
      </div>

      {/* FAQs */}
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 18 }}>{t('helpCenter.faqTitle')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {faqs.map((faq, i) => (
          <motion.div key={i} layout style={{ borderBottom: '1px solid var(--border-l)' }}>
            <h3>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              aria-controls={`faq-${i}`}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 15, color: 'var(--text)', flex: 1, paddingRight: 20 }}>{faq.q}</span>
              <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'var(--ter)', flexShrink: 0 }}>
                {Icons.plus}
              </motion.span>
            </button>
            </h3>
            {/* Closed answers stay in the HTML (hidden) so crawlers and answer engines can read them. */}
            {open === i ? (
              <motion.div
                id={`faq-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ padding: '0 4px 18px', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.65 }}
              >
                {faq.a}
              </motion.div>
            ) : (
              <div id={`faq-${i}`} hidden>{faq.a}</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Contact */}
      <PCard style={{ padding: '24px 28px', marginTop: 32, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>{t('helpCenter.contactTitle')}</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', marginBottom: 18 }}>{t('helpCenter.contactTextDemo')}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={{ padding: '12px 24px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text)' }}>{t('helpCenter.openTicket')}</button>
          <button style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'var(--accent)', fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--accent-fg)' }}>{t('helpCenter.liveChat')}</button>
        </div>
      </PCard>
    </div>
  );
}
