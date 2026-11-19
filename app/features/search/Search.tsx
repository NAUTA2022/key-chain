import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icons } from '~/components/ui';
import { useT } from '~/i18n/useT';
import { useSearch, useSearchNavigate, type SearchGroup, type SearchResult } from './useSearch';

// Global search in the top bar: an inline combobox on desktop and a full-screen
// overlay on phones. Results: catalog assets, academy posts and app sections.

const groupLabel: CSSProperties = {
  fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 600, color: 'var(--ter)',
  textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 16px 6px',
};

const KIND_ICON = { post: Icons.academy, section: Icons.dash } as const;

type ListProps = {
  listId: string;
  query: string;
  groups: SearchGroup[];
  flat: SearchResult[];
  active: number;
  loading: boolean;
  onHover: (index: number) => void;
  onPick: (result: SearchResult) => void;
};

function ResultsList({ listId, query, groups, flat, active, loading, onHover, onPick }: ListProps) {
  const { t } = useT('common');
  if (flat.length === 0) {
    return (
      <div role="status" style={{ padding: '18px 16px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', textAlign: 'center' }}>
        {loading ? t('search.searching') : t('search.noResults', { query: query.trim() })}
      </div>
    );
  }
  return (
    <div id={listId} role="listbox" aria-label={t('search.results')}>
      {groups.map(g => (
        <div key={g.kind} role="group" aria-label={g.label}>
          <div aria-hidden="true" style={groupLabel}>{g.label}</div>
          {g.items.map(r => {
            const index = flat.indexOf(r);
            const selected = index === active;
            return (
              <div
                key={r.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => onHover(index)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onPick(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', cursor: 'pointer',
                  background: selected ? 'var(--surface2)' : 'transparent',
                }}
              >
                {r.kind === 'asset' ? (
                  <img src={r.image} alt="" loading="lazy" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover', flexShrink: 0, background: 'var(--surface2)' }} />
                ) : (
                  <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface2)', color: 'var(--sec)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {KIND_ICON[r.kind]}
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                  {r.subtitle && <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.subtitle}</span>}
                </span>
                {selected && <span aria-hidden="true" style={{ color: 'var(--ter)', display: 'flex', flexShrink: 0 }}>{Icons.chevR}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Keyboard handling shared by both variants (↑ ↓ Enter Esc). */
function useResultsKeys(flat: SearchResult[], onPick: (r: SearchResult) => void, onEscape: () => void) {
  const [active, setActive] = useState(0);
  const current = flat.length ? Math.min(active, flat.length - 1) : -1;
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault();
      setActive((current + 1) % flat.length);
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault();
      setActive((current - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      const r = flat[current];
      if (r) {
        e.preventDefault();
        onPick(r);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
    }
  };
  return { active: current, setActive, onKeyDown };
}

const inputStyle: CSSProperties = {
  flex: 1, minWidth: 0, width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: 0, margin: 0,
  fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)',
};

/** Desktop search box: same look as the original decorative field, now a real combobox. */
export function SearchBox({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useT('common');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { groups, flat, loading } = useSearch(query, { isAdmin, active: open });
  const go = useSearchNavigate();
  const showList = open && query.trim().length >= 2;

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };
  const pick = (r: SearchResult) => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    go(r.href);
  };
  const keys = useResultsKeys(flat, pick, close);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      onClick={() => inputRef.current?.focus()}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface2)', borderRadius: 11,
        padding: '9px 14px', width: 300, color: 'var(--ter)', cursor: 'pointer',
        position: 'relative', boxShadow: focused ? '0 0 0 1.5px var(--border)' : undefined,
      }}
    >
      {Icons.search}
      <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex' }}>
        {!query && (
          <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', maxWidth: '100%', fontFamily: 'var(--font-b)', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
            {t('search.placeholder')}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={t('search.label')}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && keys.active >= 0 ? `${listId}-${keys.active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={80}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            keys.setActive(0);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={keys.onKeyDown}
          style={{ ...inputStyle, cursor: 'text' }}
        />
      </div>
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 420, maxWidth: 'calc(100vw - 48px)', zIndex: 95,
              background: 'var(--gl-panel)', backdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
              WebkitBackdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
              borderRadius: 16, boxShadow: 'var(--sh-lg)', border: '1px solid var(--gl-bd)', overflow: 'hidden', cursor: 'default',
            }}
          >
            <div style={{ maxHeight: 440, overflowY: 'auto', padding: '4px 0 8px' }}>
              <ResultsList listId={listId} query={query} groups={groups} flat={flat} active={keys.active} loading={loading} onHover={keys.setActive} onPick={pick} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchOverlay({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const { t } = useT('common');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { groups, flat, loading } = useSearch(query, { isAdmin, active: true });
  const go = useSearchNavigate();
  const pick = (r: SearchResult) => {
    onClose();
    go(r.href);
  };
  const keys = useResultsKeys(flat, pick, onClose);
  const ready = query.trim().length >= 2;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t('search.open')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderBottom: '1px solid var(--gl-bd)', background: 'var(--gl-panel)' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 11, padding: '8px 12px', color: 'var(--ter)' }}>
          {Icons.search}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={t('search.label')}
            aria-expanded={ready && flat.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={ready && keys.active >= 0 ? `${listId}-${keys.active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={80}
            placeholder={t('search.placeholder')}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              keys.setActive(0);
            }}
            onKeyDown={keys.onKeyDown}
            // 16px avoids the iOS zoom-on-focus.
            style={{ ...inputStyle, fontSize: 16 }}
          />
        </div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', padding: '6px 2px', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          {t('search.cancel')}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 24px' }}>
        {ready ? (
          <ResultsList listId={listId} query={query} groups={groups} flat={flat} active={keys.active} loading={loading} onHover={keys.setActive} onPick={pick} />
        ) : (
          <p style={{ margin: 0, padding: '22px 20px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', textAlign: 'center', lineHeight: 1.5 }}>
            {t('search.hint')}
          </p>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

/** Phone variant: an icon button in the top bar that opens a full-screen search. */
export function MobileSearch({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useT('common');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('search.open')}
        aria-haspopup="dialog"
        style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', flexShrink: 0, padding: 0 }}
      >
        {Icons.search}
      </button>
      <AnimatePresence>{open && <SearchOverlay isAdmin={isAdmin} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}
