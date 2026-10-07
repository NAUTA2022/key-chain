import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Reusable filter dropdown: a compact trigger ("Rubro: Campos") that opens a
// list of options with counts and a check on the selected one. With many
// options it adds a search box inside the menu, so it scales as filters grow.
// options: [{ value, label, count? }]
export default function FilterSelect({ label, value, options, onChange, allValue = 'Todos', align = 'left', searchAt = 8, block }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const current = options.find(o => o.value === value);
  const active = value !== allValue;
  const term = q.trim().toLowerCase();
  const shown = term ? options.filter(o => String(o.label).toLowerCase().includes(term)) : options;
  const pick = (v) => { onChange(v); setOpen(false); setQ(''); };

  return (
    <div ref={ref} style={{ position: 'relative', flex: block ? 1 : 'none', minWidth: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 42, width: block ? '100%' : 'auto', padding: '0 12px 0 14px', borderRadius: 12, cursor: 'pointer',
          border: `1px solid ${active ? 'var(--text)' : 'var(--border-l)'}`, background: 'var(--surface)', color: 'var(--text)',
          fontFamily: 'var(--font-b)', fontSize: 13, whiteSpace: 'nowrap', boxSizing: 'border-box',
        }}>
        <span style={{ color: 'var(--ter)', fontWeight: 500 }}>{label}:</span>
        <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', flex: block ? 1 : 'none', textAlign: 'left' }}>{current?.label ?? value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--ter)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }}
            role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 40, minWidth: 220, maxWidth: 'min(320px, 90vw)',
              background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.18)', padding: 6,
            }}>
            {options.length >= searchAt && (
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar ${label.toLowerCase()}…`}
                style={{ width: '100%', boxSizing: 'border-box', height: 36, margin: '0 0 6px', padding: '0 10px', borderRadius: 9, border: '1px solid var(--border-l)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13, outline: 'none' }} />
            )}
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {shown.map(o => {
                const sel = o.value === value;
                return (
                  <button key={o.value} type="button" role="option" aria-selected={sel} onClick={() => pick(o.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: sel ? 'var(--surface2)' : 'transparent', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: sel ? 700 : 500,
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                    {o.count != null && <span style={{ fontSize: 12, color: 'var(--ter)' }}>{o.count}</span>}
                    <span style={{ width: 14, display: 'flex', color: 'var(--text)' }}>
                      {sel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
                    </span>
                  </button>
                );
              })}
              {!shown.length && <div style={{ padding: '10px', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Sin resultados</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
