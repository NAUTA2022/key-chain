import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PBtn, Icons } from '../components/ui';
import FeedPostCard from '../components/FeedPostCard';
import ProfileCard, { ProfileStory } from '../components/ProfileCard';
import { useDragScroll } from '../hooks/useDragScroll';
import { useMobile } from '../hooks/useMobile';
import { useGlobalMilestones, useFollowing, issuerNameOf, postMedia, featuredProfiles } from '../lib/projectFeed';

// Global Feed — the first thing investors see: featured issuer profiles on
// top (cards on desktop, Instagram-stories circles on mobile; either opens
// the company profile), a search + filter bar, then only the milestone
// ("hito") posts of every live project, newest first. Regular posts stay
// inside each project's own Feed tab and on the company profile.
const PAGE = 12;
// Width of the soft fade on the profiles rail edges. It's a mask, so the
// cards fade into whatever is behind them — works in light and dark themes.
const RAIL_FADE = 72;

const NO_FILTERS = { cat: 'Todos', country: 'Todos', author: 'Todos', media: 'Todos', following: 'Todos', sort: 'recent' };
const hasFilters = (f) => Object.keys(NO_FILTERS).some(k => f[k] !== NO_FILTERS[k]);

// ─── Search + filters ─────────────────────────────────────────────────────────
// Same look as Tokenizaciones' FilterBar. On desktop they live expanded in the
// Feed's right column (FeedFilterSidebar); on tablet/mobile it's a search row
// with a collapsible "Filtros" panel (FeedFilterBar).
function SearchInput({ search, setSearch }) {
  return (
    <div style={{ flex: 1, position: 'relative' }}>
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
      <FilterGroup label="Perfiles que sigo" value={filters.following} onChange={v => setFilter('following', v)}
        options={['Todos', 'si']} labels={['Todos', 'Solo los que sigo']} />
      <FilterGroup label="Perfil" value={filters.author} onChange={v => setFilter('author', v)} options={options.author} />
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

function FeedFilterBar({ search, setSearch, filters, setFilter, options, onClear }) {
  const [open, setOpen] = useState(false);
  const active = hasFilters(filters);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
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
            <div style={{ padding: '16px 18px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16 }}>
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

export default function GlobalFeed({ nav }) {
  const items = useGlobalMilestones();
  const [profiles] = useState(featuredProfiles);
  const [followed, toggleFollow] = useFollowing();
  const isMobile = useMobile();
  const isDesktop = !useMobile(1100); // 2 + 1 column layout needs room for a big square post
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [shown, setShown] = useState(PAGE);
  // Which edges of the profiles rail still have cards hidden past them, so
  // the fade only shows where there's more to scroll to.
  const [railEdges, setRailEdges] = useState({ left: false, right: true });
  const railDrag = useDragScroll(); // mouse drag; touch keeps native swipe
  const onRailScroll = (e) => {
    const el = e.currentTarget;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    if (left !== railEdges.left || right !== railEdges.right) setRailEdges({ left, right });
  };
  const railMask = `linear-gradient(to right, ${railEdges.left ? 'transparent' : '#000'} 0, #000 ${RAIL_FADE}px, #000 calc(100% - ${RAIL_FADE}px), ${railEdges.right ? 'transparent' : '#000'} 100%)`;
  const author = filters.author === 'Todos' ? null : filters.author;

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
  const openProfile = (name) => nav('empresa', name);

  const filterProps = {
    search, setSearch: v => { setSearch(v); setShown(PAGE); },
    filters, setFilter: (k, v) => { setFilters(f => ({ ...f, [k]: v })); setShown(PAGE); },
    options: { cat: cats, country: countries, author: ['Todos', ...profiles.map(p => p.name)] },
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
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 12 }}>
        Perfiles destacados
      </motion.div>
      <div className="no-scrollbar" onScroll={onRailScroll} {...railDrag}
        style={{ display: 'flex', gap: isMobile ? 12 : 14, overflowX: 'auto', scrollSnapType: 'x mandatory', marginBottom: 20, maskImage: railMask, WebkitMaskImage: railMask, cursor: 'grab' }}>
        {profiles.map(p => (isMobile
          ? <ProfileStory key={p.name} profile={p} onOpen={() => openProfile(p.name)} />
          : <ProfileCard key={p.name} profile={p}
              following={followed.includes(p.name)}
              onFollow={() => toggleFollow(p.name)}
              onOpen={() => openProfile(p.name)} />
        ))}
      </div>

      {isDesktop ? (
        // Desktop: search + posts span the first two of three columns, one
        // big square post per row; the third column holds the filters,
        // expanded and sticky while scrolling.
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SearchInput search={search} setSearch={filterProps.setSearch} />
            {postList}
          </div>
          <div style={{ position: 'sticky', top: 16 }}>
            <FeedFilterSidebar {...filterProps} />
          </div>
        </div>
      ) : (
        <>
          {/* Tablet & mobile: one full-width column of square posts */}
          <FeedFilterBar {...filterProps} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{postList}</div>
        </>
      )}
    </div>
  );
}
