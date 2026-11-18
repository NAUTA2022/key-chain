import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icons, PBtn } from '~/components/ui';
import { call, paragraphs, useApi } from '~/features/profile/api';
import { EmptyState, Notice, Skeleton } from '~/features/profile/kit';
import { mutedStyle } from '~/features/profile/styles';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { countLabel, faqCategoryIcon, faqCategoryKey, faqCategoryLabel, faqMatches, searchTerms, srOnly, type FaqItem } from './schema';

// Live FAQ: real search, category filters and the same accordion as the demo page.

/** Same look as PCard + the demo category card, as a real <button>. */
const categoryCardStyle: CSSProperties = {
  width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'var(--text)',
  background: 'var(--surface)', backdropFilter: 'blur(2px) saturate(140%)', WebkitBackdropFilter: 'blur(2px) saturate(140%)',
  borderRadius: 20, boxShadow: 'var(--sh-md)', border: '1px solid var(--border-l)', overflow: 'hidden',
};
const categoryActiveStyle: CSSProperties = { border: '1px solid var(--accent)', boxShadow: '0 0 0 1px var(--accent), var(--sh-md)' };

type Category = { key: string; label: string; count: number };

export default function FaqLive({ onAsk }: { onAsk: () => void }) {
  const isMobile = useMobile();
  const isNarrow = useMobile(480);
  const searchId = useId();
  const faq = useApi<FaqItem[]>('support-faq', () => call(api.GET('/v1/faq')));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const categories = useMemo(() => {
    const map = new Map<string, Category>();
    for (const f of faq.data ?? []) {
      const key = faqCategoryKey(f.category);
      const current = map.get(key);
      if (current) current.count += 1;
      else map.set(key, { key, label: faqCategoryLabel(f.category), count: 1 });
    }
    return [...map.values()];
  }, [faq.data]);

  const terms = useMemo(() => searchTerms(query), [query]);
  const visible = useMemo(
    () => (faq.data ?? []).filter(f => (category === null || faqCategoryKey(f.category) === category) && faqMatches(f, terms)),
    [faq.data, category, terms],
  );
  const filtering = terms.length > 0 || category !== null;
  const activeLabel = categories.find(c => c.key === category)?.label;

  const clearFilters = () => {
    setQuery('');
    setCategory(null);
  };

  let list: ReactNode;
  if (!faq.data && faq.error) {
    list = (
      <Notice tone="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>No pudimos cargar las preguntas frecuentes.</span>
        <PBtn variant="secondary" small onClick={faq.reload}>Reintentar</PBtn>
      </Notice>
    );
  } else if (!faq.data) {
    list = <Skeleton rows={5} height={18} />;
  } else if (!faq.data.length) {
    list = (
      <EmptyState
        icon={Icons.help}
        title="Todavía no hay preguntas frecuentes"
        text="Si tenés una duda, escribinos y te respondemos por acá."
        action={<PBtn variant="secondary" small onClick={onAsk}>Abrir un ticket</PBtn>}
      />
    );
  } else if (!visible.length) {
    list = (
      <EmptyState
        icon={Icons.search}
        title="No encontramos resultados"
        text="Probá con otras palabras o abrí un ticket y te ayudamos."
        action={<PBtn variant="secondary" small onClick={clearFilters}>Limpiar búsqueda</PBtn>}
      />
    );
  } else {
    list = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {visible.map(f => {
          const isOpen = open === f.id;
          const panelId = `faq-${f.id}`;
          return (
            <motion.div key={f.id} layout style={{ borderBottom: '1px solid var(--border-l)' }}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '18px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 15, color: 'var(--text)', flex: 1, paddingRight: 20, overflowWrap: 'anywhere' }}>{f.question}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'var(--ter)', flexShrink: 0 }}>
                    {Icons.plus}
                  </motion.span>
                </button>
              </h3>
              {/* Closed answers stay in the HTML (hidden) so crawlers and answer engines can read them. */}
              {isOpen ? (
                <motion.div
                  id={panelId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ padding: '0 4px 18px', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.65, overflowWrap: 'anywhere' }}
                >
                  {paragraphs(f.answer).map((p, i) => (
                    <p key={i} style={{ margin: i ? '10px 0 0' : 0, whiteSpace: 'pre-line' }}>{p}</p>
                  ))}
                </motion.div>
              ) : (
                <div id={panelId} hidden>{f.answer}</div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div
        role="search"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', borderRadius: 16, padding: '14px 20px', border: '1.5px solid var(--border)',
          marginBottom: isMobile ? 24 : 32, boxShadow: 'var(--sh-sm)', ...(focused ? { borderColor: 'var(--accent)' } : null),
        }}
      >
        <label htmlFor={searchId} style={{ display: 'flex', flexShrink: 0, cursor: 'text' }}>
          <span aria-hidden="true" style={{ display: 'flex' }}>{Icons.search}</span>
          <span style={srOnly}>Buscar en el centro de ayuda</span>
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Buscar en el centro de ayuda…"
          autoComplete="off"
          enterKeyHint="search"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', padding: 0, margin: 0, fontFamily: 'var(--font-b)', fontSize: 15, color: 'var(--text)' }}
        />
      </div>

      {/* Categories (derived from the FAQ data) */}
      {categories.length > 0 && (
        <div
          role="group"
          aria-label="Filtrar por categoría"
          style={{
            display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, 1fr)',
            gap: isMobile ? 10 : 14, marginBottom: isMobile ? 28 : 36,
          }}
        >
          {categories.map((c, i) => {
            const active = category === c.key;
            return (
              <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }} style={{ minWidth: 0 }}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCategory(active ? null : c.key);
                    setOpen(null);
                  }}
                  style={{ ...categoryCardStyle, padding: isMobile ? '14px 16px' : '18px 20px', ...(active ? categoryActiveStyle : null) }}
                >
                  <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>
                    {Icons[faqCategoryIcon(c.key)]}
                  </span>
                  <span style={{ display: 'block', minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', overflowWrap: 'anywhere' }}>{c.label}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{countLabel(c.count, 'pregunta', 'preguntas')}</span>
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FAQs */}
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 18 }}>Preguntas frecuentes</h2>
      <div role="status" aria-live="polite" style={filtering && faq.data ? { ...mutedStyle, marginTop: -8, marginBottom: 10 } : srOnly}>
        {filtering && faq.data
          ? `${countLabel(visible.length, 'resultado', 'resultados')}${activeLabel ? ` en ${activeLabel}` : ''}`
          : ''}
      </div>
      {list}
    </>
  );
}
