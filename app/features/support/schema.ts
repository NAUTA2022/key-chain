import type { CSSProperties } from 'react';
import { z } from 'zod';
import type { IconName, PTagColor } from '~/components/ui';
import { errorText, MB } from '~/features/profile/api';
import { isProblem } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';

// Types, labels, validation (zod mirror of the API) and pure helpers for the live
// Help Center. No components here, so React Refresh stays happy.

// ─── API types ───────────────────────────────────────────────────────────────

export type FaqItem = paths['/v1/faq']['get']['responses'][200]['content']['application/json'][number];
export type TicketSummary = paths['/v1/support/tickets']['get']['responses'][200]['content']['application/json'][number];
export type TicketDetail = paths['/v1/support/tickets/{id}']['get']['responses'][200]['content']['application/json'];
export type TicketMessage = TicketDetail['messages'][number];
export type TicketAttachment = TicketDetail['attachments'][number];
export type TicketCategory = TicketSummary['category'];
export type TicketStatus = TicketSummary['status'];
type AssistantBody = paths['/v1/support/assistant']['post']['requestBody']['content']['application/json'];
export type AssistantTurn = AssistantBody['messages'][number];
export type ChatRole = AssistantTurn['role'];

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const TICKET_CATEGORIES = ['account', 'kyc', 'investment', 'payments', 'technical', 'other'] as const satisfies readonly TicketCategory[];

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  account: 'Cuenta',
  kyc: 'Verificación de identidad',
  investment: 'Inversiones',
  payments: 'Pagos',
  technical: 'Problema técnico',
  other: 'Otro',
};

export const STATUS_TAG: Record<TicketStatus, { label: string; color: PTagColor }> = {
  open: { label: 'Abierto', color: 'blue' },
  answered: { label: 'Respondido', color: 'green' },
  closed: { label: 'Cerrado', color: 'neutral' },
};

/** Attachments a single ticket may hold (mirrors the API). */
export const MAX_ATTACHMENTS = 5;
export const ATTACHMENT_MAX_BYTES = 10 * MB;
export const SUBJECT_MAX = 120;
export const MESSAGE_MAX = 5000;

export const newTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(4, 'Escribí un asunto de al menos 4 caracteres.')
    .max(SUBJECT_MAX, `El asunto puede tener hasta ${SUBJECT_MAX} caracteres.`),
  category: z.enum(TICKET_CATEGORIES, { error: 'Elegí una categoría.' }),
  message: z
    .string()
    .trim()
    .min(10, 'Contanos un poco más: el mensaje necesita al menos 10 caracteres.')
    .max(MESSAGE_MAX, `El mensaje puede tener hasta ${MESSAGE_MAX} caracteres.`),
});
export type NewTicketInput = z.infer<typeof newTicketSchema>;
export type NewTicketField = keyof NewTicketInput;
export type NewTicketErrors = Partial<Record<NewTicketField, string>>;

export const replySchema = z.object({
  body: z.string().trim().min(1, 'Escribí un mensaje.').max(MESSAGE_MAX, `El mensaje puede tener hasta ${MESSAGE_MAX} caracteres.`),
});

const NEW_TICKET_FIELDS: readonly NewTicketField[] = ['subject', 'category', 'message'];

function isNewTicketField(v: unknown): v is NewTicketField {
  return typeof v === 'string' && (NEW_TICKET_FIELDS as readonly string[]).includes(v);
}

/** Validates the new-ticket form; returns the parsed body or one Spanish error per field. */
export function validateNewTicket(input: { subject: string; category: string; message: string }):
  | { ok: true; data: NewTicketInput }
  | { ok: false; errors: NewTicketErrors } {
  const r = newTicketSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const errors: NewTicketErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path[0];
    if (isNewTicketField(key) && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Validates a reply; returns the trimmed body or the Spanish error. */
export function validateReply(body: string): { ok: true; body: string } | { ok: false; error: string } {
  const r = replySchema.safeParse({ body });
  return r.success ? { ok: true, body: r.data.body } : { ok: false, error: r.error.issues[0]?.message ?? 'Revisá el mensaje.' };
}

/**
 * Spanish copy for ticket errors. 409 = closed ticket or attachment limit; `upload`
 * adds the file checks, `load` treats a malformed id (400) as "not found".
 */
export function ticketErrorText(error: unknown, fallback: string, kind: 'write' | 'upload' | 'load' = 'write'): string {
  if (isProblem(error) && error.code === 'conflict') {
    return 'max' in error
      ? `Este ticket ya tiene el máximo de ${MAX_ATTACHMENTS} archivos adjuntos.`
      : 'Este ticket está cerrado. Si necesitás más ayuda, abrí uno nuevo.';
  }
  const notFound = 'No encontramos este ticket.';
  const reasons: Record<string, string> =
    kind === 'upload'
      ? { not_found: notFound, bad_request: 'No pudimos procesar el archivo. Usá PDF, PNG, JPG o WebP.', payload_too_large: 'El archivo supera el máximo de 10 MB.' }
      : kind === 'load'
        ? { not_found: notFound, http_error: notFound, bad_request: notFound }
        : { not_found: notFound };
  return errorText(error, fallback, reasons);
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

/** Lowercase, accent-free text for case/accent-insensitive search. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function searchTerms(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

/** Stable key used to group FAQ entries by category. */
export function faqCategoryKey(category: string): string {
  return category.trim().toLowerCase() || 'general';
}

/** Human label for an API FAQ category ("general" → "General", "token_kycn" → "Token kycn"). */
export function faqCategoryLabel(category: string): string {
  const raw = category.trim();
  if (!raw || raw.toLowerCase() === 'general') return 'General';
  const s = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.charAt(0).toLocaleUpperCase('es') + s.slice(1);
}

const CATEGORY_ICONS = new Map<string, IconName>([
  ['general', 'help'], ['ayuda', 'help'],
  ['cuenta', 'profile'], ['account', 'profile'], ['perfil', 'profile'],
  ['kyc', 'shield'], ['seguridad', 'shield'], ['security', 'shield'], ['verificacion', 'shield'],
  ['wallet', 'wallet'], ['wallets', 'wallet'], ['fondos', 'wallet'], ['pagos', 'wallet'], ['payments', 'wallet'],
  ['token', 'token'], ['tokens', 'token'], ['kycn', 'token'], ['fact', 'token'],
  ['swap', 'swap'], ['defi', 'swap'],
  ['invertir', 'primary'], ['inversion', 'primary'], ['inversiones', 'primary'], ['investment', 'primary'], ['investing', 'primary'],
  ['mercado', 'secondary'], ['market', 'secondary'], ['secundario', 'secondary'],
  ['academia', 'academy'], ['academy', 'academy'],
]);

/** Icon for a category card, guessed from its words (falls back to the help icon). */
export function faqCategoryIcon(category: string): IconName {
  for (const word of normalizeText(category).split(/[^a-z0-9]+/)) {
    const icon = CATEGORY_ICONS.get(word);
    if (icon) return icon;
  }
  return 'help';
}

export function faqMatches(faq: FaqItem, terms: readonly string[]): boolean {
  if (!terms.length) return true;
  const haystack = normalizeText(`${faq.question} ${faq.answer} ${faqCategoryLabel(faq.category)}`);
  return terms.every(t => haystack.includes(t));
}

export function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ─── Assistant ───────────────────────────────────────────────────────────────

export const ASSISTANT_MAX_MESSAGES = 12;
export const ASSISTANT_MAX_CHARS = 2000;

export type ChatMessage = { id: number; role: ChatRole; content: string };

/**
 * Body for POST /v1/support/assistant: consecutive turns of the same role merged,
 * every content within 1..2000 chars, at most the last 12 turns, ending with the user.
 */
export function assistantPayload(history: readonly ChatMessage[]): AssistantTurn[] {
  const merged: AssistantTurn[] = [];
  for (const m of history) {
    const content = m.content.trim();
    if (!content) continue;
    const last = merged.at(-1);
    if (last && last.role === m.role) last.content = `${last.content}\n\n${content}`;
    else merged.push({ role: m.role, content });
  }
  while (merged.length && merged[merged.length - 1].role !== 'user') merged.pop();
  return merged
    .slice(-ASSISTANT_MAX_MESSAGES)
    .map(m => ({
      role: m.role,
      // Keep the newest part of a long user turn and the start of a long answer.
      content: (m.content.length > ASSISTANT_MAX_CHARS
        ? m.role === 'user' ? m.content.slice(-ASSISTANT_MAX_CHARS) : m.content.slice(0, ASSISTANT_MAX_CHARS)
        : m.content
      ).trim(),
    }))
    .filter(m => m.content.length > 0);
}

/** Strips the most common markdown markers so the reply reads as plain text (it is never rendered as HTML). */
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1');
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

/** Visually hidden but announced by screen readers. */
export const srOnly: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
};
