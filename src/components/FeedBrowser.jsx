import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { PBtn, Icons } from './ui';
import FeedPostCard from './FeedPostCard';
import { useMobile } from '../hooks/useMobile';
import { useMagnetScroll } from '../hooks/useMagnetScroll';
import { useFollowing, issuerNameOf, postMedia } from '../lib/projectFeed';

// Posts browser shared by the global Feed and the company profile: search +
// filters and the list of square posts, with the "magnet" toolbar.
// - Desktop (>= 1100px): posts span two of three columns, one big post per
//   row; the third column holds the filters. Search and filters pin at the
//   same height when scrolling, each on its own (no full-width bar).
// - Tablet & mobile: one full-width column, with a pinned bar holding the
//   search and a "Filtros" button.
// Whatever sits above it on the page (profiles rail, company header) is the
// magnet zone: letting go halfway glides to the top or to the pinned state.
//
// Props: items [{ post, asset }], nav, authors (profile names for the
// "Perfil" filter, omit to hide it), showFollowing (show "Perfiles que sigo").
const PAGE = 12;
const PIN_TOP = 12; // desktop: where search + filters pin, aligned

const NO_FILTERS = { cat: 'Todos', country: 'Todos', author: 'Todos', media: 'Todos', following: 'Todos', sort: 'recent' };
const hasFilters = (f) => Object.keys(NO_FILTERS).some(k => f[k] !== NO_FILTERS[k]);

// ─── Search + filters ─────────────────────────────────────────────────────────
// Same look as Tokenizaciones' FilterBar. On desktop they live expanded in the
// right column (FeedFilterSidebar); on tablet/mobile it's a search row with a
// collapsible "Filtros" panel (FeedFilterBar).
// `floating`: pinned over the posts (desktop), so the input itself gets an
// opaque glass background instead of a full-width bar behind it.
function SearchInput({ search, setSearch, floating }) {
  return (
    <div style={{ flex: 1, position: 'relative', borderRadius: 12, transition: 'box-shadow 0.2s ease',
      ...(floating && { background: 'var(--gl-panel-strong)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: 'var(--sh-lg)' }) }}>
      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ter)', pointerEvents: 'none', display: 'flex' }}>
        {Icons.search}
      </span>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar en el feed..."
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13.5, outline: 'none' }} />
    </div>
  );
}

function FilterGroups({ filters, setFilter, options }) {
  return (
    <>
      <FilterGroup label="Ordenar por" value={filters.sort} onChange={v => setFilter('sort', v)}
        options={['recent', 'popular']} labels={['Más recientes', 'Más populares']} />
      <FilterGroup label="Rubro" value={filters.cat} onChange={v => setFilter('cat', v)} options={options.cat} />
      <FilterGroup label="País" value={filters.country} onChange={v => setFilter('country', v)} options={options.country} />
      <FilterGroup label="Contenido" value={filters.media} onChange={v => setFilter('media', v)}
        options={['Todos', 'image', 'video']} labels={['Todo', 'Con fotos', 'Con videos']} />
      {options.following && (
        <FilterGroup label="Perfiles que sigo" value={filters.following} onChange={v => setFilter('following', v)}
          options={['Todos', 'si']} labels={['Todos', 'Solo los que sigo']} />
      )}
      {options.author && (
        <FilterGroup label="Perfil" value={filters.author} onChange={v => setFilter('author', v)} options={options.author} />
      )}
    </>
  );
}

function ClearButton({ onClear }) {
  return (
    <button onClick={onClear}
      style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ter)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-b)', flexShrink: 0 }}>
      Limpiar
    </button>
  );
}

// Desktop right column: filters only (the search box sits above the posts).
function FeedFilterSidebar({ search, filters, setFilter, options, onClear }) {
  const active = hasFilters(filters) || !!search;
  return (
    <div style={{ padding: '18px 18px 20px', background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Filtros</span>
        {active && (
          <button onClick={onClear}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600 }}>
            Limpiar
          </button>
        )}
      </div>
      <FilterGroups filters={filters} setFilter={setFilter} options={options} />
    </div>
  );
}

// `compact`: pinned at the top, so an open panel scrolls inside itself
// instead of covering the whole screen.
function FeedFilterBar({ search, setSearch, filters, setFilter, options, onClear, compact }) {
  const [open, setOpen] = useState(false);
  const active = hasFilters(filters);
  return (
    <div>
      <div style={{ display: 'flex', gap: 10 }}>
        <SearchInput search={search} setSearch={setSearch} />
        <button onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-bg)' : 'var(--surface)', color: active ? 'var(--accent-text)' : 'var(--sec)', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
        </button>
        {(active || search) && <ClearButton onClear={onClear} />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: 10, padding: '16px 18px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16,
              ...(compact && { maxHeight: '55vh', overflowY: 'auto' }) }}>
              <FilterGroups filters={filters} setFilter={setFilter} options={options} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options, labels }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt, i) => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding: '5px 11px', borderRadius: 999, border: `1.5px solid ${value === opt ? 'var(--accent)' : 'var(--border)'}`, background: value === opt ? 'var(--accent-bg)' : 'transparent', color: value === opt ? 'var(--accent-text)' : 'var(--sec)', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: value === opt ? 700 : 400 }}>
            {labels ? labels[i] : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedBrowser({ items, nav, authors, showFollowing }) {
  const [followed] = useFollowing();
  const isMobile = useMobile();
  const isDesktop = !useMobile(1100); // 2 + 1 column layout needs room for a big square post
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [shown, setShown] = useState(PAGE);
  const author = filters.author === 'Todos' ? null : filters.author;
  const pagePad = isMobile ? 14 : 32; // matches .g-page padding

  // Magnet toolbar: search (+ filters) pin at the top with a snap, and the
  // area above glides to rest instead of stopping halfway (useMagnetScroll).
  const sentinelRef = useRef(null);
  const { stuck } = useMagnetScroll(sentinelRef, isDesktop ? PIN_TOP : 0);
  const snap = useAnimationControls();
  // The "pull" when the toolbar reaches the top: a quick overshoot that
  // settles into place, like it got snapped by a magnet.
  useEffect(() => {
    if (stuck) snap.start({ y: [-14, 4, 0], scale: [0.985, 1.006, 1], transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } });
  }, [stuck, snap]);

  const cats = ['Todos', ...new Set(items.map(i => i.asset.cat))];
  const countries = ['Todos', ...new Set(items.map(i => i.asset.country).filter(Boolean))];
  const q = search.trim().toLowerCase();
  const filtered = items
    .filter(({ post, asset }) => {
      const media = postMedia(post);
      if (filters.cat !== 'Todos' && asset.cat !== filters.cat) return false;
      if (filters.country !== 'Todos' && asset.country !== filters.country) return false;
      if (author && issuerNameOf(asset) !== author) return false;
      if (filters.media === 'video' && !media.some(m => m.type === 'video')) return false;
      if (filters.media === 'image' && !media.some(m => m.type === 'image')) return false;
      if (filters.following === 'si' && !followed.includes(issuerNameOf(asset))) return false;
      if (!q) return true;
      return [post.text, asset.name, issuerNameOf(asset), asset.location, asset.cat]
        .some(s => s && s.toLowerCase().includes(q));
    })
    .sort((x, y) => (filters.sort === 'popular' ? y.post.likes - x.post.likes : 0));
  const visible = filtered.slice(0, shown);

  const filterProps = {
    search, setSearch: v => { setSearch(v); setShown(PAGE); },
    filters, setFilter: (k, v) => { setFilters(f => ({ ...f, [k]: v })); setShown(PAGE); },
    options: { cat: cats, country: countries, author: authors && ['Todos', ...authors], following: !!showFollowing },
    onClear: () => { setFilters(NO_FILTERS); setSearch(''); setShown(PAGE); },
  };
  const postList = (
    <>
      {visible.length === 0 && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: 13.5 }}>
          {search || hasFilters(filters) ? 'No hay publicaciones que coincidan con tu búsqueda.' : 'Todavía no hay publicaciones.'}
        </div>
      )}
      {visible.map(({ post, asset }) => (
        <FeedPostCard key={`${asset.id}:${post.id}`} post={post} asset={asset} nav={nav} />
      ))}
      {shown < filtered.length && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <PBtn variant="secondary" onClick={() => setShown(s => s + PAGE)}>Cargar más</PBtn>
        </div>
      )}
    </>
  );

  return (
    <>
      <div ref={sentinelRef} />
      {isDesktop ? (
        // Desktop: posts span the first two of three columns, one big square
        // post per row; the third column holds the filters. Search and
        // filters are pinned independently at the same height (no full-width
        // bar behind them).
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ position: 'sticky', top: PIN_TOP, zIndex: 30 }}>
              <motion.div animate={snap}>
                <SearchInput search={search} setSearch={filterProps.setSearch} floating={stuck} />
              </motion.div>
            </div>
            {postList}
          </div>
          <div style={{ position: 'sticky', top: PIN_TOP }}>
            <motion.div animate={snap}>
              <FeedFilterSidebar {...filterProps} />
            </motion.div>
          </div>
        </div>
      ) : (
        <>
          {/* Tablet & mobile: pinned bar with search + "Filtros" */}
          <div style={{ position: 'sticky', top: 0, zIndex: 30, margin: `0 -${pagePad}px 4px` }}>
            <motion.div animate={snap}
              style={{ padding: `10px ${pagePad}px`, background: stuck ? 'var(--bg)' : 'transparent', transition: 'background 0.2s ease, box-shadow 0.2s ease',
                boxShadow: stuck ? '0 10px 24px -12px rgba(0,0,0,0.45)' : 'none' }}>
              <FeedFilterBar {...filterProps} compact={stuck} />
            </motion.div>
          </div>
          {/* One full-width column of square posts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{postList}</div>
        </>
      )}
    </>
  );
}
