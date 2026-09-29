import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PBtn, Icons } from '../components/ui';
import { PostMedia, PostComments } from '../components/feed';
import ProfileCard from '../components/ProfileCard';
import { useGlobalMilestones, setProjectPosts, issuerNameOf, postMedia, featuredProfiles } from '../lib/projectFeed';

// Global Feed — the first thing investors see: featured issuer profiles on
// top, then only the milestone ("hito") posts of every live project, newest
// first. Regular posts stay inside each project's own Feed tab. Clicking a
// profile narrows the posts to that issuer; "Ver proyecto" opens that project
// on its Feed tab, scrolled to the post.
const PAGE = 12;

const NO_FILTERS = { cat: 'Todos', country: 'Todos', author: 'Todos', media: 'Todos', following: 'Todos', sort: 'recent' };
const hasFilters = (f) => Object.keys(NO_FILTERS).some(k => f[k] !== NO_FILTERS[k]);

// ─── Search + filter bar (same look as Tokenizaciones' FilterBar) ─────────────
function FeedFilterBar({ search, setSearch, filters, setFilter, options, onClear }) {
  const [open, setOpen] = useState(false);
  const active = hasFilters(filters);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ter)', pointerEvents: 'none', display: 'flex' }}>
            {Icons.search}
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en el feed: proyectos, empresas, publicaciones..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 38px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13.5, outline: 'none' }} />
        </div>
        <button onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 12, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-bg)' : 'var(--surface)', color: active ? 'var(--accent-text)' : 'var(--sec)', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
        </button>
        {(active || search) && (
          <button onClick={onClear}
            style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ter)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-b)' }}>
            Limpiar
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16 }}>
              <FilterGroup label="Rubro" value={filters.cat} onChange={v => setFilter('cat', v)} options={options.cat} />
              <FilterGroup label="País" value={filters.country} onChange={v => setFilter('country', v)} options={options.country} />
              <FilterGroup label="Perfil" value={filters.author} onChange={v => setFilter('author', v)} options={options.author} />
              <FilterGroup label="Contenido" value={filters.media} onChange={v => setFilter('media', v)}
                options={['Todos', 'image', 'video']} labels={['Todo', 'Con fotos', 'Con videos']} />
              <FilterGroup label="Perfiles que sigo" value={filters.following} onChange={v => setFilter('following', v)}
                options={['Todos', 'si']} labels={['Todos', 'Solo los que sigo']} />
              <FilterGroup label="Ordenar por" value={filters.sort} onChange={v => setFilter('sort', v)}
                options={['recent', 'popular']} labels={['Más recientes', 'Más populares']} />
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
  const [followed, setFollowed] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [shown, setShown] = useState(PAGE);
  const [openComments, setOpenComments] = useState([]);
  const author = filters.author === 'Todos' ? null : filters.author; // also set by clicking a profile
  const setAuthor = (fn) => {
    setFilters(f => {
      const next = fn(f.author === 'Todos' ? null : f.author);
      return { ...f, author: next || 'Todos' };
    });
    setShown(PAGE);
  };

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

  const updatePost = (asset, postId, fn) =>
    setProjectPosts(asset, posts => posts.map(p => (p.id === postId ? fn(p) : p)));
  const toggleLike = (asset, postId) => updatePost(asset, postId, p =>
    ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
  const addComment = (asset, postId, text) => updatePost(asset, postId, p => ({
    ...p, comments: [...(p.comments || []), {
      id: Date.now(), date: 'Ahora', text,
      author: asset.isMine ? issuerNameOf(asset) : 'Vos', isIssuer: !!asset.isMine,
    }],
  }));
  const toggleComments = (key) => setOpenComments(o => (o.includes(key) ? o.filter(x => x !== key) : [...o, key]));

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 12 }}>
        Perfiles destacados
      </motion.div>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', marginBottom: 20 }}>
        {profiles.map(p => (
          <ProfileCard key={p.name} profile={p}
            following={followed.includes(p.name)}
            onFollow={() => setFollowed(f => (f.includes(p.name) ? f.filter(x => x !== p.name) : [...f, p.name]))}
            selected={author === p.name}
            onSelect={() => { setAuthor(a => (a === p.name ? null : p.name)); setShown(PAGE); }} />
        ))}
      </div>

      <FeedFilterBar
        search={search} setSearch={v => { setSearch(v); setShown(PAGE); }}
        filters={filters} setFilter={(k, v) => { setFilters(f => ({ ...f, [k]: v })); setShown(PAGE); }}
        options={{ cat: cats, country: countries, author: ['Todos', ...profiles.map(p => p.name)] }}
        onClear={() => { setFilters(NO_FILTERS); setSearch(''); setShown(PAGE); }} />

      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: 13.5 }}>
          {search || hasFilters(filters) ? 'No hay publicaciones que coincidan con tu búsqueda.' : 'Todavía no hay publicaciones.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visible.map(({ post, asset }) => {
          const key = `${asset.id}:${post.id}`;
          const media = postMedia(post);
          const open = openComments.includes(key);
          return (
            <div key={key} style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 16, padding: '16px 18px' }}>
              {/* Project header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <img src={asset.img} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => nav('detalle', asset)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', maxWidth: '100%',
                      fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {asset.name}
                  </button>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)' }}>
                    {issuerNameOf(asset)} · {asset.cat} · {post.date}
                  </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 10.5, flexShrink: 0 }}>
                  ★ Hito
                </span>
              </div>

              {post.text && (
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55, marginBottom: media.length ? 12 : 10 }}>{post.text}</div>
              )}
              <PostMedia media={media} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 8, borderTop: '1px solid var(--border-l)' }}>
                <button onClick={() => toggleLike(asset, post.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: post.liked ? 'var(--neg)' : 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, padding: 0 }}>
                  {post.liked ? '♥' : '♡'} {post.likes}
                </button>
                <button onClick={() => toggleComments(key)} aria-expanded={open}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: open ? 'var(--text)' : 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, padding: 0 }}>
                  💬 {post.comments?.length ? `${post.comments.length} ${post.comments.length === 1 ? 'comentario' : 'comentarios'}` : 'Comentar'}
                </button>
                <button onClick={() => nav('detalle', { ...asset, focusPostId: post.id })}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, padding: 0 }}>
                  Ver proyecto →
                </button>
              </div>
              {open && (
                <PostComments comments={post.comments || []} onAdd={text => addComment(asset, post.id, text)}
                  issuerName={issuerNameOf(asset)} isOwner={!!asset.isMine} />
              )}
            </div>
          );
        })}
      </div>

      {shown < filtered.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <PBtn variant="secondary" onClick={() => setShown(s => s + PAGE)}>Cargar más</PBtn>
        </div>
      )}
    </div>
  );
}
