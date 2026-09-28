import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PCard, PBtn, PTag, PProgress, PImg, PDiv, PDonut, PArea, PScanLink, Icons, CompanyTag } from '../components/ui';
import { fmtUSD, fmtUSD2, MY_HOLDINGS } from '../data';
import { addPendingPayment } from '../lib/keypayInbox';
import { DEV_MODE } from '../lib/devSession';

// ─── Media carousel ───────────────────────────────────────────────────────────
function MediaCarousel({ images = [] }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const media = images.length > 0 ? images : [null];

  const go = (next) => {
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  };
  const prev = () => go((idx - 1 + media.length) % media.length);
  const next = () => go((idx + 1) % media.length);

  return (
    <div style={{ borderRadius:22, overflow:'hidden', background:'var(--surface2)' }}>
      {/* Main image */}
      <div style={{ position:'relative', height:340, overflow:'hidden' }}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.img
            key={idx}
            src={media[idx]}
            alt=""
            custom={dir}
            initial={{ x: dir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -dir * 60, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
          />
        </AnimatePresence>

        {/* Arrows */}
        {media.length > 1 && (
          <>
            <button onClick={prev}
              style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, zIndex:2, backdropFilter:'blur(4px)' }}>
              ‹
            </button>
            <button onClick={next}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, zIndex:2, backdropFilter:'blur(4px)' }}>
              ›
            </button>
          </>
        )}

        {/* Counter */}
        {media.length > 1 && (
          <div style={{ position:'absolute', bottom:12, right:14, background:'rgba(0,0,0,0.6)', color:'#fff', borderRadius:999, padding:'3px 10px', fontSize:11.5, fontFamily:'var(--font-b)', backdropFilter:'blur(4px)', zIndex:2 }}>
            {idx + 1} / {media.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div style={{ display:'flex', gap:8, padding:'10px 12px', background:'var(--surface)', overflowX:'auto' }}>
          {media.map((src, i) => (
            <button key={i} onClick={() => go(i)}
              style={{ flexShrink:0, width:72, height:50, borderRadius:10, overflow:'hidden', border:`2px solid ${i===idx ? 'var(--accent)' : 'transparent'}`, padding:0, cursor:'pointer', transition:'border-color 0.15s', background:'var(--surface2)' }}>
              <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Project feed — Instagram/Facebook-style updates from the issuer ───────────
// Only shown once a project is live (Operativo), fully funded, or flagged
// early (feedEnabled) — before that there's nothing operational to post
// about yet. Posts flagged as "hito" also surface in the Actualizaciones
// timeline; clicking one there jumps back here and briefly highlights it.
// The composer itself only renders for the project's actual owner (isMine) —
// everyone else just reads the feed, same as any investor would. The owner
// can attach photos and videos (up to MAX_FEED_MEDIA per post).
const MAX_FEED_MEDIA = 10;

// Seed posts still use the older single `img` field.
const postMedia = (post) => post.media || (post.img ? [{ id: post.img, type: 'image', url: post.img }] : []);

function PostMedia({ media }) {
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

function ProjectFeed({ a, posts, setPosts, highlightId, registerPostRef }) {
  const [text, setText] = useState('');
  const [milestone, setMilestone] = useState(false);
  const [img, setImg] = useState(null);
  const [uploads, setUploads] = useState([]); // [{ id, type: 'image'|'video', url, name }]
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);
  const issuerName = a.issuer === 'keychain' ? 'KEYCHAIN' : (a.company || '');
  const canPublish = text.trim() || img || uploads.length > 0;

  // No backend yet: files stay in the browser as object URLs, so uploaded
  // media lives until the page reloads. Swap this for a real upload (and
  // store the returned URLs on the post) once the feed is persisted.
  const addFiles = (fileList) => {
    const files = [...fileList];
    const valid = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const room = MAX_FEED_MEDIA - uploads.length;
    const accepted = valid.slice(0, Math.max(room, 0));
    setUploadError(
      valid.length < files.length ? 'Solo se pueden subir fotos o videos.'
      : accepted.length < valid.length ? `Máximo ${MAX_FEED_MEDIA} archivos por publicación.`
      : ''
    );
    setUploads(u => [...u, ...accepted.map(f => ({
      id: `${f.name}-${f.lastModified}-${Math.random()}`,
      type: f.type.startsWith('video/') ? 'video' : 'image',
      url: URL.createObjectURL(f),
      name: f.name,
    }))]);
  };

  const removeUpload = (id) => setUploads(u => {
    const gone = u.find(m => m.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    return u.filter(m => m.id !== id);
  });

  const publish = () => {
    if (!canPublish) return;
    const media = [...(img ? [{ id: img, type: 'image', url: img }] : []), ...uploads];
    setPosts(p => [{ id: Date.now(), date: 'Ahora', text: text.trim(), milestone, media, likes: 0, liked: false }, ...p]);
    setText(''); setMilestone(false); setImg(null); setUploads([]); setUploadError('');
  };

  const toggleLike = (id) => setPosts(p => p.map(post => post.id === id
    ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
    : post));

  return (
    <motion.div key="feed" initial={{ opacity:0 }} animate={{ opacity:1 }}>
      {/* Composer — only the project's owner gets to post here (isMine) */}
      {a.isMine && (
      <PCard style={{ padding:'18px 20px', marginBottom:18 }}>
        <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Panel del emisor · Publicar como {issuerName}</div>
        <div style={{ display:'flex', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent-bg)', color:'var(--accent-text)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, flexShrink:0 }}>
            {issuerName.slice(0,1)}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
              placeholder="Escribí una actualización para tus inversores..."
              style={{ width:'100%', resize:'vertical', border:'1px solid var(--border-l)', borderRadius:12, padding:'10px 12px', fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--text)', background:'var(--surface)', outline:'none', boxSizing:'border-box' }} />
            {a.images?.length > 1 && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                {a.images.map(src => (
                  <button key={src} onClick={() => setImg(img === src ? null : src)}
                    style={{ width:50, height:38, borderRadius:8, overflow:'hidden', border:`2px solid ${img===src ? 'var(--accent)' : 'transparent'}`, padding:0, cursor:'pointer', flexShrink:0 }}>
                    <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                  </button>
                ))}
              </div>
            )}
            {uploads.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                {uploads.map(m => (
                  <div key={m.id} style={{ position:'relative', width:78, height:60, borderRadius:10, overflow:'hidden', background:'var(--surface2)', flexShrink:0 }}>
                    {m.type === 'video'
                      ? <video src={m.url} muted playsInline preload="metadata" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      : <img src={m.url} alt={m.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />}
                    {m.type === 'video' && (
                      <span style={{ position:'absolute', left:5, bottom:4, padding:'1px 5px', borderRadius:5, background:'rgba(0,0,0,0.65)', color:'#fff', fontFamily:'var(--font-b)', fontSize:9.5, fontWeight:700 }}>▶ Video</span>
                    )}
                    <button onClick={() => removeUpload(m.id)} aria-label={`Quitar ${m.name}`}
                      style={{ position:'absolute', top:4, right:4, width:18, height:18, borderRadius:6, border:'none', background:'rgba(0,0,0,0.65)', color:'#fff', cursor:'pointer', fontSize:10, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploadError && (
              <div style={{ marginTop:8, fontFamily:'var(--font-b)', fontSize:12, color:'var(--neg)' }}>{uploadError}</div>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginTop:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <button onClick={() => fileRef.current?.click()} disabled={uploads.length >= MAX_FEED_MEDIA}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:10, border:'1px solid var(--border-l)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:12.5, fontWeight:600, cursor: uploads.length >= MAX_FEED_MEDIA ? 'not-allowed' : 'pointer', opacity: uploads.length >= MAX_FEED_MEDIA ? 0.5 : 1 }}>
                  {Icons.plus} Fotos / videos
                </button>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)' }}>
                  <input type="checkbox" checked={milestone} onChange={e => setMilestone(e.target.checked)} />
                  Marcar como hito
                </label>
              </div>
              <PBtn variant="accent" small disabled={!canPublish} onClick={publish} style={{ opacity: canPublish ? 1 : 0.5 }}>Publicar</PBtn>
            </div>
          </div>
        </div>
      </PCard>
      )}

      {!a.isMine && (
        <div style={{ marginBottom:18, fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>
          Actualizaciones publicadas por {issuerName}.
        </div>
      )}

      {/* Posts — newest first */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {posts.map(post => (
          <div key={post.id} ref={el => registerPostRef(post.id, el)}
            style={{
              background: highlightId === post.id ? 'var(--accent-bg)' : 'var(--surface)',
              border: `1.5px solid ${highlightId === post.id ? 'var(--accent)' : 'var(--border-l)'}`,
              borderRadius:16, padding:'16px 18px', transition:'background 0.4s ease, border-color 0.4s ease',
            }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent-bg)', color:'var(--accent-text)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, flexShrink:0 }}>
                {issuerName.slice(0,1)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:13.5, color:'var(--text)' }}>{issuerName}</div>
                <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)' }}>{post.date}</div>
              </div>
              {post.milestone && (
                <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:999, background:'var(--accent-bg)', color:'var(--accent-text)', fontFamily:'var(--font-b)', fontWeight:700, fontSize:10.5, flexShrink:0 }}>
                  ★ Hito
                </span>
              )}
            </div>
            {post.text && <div style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--text)', lineHeight:1.55, marginBottom: postMedia(post).length ? 12 : 10 }}>{post.text}</div>}
            <PostMedia media={postMedia(post)} />
            <div style={{ display:'flex', alignItems:'center', gap:18, paddingTop:8, borderTop:'1px solid var(--border-l)' }}>
              <button onClick={() => toggleLike(post.id)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color: post.liked ? 'var(--neg)' : 'var(--sec)', fontFamily:'var(--font-b)', fontSize:12.5, padding:0 }}>
                {post.liked ? '♥' : '♡'} {post.likes}
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:12.5 }}>
                💬 Comentarios
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Dev state banner ─────────────────────────────────────────────────────────
// Developer-only (DEV_MODE): spells out which state a project is in and what
// the page should show because of it, so every asset — not just the [QA]
// fixtures — is self-explanatory while testing. Fixtures add their `devNote`
// on top as the specific thing to verify.
const ISSUER_LABEL = { keychain: 'KEYCHAIN', verified: 'Verificado', community: 'Comunidad' };

function projectState(a, { isLive, holding }) {
  const funding = a.sold <= 0 ? 'Nuevo · sin financiamiento'
    : a.sold >= 100 ? 'Financiado 100%'
    : a.stage === 'Operativo' ? `${a.sold}% de tokens vendidos`
    : `En financiamiento · ${a.sold}%`;
  const feedWhy = a.stage === 'Operativo' ? 'stage="Operativo"'
    : a.sold >= 100 ? 'sold>=100'
    : a.feedEnabled ? 'feedEnabled=true'
    : 'sold<100 y feedEnabled=false';
  return [
    ['Etapa', `${a.stage} — ${funding}`],
    ['Feed y Actualizaciones', `${isLive ? 'Visibles' : 'Ocultos'} (${feedWhy})`],
    ['Publicar en el Feed', a.isMine ? 'Sí — es mi proyecto (isMine)' : 'No — solo lectura'],
    ['Mi inversión', holding ? `Sí — ${holding.tokens} tokens${isLive ? ', con "Ver avances"' : ', sin "Ver avances"'}` : 'No'],
    ['Emisor', ISSUER_LABEL[a.issuer] || a.issuer || '—'],
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductDetail({ nav, asset: a, fromRoute }) {
  const [tab, setTab]       = useState('resumen');
  const [tokens, setTokens] = useState(10);
  const left = a.totalTokens - Math.round(a.totalTokens * a.sold / 100);
  // Feed exists once the project is running, fully funded, OR was explicitly
  // flagged early (feedEnabled) — some projects start building/buying the
  // underlying asset before their raise closes and want to post progress
  // during that window too.
  const isLive = a.stage === 'Operativo' || a.sold >= 100 || a.feedEnabled === true;
  const tabs = [
    ['resumen','Resumen'],
    ...(isLive ? [['feed','Feed']] : []),
    ['tokenomics','Tokenomics'], ['docs','Documentos'],
    ...(isLive ? [['updates','Actualizaciones']] : []),
  ];
  const images = a.images || [a.img];
  // Came in from Mercado Secundario (or anywhere else)? Go back there —
  // only default to Mercado Primario when we don't know the origin.
  const backRoute = fromRoute || 'primario';

  // Feed posts live here (not inside ProjectFeed) so the Actualizaciones tab
  // can read the same milestone-flagged posts and jump back to them.
  const [posts, setPosts] = useState([
    { id: 1, date: '10 Jun 2026', text: 'Se distribuyeron $38,400 USDC entre 412 holders.', milestone: true, img: null, likes: 31, liked: false },
    { id: 2, date: '28 May 2026', text: 'Auditoría operativa sin observaciones.', milestone: true, img: null, likes: 15, liked: false },
    { id: 3, date: '15 May 2026', text: `El proyecto alcanzó el ${a.sold}% de financiación.`, milestone: true, img: null, likes: 24, liked: false },
    { id: 4, date: '02 May 2026', text: 'Se firmó contrato de operación por 24 meses adicionales.', milestone: false, img: null, likes: 8, liked: false },
  ]);
  const [highlightId, setHighlightId] = useState(null);
  const [scrollToId, setScrollToId] = useState(null);
  const postRefs = useRef({});
  const registerPostRef = (id, el) => { postRefs.current[id] = el; };

  // Dev-only state banner (see projectState above).
  const [devNoteOpen, setDevNoteOpen] = useState(true);

  const goToPost = (id) => { setTab('feed'); setScrollToId(id); };

  useEffect(() => {
    if (tab !== 'feed' || scrollToId == null) return;
    const el = postRefs.current[scrollToId];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(scrollToId);
    setScrollToId(null);
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [tab, scrollToId]);
  // Already holding this asset? Surface an investor summary (position,
  // P&L, yield collected) instead of treating every visitor as a first-time buyer.
  const holding = MY_HOLDINGS.find(h => h.assetId === a.id);
  const holdingPnlPct = holding ? ((holding.current / holding.invested - 1) * 100).toFixed(1) : null;
  const holdingIsPos = holding ? holding.current >= holding.invested : null;

  return (
    <div style={{ padding:'24px 32px 40px', maxWidth:1200, margin:'0 auto' }}>
      {/* Back */}
      <button onClick={() => nav(backRoute)}
        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--sec)', fontFamily:'var(--font-b)', fontSize:13.5, marginBottom:18, padding:0 }}>
        {Icons.back} Volver al mercado
      </button>

      {/* Two-column grid — both columns start at the same top */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:26, alignItems:'start' }}>

        {/* ── Left column ── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}>

          {/* Carousel */}
          <MediaCarousel images={images} />

          {/* Title row */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:22, marginBottom:6 }}>
            <div>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:30, color:'var(--text)', letterSpacing:'-0.03em', marginBottom:8 }}>{a.name}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--ter)', marginBottom:10 }}>
                {Icons.location}
                <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)' }}>{a.location}</span>
                <span style={{ color:'var(--ter)', margin:'0 4px' }}>·</span>
                <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)' }}>Vida útil: {a.lifespan}</span>
              </div>
              {a.company && <CompanyTag company={a.company} cat={a.cat} size="sm" />}
            </div>
            <PScanLink contract={a.contract} />
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border-l)', margin:'20px 0' }}>
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
                fontFamily:'var(--font-b)', fontSize:13.5, fontWeight: tab===id ? 700 : 450,
                color: tab===id ? 'var(--text)' : 'var(--ter)',
                borderBottom:`2px solid ${tab===id ? 'var(--accent)' : 'transparent'}`, marginBottom:-1,
              }}>{label}</button>
            ))}
          </div>

          {tab==='resumen' && (
            <motion.div key="res" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <div style={{ fontFamily:'var(--font-b)', fontSize:14.5, color:'var(--sec)', lineHeight:1.7, marginBottom:22 }}>{a.desc}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
                {[['Valuación',fmtUSD(a.valuation)],['Categoría',a.cat],['Etapa',a.stage],['Vida útil',a.lifespan]].map(([k,v]) => (
                  <div key={k} style={{ background:'var(--surface)', border:'1px solid var(--border-l)', borderRadius:14, padding:'14px 16px' }}>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k}</div>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15.5, color:'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <PCard style={{ padding:'20px 22px' }}>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Rendimiento histórico</div>
                <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:14 }}>Últimos 12 meses · precio de referencia</div>
                <PArea data={a.perf} height={120} id={`det${a.id}`} />
              </PCard>
            </motion.div>
          )}

          {tab==='tokenomics' && (
            <motion.div key="tok" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <PCard style={{ padding:'22px 24px' }}>
                <div style={{ display:'flex', gap:30, alignItems:'center', marginBottom:20 }}>
                  <PDonut size={150} label={`${a.sold}%`} sub="vendido" segments={[
                    { value:a.sold, color:'var(--accent)' },
                    { value:100-a.sold, color:'var(--surface2)' },
                  ]} />
                  <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    {[['Supply total',a.totalTokens.toLocaleString()],['Vendidos',Math.round(a.totalTokens*a.sold/100).toLocaleString()],['Disponibles',left.toLocaleString()],['Precio token',fmtUSD(a.tokenPrice)],['Min. inversión','1 token'],['Fee plataforma','0.5%'],['Distribución','Mensual · USDC'],['Estándar','ERC-20 · Polygon']].map(([k,v]) => (
                      <div key={k}>
                        <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', marginBottom:3 }}>{k}</div>
                        <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--text)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <PDiv style={{ margin:'6px 0 16px' }} />
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--sec)' }}>Contrato verificado en Polygon</span>
                  <PScanLink contract={a.contract} />
                </div>
              </PCard>
            </motion.div>
          )}

          {tab==='docs' && (
            <motion.div key="docs" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {['Informe de tasación independiente','Certificado de seguro','Título de propiedad / escritura','Auditoría del smart contract (CertiK)','Contrato de administración','Términos y condiciones de la emisión'].map(doc => (
                <div key={doc} style={{ background:'var(--surface)', border:'1px solid var(--border-l)', borderRadius:14, padding:'15px 18px', display:'flex', alignItems:'center', gap:13, cursor:'pointer' }}>
                  <span style={{ color:'var(--sec)' }}>{Icons.doc}</span>
                  <span style={{ flex:1, fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)' }}>{doc}</span>
                  <span style={{ padding:'3px 10px', borderRadius:999, background:'var(--surface2)', color:'var(--sec)', fontSize:11, fontWeight:600 }}>PDF</span>
                  <span style={{ color:'var(--ter)' }}>{Icons.chevR}</span>
                </div>
              ))}
            </motion.div>
          )}

          {tab==='feed' && (
            <ProjectFeed a={a} posts={posts} setPosts={setPosts} highlightId={highlightId} registerPostRef={registerPostRef} />
          )}

          {tab==='updates' && (
            <motion.div key="upd" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column' }}>
              {posts.filter(p => p.milestone).length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:13.5 }}>Todavía no hay hitos marcados en el feed.</div>
              )}
              {posts.filter(p => p.milestone).map((post, i, arr) => (
                <div key={post.id} onClick={() => goToPost(post.id)} style={{ display:'flex', gap:16, cursor:'pointer' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--accent)', marginTop:5, flexShrink:0 }} />
                    {i < arr.length - 1 && <div style={{ width:1.5, flex:1, background:'var(--border-l)', margin:'4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom:22, flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)' }}>{post.date}</span>
                      <span style={{ color:'var(--accent-text)' }}>{Icons.chevR}</span>
                    </div>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', lineHeight:1.55 }}>{post.text}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ── Right column (buy panel) — starts at same top as image ── */}
        <div style={{ position:'sticky', top:62 }}>
          {/* Dev-only state banner — hidden in production builds (DEV_MODE). */}
          {DEV_MODE && devNoteOpen && (
            <div style={{ position:'relative', marginBottom:14, padding:'14px 38px 14px 16px', borderRadius:14, background:'rgba(245,158,11,0.12)', border:'1.5px dashed rgba(245,158,11,0.55)' }}>
              <button onClick={() => setDevNoteOpen(false)} aria-label="Cerrar aviso"
                style={{ position:'absolute', top:10, right:10, width:22, height:22, borderRadius:7, border:'none', background:'rgba(245,158,11,0.18)', color:'#f59e0b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, lineHeight:1 }}>
                ✕
              </button>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:11, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>⚠ Aviso para desarrolladores · Estado del proyecto</div>
              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', columnGap:10, rowGap:4, marginBottom: a.devNote ? 10 : 0 }}>
                {projectState(a, { isLive, holding }).map(([k, v]) => (
                  <div key={k} style={{ display:'contents' }}>
                    <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', whiteSpace:'nowrap' }}>{k}</span>
                    <span style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--text)', fontWeight:600, lineHeight:1.45 }}>{v}</span>
                  </div>
                ))}
              </div>
              {a.devNote && (
                <div style={{ paddingTop:10, borderTop:'1px dashed rgba(245,158,11,0.35)' }}>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:10.5, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Qué verificar (QA)</div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--text)', lineHeight:1.5 }}>{a.devNote}</div>
                </div>
              )}
            </div>
          )}

          {/* Already an investor here? Show your position before the buy panel. */}
          {holding && (
            <PCard style={{ padding:'20px 22px', marginBottom:14, border:'1.5px solid var(--accent)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)' }}>Tu inversión</span>
                <PTag label={`Desde ${holding.since}`} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', marginBottom:3 }}>Tokens</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{holding.tokens}</div>
                </div>
                <div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', marginBottom:3 }}>Valor actual</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{fmtUSD2(holding.current)}</div>
                </div>
                <div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', marginBottom:3 }}>Invertido</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{fmtUSD2(holding.invested)}</div>
                </div>
                <div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', marginBottom:3 }}>P&L</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:17, color: holdingIsPos ? 'var(--pos)' : 'var(--neg)' }}>{holdingIsPos ? '+' : ''}{holdingPnlPct}%</div>
                </div>
              </div>
              <PDiv style={{ marginBottom:14 }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)' }}>Rendimiento cobrado</span>
                <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--pos)' }}>+{fmtUSD2(holding.yieldEarned)}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {isLive && <PBtn variant="secondary" style={{ flex:1, padding:'10px', fontSize:13 }} onClick={() => setTab('updates')}>Ver avances</PBtn>}
                <PBtn variant="ghost" style={{ flex:1, padding:'10px', fontSize:13 }} onClick={() => nav('secundario')}>Vender</PBtn>
              </div>
            </PCard>
          )}

          <PCard style={{ padding:'22px 24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
              <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:28, color:'var(--text)', letterSpacing:'-0.03em' }}>{fmtUSD(a.tokenPrice)}</span>
              <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>por token</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18 }}>
              <PTag label={`${a.apy}% APY estimado`} color="green" />
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)' }}>Financiado {a.sold}%</span>
                <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>{left.toLocaleString()} disponibles</span>
              </div>
              <PProgress value={a.sold} />
            </div>

            <PDiv style={{ marginBottom:16 }} />

            <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Cantidad de tokens</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <button onClick={() => setTokens(Math.max(1, tokens - 5))} style={{ width:38, height:38, borderRadius:10, border:'1.5px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text)', fontSize:16 }}>−</button>
              <div style={{ flex:1, textAlign:'center', fontFamily:'var(--font-h)', fontWeight:800, fontSize:26, color:'var(--text)' }}>{tokens}</div>
              <button onClick={() => setTokens(tokens + 5)} style={{ width:38, height:38, borderRadius:10, border:'none', background:'var(--text)', cursor:'pointer', color:'var(--bg)', fontSize:16 }}>+</button>
            </div>
            <div style={{ display:'flex', gap:6, marginBottom:16 }}>
              {[10,25,50,100].map(n => (
                <button key={n} onClick={() => setTokens(n)} style={{
                  flex:1, padding:'7px 0', borderRadius:9,
                  border:`1.5px solid ${tokens===n ? 'var(--accent)' : 'var(--border)'}`,
                  background: tokens===n ? 'var(--accent-bg)' : 'transparent',
                  color: tokens===n ? 'var(--accent-text)' : 'var(--sec)',
                  fontFamily:'var(--font-b)', fontSize:12.5, fontWeight:600, cursor:'pointer',
                }}>{n}</button>
              ))}
            </div>

            <div style={{ background:'var(--surface2)', borderRadius:13, padding:'13px 16px', marginBottom:16 }}>
              {[['Subtotal',fmtUSD2(tokens*a.tokenPrice)],['Fee (0.5%)',fmtUSD2(tokens*a.tokenPrice*0.005)],['Rendimiento anual est.',fmtUSD2(tokens*a.tokenPrice*a.apy/100)]].map(([k,v],i) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
                  <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)' }}>{k}</span>
                  <span style={{ fontFamily:'var(--font-h)', fontWeight:600, fontSize:13, color: i===2 ? 'var(--accent-text)' : 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>

            <PBtn variant="accent" style={{ width:'100%', padding:'14px', fontSize:15, marginBottom:10 }} onClick={() => {
              const id = addPendingPayment({ name: `Tokenización — ${a.name}`, qty: tokens, unit: a.tokenPrice, fee: tokens*a.tokenPrice*0.005, source: 'Tokenizaciones' });
              nav('keypay', { screen: 'cart', focusId: id });
            }}>
              {holding ? 'Comprar más' : 'Invertir'} · {fmtUSD2(tokens*a.tokenPrice*1.005)}
            </PBtn>
            <div style={{ textAlign:'center', fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)' }}>Pago con USDC · Liquidación on-chain inmediata</div>
          </PCard>

          <PCard style={{ padding:'16px 20px', marginTop:14 }}>
            {[['Contrato auditado por CertiK',Icons.shield],['Activo asegurado · cobertura total',Icons.check],['Custodia institucional regulada',Icons.lock]].map(([txt,ic],i,arr) => (
              <div key={txt} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i<arr.length-1 ? '1px solid var(--border-l)' : 'none' }}>
                <span style={{ color:'var(--accent-text)', display:'flex' }}>{ic}</span>
                <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)' }}>{txt}</span>
              </div>
            ))}
          </PCard>
        </div>
      </div>
    </div>
  );
}
