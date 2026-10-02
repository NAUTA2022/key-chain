import { useState, useRef } from 'react';
import { PBtn, CompanyAvatar } from './ui';

// Shared pieces of a feed post, used by a project's Feed tab
// (pages/ProductDetail) and by the global Feed (pages/GlobalFeed).

export function PostMedia({ media }) {
  if (!media.length) return null;
  const single = media.length === 1;
  return (
    <div style={{ display:'grid', gridTemplateColumns: single ? '1fr' : '1fr 1fr', gap:6, marginBottom:10 }}>
      {media.map(m => m.type === 'video'
        ? <video key={m.id} src={m.url} controls playsInline preload="metadata"
            style={{ width:'100%', maxHeight: single ? 360 : 200, borderRadius:12, background:'#000', display:'block' }} />
        : <img key={m.id} src={m.url} alt=""
            style={{ width:'100%', height: single ? 'auto' : 200, maxHeight: single ? 280 : 200, objectFit:'cover', borderRadius:12, display:'block' }} />
      )}
    </div>
  );
}

// Instagram-style square media: a 1:1 frame, one photo/video at a time.
// Several items swipe as a carousel (drag on touch, arrows on desktop),
// with a "2/3" counter and dots.
export function SquareMedia({ media }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  if (!media.length) return null;
  const many = media.length > 1;
  const go = (i) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  const arrow = (dir) => (
    <button onClick={() => go(index + dir)} aria-label={dir < 0 ? 'Anterior' : 'Siguiente'}
      style={{ position: 'absolute', top: '50%', [dir < 0 ? 'left' : 'right']: 8, transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.88)', color: '#111', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
      {dir < 0 ? '‹' : '›'}
    </button>
  );

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <div ref={ref} className="no-scrollbar"
          onScroll={e => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          style={{ display: 'flex', aspectRatio: '1 / 1', overflowX: many ? 'auto' : 'hidden', overflowY: 'hidden', scrollSnapType: 'x mandatory' }}>
          {media.map(m => (
            <div key={m.id} style={{ flex: '0 0 100%', height: '100%', scrollSnapAlign: 'start' }}>
              {m.type === 'video'
                ? <video src={m.url} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <img src={m.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </div>
          ))}
        </div>
        {many && (
          <>
            <span style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 700 }}>
              {index + 1}/{media.length}
            </span>
            {index > 0 && arrow(-1)}
            {index < media.length - 1 && arrow(1)}
          </>
        )}
      </div>
      {many && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
          {media.map((m, i) => (
            <span key={m.id} style={{ width: 6, height: 6, borderRadius: '50%', background: i === index ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s ease' }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PostComments({ comments, onAdd, issuerName, isOwner }) {
  const [draft, setDraft] = useState('');
  const send = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
  };
  // The company answers with its hexagon; everyone else is a round user.
  const avatar = (label, isIssuer) => isIssuer ? <CompanyAvatar company={label} size={28} /> : (
    <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-h)', fontWeight:700, fontSize:12,
      background: isIssuer ? 'var(--accent-bg)' : 'var(--surface2)', color: isIssuer ? 'var(--accent-text)' : 'var(--sec)' }}>
      {label.slice(0,1).toUpperCase()}
    </div>
  );

  return (
    <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
      {comments.length === 0 && (
        <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>Todavía no hay comentarios. ¡Sé el primero!</div>
      )}
      {comments.map(c => (
        <div key={c.id} style={{ display:'flex', gap:8 }}>
          {avatar(c.author, c.isIssuer)}
          <div style={{ flex:1, minWidth:0, background:'var(--surface2)', borderRadius:12, padding:'8px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:12.5, color:'var(--text)' }}>{c.author}</span>
              {c.isIssuer && <span style={{ padding:'1px 6px', borderRadius:999, background:'var(--accent-bg)', color:'var(--accent-text)', fontFamily:'var(--font-b)', fontWeight:700, fontSize:9.5 }}>Emisor</span>}
              <span style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)' }}>· {c.date}</span>
            </div>
            <div style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--text)', lineHeight:1.5, whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{c.text}</div>
          </div>
        </div>
      ))}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        {avatar(isOwner ? issuerName : 'Vos', isOwner)}
        <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={500}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder={isOwner ? 'Responder como emisor...' : 'Escribí un comentario...'}
          style={{ flex:1, minWidth:0, border:'1px solid var(--border-l)', borderRadius:999, padding:'8px 14px', fontFamily:'var(--font-b)', fontSize:13, color:'var(--text)', background:'var(--surface)', outline:'none' }} />
        <PBtn variant="accent" small disabled={!draft.trim()} onClick={send} style={{ opacity: draft.trim() ? 1 : 0.5 }}>Enviar</PBtn>
      </div>
    </div>
  );
}
