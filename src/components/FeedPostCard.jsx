import { useState } from 'react';
import { PostMedia, PostComments } from './feed';
import { setProjectPosts, issuerNameOf, postMedia } from '../lib/projectFeed';

// One post as shown in the global Feed and on a company profile: project
// header (issuer name opens the company profile), text, media, likes,
// comments and "Ver proyecto".
export default function FeedPostCard({ post, asset, nav }) {
  const [open, setOpen] = useState(false);
  const media = postMedia(post);
  const issuer = issuerNameOf(asset);

  const update = (fn) => setProjectPosts(asset, posts => posts.map(p => (p.id === post.id ? fn(p) : p)));
  const toggleLike = () => update(p => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }));
  const addComment = (text) => update(p => ({
    ...p, comments: [...(p.comments || []), {
      id: Date.now(), date: 'Ahora', text,
      author: asset.isMine ? issuer : 'Vos', isIssuer: !!asset.isMine,
    }],
  }));

  const linkStyle = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' };

  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <img src={asset.img} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={() => nav('detalle', asset)}
            style={{ ...linkStyle, textAlign: 'left', maxWidth: '100%', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {asset.name}
          </button>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)' }}>
            <button onClick={() => nav('empresa', issuer)} style={{ ...linkStyle, fontWeight: 600, color: 'var(--sec)' }}>{issuer}</button>
            {' · '}{asset.cat} · {post.date}
          </div>
        </div>
        {post.milestone && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 10.5, flexShrink: 0 }}>
            ★ Hito
          </span>
        )}
      </div>

      {post.text && (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55, marginBottom: media.length ? 12 : 10 }}>{post.text}</div>
      )}
      <PostMedia media={media} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 8, borderTop: '1px solid var(--border-l)' }}>
        <button onClick={toggleLike} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: post.liked ? 'var(--neg)' : 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, padding: 0 }}>
          {post.liked ? '♥' : '♡'} {post.likes}
        </button>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: open ? 'var(--text)' : 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, padding: 0 }}>
          💬 {post.comments?.length ? `${post.comments.length} ${post.comments.length === 1 ? 'comentario' : 'comentarios'}` : 'Comentar'}
        </button>
        <button onClick={() => nav('detalle', { ...asset, focusPostId: post.id })}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, padding: 0 }}>
          Ver proyecto →
        </button>
      </div>
      {open && (
        <PostComments comments={post.comments || []} onAdd={addComment} issuerName={issuer} isOwner={!!asset.isMine} />
      )}
    </div>
  );
}
