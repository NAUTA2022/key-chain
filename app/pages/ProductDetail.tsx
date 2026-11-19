import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { PCard, PBtn, PTag, PProgress, PDiv, PDonut, PArea, PScanLink, Icons, CompanyTag, CompanyAvatar } from '~/components/ui';
import { PostMedia, PostComments } from '~/components/social/feed';
import { fmtUSD, fmtUSD2, MY_HOLDINGS, type RwaAsset } from '~/data';
import { pathFor, type NavFn, type RouteKey } from '~/lib/navigation';
import { goCheckout } from '~/lib/checkout';
import { DEV_MODE } from '~/lib/devSession';
import { feedStoreVersion, isFeedLive, issuerNameOf, postMedia, projectPostsOf, setProjectPosts, subscribeFeedStore, type ProjectPost } from '~/lib/projectFeed';
import { NO_FEED_FILTERS, useFeedPage, useSocialSource } from '~/lib/social/source';
import type { FeedItem, FeedQuery, MediaItem, MediaType, PostComment } from '~/lib/social/types';
import type { ApiAssetDto, CatalogAsset } from '~/lib/catalog';
import { useDividends, useHoldings } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { useMobile } from '~/hooks/useMobile';
import LiveDocuments from '~/features/asset/LiveDocuments';
import LiveTokenomics from '~/features/asset/LiveTokenomics';
import { usePublicSettings } from '~/features/asset/api';
import AddressLink from '~/features/wallet/AddressLink';
import GuideButton from '~/features/guide/GuideButton';

/** Why a signed-in user can't invest yet (completed on the profile page). */
type InvestGate = 'onboarding' | 'none' | 'pending' | 'rejected';
const GATE_COPY: Record<InvestGate, { cta: string; note: string }> = {
  onboarding: { cta: 'Completar mi perfil', note: 'Completa tu perfil para poder invertir.' },
  none: { cta: 'Verificar mi identidad', note: 'Para invertir necesitas verificar tu identidad (KYC).' },
  pending: { cta: 'Ver estado del KYC', note: 'Tu verificación está en revisión. Te avisamos cuando puedas invertir.' },
  rejected: { cta: 'Revisar mi KYC', note: 'Tu verificación fue rechazada. Revisa tus datos en el perfil.' },
};

const DEMO_TRUST = [['Contrato auditado por CertiK', Icons.shield], ['Activo asegurado · cobertura total', Icons.check], ['Custodia institucional regulada', Icons.lock]] as const;
// Live: only what the platform's contracts actually guarantee.
const LIVE_TRUST = [['Token de seguridad ERC-3643 con identidad verificada', Icons.shield], ['Fondos custodiados en un vault on-chain', Icons.lock], ['Dividendos con prueba Merkle on-chain', Icons.check]] as const;

// ─── Media carousel ───────────────────────────────────────────────────────────
type MediaCarouselProps = { images?: string[]; height?: number };

function MediaCarousel({ images = [], height = 340 }: MediaCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const media: Array<string | null> = images.length > 0 ? images : [null];

  const go = (next: number) => {
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  };
  const prev = () => go((idx - 1 + media.length) % media.length);
  const next = () => go((idx + 1) % media.length);

  return (
    <div style={{ borderRadius:22, overflow:'hidden', background:'var(--surface2)' }}>
      {/* Main image */}
      <div style={{ position:'relative', height, overflow:'hidden' }}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.img
            key={idx}
            src={media[idx] ?? undefined}
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
            <button key={i} onClick={() => go(i)} aria-label={`Ver imagen ${i + 1} de ${media.length}`} aria-current={i === idx ? 'true' : undefined}
              style={{ flexShrink:0, width:72, height:50, borderRadius:10, overflow:'hidden', border:`2px solid ${i===idx ? 'var(--accent)' : 'transparent'}`, padding:0, cursor:'pointer', transition:'border-color 0.15s', background:'var(--surface2)' }}>
              <img src={src ?? undefined} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
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
// timeline and in the global Feed; clicking one there jumps back here and
// briefly highlights it.
// The composer itself only renders for the project's actual owner (isMine;
// live: also platform admins) — everyone else just reads the feed, same as
// any investor would. The owner can attach photos and videos (up to
// MAX_FEED_MEDIA per post).
const MAX_FEED_MEDIA = 10;

/** A post as the project's Feed tab shows it (demo store or API feed). */
type ViewPost = {
  id: string;
  date: string;
  text: string;
  milestone: boolean;
  media: MediaItem[];
  likes: number;
  liked: boolean;
  /** Comments already at hand (demo: always; live: once opened), null while not loaded. */
  comments: PostComment[] | null;
  commentCount: number;
};

/** Composer output: text, hito flag, an existing project photo (demo) and uploaded files. */
type FeedDraft = { text: string; milestone: boolean; img: string | null; uploads: Upload[] };

/** A photo/video picked in the composer, previewed from an object URL. */
type Upload = { id: string; type: MediaType; url: string; name: string; file: File };

type ProjectFeedProps = {
  a: RwaAsset;
  posts: ViewPost[];
  status: 'loading' | 'error' | 'ready';
  /** Live: the API feed; demo: the shared demo store (lib/projectFeed). */
  live: boolean;
  /** The viewer may post here (the project's owner; live: also admins). */
  canPost: boolean;
  /** Project photos the owner can attach as they are (demo only: the API takes uploads). */
  imageChoices: readonly string[];
  onToggleLike: (id: string) => void;
  /** Live: loads a post's comments the first time they're opened. */
  onOpenComments: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
  /** Resolves to an error message or null (live); null right away when published locally (demo). */
  onPublish: (draft: FeedDraft) => Promise<string | null> | null;
  hasMore: boolean;
  onMore: () => void;
  highlightId: string | null;
  registerPostRef: (id: string, el: HTMLDivElement | null) => void;
};

function ProjectFeed({ a, posts, status, live, canPost, imageChoices, onToggleLike, onOpenComments, onAddComment, onPublish, hasMore, onMore, highlightId, registerPostRef }: ProjectFeedProps) {
  const [text, setText] = useState('');
  const [milestone, setMilestone] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const issuerName = issuerNameOf(a);
  const canPublish = Boolean(text.trim() || img || uploads.length > 0) && !publishing;

  // Picked files are previewed from object URLs. Demo: they also become the
  // post's media (they live until the page reloads, like the design). Live:
  // the files are uploaded with the post and the previews are released.
  const addFiles = (fileList: FileList | null) => {
    const files = fileList ? [...fileList] : [];
    const valid = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const room = MAX_FEED_MEDIA - uploads.length;
    const accepted = valid.slice(0, Math.max(room, 0));
    setUploadError(
      valid.length < files.length ? 'Solo se pueden subir fotos o videos.'
      : accepted.length < valid.length ? `Máximo ${MAX_FEED_MEDIA} archivos por publicación.`
      : ''
    );
    setUploads(u => [...u, ...accepted.map((f): Upload => ({
      id: `${f.name}-${f.lastModified}-${Math.random()}`,
      type: f.type.startsWith('video/') ? 'video' : 'image',
      url: URL.createObjectURL(f),
      name: f.name,
      file: f,
    }))]);
  };

  const removeUpload = (id: string) => setUploads(u => {
    const gone = u.find(m => m.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    return u.filter(m => m.id !== id);
  });

  const reset = () => { setText(''); setMilestone(false); setImg(null); setUploads([]); setUploadError(''); };
  const publish = async () => {
    if (!canPublish) return;
    const draft: FeedDraft = { text: text.trim(), milestone, img, uploads };
    const pending = onPublish(draft);
    if (!pending) return reset();
    setPublishing(true);
    setPublishError(null);
    const error = await pending;
    setPublishing(false);
    if (error) return setPublishError(error);
    draft.uploads.forEach(m => URL.revokeObjectURL(m.url));
    reset();
  };

  // Anyone who can see the feed can comment; the owner's replies are tagged
  // as the issuer.
  const [openComments, setOpenComments] = useState<string[]>([]);
  const toggleComments = (id: string) => {
    if (!openComments.includes(id)) onOpenComments(id);
    setOpenComments(o => o.includes(id) ? o.filter(x => x !== id) : [...o, id]);
  };

  return (
    <motion.div key="feed" initial={{ opacity:0 }} animate={{ opacity:1 }}>
      {/* Composer — only the project's owner gets to post here (isMine) */}
      {canPost && (
      <PCard style={{ padding:'18px 20px', marginBottom:18 }}>
        <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Panel del emisor · Publicar como {issuerName}</div>
        <div style={{ display:'flex', gap:12 }}>
          <CompanyAvatar company={issuerName} size={36} />
          <div style={{ flex:1, minWidth:0 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} aria-label="Actualización para tus inversores"
              placeholder="Escribe una actualización para tus inversores..."
              style={{ width:'100%', resize:'vertical', border:'1px solid var(--border-l)', borderRadius:12, padding:'10px 12px', fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--text)', background:'var(--surface)', outline:'none', boxSizing:'border-box' }} />
            {imageChoices.length > 1 && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                {imageChoices.map(src => (
                  <button key={src} onClick={() => setImg(img === src ? null : src)} aria-pressed={img === src} aria-label="Adjuntar esta foto del proyecto"
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
              <div role="alert" style={{ marginTop:8, fontFamily:'var(--font-b)', fontSize:12, color:'var(--neg)' }}>{uploadError}</div>
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
              <PBtn variant="accent" small disabled={!canPublish} onClick={() => void publish()} style={{ opacity: canPublish ? 1 : 0.5 }}>{publishing ? 'Publicando…' : 'Publicar'}</PBtn>
            </div>
            {publishError && <div role="alert" style={{ marginTop:8, fontFamily:'var(--font-b)', fontSize:12, color:'var(--neg)' }}>{publishError}</div>}
          </div>
        </div>
      </PCard>
      )}

      {!canPost && (
        <div style={{ marginBottom:18, fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>
          Actualizaciones publicadas por {issuerName}.
        </div>
      )}

      {live && posts.length === 0 && (
        <div role="status" style={{ textAlign:'center', padding:'32px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:13.5 }}>
          {status === 'loading' ? 'Cargando publicaciones…' : status === 'error' ? 'No se pudieron cargar las publicaciones.' : 'Todavía no hay publicaciones en este proyecto.'}
        </div>
      )}

      {/* Posts — newest first */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {posts.map(post => {
          const commentsOpen = openComments.includes(post.id);
          const count = post.comments?.length ?? post.commentCount;
          return (
          <div key={post.id} ref={el => registerPostRef(post.id, el)}
            style={{
              background: highlightId === post.id ? 'var(--accent-bg)' : 'var(--surface)',
              border: `1.5px solid ${highlightId === post.id ? 'var(--accent)' : 'var(--border-l)'}`,
              borderRadius:16, padding:'16px 18px', transition:'background 0.4s ease, border-color 0.4s ease',
            }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <CompanyAvatar company={issuerName} size={36} />
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
            {post.text && <div style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--text)', lineHeight:1.55, marginBottom: post.media.length ? 12 : 10 }}>{post.text}</div>}
            <PostMedia media={post.media} />
            <div style={{ display:'flex', alignItems:'center', gap:18, paddingTop:8, borderTop:'1px solid var(--border-l)' }}>
              <button onClick={() => onToggleLike(post.id)} aria-pressed={post.liked} aria-label={post.liked ? 'Quitar me gusta' : 'Me gusta'} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color: post.liked ? 'var(--neg)' : 'var(--sec)', fontFamily:'var(--font-b)', fontSize:12.5, padding:0 }}>
                {post.liked ? '♥' : '♡'} {post.likes}
              </button>
              <button onClick={() => toggleComments(post.id)} aria-expanded={commentsOpen}
                style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color: commentsOpen ? 'var(--text)' : 'var(--sec)', fontFamily:'var(--font-b)', fontSize:12.5, padding:0 }}>
                {Icons.comment} {count ? `${count} ${count === 1 ? 'comentario' : 'comentarios'}` : 'Comentar'}
              </button>
            </div>
            {commentsOpen && (post.comments
              ? <PostComments comments={post.comments} onAdd={t => onAddComment(post.id, t)} issuerName={issuerName} isOwner={!!a.isMine} />
              : <div role="status" style={{ marginTop:12, fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>Cargando comentarios…</div>)}
          </div>
          );
        })}
      </div>

      {live && hasMore && (
        <div style={{ display:'flex', justifyContent:'center', marginTop:16 }}>
          <PBtn variant="secondary" small disabled={status === 'loading'} onClick={onMore}>{status === 'loading' ? 'Cargando…' : 'Ver más publicaciones'}</PBtn>
        </div>
      )}
    </motion.div>
  );
}

// ─── Dev state banner ─────────────────────────────────────────────────────────
// Developer-only (DEV_MODE, demo mode): spells out which state a project is in
// and what the page should show because of it, so every asset is
// self-explanatory while testing.
const ISSUER_LABEL: Record<RwaAsset['issuer'], string> = { keychain: 'BRIKME', verified: 'Verificado', community: 'Comunidad' };

function projectState(a: RwaAsset, { isLive, holding }: { isLive: boolean; holding: { tokens: number } | null | undefined }): Array<readonly [string, string]> {
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
type ProductDetailTab = 'resumen' | 'feed' | 'tokenomics' | 'docs' | 'updates';

/** Demo asset, or a catalog asset with its pool (backend enabled). */
type DetailAsset = RwaAsset & { pool?: CatalogAsset['pool']; slug?: string };

type ProductDetailProps = {
  nav: NavFn;
  asset: DetailAsset;
  fromRoute?: RouteKey;
  /** Full API view of the asset (contracts, schedule); live mode only. */
  apiAsset?: ApiAssetDto | null;
  /** Coming from the global Feed / a company profile: open the Feed tab on this post. */
  focusPostId?: string | null;
};

const FEED_PAGE = 30;

const fromDemoPost = (p: ProjectPost): ViewPost => ({
  id: p.id, date: p.date, text: p.text, milestone: p.milestone, media: postMedia(p),
  likes: p.likes, liked: p.liked, comments: p.comments, commentCount: p.comments.length,
});

export default function ProductDetail({ nav, asset: a, fromRoute, apiAsset = null, focusPostId = null }: ProductDetailProps) {
  const session = useSession();
  const live = session.status !== 'disabled';
  const mobile = useMobile();
  const navigate = useNavigate();
  const isLive = isFeedLive(a);
  // Coming from the global Feed? Open straight on this project's Feed tab,
  // scrolled to the post that was clicked.
  const [tab, setTab]       = useState<ProductDetailTab>(focusPostId && isLive ? 'feed' : 'resumen');
  const [tokens, setTokens] = useState(10);
  const left = a.totalTokens - Math.round(a.totalTokens * a.sold / 100);
  const tabs: Array<readonly [ProductDetailTab, string]> = [
    ['resumen','Resumen'],
    ...(isLive ? [['feed','Feed'] as const] : []),
    ['tokenomics','Tokenomics'], ['docs','Documentos'],
    ...(isLive ? [['updates','Actualizaciones'] as const] : []),
  ];
  const images = a.images || [a.img];
  // Came in from Mercado Secundario (or anywhere else)? Go back there —
  // only default to Mercado Primario when we don't know the origin.
  const backRoute: RouteKey = fromRoute || 'primario';
  const issuerName = issuerNameOf(a);

  // ── Feed ──
  // Demo: posts live in the shared demo store (lib/projectFeed) so the
  // Actualizaciones tab, the global Feed and the company profile read the
  // same posts. Live: the project's posts from the API feed (SocialSource,
  // GET /v1/feed?assetId=…) with its likes, comments and uploads.
  useSyncExternalStore(subscribeFeedStore, feedStoreVersion, feedStoreVersion);
  const demoPosts = live ? null : projectPostsOf(a);
  const source = useSocialSource();
  const liveSource = live ? source : null;
  const [feedLimit, setFeedLimit] = useState(FEED_PAGE);
  const feedQuery: FeedQuery = { ...NO_FEED_FILTERS, scope: { kind: 'asset', assetId: a.id }, milestonesOnly: false };
  const page = useFeedPage(live && isLive ? liveSource : null, feedQuery, feedLimit);
  // Live: posts published from here (shown even before the feed refreshes),
  // optimistic likes and comments loaded on demand.
  const [created, setCreated] = useState<FeedItem[]>([]);
  const [likeOverrides, setLikeOverrides] = useState<Record<string, { liked: boolean; likes: number }>>({});
  const [loadedComments, setLoadedComments] = useState<Record<string, PostComment[]>>({});
  const liveItems = [...created.filter(c => !page.items.some(i => i.post.id === c.post.id)), ...page.items];
  const feedPosts: ViewPost[] = demoPosts
    ? demoPosts.map(fromDemoPost)
    : liveItems.map(({ post: p }) => ({
        id: p.id, date: p.date, text: p.text, milestone: p.milestone, media: p.media,
        likes: likeOverrides[p.id]?.likes ?? p.likes, liked: likeOverrides[p.id]?.liked ?? p.likedByMe,
        comments: loadedComments[p.id] ?? p.comments ?? null, commentCount: p.commentCount,
      }));
  const feedStatus = !live ? 'ready' : page.error ? 'error' : page.loading && liveSource ? 'loading' : 'ready';
  const signedIn = session.status === 'authenticated';

  const toggleLike = (id: string) => {
    if (!live) {
      setProjectPosts(a, p => p.map(post => post.id === id
        ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
        : post));
      return;
    }
    if (!signedIn || !liveSource) return nav('login');
    const current = feedPosts.find(p => p.id === id);
    if (!current) return;
    setLikeOverrides(o => ({ ...o, [id]: { liked: !current.liked, likes: current.likes + (current.liked ? -1 : 1) } }));
    liveSource.toggleLike(id).then(
      r => setLikeOverrides(o => ({ ...o, [id]: r })),
      () => setLikeOverrides(o => ({ ...o, [id]: { liked: current.liked, likes: current.likes } })),
    );
  };
  const openComments = (id: string) => {
    if (!live || !liveSource || loadedComments[id] || feedPosts.find(p => p.id === id)?.comments) return;
    liveSource.listComments(id).then(
      list => setLoadedComments(c => ({ ...c, [id]: list })),
      () => setLoadedComments(c => ({ ...c, [id]: [] })),
    );
  };
  const addComment = (postId: string, text: string) => {
    if (!live) {
      setProjectPosts(a, p => p.map(post => post.id === postId
        ? { ...post, comments: [...(post.comments || []), {
            id: String(Date.now()), date: 'Ahora', text,
            author: a.isMine ? issuerName : 'Vos', isIssuer: !!a.isMine,
          }] }
        : post));
      return;
    }
    if (!signedIn || !liveSource) return nav('login');
    liveSource.addComment(postId, text).then(
      comment => setLoadedComments(c => ({ ...c, [postId]: [...(c[postId] ?? feedPosts.find(p => p.id === postId)?.comments ?? []), comment] })),
      () => undefined,
    );
  };
  const publishPost = (draft: FeedDraft): Promise<string | null> | null => {
    if (!live) {
      const media: MediaItem[] = [...(draft.img ? [{ id: draft.img, type: 'image' as const, url: draft.img }] : []), ...draft.uploads.map(({ id, type, url }) => ({ id, type, url }))];
      setProjectPosts(a, p => [{ id: String(Date.now()), ts: Date.now(), date: 'Ahora', text: draft.text, milestone: draft.milestone, media, likes: 0, liked: false, comments: [] }, ...p]);
      return null;
    }
    if (!liveSource) return Promise.resolve('El feed no está disponible en este momento.');
    return liveSource.createPost({ assetId: a.id, text: draft.text, milestone: draft.milestone, files: draft.uploads.map(u => u.file) }).then(
      item => { setCreated(c => [item, ...c]); return null; },
      (e: unknown) => (e instanceof Error && e.message ? e.message : 'No se pudo publicar la actualización.'),
    );
  };
  // The owner posts (live: platform admins too; the API checks it again).
  const canPost = !!a.isMine || (live && session.user?.role === 'admin');
  // Demo: the owner may attach one of the project's own photos as is.
  const imageChoices = live ? [] : a.images;

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [scrollToId, setScrollToId] = useState<string | null>(focusPostId && isLive ? focusPostId : null);
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerPostRef = (id: string, el: HTMLDivElement | null) => { postRefs.current[id] = el; };

  // Dev-only state banner (see projectState above).
  const [devNoteOpen, setDevNoteOpen] = useState(true);

  const goToPost = (id: string) => { setTab('feed'); setScrollToId(id); };

  useEffect(() => {
    if (tab !== 'feed' || scrollToId == null) return;
    const el = postRefs.current[scrollToId];
    if (!el && feedStatus === 'loading') return; // live: wait until the posts arrive
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(el ? scrollToId : null);
    setScrollToId(null);
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [tab, scrollToId, feedStatus]);
  // Already holding this asset? Surface an investor summary (position,
  // P&L, yield collected) instead of treating every visitor as a first-time buyer.
  // Backend enabled: the position comes from the chain and tokenized assets are bought on-chain.
  const pool = apiAsset?.pool ?? a.pool ?? null;
  const onchainPool = pool?.status === 'active' ? pool : null;
  const { data: liveHoldings } = useHoldings();
  const { data: liveDividends } = useDividends();
  const liveHolding = liveHoldings?.find(h => h.assetId === a.id);
  const holding = live
    ? liveHolding && {
        assetId: a.id, tokens: liveHolding.tokens, invested: liveHolding.invested, current: liveHolding.value, since: '',
        yieldEarned: liveDividends?.filter(d => d.assetId === a.id && d.claimed).reduce((t, d) => t + d.amount, 0) ?? 0,
      }
    : MY_HOLDINGS.find(h => h.assetId === a.id);
  // Live: platform fee shown to the investor and admin pauses (GET /v1/settings/public).
  const settings = usePublicSettings();
  const feePct = live ? (settings.data?.displayFeePercent ?? null) : 0.5;
  const paused = live && settings.data?.investmentsPaused === true;
  const pauseNote = settings.data?.maintenanceMessage || 'Las inversiones están pausadas temporalmente.';
  const user = session.user;
  const gate: InvestGate | null = !live || session.status !== 'authenticated' || !user
    ? null
    : !user.onboarded ? 'onboarding' : user.kycStatus === 'verified' ? null : user.kycStatus;
  // Live: what keeps the buy button from investing right now (null = can invest).
  let liveBlock: { label: string; note: string; action: (() => void) | null } | null = null;
  if (live) {
    if (paused) liveBlock = { label: 'Inversiones pausadas', note: pauseNote, action: null };
    else if (!onchainPool) {
      liveBlock = {
        label: 'Todavía no disponible',
        note: pool?.status === 'deploying' || pool?.status === 'granting_roles'
          ? 'El activo se está desplegando on-chain. Vuelve en unos minutos.'
          : 'Este activo todavía no está tokenizado on-chain.',
        action: null,
      };
    } else if (gate) liveBlock = { label: GATE_COPY[gate].cta, note: GATE_COPY[gate].note, action: () => nav('perfil') };
    else if (tokens > left) liveBlock = { label: `Quedan ${left.toLocaleString()} tokens`, note: 'Elige una cantidad menor o igual a los tokens disponibles.', action: null };
  }
  // Every "Invertir" goes through Brikme's checkout. Live: the checkout runs
  // the on-chain investment (the API prices it; the fee is inside the price).
  const invest = () => {
    if (liveBlock) return liveBlock.action?.();
    if (live && session.status !== 'authenticated') return nav('login');
    goCheckout(nav, {
      title: holding ? 'Compra de tokens' : 'Inversión', source: 'Tokenizaciones', fee: live ? 0 : tokens*a.tokenPrice*0.005,
      items: [{ name: a.name, img: a.img, qty: tokens, unit: a.tokenPrice, meta: `${a.apy}% APY · ${a.cat}` }],
      back: { route: 'detalle', data: a }, done: { route: 'pertenencias', label: 'Ver en Mis Pertenencias' },
      ...(live && { action: { kind: 'primary' as const, assetId: a.id, quantity: tokens } }),
    });
  };
  // "Vender": live opens the sell form of the on-chain market for this asset.
  const sell = () => (live ? navigate(`${pathFor('secundario')}?vender=${a.id}`) : nav('secundario'));
  const subtotal = tokens * a.tokenPrice;
  const feeRow: readonly [string, string] = live
    ? (feePct === null ? ['Fee plataforma', '—'] : [`Fee (${feePct.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%, incluida)`, fmtUSD2(subtotal * feePct / 100)])
    : ['Fee (0.5%)', fmtUSD2(tokens*a.tokenPrice*0.005)];
  const holdingPnlPct = holding ? ((holding.invested ? holding.current / holding.invested - 1 : 0) * 100).toFixed(1) : null;
  const holdingIsPos = holding ? holding.current >= holding.invested : null;

  return (
    <div style={{ padding: mobile ? '16px 14px 80px' : '24px 32px 40px', maxWidth:1200, margin:'0 auto' }}>
      {/* Back */}
      <button onClick={() => (backRoute === 'empresa' ? nav('empresa', issuerName) : nav(backRoute))}
        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--sec)', fontFamily:'var(--font-b)', fontSize:13.5, marginBottom:18, padding:0 }}>
        {Icons.back} Volver al mercado
      </button>

      {/* Two-column grid — both columns start at the same top */}
      <div style={{ display:'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : '1fr 360px', gap: mobile ? 18 : 26, alignItems:'start' }}>

        {/* ── Left column ── */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}>

          {/* Carousel */}
          <MediaCarousel images={images} height={mobile ? 230 : 340} />

          {/* Title row */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:22, marginBottom:6, ...(mobile ? { flexWrap:'wrap', gap:10 } : {}) }}>
            <div style={mobile ? { minWidth:0 } : undefined}>
              <h1 data-guide="project-title" style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize: mobile ? 24 : 30, color:'var(--text)', letterSpacing:'-0.03em', marginBottom:8 }}>{a.name}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--ter)', marginBottom:10, ...(mobile ? { flexWrap:'wrap' } : {}) }}>
                {Icons.location}
                <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)' }}>{a.location}</span>
                <span style={{ color:'var(--ter)', margin:'0 4px' }}>·</span>
                <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)' }}>Vida útil: {a.lifespan}</span>
                <GuideButton tour="project" />
              </div>
              {a.company && <CompanyTag company={a.company} cat={a.cat} size="sm" />}
            </div>
            {live ? (a.contract ? <AddressLink value={a.contract} /> : null) : <PScanLink contract={a.contract} />}
          </div>

          {/* Tabs */}
          <div data-guide="project-tabs" style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border-l)', margin:'20px 0', ...(mobile ? { overflowX:'auto' } : {}) }}>
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: mobile ? '10px 12px' : '10px 18px', border:'none', background:'none', cursor:'pointer', ...(mobile ? { whiteSpace:'nowrap', flexShrink:0 } : {}),
                fontFamily:'var(--font-b)', fontSize:13.5, fontWeight: tab===id ? 700 : 450,
                color: tab===id ? 'var(--text)' : 'var(--ter)',
                borderBottom:`2px solid ${tab===id ? 'var(--accent)' : 'transparent'}`, marginBottom:-1,
              }}>{label}</button>
            ))}
          </div>

          {tab==='resumen' && (
            <motion.div key="res" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <div style={{ fontFamily:'var(--font-b)', fontSize:14.5, color:'var(--sec)', lineHeight:1.7, marginBottom:22 }}>{a.desc}</div>
              <div style={{ display:'grid', gridTemplateColumns: mobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: mobile ? 10 : 14, marginBottom:22 }}>
                {[['Valuación',fmtUSD(a.valuation)],['Categoría',a.cat],['Etapa',a.stage],['Vida útil',a.lifespan]].map(([k,v]) => (
                  <div key={k} style={{ background:'var(--surface)', border:'1px solid var(--border-l)', borderRadius:14, padding:'14px 16px' }}>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k}</div>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15.5, color:'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <PCard style={{ padding:'20px 22px' }}>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>Rendimiento histórico</div>
                <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:14 }}>{live ? 'Precio de referencia publicado por el emisor' : 'Últimos 12 meses · precio de referencia'}</div>
                {a.perf.length >= 2
                  ? <PArea data={a.perf} height={120} id={`det${a.id}`} />
                  : <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>Todavía no hay historial de rendimiento.</div>}
              </PCard>
            </motion.div>
          )}

          {tab==='tokenomics' && live && (
            <motion.div key="tok-live" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <LiveTokenomics asset={a} dto={apiAsset} mobile={mobile} />
            </motion.div>
          )}

          {tab==='tokenomics' && !live && (
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

          {tab==='docs' && live && <LiveDocuments idOrSlug={a.slug ?? String(a.id)} nav={nav} />}

          {tab==='docs' && !live && (
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
            <ProjectFeed a={a} posts={feedPosts} status={feedStatus} live={live} canPost={canPost} imageChoices={imageChoices}
              onToggleLike={toggleLike} onOpenComments={openComments} onAddComment={addComment} onPublish={publishPost}
              hasMore={page.hasMore} onMore={() => setFeedLimit(l => l + FEED_PAGE)}
              highlightId={highlightId} registerPostRef={registerPostRef} />
          )}

          {tab==='updates' && (
            <motion.div key="upd" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column' }}>
              {feedPosts.filter(p => p.milestone).length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:13.5 }}>Todavía no hay hitos marcados en el feed.</div>
              )}
              {feedPosts.filter(p => p.milestone).map((post, i, arr) => (
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
        <div style={mobile ? { minWidth:0 } : { position:'sticky', top:62 }}>
          {/* Dev-only state banner — demo mode in development builds (DEV_MODE). */}
          {DEV_MODE && !live && devNoteOpen && (
            <div style={{ position:'relative', marginBottom:14, padding:'14px 38px 14px 16px', borderRadius:14, background:'rgba(245,158,11,0.12)', border:'1.5px dashed rgba(245,158,11,0.55)' }}>
              <button onClick={() => setDevNoteOpen(false)} aria-label="Cerrar aviso"
                style={{ position:'absolute', top:10, right:10, width:22, height:22, borderRadius:7, border:'none', background:'rgba(245,158,11,0.18)', color:'#f59e0b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, lineHeight:1 }}>
                ✕
              </button>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:11, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>⚠ Aviso para desarrolladores · Estado del proyecto</div>
              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', columnGap:10, rowGap:4 }}>
                {projectState(a, { isLive, holding }).map(([k, v]) => (
                  <div key={k} style={{ display:'contents' }}>
                    <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', whiteSpace:'nowrap' }}>{k}</span>
                    <span style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--text)', fontWeight:600, lineHeight:1.45 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Already an investor here? Show your position before the buy panel. */}
          {holding && (
            <PCard style={{ padding:'20px 22px', marginBottom:14, border:'1.5px solid var(--accent)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)' }}>Tu inversión</span>
                <PTag label={holding.since ? `Desde ${holding.since}` : 'On-chain'} />
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
                {(!live || onchainPool) && <PBtn variant="ghost" style={{ flex:1, padding:'10px', fontSize:13 }} onClick={sell}>Vender</PBtn>}
              </div>
            </PCard>
          )}

          <PCard style={{ padding:'22px 24px' }}>
            <div data-guide="project-price" style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
              <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:28, color:'var(--text)', letterSpacing:'-0.03em' }}>{fmtUSD(a.tokenPrice)}</span>
              <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>por token</span>
            </div>
            <div data-guide="project-apy" style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18 }}>
              <PTag label={`${a.apy}% APY estimado`} color="green" />
            </div>

            <div data-guide="project-funded" style={{ marginBottom:16 }}>
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
              {[['Subtotal',fmtUSD2(tokens*a.tokenPrice)],feeRow,['Rendimiento anual est.',fmtUSD2(tokens*a.tokenPrice*a.apy/100)]].map(([k,v],i) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
                  <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)' }}>{k}</span>
                  <span style={{ fontFamily:'var(--font-h)', fontWeight:600, fontSize:13, color: i===2 ? 'var(--accent-text)' : 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>

            <PBtn guide="project-invest" variant="accent" disabled={liveBlock !== null && !liveBlock.action} style={{ width:'100%', padding:'14px', fontSize:15, marginBottom:10 }} onClick={invest}>
              {liveBlock ? liveBlock.label : <>{holding ? 'Comprar más' : 'Invertir'} · {fmtUSD2(tokens*a.tokenPrice*(live ? 1 : 1.005))}</>}
            </PBtn>
            <div role="status" aria-live="polite" style={{ textAlign:'center', fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)' }}>
              {liveBlock?.note ?? 'Pago con USDC · Liquidación on-chain inmediata'}
            </div>
          </PCard>

          <PCard style={{ padding:'16px 20px', marginTop:14 }}>
            {(live ? LIVE_TRUST : DEMO_TRUST).map(([txt,ic],i,arr) => (
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
