import type { paths } from '~/lib/api/schema';

// Response/request shapes of the admin API, derived from the generated OpenAPI types.

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type JsonOf<S> = S extends { content: { 'application/json': infer T } } ? T : never;

/** JSON body of the 200 (or 201) response of an operation. */
export type Ok<P extends keyof paths, M extends Method> = paths[P][M] extends { responses: infer R }
  ? R extends { 200: infer S } ? JsonOf<S> : R extends { 201: infer S } ? JsonOf<S> : never
  : never;

/** JSON request body of an operation. */
export type Body<P extends keyof paths, M extends Method> = paths[P][M] extends { requestBody?: { content: { 'application/json': infer B } } } ? B : never;

export type AdminStats = Ok<'/v1/admin/stats', 'get'>;

export type AdminAsset = Ok<'/v1/admin/assets', 'get'>[number];
export type AdminAssetDetail = Ok<'/v1/admin/assets/{id}', 'get'>;
export type AdminIssuer = Ok<'/v1/admin/issuers', 'get'>[number];
export type AssetCategory = AdminAsset['category'];
export type AssetStage = AdminAsset['stage'];
export type PublicationStatus = AdminAsset['status'];
export type PoolStatus = NonNullable<AdminAsset['poolStatus']>;
export type IssuerKind = AdminAsset['issuer']['kind'];
export type AssetImage = AdminAssetDetail['images'][number];
export type AssetDocument = AdminAssetDetail['documents'][number];
export type DocumentKind = AssetDocument['kind'];
export type CreateAssetBody = Body<'/v1/admin/assets', 'post'>;
export type UpdateAssetBody = Body<'/v1/admin/assets/{id}', 'patch'>;

export type AdminUserPage = Ok<'/v1/admin/users', 'get'>;
export type AdminUser = AdminUserPage['items'][number];
export type AdminUserDetail = Ok<'/v1/admin/users/{id}', 'get'>;
export type UserRole = AdminUser['role'];
export type UserKycStatus = AdminUser['kycStatus'];
export type UserOrder = AdminUserDetail['orders'][number];
export type UsersQuery = NonNullable<paths['/v1/admin/users']['get']['parameters']['query']>;
export type OnchainIdentityStatus = NonNullable<AdminUserDetail['onchainIdentity']>['status'];

export type AuditPage = Ok<'/v1/admin/audit', 'get'>;
export type AuditEntry = AuditPage['items'][number];

export type BroadcastBody = Body<'/v1/admin/notifications', 'post'>;
export type BroadcastAudience = BroadcastBody['audience'];

export type Ticket = Ok<'/v1/admin/support/tickets', 'get'>[number];
export type TicketDetail = Ok<'/v1/admin/support/tickets/{id}', 'get'>;
export type TicketStatus = Ticket['status'];
export type TicketCategory = Ticket['category'];
export type StoredFileRef = TicketDetail['attachments'][number];

export type TokenizationRequest = Ok<'/v1/admin/tokenization-requests', 'get'>[number];
export type TokenizationRequestDetail = Ok<'/v1/admin/tokenization-requests/{id}', 'get'>;
export type RequestStatus = TokenizationRequest['status'];
/** Asset categories plus "otro" (the admin picks the asset category on approval). */
export type RequestCategory = TokenizationRequest['data']['category'];

export type AcademyPost = Ok<'/v1/admin/academy/posts', 'get'>[number];
export type CreatePostBody = Body<'/v1/admin/academy/posts', 'post'>;
export type UpdatePostBody = Body<'/v1/admin/academy/posts/{id}', 'patch'>;

export type Faq = Ok<'/v1/admin/faq', 'get'>[number];
export type CreateFaqBody = Body<'/v1/admin/faq', 'post'>;

export type PlatformToken = Ok<'/v1/admin/token', 'get'>;
export type TokenBody = Body<'/v1/admin/token', 'put'>;

export type ChainTx = Ok<'/v1/admin/chain/transactions', 'get'>[number];
