import type { AssetCategory } from '~/data';
import { errorText, uploadFile } from '~/features/profile/api';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { mediaUrl, toCatalogAsset, type CatalogAsset } from '~/lib/catalog';
import { slugify } from '~/lib/navigation';
import type { SessionUser } from '~/lib/session';
import { ANONYMOUS_NAME, personGradient } from '~/lib/social/identity';
import { MAX_POST_MEDIA } from '~/lib/social/types';
import type {
  CompanyEdit, CompanyImageKind, CompanyLive, CompanyProfile, CompanyRef, CreatePostInput, FeedFacets, FeedItem, FeedPage, FeedQuery,
  FeedScope, FollowEntry, FollowPage, FollowState, FollowTarget, PersonProfile, PersonRef, PostComment, Review, ReviewInput,
  SocialAsset, SocialSource, Viewer,
} from '~/lib/social/types';

// Live SocialSource: the social layer over the KEY CHAIN API (/v1/feed,
// /v1/companies, /v1/users, /v1/reviews). Maps the API's DTOs to the shapes
// the design's components already render. Fields the API does not provide
// (trust score, on-time payments, reputation, other people's amounts) are
// left out so the screens show their empty states instead of invented values.
// Errors reject with a Spanish message that can be shown to the user.

type Json<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T : never;

type FeedPostDto = Json<'/v1/feed/posts/{id}', 'get'>;
type CommentDto = Json<'/v1/feed/posts/{id}/comments', 'post'>;
type CompanyRefDto = NonNullable<CommentDto['company']>;
type PublicUserRefDto = CommentDto['author'];
type CompanySummaryDto = Json<'/v1/companies', 'get'>['items'][number];
type CompanyProfileDto = Json<'/v1/companies/{slug}', 'get'>;
type FollowEntryDto = Json<'/v1/users/{id}/followers', 'get'>['items'][number];
type PublicProfileDto = Json<'/v1/users/{id}', 'get'>;
type ReviewDto = Json<'/v1/companies/{slug}/reviews', 'post'>;
type UploadedMediaDto = Json<'/v1/feed/media', 'post'>;
type ApiCategory = FeedPostDto['asset']['category'];

const CATEGORY_LABEL: Record<ApiCategory, AssetCategory> = {
  autos: 'Autos', campos: 'Campos', drones: 'Drones', inmuebles: 'Inmuebles', edificios: 'Edificios',
};
const CATEGORY_CODE: Readonly<Record<string, ApiCategory>> = {
  Autos: 'autos', Campos: 'campos', Drones: 'drones', Inmuebles: 'inmuebles', Edificios: 'edificios',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MB = 1024 * 1024;
const FEED_MAX_PAGE = 50;
const FOLLOW_PAGE = 30;

// ─── Change notifications (shared by every instance of the live source) ──────
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version += 1;
  listeners.forEach(l => l());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getVersion = () => version;

/** Last known "liked by me" per post, so a toggle knows whether to like or unlike. */
const likedByMe = new Map<string, boolean>();

// ─── Requests ────────────────────────────────────────────────────────────────
type ApiCall<T> = Promise<{ data?: T; error?: unknown; response: Response }>;
type Reasons = Record<string, string>;

/** Resolves the response body or rejects with a Spanish message. */
async function must<T>(request: ApiCall<T>, fallback: string, reasons?: Reasons): Promise<T> {
  let r: Awaited<ApiCall<T>>;
  try {
    r = await request;
  } catch (e) {
    throw new Error(errorText(e, fallback, reasons), { cause: e });
  }
  if (r.data === undefined || !r.response.ok) throw new Error(errorText(r.error, fallback, reasons));
  return r.data;
}

/** Like `must` for endpoints that answer 204 (no body). */
async function mustOk(request: ApiCall<unknown>, fallback: string, reasons?: Reasons): Promise<void> {
  let r: Awaited<ApiCall<unknown>>;
  try {
    r = await request;
  } catch (e) {
    throw new Error(errorText(e, fallback, reasons), { cause: e });
  }
  if (!r.response.ok) throw new Error(errorText(r.error, fallback, reasons));
}

/** Body, or null when the resource does not exist (404, or 400 for a malformed id). */
async function maybe<T>(request: ApiCall<T>, fallback: string): Promise<T | null> {
  let r: Awaited<ApiCall<T>>;
  try {
    r = await request;
  } catch (e) {
    throw new Error(errorText(e, fallback), { cause: e });
  }
  if (r.response.status === 404 || r.response.status === 400) return null;
  if (r.data === undefined || !r.response.ok) throw new Error(errorText(r.error, fallback));
  return r.data;
}

// ─── Formatting ──────────────────────────────────────────────────────────────
/** "13 Jun 2026" like the design's posts; "Ahora" for the last minute. */
function displayDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  if (Math.abs(Date.now() - t) < 60_000) return 'Ahora';
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mar 2025" (the label ProjectBrowser sorts by). */
function monthLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-03" → "Mar". */
function shortMonth(month: string): string {
  const m = /^\d{4}-(\d{2})/.exec(month);
  return m ? (MONTHS[Number(m[1]) - 1] ?? month) : month;
}

const fileUrl = (url: string | null | undefined): string | null => (url ? mediaUrl(url) : null);
const unique = <T>(list: readonly T[]): T[] => [...new Set(list)];
const isFeedOpen = (a: SocialAsset) => !!a.feedEnabled || a.stage === 'Operativo' || a.sold >= 100;

// ─── Source ──────────────────────────────────────────────────────────────────
export type LiveSocialContext = {
  /** The signed-in user (null while the session loads or for visitors). */
  user: SessionUser | null;
  /** The live catalog: the projects the posts and reviews point at. */
  assets: readonly CatalogAsset[];
};

export function createLiveSocialSource({ user, assets }: LiveSocialContext): SocialSource {
  const byId = new Map<number, SocialAsset>(assets.map(a => [a.id, a]));
  const isAdmin = user?.role === 'admin';

  const viewer: Viewer | null = user
    ? (() => {
        const name = user.displayName || `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`;
        return {
          id: user.id, name, handle: '', initial: name.slice(0, 1).toUpperCase(), gradient: personGradient(user.id),
          avatarUrl: fileUrl(user.avatarUrl), company: null,
        };
      })()
    : null;

  type AssetRef = {
    id: number; slug?: string; name: string; category?: ApiCategory; country?: string; location?: string;
    stage?: 'recaudacion' | 'operativo'; imageUrl?: string | null;
  };
  /** The catalog project, or a minimal card built from what the API sent (never shown with invented numbers). */
  const assetOf = (ref: AssetRef): SocialAsset => {
    const known = byId.get(ref.id);
    if (known) return known;
    const img = mediaUrl(ref.imageUrl ?? null);
    return {
      id: ref.id, slug: ref.slug, name: ref.name, cat: ref.category ? CATEGORY_LABEL[ref.category] : 'Inmuebles',
      country: ref.country ?? '', company: '', issuer: 'community', location: ref.location ?? '', images: [img], img,
      valuation: 0, tokenPrice: 0, totalTokens: 0, sold: 0, apy: 0, stage: ref.stage === 'operativo' ? 'Operativo' : 'Recaudación',
      lifespan: '', contract: '', desc: '', perf: [], live: true,
    };
  };

  const personRef = (u: PublicUserRefDto): PersonRef => {
    const name = u.displayName ?? ANONYMOUS_NAME;
    return {
      id: u.id, name, handle: '', initial: name.slice(0, 1).toUpperCase(), gradient: personGradient(u.id),
      avatarUrl: fileUrl(u.avatarUrl), anonymous: u.displayName === null,
    };
  };

  const companyRef = (c: CompanyRefDto): CompanyRef => ({ slug: c.slug, name: c.name, logoUrl: fileUrl(c.logoUrl) });

  // ─── Feed ──────────────────────────────────────────────────────────────────
  const toFeedItem = (p: FeedPostDto): FeedItem => {
    likedByMe.set(p.id, p.likedByMe);
    return {
      post: {
        id: p.id, text: p.body, milestone: p.milestone, likes: p.likeCount, likedByMe: p.likedByMe, commentCount: p.commentCount,
        media: p.media.map(m => ({ id: m.id, type: m.kind, url: mediaUrl(m.url) })),
        createdAt: p.createdAt, date: displayDate(p.createdAt), canManage: p.canManage,
      },
      asset: assetOf({ ...p.asset }),
      company: companyRef(p.company),
    };
  };

  const scopeAssets = (scope: FeedScope): SocialAsset[] => {
    const all = [...byId.values()];
    if (scope.kind === 'global') return all.filter(isFeedOpen);
    if (scope.kind === 'asset') return all.filter(a => a.id === scope.assetId);
    return all.filter(a => slugify(a.company) === scope.slug);
  };

  const facetsOf = (scope: FeedScope): FeedFacets | undefined => {
    const list = scopeAssets(scope);
    return list.length
      ? { cats: unique(list.map(a => a.cat)), countries: unique(list.map(a => a.country).filter(Boolean)) }
      : undefined;
  };

  async function listFeed(query: FeedQuery, cursor: string | null, limit: number): Promise<FeedPage> {
    const facets = facetsOf(query.scope);
    const category = query.cat === null ? undefined : CATEGORY_CODE[query.cat];
    // A category the API does not know matches nothing.
    if (query.cat !== null && !category) return { items: [], nextCursor: null, facets };
    const q = query.q.trim().slice(0, 80);
    const company = query.scope.kind === 'company' ? query.scope.slug : query.author ?? undefined;
    const page = await must(api.GET('/v1/feed', {
      params: {
        query: {
          sort: query.sort,
          limit: Math.min(FEED_MAX_PAGE, Math.max(1, limit)),
          ...(q ? { q } : {}),
          ...(category ? { category } : {}),
          ...(query.country ? { country: query.country } : {}),
          ...(company ? { company } : {}),
          ...(query.scope.kind === 'asset' ? { assetId: query.scope.assetId } : {}),
          ...(query.milestonesOnly ? { kind: 'milestone' as const } : {}),
          ...(query.media !== 'all' ? { media: query.media } : {}),
          ...(query.following ? { following: 'true' as const } : {}),
          ...(cursor ? { cursor } : {}),
        },
      },
    }), 'No pudimos cargar las publicaciones.');
    return { items: page.items.map(toFeedItem), nextCursor: page.nextCursor, facets };
  }

  async function toggleLike(postId: string): Promise<{ liked: boolean; likes: number }> {
    let current = likedByMe.get(postId);
    if (current === undefined) {
      const post = await must(api.GET('/v1/feed/posts/{id}', { params: { path: { id: postId } } }), 'No encontramos esta publicación.');
      current = post.likedByMe;
    }
    // Remember the intent right away so a quick second tap goes the other way.
    likedByMe.set(postId, !current);
    const params = { params: { path: { id: postId } } };
    try {
      const r = await must(current ? api.DELETE('/v1/feed/posts/{id}/like', params) : api.PUT('/v1/feed/posts/{id}/like', params),
        'No pudimos registrar tu me gusta.');
      likedByMe.set(postId, r.liked);
      return { liked: r.liked, likes: r.likeCount };
    } catch (e) {
      likedByMe.set(postId, current);
      throw e;
    }
  }

  const toComment = (c: CommentDto): PostComment => ({
    id: c.id,
    author: c.isIssuer && c.company ? c.company.name : (c.author.displayName ?? ANONYMOUS_NAME),
    isIssuer: c.isIssuer,
    text: c.body,
    date: displayDate(c.createdAt),
    authorId: c.author.id,
    avatarUrl: fileUrl(c.author.avatarUrl),
    anonymous: !c.isIssuer && c.author.displayName === null,
    canDelete: c.isMine || isAdmin,
  });

  async function listComments(postId: string): Promise<PostComment[]> {
    const out: PostComment[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 5; i++) {
      const page = await must(api.GET('/v1/feed/posts/{id}/comments', {
        params: { path: { id: postId }, query: { limit: 100, ...(cursor ? { cursor } : {}) } },
      }), 'No pudimos cargar los comentarios.');
      out.push(...page.items.map(toComment));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return out;
  }

  async function addComment(postId: string, text: string): Promise<PostComment> {
    const body = text.trim();
    if (!body) throw new Error('Escribí un comentario.');
    const c = await must(api.POST('/v1/feed/posts/{id}/comments', { params: { path: { id: postId } }, body: { body: body.slice(0, 500) } }),
      'No pudimos publicar tu comentario.', { validation_failed: 'El comentario puede tener hasta 500 caracteres.', not_found: 'Esta publicación ya no existe.' });
    return toComment(c);
  }

  async function createPost(input: CreatePostInput): Promise<FeedItem> {
    const files = [...input.files];
    const text = input.text.trim();
    if (!text && !files.length) throw new Error('Escribí algo o agregá una foto o un video para publicar.');
    if (files.length > MAX_POST_MEDIA) throw new Error(`Máximo ${MAX_POST_MEDIA} archivos por publicación.`);
    for (const f of files) {
      const isImage = IMAGE_TYPES.includes(f.type);
      if (!isImage && !VIDEO_TYPES.includes(f.type)) throw new Error('Solo se pueden subir fotos (PNG, JPG, WebP) o videos (MP4, WebM).');
      if (f.size > (isImage ? 5 : 25) * MB) throw new Error(`"${f.name}" supera el máximo de ${isImage ? 5 : 25} MB.`);
    }
    const mediaIds: string[] = [];
    for (const f of files) {
      const { data, error } = await uploadFile<UploadedMediaDto>('/v1/feed/media', f);
      if (!data) {
        throw new Error(errorText(error, `No pudimos subir "${f.name}".`, {
          forbidden: 'Solo el dueño de la empresa puede subir fotos o videos.',
          validation_failed: 'Formato no admitido. Usá fotos PNG, JPG o WebP, o videos MP4 o WebM.',
          bad_request: 'Formato no admitido. Usá fotos PNG, JPG o WebP, o videos MP4 o WebM.',
        }));
      }
      mediaIds.push(data.id);
    }
    const post = await must(api.POST('/v1/feed/posts', { body: { assetId: input.assetId, body: text, milestone: input.milestone, mediaIds } }),
      'No pudimos publicar. Probá de nuevo.', {
        forbidden: 'Solo el emisor del proyecto o un administrador puede publicar en su feed.',
        conflict: 'El feed de este proyecto se abre cuando está operativo o financiado.',
        not_found: 'No encontramos este proyecto.',
      });
    emit();
    return toFeedItem(post);
  }

  async function deletePost(postId: string): Promise<void> {
    await mustOk(api.DELETE('/v1/feed/posts/{id}', { params: { path: { id: postId } } }), 'No pudimos eliminar la publicación.');
    likedByMe.delete(postId);
    emit();
  }

  async function deleteComment(commentId: string): Promise<void> {
    await mustOk(api.DELETE('/v1/feed/comments/{id}', { params: { path: { id: commentId } } }), 'No pudimos eliminar el comentario.');
  }

  // ─── Companies ─────────────────────────────────────────────────────────────
  const fromSummary = (c: CompanySummaryDto, all: SocialAsset[]): CompanyProfile => ({
    slug: c.slug,
    name: c.name,
    handle: c.slug.replace(/-/g, ''),
    cover: mediaUrl(c.coverUrl),
    bio: c.bio ?? '',
    verified: c.verified,
    logoUrl: fileUrl(c.logoUrl),
    owner: null,
    projects: c.projects,
    followers: c.followers,
    isFollowing: c.isFollowing,
    isMine: false,
    liveAssets: all.filter(isFeedOpen),
    allAssets: all,
  });

  const toCompanyLive = (c: CompanyProfileDto): CompanyLive => ({
    canEdit: c.canEdit,
    createdAt: c.createdAt,
    bannerUrl: fileUrl(c.bannerUrl),
    stats: {
      raised: c.stats.raised, investors: c.stats.investors, operating: c.stats.operating, raising: c.stats.raising,
      avgApy: c.stats.avgApy, distributed: c.stats.distributed, posts: c.stats.posts, milestones: c.stats.milestones,
      likes: c.stats.likes, comments: c.stats.comments, countries: c.stats.countries,
      categories: c.stats.categories.map(k => CATEGORY_LABEL[k]), reviews: c.stats.reviews,
    },
    monthly: c.monthlyDistributions.map(m => ({ label: shortMonth(m.month), value: m.amount })),
    projectStats: c.projectStats.map(p => ({ assetId: p.assetId, raised: p.raised, investors: p.investors })),
  });

  async function listFeaturedCompanies(): Promise<CompanyProfile[]> {
    // Featured companies first (admin), then the most followed.
    const page = await must(api.GET('/v1/companies', { params: { query: { sort: 'followers', limit: 24 } } }), 'No pudimos cargar las empresas.');
    const all = [...byId.values()];
    return page.items.map(c => fromSummary(c, all.filter(a => slugify(a.company) === c.slug)));
  }

  async function getCompany(slug: string): Promise<CompanyProfile | null> {
    const [profile, projects] = await Promise.all([
      maybe(api.GET('/v1/companies/{slug}', { params: { path: { slug } } }), 'No pudimos cargar el perfil de la empresa.'),
      must(api.GET('/v1/assets', { params: { query: { company: slug, limit: 100 } } }), 'No pudimos cargar los proyectos de la empresa.'),
    ]);
    if (!profile) return null;
    const all = projects.items.map(toCatalogAsset);
    const owner = profile.owner ? { ...personRef(profile.owner), bio: '' } : null;
    return { ...fromSummary(profile, all), owner, isMine: profile.isOwner, live: toCompanyLive(profile) };
  }

  async function updateCompany(slug: string, edit: CompanyEdit): Promise<CompanyProfile> {
    await must(api.PATCH('/v1/companies/{slug}', { params: { path: { slug } }, body: edit }), 'No pudimos guardar los cambios.', {
      validation_failed: 'Revisá los datos: el nombre debe tener entre 2 y 120 caracteres y la descripción hasta 600.',
    });
    emit();
    const fresh = await getCompany(slug);
    if (!fresh) throw new Error('No encontramos la empresa.');
    return fresh;
  }

  async function setCompanyImage(slug: string, kind: CompanyImageKind, file: File | null): Promise<CompanyProfile> {
    const label = kind === 'logo' ? 'el logo' : 'la portada';
    if (file) {
      if (!IMAGE_TYPES.includes(file.type)) throw new Error('Formato no admitido. Usá PNG, JPG o WebP.');
      if (file.size > 5 * MB) throw new Error('La imagen supera el máximo de 5 MB.');
      const { data, error } = await uploadFile<CompanyProfileDto>(`/v1/companies/${slug}/${kind}`, file);
      if (!data) throw new Error(errorText(error, `No pudimos subir ${label}.`, { validation_failed: 'La imagen no es válida. Usá PNG, JPG o WebP de hasta 5 MB.', bad_request: 'La imagen no es válida. Usá PNG, JPG o WebP de hasta 5 MB.' }));
    } else {
      const params = { params: { path: { slug } } };
      await must(kind === 'logo' ? api.DELETE('/v1/companies/{slug}/logo', params) : api.DELETE('/v1/companies/{slug}/banner', params),
        `No pudimos quitar ${label}.`);
    }
    emit();
    const fresh = await getCompany(slug);
    if (!fresh) throw new Error('No encontramos la empresa.');
    return fresh;
  }

  // ─── People ────────────────────────────────────────────────────────────────
  async function getPerson(id: string): Promise<PersonProfile | null> {
    if (!UUID.test(id)) return null;
    const p: PublicProfileDto | null = await maybe(api.GET('/v1/users/{id}', { params: { path: { id } } }), 'No pudimos cargar este perfil.');
    if (!p) return null;
    const first = p.companies[0];
    return {
      ...personRef({ id: p.id, displayName: p.displayName, avatarUrl: p.avatarUrl }),
      bio: '',
      rep: null,
      company: first ? companyRef(first) : null,
      followersCount: p.followers,
      followingCount: p.followingPeople + p.followingCompanies,
      isFollowing: p.isFollowing,
      isSelf: p.isMe,
      live: {
        isPublic: p.isPublic,
        kycVerified: p.kycVerified,
        level: p.level,
        memberSince: p.memberSince,
        investmentsVisible: p.investmentsVisible,
        investments: p.investments?.map(i => ({
          asset: assetOf({ id: i.assetId, slug: i.slug, name: i.name, category: i.category, location: i.location, imageUrl: i.imageUrl }),
          since: monthLabel(i.since),
        })) ?? null,
      },
    };
  }

  // ─── Follows ───────────────────────────────────────────────────────────────
  const FOLLOW_REASONS: Reasons = { bad_request: 'No podés seguirte a vos mismo ni a tu propia empresa.', not_found: 'Este perfil ya no existe.' };

  async function setFollow(target: FollowTarget, on: boolean): Promise<FollowState> {
    const fallback = on ? 'No pudimos seguir este perfil.' : 'No pudimos dejar de seguir este perfil.';
    let state: FollowState;
    if (target.kind === 'company') {
      const params = { params: { path: { slug: target.slug } } };
      state = await must(on ? api.PUT('/v1/companies/{slug}/follow', params) : api.DELETE('/v1/companies/{slug}/follow', params), fallback, FOLLOW_REASONS);
    } else {
      const params = { params: { path: { id: target.id } } };
      state = await must(on ? api.PUT('/v1/users/{id}/follow', params) : api.DELETE('/v1/users/{id}/follow', params), fallback, FOLLOW_REASONS);
    }
    emit();
    return state;
  }

  const toFollowEntry = (e: FollowEntryDto): FollowEntry => (e.kind === 'company'
    ? { kind: 'company', slug: e.company.slug, name: e.company.name, logoUrl: fileUrl(e.company.logoUrl), isFollowing: e.isFollowing, isMine: e.isMine }
    : { kind: 'person', ...personRef(e.user), companyName: e.company?.name ?? null, isSelf: e.isMe, isFollowing: e.isFollowing });

  /** Total for "y N más": exact on the last page, otherwise read from the profile. */
  async function followCount(target: FollowTarget, which: 'followers' | 'following', seen: number, more: boolean): Promise<number> {
    if (!more) return seen;
    if (target.kind === 'company') {
      const c = await maybe(api.GET('/v1/companies/{slug}', { params: { path: { slug: target.slug } } }), 'No pudimos cargar la lista.');
      return c ? c.followers : seen;
    }
    const p = await maybe(api.GET('/v1/users/{id}', { params: { path: { id: target.id } } }), 'No pudimos cargar la lista.');
    if (!p) return seen;
    return which === 'followers' ? p.followers : p.followingPeople + p.followingCompanies;
  }

  async function listFollowers(target: FollowTarget, cursor: string | null): Promise<FollowPage> {
    const query = { limit: FOLLOW_PAGE, ...(cursor ? { cursor } : {}) };
    const page = target.kind === 'company'
      ? await must(api.GET('/v1/companies/{slug}/followers', { params: { path: { slug: target.slug }, query } }), 'No pudimos cargar los seguidores.')
      : UUID.test(target.id)
        ? await must(api.GET('/v1/users/{id}/followers', { params: { path: { id: target.id }, query } }), 'No pudimos cargar los seguidores.')
        : { items: [], nextCursor: null };
    const offset = cursor ? Number(cursor) || 0 : 0;
    const count = await followCount(target, 'followers', offset + page.items.length, page.nextCursor !== null);
    return { count, items: page.items.map(toFollowEntry), nextCursor: page.nextCursor };
  }

  async function listFollowing(target: FollowTarget, cursor: string | null): Promise<FollowPage> {
    // Companies don't follow anyone.
    if (target.kind === 'company' || !UUID.test(target.id)) return { count: 0, items: [], nextCursor: null };
    const page = await must(api.GET('/v1/users/{id}/following', {
      params: { path: { id: target.id }, query: { limit: FOLLOW_PAGE, ...(cursor ? { cursor } : {}) } },
    }), 'No pudimos cargar a quién sigue.');
    const offset = cursor ? Number(cursor) || 0 : 0;
    const count = await followCount(target, 'following', offset + page.items.length, page.nextCursor !== null);
    return { count, items: page.items.map(toFollowEntry), nextCursor: page.nextCursor };
  }

  // ─── Reviews ───────────────────────────────────────────────────────────────
  const toReview = (r: ReviewDto): Review => ({
    id: r.id,
    asset: assetOf({ id: r.asset.id, slug: r.asset.slug, name: r.asset.name }),
    rating: r.rating,
    author: r.author.displayName ?? ANONYMOUS_NAME,
    text: r.body,
    date: displayDate(r.createdAt),
    ts: Date.parse(r.createdAt) || 0,
    authorId: r.author.id,
    authorAvatarUrl: fileUrl(r.author.avatarUrl),
    authorAnonymous: r.author.displayName === null,
    isMine: r.isMine,
  });

  const REVIEW_REASONS: Reasons = {
    already_reviewed: 'Ya publicaste una reseña de este proyecto. Podés editarla desde la lista.',
    forbidden: 'Solo los inversores de este proyecto pueden reseñarlo (y nunca su propia empresa).',
    not_found: 'No encontramos este proyecto.',
    bad_request: 'Ese proyecto no es de esta empresa.',
    validation_failed: 'Revisá la reseña: una calificación de 1 a 5 y hasta 1000 caracteres.',
  };

  async function listReviews(slug: string): Promise<Review[]> {
    const out: Review[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const page = await maybe(api.GET('/v1/companies/{slug}/reviews', {
        params: { path: { slug }, query: { limit: 50, ...(cursor ? { cursor } : {}) } },
      }), 'No pudimos cargar las reseñas.');
      if (!page) break;
      out.push(...page.items.map(toReview));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return out;
  }

  async function addReview(slug: string, input: ReviewInput): Promise<Review> {
    const body = input.text.trim();
    if (!body) throw new Error('Escribí tu reseña.');
    const r = await must(api.POST('/v1/companies/{slug}/reviews', {
      params: { path: { slug } }, body: { assetId: input.assetId, rating: input.rating, body: body.slice(0, 1000) },
    }), 'No pudimos publicar tu reseña.', REVIEW_REASONS);
    emit();
    return toReview(r);
  }

  async function updateReview(reviewId: string, input: Omit<ReviewInput, 'assetId'>): Promise<Review> {
    const body = input.text.trim();
    if (!body) throw new Error('Escribí tu reseña.');
    const r = await must(api.PUT('/v1/reviews/{id}', { params: { path: { id: reviewId } }, body: { rating: input.rating, body: body.slice(0, 1000) } }),
      'No pudimos guardar tu reseña.', REVIEW_REASONS);
    emit();
    return toReview(r);
  }

  async function deleteReview(reviewId: string): Promise<void> {
    await mustOk(api.DELETE('/v1/reviews/{id}', { params: { path: { id: reviewId } } }), 'No pudimos eliminar la reseña.');
    emit();
  }

  return {
    mode: 'live',
    viewer,
    listFeed,
    toggleLike,
    listComments,
    addComment,
    createPost,
    listFeaturedCompanies,
    getCompany,
    getPerson,
    follow: target => setFollow(target, true),
    unfollow: target => setFollow(target, false),
    listFollowers,
    listFollowing,
    listReviews,
    addReview,
    updateReview,
    deleteReview,
    deletePost,
    deleteComment,
    updateCompany,
    setCompanyImage,
    subscribe,
    getVersion,
  };
}
