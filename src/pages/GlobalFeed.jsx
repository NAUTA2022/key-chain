import { useState } from 'react';
import { motion } from 'framer-motion';
import { PBtn } from '../components/ui';
import { PostMedia, PostComments } from '../components/feed';
import ProfileCard from '../components/ProfileCard';
import { useGlobalMilestones, setProjectPosts, issuerNameOf, postMedia, featuredProfiles } from '../lib/projectFeed';

// Global Feed — the first thing investors see: featured issuer profiles on
// top, then only the milestone ("hito") posts of every live project, newest
// first. Regular posts stay inside each project's own Feed tab. Clicking a
// profile narrows the posts to that issuer; "Ver proyecto" opens that project
// on its Feed tab, scrolled to the post.
const PAGE = 12;

export default function GlobalFeed({ nav }) {
  const items = useGlobalMilestones();
  const [profiles] = useState(featuredProfiles);
  const [followed, setFollowed] = useState([]);
  const [author, setAuthor] = useState(null); // clicking a profile shows only its posts
  const [shown, setShown] = useState(PAGE);
  const [openComments, setOpenComments] = useState([]);

  const filtered = author ? items.filter(i => issuerNameOf(i.asset) === author) : items;
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
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8, marginBottom: 22 }}>
        {profiles.map(p => (
          <ProfileCard key={p.name} profile={p}
            following={followed.includes(p.name)}
            onFollow={() => setFollowed(f => (f.includes(p.name) ? f.filter(x => x !== p.name) : [...f, p.name]))}
            selected={author === p.name}
            onSelect={() => { setAuthor(a => (a === p.name ? null : p.name)); setShown(PAGE); }} />
        ))}
      </div>

      {author && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>
          Publicaciones de <b style={{ color: 'var(--text)' }}>{author}</b>
          <button onClick={() => setAuthor(null)} aria-label="Ver todas las publicaciones"
            style={{ border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--sec)', borderRadius: 999, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
            ✕ Ver todas
          </button>
        </div>
      )}

      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: 13.5 }}>
          Todavía no hay publicaciones.
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
