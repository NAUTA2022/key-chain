import { isProblem } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { errorText, MB } from '~/features/profile/api';

// Types and IO helpers for /v1/tokenization-requests (no components here).

export type TokenizationRequest = paths['/v1/tokenization-requests']['get']['responses'][200]['content']['application/json'][number];
export type TokenizationRequestDetail = paths['/v1/tokenization-requests/{id}']['get']['responses'][200]['content']['application/json'];
export type RequestDocument = TokenizationRequestDetail['documents'][number];
export type RequestStatus = TokenizationRequest['status'];

/** Server limits: documents per request and bytes per document. */
export const MAX_DOCUMENTS = 10;
export const MAX_DOCUMENT_BYTES = 10 * MB;

/** Documents can still be added while the team has not resolved the request. */
export function isOpen(status: RequestStatus): boolean {
  return status === 'submitted' || status === 'in_review' || status === 'changes_requested';
}

export function documentsPath(id: string): string {
  return `/v1/tokenization-requests/${encodeURIComponent(id)}/documents`;
}

/** Spanish message for a failed document upload. */
export function uploadErrorText(error: unknown): string {
  if (isProblem(error) && error.code === 'conflict') {
    return 'max' in error
      ? `Llegaste al máximo de ${MAX_DOCUMENTS} documentos para esta solicitud.`
      : 'La solicitud ya fue resuelta y no admite más documentos.';
  }
  return errorText(error, 'No pudimos subir el archivo. Probá de nuevo.', {
    bad_request: 'El archivo no es válido. Usá PDF, PNG, JPG o WebP.',
    payload_too_large: 'El archivo supera el máximo de 10 MB.',
    not_found: 'No encontramos la solicitud.',
    rate_limited: 'Subiste muchos archivos seguidos. Esperá un rato y volvé a probar.',
  });
}

/** True when the upload failed because the request is no longer open (approved/rejected). */
export function isClosedConflict(error: unknown): boolean {
  return isProblem(error) && error.code === 'conflict' && !('max' in error);
}

/** Spanish message for a failed POST /v1/tokenization-requests. */
export function submitErrorText(error: unknown): string {
  return errorText(error, 'No pudimos enviar la solicitud. Probá de nuevo en unos minutos.', {
    validation_failed: 'Hay datos que el servidor no aceptó. Revisá los campos marcados.',
    rate_limited: 'Llegaste al límite de solicitudes por hoy. Probá de nuevo mañana.',
  });
}

/** Field names rejected by the server (422 `issues[].path`). */
export function rejectedFields(error: unknown): string[] {
  if (!isProblem(error) || error.code !== 'validation_failed' || !Array.isArray(error.issues)) return [];
  const out: string[] = [];
  for (const issue of error.issues as unknown[]) {
    if (typeof issue === 'object' && issue !== null && 'path' in issue && typeof issue.path === 'string') out.push(issue.path.split('.')[0]);
  }
  return out;
}

// ─── Formatting (es-AR, the same convention the form accepts) ────────────────

export function fmtMoney(n: number, maxDecimals = 2): string {
  return `US$ ${n.toLocaleString('es-AR', { maximumFractionDigits: maxDecimals })}`;
}

export function fmtCount(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export function fmtPercent(n: number): string {
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`;
}
