import { RWA_ASSETS } from '~/data';
import { ME, MY_COMPANY } from '~/lib/me';
import { personByName, personNameBySlug, companyFollowers, personSocial } from '~/lib/people';
import { seedReviews } from '~/lib/companyStats';
import {
  assetsPosts, companyNameBySlug, companySlug, emitFeedStore, feedStoreVersion, featuredProfiles, findProjectPost,
  followedCompanies, followedPeople, globalMilestones, isFeedLive, issuerNameOf, postMedia, profileByName,
  setProjectPosts, subscribeFeedStore, toggleFollowCompany, toggleFollowPerson,
  type AssetPost, type DemoCompany, type ProjectPost,
} from '~/lib/projectFeed';
import { MAX_POST_MEDIA } from '~/lib/social/types';
import type {
  CompanyProfile, CreatePostInput, FeedItem, FeedPage, FeedPost, FeedQuery, FollowEntry, FollowPage, FollowState, FollowTarget,
  PersonProfile, PostComment, Review, ReviewInput, SocialSnapshot, SocialSource, Viewer,
} from '~/lib/social/types';

// Demo SocialSource: the design branch's in-memory behaviour (seeded posts,
// likes, comments, follows and reviews that reset on reload), backed by the
// shared demo store in lib/projectFeed so a project's Feed tab, the global
// Feed and the company profile always agree. Demo mode only.

const companyRefOf = (name: string) => ({ slug: companySlug(name), name });

const viewer: Viewer = {
  id: ME.name, name: ME.name, handle: 'vos', initial: ME.initial, gradient: ME.gradient,
  company: MY_COMPANY ? companyRefOf(MY_COMPANY) : null,
};

function toFeedPost(p: ProjectPost): FeedPost {
  return {
    id: p.id,
    text: p.text,
    media: postMedia(p),
    milestone: p.milestone,
    likes: p.likes,
    likedByMe: p.liked,
    commentCount: p.comments.length,
    comments: p.comments,
    createdAt: p.ts === undefined ? '' : new Date(p.ts).toISOString(),
    date: p.date,
  };
}

const toFeedItem = ({ post, asset }: AssetPost): FeedItem => ({ post: toFeedPost(post), asset, company: companyRefOf(issuerNameOf(asset)) });

// ─── Feed ─────────────────────────────────────────────────────────────────────
function scopeItems(query: FeedQuery): AssetPost[] {
  if (query.scope.kind === 'global') {
    return query.milestonesOnly ? globalMilestones() : assetsPosts(RWA_ASSETS.filter(isFeedLive));
  }
  if (query.scope.kind === 'asset') {
    const { assetId } = query.scope;
    const asset = RWA_ASSETS.find(a => a.id === assetId);
    const posts = asset ? assetsPosts([asset]) : [];
    return query.milestonesOnly ? posts.filter(p => p.post.milestone) : posts;
  }
  const name = companyNameBySlug(query.scope.slug);
  const profile = name ? profileByName(name) : null;
  if (!profile) return [];
  const posts = assetsPosts(profile.liveAssets);
  return query.milestonesOnly ? posts.filter(p => p.post.milestone) : posts;
}

function feed(query: FeedQuery, cursor: string | null, limit: number): FeedPage {
  const items = scopeItems(query);
  const followed = followedCompanies();
  const q = query.q.trim().toLowerCase();
  const filtered = items
    .filter(({ post, asset }) => {
      const media = postMedia(post);
      const issuer = issuerNameOf(asset);
      if (query.cat !== null && asset.cat !== query.cat) return false;
      if (query.country !== null && asset.country !== query.country) return false;
      if (query.author !== null && companySlug(issuer) !== query.author) return false;
      if (query.media === 'video' && !media.some(m => m.type === 'video')) return false;
      if (query.media === 'image' && !media.some(m => m.type === 'image')) return false;
      if (query.following && !followed.includes(issuer)) return false;
      if (!q) return true;
      return [post.text, asset.name, issuer, asset.location, asset.cat]
        .some(s => s && s.toLowerCase().includes(q));
    })
    .sort((x, y) => (query.sort === 'popular' ? y.post.likes - x.post.likes : 0));
  const start = cursor ? Number(cursor) || 0 : 0;
  const end = start + Math.max(0, limit);
  return {
    items: filtered.slice(start, end).map(toFeedItem),
    nextCursor: end < filtered.length ? String(end) : null,
    facets: {
      cats: [...new Set(items.map(i => i.asset.cat))],
      countries: [...new Set(items.map(i => i.asset.country).filter(Boolean))],
    },
  };
}

// ─── Companies and people ─────────────────────────────────────────────────────
function toCompanyProfile(p: DemoCompany): CompanyProfile {
  const isFollowing = followedCompanies().includes(p.name);
  const isMine = !!MY_COMPANY && p.name === MY_COMPANY;
  return {
    slug: companySlug(p.name),
    name: p.name,
    handle: p.handle,
    cover: p.cover,
    bio: p.bio,
    verified: p.verified,
    // The signed-in user runs their own company.
    owner: isMine
      ? { id: viewer.id, name: viewer.name, handle: viewer.handle, initial: viewer.initial, gradient: viewer.gradient, bio: '' }
      : { id: p.owner.name, ...p.owner },
    projects: p.projects,
    followers: p.followers + (isFollowing ? 1 : 0),
    isFollowing,
    isMine,
    liveAssets: p.liveAssets,
    allAssets: p.allAssets,
  };
}

function company(slug: string): CompanyProfile | null {
  const name = companyNameBySlug(slug);
  const profile = name ? profileByName(name) : null;
  return profile ? toCompanyProfile(profile) : null;
}

const socialOf = (name: string) => personSocial(name, {
  iFollow: followedPeople().includes(name), myPeople: followedPeople(), myCompanies: followedCompanies(),
});

// `idOrSlug`: a demo person's name (their id) or their URL slug.
function person(idOrSlug: string): PersonProfile | null {
  const id = personNameBySlug(idOrSlug);
  if (!id) return null;
  const isSelf = id === ME.name;
  const p = personByName(id);
  const social = socialOf(id);
  const companyName = isSelf ? MY_COMPANY : p.company;
  return {
    id, name: id, handle: isSelf ? viewer.handle : p.handle, initial: p.initial, gradient: isSelf ? ME.gradient : p.gradient,
    bio: p.bio, rep: p.rep, company: companyName ? companyRefOf(companyName) : null,
    followersCount: social.followersCount, followingCount: social.followingCount,
    isFollowing: followedPeople().includes(id), isSelf,
  };
}

// ─── Follows ──────────────────────────────────────────────────────────────────
function personEntry(name: string): FollowEntry {
  const isSelf = name === ME.name;
  const p = isSelf ? { ...ME, handle: 'vos', company: null } : personByName(name);
  return {
    kind: 'person', id: name, name, handle: p.handle, initial: p.initial, gradient: p.gradient,
    companyName: p.company, isSelf, isFollowing: followedPeople().includes(name),
  };
}

const companyEntry = (name: string): FollowEntry => ({
  kind: 'company', slug: companySlug(name), name, isFollowing: followedCompanies().includes(name),
});

function followers(target: FollowTarget): FollowPage {
  if (target.kind === 'company') {
    const name = companyNameBySlug(target.slug);
    if (!name) return { count: 0, items: [], nextCursor: null };
    const f = companyFollowers(name, followedCompanies().includes(name));
    return { count: f.count, items: f.people.map(personEntry), nextCursor: null };
  }
  const s = socialOf(target.id);
  return { count: s.followersCount, items: s.followers.map(personEntry), nextCursor: null };
}

function following(target: FollowTarget): FollowPage {
  // Companies don't follow anyone.
  if (target.kind === 'company') return { count: 0, items: [], nextCursor: null };
  const s = socialOf(target.id);
  return {
    count: s.followingCount,
    items: [...s.followingCompanies.map(companyEntry), ...s.followingPeople.map(personEntry)],
    nextCursor: null,
  };
}

function setFollow(target: FollowTarget, on: boolean): FollowState {
  if (target.kind === 'company') {
    const name = companyNameBySlug(target.slug);
    if (!name) throw new Error(`Unknown company ${target.slug}`);
    if (followedCompanies().includes(name) !== on) toggleFollowCompany(name);
    return { following: on, followers: (profileByName(name)?.followers ?? 0) + (on ? 1 : 0) };
  }
  if (target.id === ME.name) throw new Error('You cannot follow yourself');
  if (followedPeople().includes(target.id) !== on) toggleFollowPerson(target.id);
  return { following: on, followers: socialOf(target.id).followersCount };
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
// Seeded per company on first read; the ones written in this session go first.
const reviewsBySlug = new Map<string, Review[]>();

function reviews(slug: string): Review[] {
  const cached = reviewsBySlug.get(slug);
  if (cached) return cached;
  const name = companyNameBySlug(slug);
  const seeded = seedReviews(name ? profileByName(name) : null);
  reviewsBySlug.set(slug, seeded);
  return seeded;
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${(seq += 1)}`;

function addReview(slug: string, input: ReviewInput): Review {
  const name = companyNameBySlug(slug);
  const asset = (name ? profileByName(name)?.allAssets : undefined)?.find(a => a.id === input.assetId);
  const text = input.text.trim();
  if (!asset || !text) throw new Error('Invalid review');
  const review: Review = { id: nextId('me'), asset, rating: input.rating, author: ME.name, text, date: 'Ahora', ts: 1 };
  reviewsBySlug.set(slug, [review, ...reviews(slug)]);
  emitFeedStore();
  return review;
}

// ─── Posts ────────────────────────────────────────────────────────────────────
function toggleLike(postId: string): { liked: boolean; likes: number } {
  const found = findProjectPost(postId);
  if (!found) throw new Error(`Unknown post ${postId}`);
  const { post } = found;
  const next = { liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) };
  setProjectPosts(found.asset, posts => posts.map(p => (p.id === postId ? { ...p, ...next } : p)));
  return next;
}

function addComment(postId: string, text: string): PostComment {
  const found = findProjectPost(postId);
  const body = text.trim();
  if (!found || !body) throw new Error('Invalid comment');
  // The issuer answers as the company; everyone else as "Vos".
  const issuer = issuerNameOf(found.asset);
  const comment: PostComment = {
    id: nextId('c'), date: 'Ahora', text: body,
    author: found.asset.isMine ? issuer : 'Vos', isIssuer: !!found.asset.isMine,
  };
  setProjectPosts(found.asset, posts => posts.map(p => (p.id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p)));
  return comment;
}

// Like the design's composer: files stay in the browser as object URLs (until reload).
function createPost(input: CreatePostInput): FeedItem {
  const asset = RWA_ASSETS.find(a => a.id === input.assetId);
  if (!asset) throw new Error('No encontramos este proyecto.');
  if (!asset.isMine) throw new Error('Solo el emisor del proyecto puede publicar en su feed.');
  const files = [...input.files];
  if (files.some(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'))) throw new Error('Solo se pueden subir fotos o videos.');
  if (files.length > MAX_POST_MEDIA) throw new Error(`Máximo ${MAX_POST_MEDIA} archivos por publicación.`);
  const text = input.text.trim();
  if (!text && !files.length) throw new Error('Escribí algo o agregá una foto o un video para publicar.');
  const ts = Date.now();
  const post: ProjectPost = {
    id: nextId('p'), ts, date: 'Ahora', text, milestone: input.milestone,
    media: files.map((f, i) => ({ id: `${f.name}-${f.lastModified}-${i}-${ts}`, type: f.type.startsWith('video/') ? 'video' : 'image', url: URL.createObjectURL(f) })),
    likes: 0, liked: false, comments: [],
  };
  setProjectPosts(asset, posts => [post, ...posts]);
  return toFeedItem({ post, asset });
}

// ─── Source ───────────────────────────────────────────────────────────────────
const snapshot: SocialSnapshot = {
  feed,
  featuredCompanies: () => featuredProfiles().map(toCompanyProfile),
  company,
  person,
  reviews,
  followers,
  following,
};

/** Runs a synchronous demo operation as the async SocialSource contract expects. */
const resolve = <T>(fn: () => T): Promise<T> => {
  try {
    return Promise.resolve(fn());
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
};

export const demoSocialSource: SocialSource = {
  mode: 'demo',
  viewer,
  listFeed: (query, cursor, limit) => resolve(() => feed(query, cursor, limit)),
  toggleLike: postId => resolve(() => toggleLike(postId)),
  listComments: postId => resolve(() => findProjectPost(postId)?.post.comments ?? []),
  addComment: (postId, text) => resolve(() => addComment(postId, text)),
  createPost: input => resolve(() => createPost(input)),
  listFeaturedCompanies: () => resolve(snapshot.featuredCompanies),
  getCompany: slug => resolve(() => company(slug)),
  getPerson: id => resolve(() => person(id)),
  follow: target => resolve(() => setFollow(target, true)),
  unfollow: target => resolve(() => setFollow(target, false)),
  listFollowers: target => resolve(() => followers(target)),
  listFollowing: target => resolve(() => following(target)),
  listReviews: slug => resolve(() => reviews(slug)),
  addReview: (slug, input) => resolve(() => addReview(slug, input)),
  subscribe: subscribeFeedStore,
  getVersion: feedStoreVersion,
  snapshot,
};
