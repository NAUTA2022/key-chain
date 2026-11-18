import type { RwaAsset } from '~/data';
import type { CatalogAsset } from '~/lib/catalog';

// Social layer (global feed, company profiles, follows, comments, reviews).
// The visual components only see these shapes; where they come from is a
// `SocialSource`: the in-memory demo adapter (lib/social/demo.ts, the design
// branch's behaviour) or the API adapter in live mode (see useSocialSource).

/** A project as the social components need it: the demo RwaAsset, optionally with the live catalog fields. */
export type SocialAsset = RwaAsset & Partial<Pick<CatalogAsset, 'slug' | 'pool' | 'live'>>;

// ─── Posts ────────────────────────────────────────────────────────────────────
export type MediaType = 'image' | 'video';
export type MediaItem = { id: string; type: MediaType; url: string };

export type PostComment = {
  id: string;
  /** Display name of the author (the company name when the issuer answers). */
  author: string;
  /** Written by the project's issuer (shown with the company hexagon and an "Emisor" badge). */
  isIssuer: boolean;
  text: string;
  /** Display date ("13 Jun 2026", "Ahora"). */
  date: string;
  /** Live: the author's user id (opens their profile), the photo and whether the name is hidden (identicon). */
  authorId?: string | null;
  avatarUrl?: string | null;
  anonymous?: boolean;
  /** Live: the viewer wrote it or is an admin (may delete it). */
  canDelete?: boolean;
};

export type FeedPost = {
  id: string;
  text: string;
  media: MediaItem[];
  /** Milestone ("hito"): shown in the global feed and the company's Hitos tab. */
  milestone: boolean;
  likes: number;
  likedByMe: boolean;
  commentCount: number;
  /** Comments delivered with the post (demo). When absent, they are loaded with `listComments`. */
  comments?: PostComment[];
  /** ISO timestamp. */
  createdAt: string;
  /** Display date ("13 Jun 2026"). */
  date: string;
  /** Live: the viewer owns the company or is an admin (may delete the post). */
  canManage?: boolean;
};

/** The company (issuer) that authors a project's posts. */
export type CompanyRef = { slug: string; name: string; logoUrl?: string | null };

/** One post with the project it belongs to and its author company. */
export type FeedItem = { post: FeedPost; asset: SocialAsset; company: CompanyRef };

// ─── Feed queries ─────────────────────────────────────────────────────────────
/** Global feed (every live project), one company's posts, or one project's posts. */
export type FeedScope =
  | { kind: 'global' }
  | { kind: 'company'; slug: string }
  | { kind: 'asset'; assetId: number };
export type FeedSort = 'recent' | 'popular';
export type FeedMediaFilter = 'all' | 'image' | 'video';

export type FeedFilters = {
  /** Free text over the post text, project name, company, location and category. */
  q: string;
  /** Category label (e.g. "Campos") or null for all. */
  cat: string | null;
  country: string | null;
  /** Company slug or null for all. */
  author: string | null;
  media: FeedMediaFilter;
  /** Only companies the viewer follows. */
  following: boolean;
  sort: FeedSort;
};

export type FeedQuery = FeedFilters & { scope: FeedScope; milestonesOnly: boolean };

/** Filter options for the whole scope (not just the current page). */
export type FeedFacets = { cats: string[]; countries: string[] };

export type FeedPage = { items: FeedItem[]; nextCursor: string | null; facets?: FeedFacets };

/** Most photos/videos one post can carry. */
export const MAX_POST_MEDIA = 10;

/** A new post on a project's feed (only its issuer may publish). */
export type CreatePostInput = {
  assetId: number;
  text: string;
  /** Milestone ("hito"): also shown in the global feed. */
  milestone: boolean;
  /** Photos and videos, in order. */
  files: readonly File[];
};

// ─── People and companies ─────────────────────────────────────────────────────
export type PersonRef = {
  /** Stable id (live: user id; demo: the person's name). */
  id: string;
  name: string;
  handle: string;
  initial: string;
  /** Avatar background when there is no photo. */
  gradient: string;
  avatarUrl?: string | null;
  /** Live: the person keeps their profile private (shown as "Inversor" with an identicon seeded by `id`). */
  anonymous?: boolean;
};

export type CompanyOwner = PersonRef & { bio: string };

/** What only the API knows about a company (live mode); every number comes from the database. */
export type CompanyLive = {
  /** The viewer may edit the profile and post (owner or admin). */
  canEdit: boolean;
  /** Joined the platform (ISO). */
  createdAt: string;
  bannerUrl: string | null;
  stats: {
    raised: number;
    investors: number;
    operating: number;
    raising: number;
    avgApy: number | null;
    distributed: number;
    posts: number;
    milestones: number;
    likes: number;
    comments: number;
    countries: string[];
    /** Category labels ("Campos"). */
    categories: string[];
    reviews: { average: number | null; count: number };
  };
  /** Net dividends per month, last 12 months, oldest first. */
  monthly: Array<{ label: string; value: number }>;
  /** Per published project: capital raised and investors (on-chain orders). */
  projectStats: Array<{ assetId: number; raised: number; investors: number }>;
};

export type CompanyProfile = {
  slug: string;
  name: string;
  handle: string;
  cover: string;
  bio: string;
  verified: boolean;
  logoUrl?: string | null;
  /** Null when nobody manages the company yet (live). */
  owner: CompanyOwner | null;
  /** Projects with a live feed (shown on the featured card). */
  projects: number;
  /** Followers, including the viewer when `isFollowing`. */
  followers: number;
  isFollowing: boolean;
  /** The viewer runs this company. */
  isMine: boolean;
  /** Projects with a live feed. */
  liveAssets: SocialAsset[];
  /** Every project of the company, including the ones still raising. */
  allAssets: SocialAsset[];
  /** Live mode only. */
  live?: CompanyLive;
};

/** What the API tells about a person (live mode), following their privacy settings. Never amounts. */
export type PersonLive = {
  /** "Perfil público" is on (or it is the viewer). */
  isPublic: boolean;
  kycVerified: boolean | null;
  level: { level: number; name: string } | null;
  /** ISO, null when private. */
  memberSince: string | null;
  /** The person shows the projects they hold. */
  investmentsVisible: boolean;
  /** Projects held (no amounts), oldest first; null when private. `since` is a "Mar 2025" label. */
  investments: Array<{ asset: SocialAsset; since: string }> | null;
};

export type PersonProfile = PersonRef & {
  bio: string;
  /** Reputation, 0–5 (null: not available). */
  rep: number | null;
  /** The company this person owns, if any. */
  company: CompanyRef | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  /** Live mode only. */
  live?: PersonLive;
};

/** The signed-in user as the social layer shows them. */
export type Viewer = PersonRef & { company: CompanyRef | null };

// ─── Follows ──────────────────────────────────────────────────────────────────
export type FollowTarget = { kind: 'company'; slug: string } | { kind: 'person'; id: string };

export type FollowEntry =
  | { kind: 'company'; slug: string; name: string; isFollowing: boolean; logoUrl?: string | null; /** The viewer owns it (cannot follow it). */ isMine?: boolean }
  | (PersonRef & { kind: 'person'; companyName: string | null; isSelf: boolean; isFollowing: boolean });

/** `count` is the full total; `items` may be a sample of it ("y N más"). */
export type FollowPage = { count: number; items: FollowEntry[]; nextCursor: string | null };

export type FollowState = { following: boolean; followers: number };

// ─── Reviews ──────────────────────────────────────────────────────────────────
export type Review = {
  id: string;
  asset: SocialAsset;
  rating: number;
  author: string;
  text: string;
  date: string;
  /** Sort key, newest first. */
  ts: number;
  /** Live: the author's user id, photo and privacy (identicon when anonymous). */
  authorId?: string;
  authorAvatarUrl?: string | null;
  authorAnonymous?: boolean;
  /** Live: the viewer wrote it (may edit or delete it). */
  isMine?: boolean;
};

export type ReviewInput = { assetId: number; rating: number; text: string };

/** Owner/admin edits of a company profile (live). Empty bio clears it. */
export type CompanyEdit = { name?: string; bio?: string | null };
export type CompanyImageKind = 'logo' | 'banner';

// ─── Source ───────────────────────────────────────────────────────────────────
/**
 * Synchronous reads for sources whose data already lives in memory (demo):
 * pages render their first frame with data instead of a loading state.
 */
export interface SocialSnapshot {
  feed(query: FeedQuery, cursor: string | null, limit: number): FeedPage;
  featuredCompanies(): CompanyProfile[];
  company(slug: string): CompanyProfile | null;
  person(id: string): PersonProfile | null;
  reviews(companySlug: string): Review[];
  followers(target: FollowTarget): FollowPage;
  following(target: FollowTarget): FollowPage;
}

/**
 * Everything the social screens read or write. Cursors are opaque strings;
 * `null` asks for the first page. Mutations resolve with the server's state
 * so optimistic UI can reconcile.
 */
export interface SocialSource {
  readonly mode: 'demo' | 'live';
  /** The signed-in user, or null for an anonymous visitor (writes are then rejected). */
  readonly viewer: Viewer | null;

  listFeed(query: FeedQuery, cursor: string | null, limit: number): Promise<FeedPage>;
  toggleLike(postId: string): Promise<{ liked: boolean; likes: number }>;
  listComments(postId: string): Promise<PostComment[]>;
  addComment(postId: string, text: string): Promise<PostComment>;
  /** Publishes on a project's feed. Rejects with an Error whose message can be shown to the user (Spanish). */
  createPost(input: CreatePostInput): Promise<FeedItem>;

  /** Companies for the "Perfiles destacados" rail, most followed first. */
  listFeaturedCompanies(): Promise<CompanyProfile[]>;
  getCompany(slug: string): Promise<CompanyProfile | null>;
  getPerson(id: string): Promise<PersonProfile | null>;

  follow(target: FollowTarget): Promise<FollowState>;
  unfollow(target: FollowTarget): Promise<FollowState>;
  listFollowers(target: FollowTarget, cursor: string | null): Promise<FollowPage>;
  listFollowing(target: FollowTarget, cursor: string | null): Promise<FollowPage>;

  listReviews(companySlug: string): Promise<Review[]>;
  addReview(companySlug: string, input: ReviewInput): Promise<Review>;

  // Live-only operations (the demo has no moderation or profile editing).
  updateReview?(reviewId: string, input: Omit<ReviewInput, 'assetId'>): Promise<Review>;
  deleteReview?(reviewId: string): Promise<void>;
  deletePost?(postId: string): Promise<void>;
  deleteComment?(commentId: string): Promise<void>;
  updateCompany?(slug: string, edit: CompanyEdit): Promise<CompanyProfile>;
  /** Uploads (file) or removes (null) the company's logo or banner. */
  setCompanyImage?(slug: string, kind: CompanyImageKind, file: File | null): Promise<CompanyProfile>;

  /** Change notifications (e.g. a like or follow made elsewhere); hooks re-read on each. */
  subscribe?(listener: () => void): () => void;
  getVersion?(): number;
  /** Present on in-memory sources only. */
  readonly snapshot?: SocialSnapshot;
}
