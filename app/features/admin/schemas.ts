import { z } from 'zod';
import type { AssetCategory, AssetStage, BroadcastAudience, DocumentKind, IssuerKind, PublicationStatus, UserRole } from './types';

// Client-side mirrors of the admin API request bodies (key-chain-api zod schemas),
// with Spanish messages. The API validates again; these only give early feedback.

const text = (min: number, max: number) =>
  z
    .string({ error: 'Completa este campo.' })
    .trim()
    .min(min, min <= 1 ? 'Completa este campo.' : `Mínimo ${min} caracteres.`)
    .max(max, `Máximo ${max} caracteres.`);
const num = () => z.number({ error: 'Ingresa un número válido.' });

/** Field path → first message. */
export type FieldErrors = Record<string, string>;

export function validate<S extends z.ZodType>(schema: S, value: unknown): { ok: true; data: z.output<S> } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(value);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export const ASSET_CATEGORIES = ['autos', 'campos', 'drones', 'inmuebles', 'edificios'] as const satisfies readonly AssetCategory[];
export const ASSET_STAGES = ['recaudacion', 'operativo'] as const satisfies readonly AssetStage[];
export const ISSUER_KINDS = ['keychain', 'verified', 'community'] as const satisfies readonly IssuerKind[];
export const DOC_KINDS = ['legal', 'financial', 'technical', 'insurance', 'other'] as const satisfies readonly DocumentKind[];
export const PUBLICATION_STATUSES = ['draft', 'review', 'published', 'archived'] as const satisfies readonly PublicationStatus[];
export const ROLES = ['investor', 'issuer', 'admin'] as const satisfies readonly UserRole[];

const assetFields = {
  name: text(3, 120),
  category: z.enum(ASSET_CATEGORIES, { error: 'Elige una categoría.' }),
  country: text(2, 80),
  location: text(2, 160),
  description: text(10, 5000),
  valuation: num().positive('Debe ser mayor a 0.').max(1e13, 'Valor demasiado alto.'),
  tokenPrice: num().min(0.000001, 'Debe ser mayor a 0.').max(1e9, 'Valor demasiado alto.'),
  totalTokens: num().int('Debe ser un número entero.').min(1, 'Mínimo 1 token.').max(2_000_000_000, 'Máximo 2.000.000.000 tokens.'),
  apy: num().min(0, 'No puede ser negativo.').max(100, 'Máximo 100%.'),
  stage: z.enum(ASSET_STAGES, { error: 'Elige una etapa.' }),
  lifespan: text(1, 60),
  feedEnabled: z.boolean(),
  distributionFrequency: text(2, 40),
};

export const createAssetSchema = z
  .object({
    ...assetFields,
    status: z.enum(['draft', 'published']),
    issuerId: z.uuid('Elige un emisor.').optional(),
    newIssuer: z.object({ name: text(2, 120), kind: z.enum(ISSUER_KINDS) }).optional(),
  })
  .refine(b => Boolean(b.issuerId) !== Boolean(b.newIssuer), { message: 'Elige un emisor existente o crea uno nuevo.', path: ['issuerId'] });

export const updateAssetSchema = z.object({ ...assetFields, issuerId: z.uuid('Elige un emisor.') }).partial();

export const documentSchema = z.object({ title: text(2, 160), kind: z.enum(DOC_KINDS) });

export const distributionSchema = z.object({
  nextDistributionAt: z.iso
    .datetime({ offset: true, error: 'Elige una fecha válida.' })
    .nullable()
    .refine(v => v === null || Date.parse(v) > Date.now(), 'La fecha debe ser futura.'),
  distributionFrequency: text(2, 40).optional(),
});

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'];

/** Same type/size limits the API enforces for each upload purpose. */
export function checkFile(file: File, kind: 'image' | 'document'): string | null {
  const types = kind === 'image' ? IMAGE_TYPES : DOC_TYPES;
  const max = kind === 'image' ? 5 : 10;
  if (!types.includes(file.type)) return kind === 'image' ? 'Formato no admitido: usa PNG, JPG o WebP.' : 'Formato no admitido: usa PDF, PNG, JPG o WebP.';
  if (file.size > max * 1024 * 1024) return `El archivo supera ${max} MB.`;
  return null;
}

// ─── Users, KYC, support, requests ───────────────────────────────────────────

export const reasonSchema = z.object({ reason: text(3, 300) });
export const roleSchema = z.object({ role: z.enum(ROLES) });
export const replySchema = z.object({ body: text(1, 5000) });
// Asking for changes or rejecting must tell the requester why (mirrors the API).
export const reviewSchema = z
  .object({ status: z.enum(['in_review', 'changes_requested', 'rejected']), note: text(3, 1000).optional() })
  .superRefine((b, ctx) => {
    if (b.status !== 'in_review' && !b.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Escribe una nota para el solicitante: la va a ver en su solicitud.' });
  });

// ─── Broadcast ───────────────────────────────────────────────────────────────

export const AUDIENCES = ['all', 'investors', 'kyc_verified'] as const satisfies readonly BroadcastAudience[];

export const broadcastSchema = z.object({
  title: text(3, 120),
  body: text(3, 1000),
  link: z
    .string()
    .trim()
    .max(300, 'Máximo 300 caracteres.')
    .regex(/^\/(?![/\\])[^\s]*$/, 'Usa una ruta interna que empiece con "/" (por ejemplo /pertenencias).')
    .optional(),
  audience: z.enum(AUDIENCES),
});

// ─── Content ─────────────────────────────────────────────────────────────────

const slugField = text(3, 120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones simples.');
const imageUrlField = z
  .string()
  .trim()
  .max(500, 'Máximo 500 caracteres.')
  .regex(/^(\/[^/\\]|https:\/\/)/, 'Usa una ruta relativa (/…) o una URL https.');

const postFields = {
  slug: slugField,
  title: text(3, 200),
  excerpt: text(10, 500),
  body: z.string().trim().max(100_000, 'Máximo 100.000 caracteres.').nullable(),
  category: text(2, 40),
  coverUrl: imageUrlField,
  readMinutes: num().int('Debe ser un número entero.').min(1, 'Mínimo 1 minuto.').max(240, 'Máximo 240 minutos.'),
  featured: z.boolean(),
  status: z.enum(PUBLICATION_STATUSES),
  publishedAt: z.iso.datetime({ offset: true, error: 'Elige una fecha válida.' }),
};

export const createPostSchema = z.object({
  ...postFields,
  slug: slugField.optional(),
  coverUrl: imageUrlField.optional(),
  publishedAt: postFields.publishedAt.optional(),
});
export const updatePostSchema = z.object(postFields).partial();

const faqFields = {
  question: text(5, 300),
  answer: text(5, 5000),
  category: text(2, 40),
  published: z.boolean(),
};
export const faqSchema = z.object(faqFields);

const shortText = text(1, 60);
const colorField = z
  .string()
  .trim()
  .regex(/^(#[0-9a-fA-F]{3,8}|var\(--[a-zA-Z0-9-]{1,40}\))$/, 'Usa un color hex (#8247E5) o var(--nombre).');

export const tokenSchema = z
  .object({
    symbol: text(2, 12).regex(/^[A-Z0-9]+$/, 'Solo mayúsculas y números.'),
    name: text(2, 60),
    price: num().min(0, 'No puede ser negativo.').max(1e9, 'Valor demasiado alto.'),
    raised: num().min(0, 'No puede ser negativo.').max(1e14, 'Valor demasiado alto.'),
    goal: num().positive('Debe ser mayor a 0.').max(1e14, 'Valor demasiado alto.'),
    holders: num().int('Debe ser un número entero.').min(0, 'No puede ser negativo.').max(1e9, 'Valor demasiado alto.'),
    contractAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Dirección EVM inválida.').nullable(),
    chainId: num().int('Debe ser un número entero.').positive('Debe ser mayor a 0.').nullable(),
    utilities: z.array(text(1, 200)).max(20, 'Máximo 20 utilidades.'),
    rounds: z
      .array(
        z.object({
          name: shortText,
          price: num().min(0, 'No puede ser negativo.').max(1e9, 'Valor demasiado alto.'),
          status: text(1, 30),
          alloc: shortText,
          tge: shortText,
          cliff: shortText,
          vesting: shortText,
        }),
      )
      .max(20, 'Máximo 20 rondas.'),
    allocations: z
      .array(z.object({ label: shortText, percent: num().positive('Debe ser mayor a 0.').max(100, 'Máximo 100%.'), color: colorField }))
      .min(1, 'Agrega al menos una asignación.')
      .max(20, 'Máximo 20 asignaciones.'),
  })
  .refine(t => Math.abs(t.allocations.reduce((sum, a) => sum + a.percent, 0) - 100) <= 0.01, {
    message: 'Los porcentajes de asignación deben sumar 100.',
    path: ['allocations'],
  });
