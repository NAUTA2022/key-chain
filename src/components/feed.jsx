import { useState } from 'react';
import { PBtn } from './ui';

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

export function PostComments({ comments, onAdd, issuerName, isOwner }) {
  const [draft, setDraft] = useState('');
  const send = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft('');
  };
  const avatar = (label, isIssuer) => (
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
