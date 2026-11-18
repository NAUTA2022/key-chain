import { isProblem } from '~/lib/api/client';

// Friendly Spanish messages for the onboarding and email verification API problems.

const NETWORK = 'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.';

function reasonOf(e: unknown): string | undefined {
  return isProblem(e) && typeof e.reason === 'string' ? e.reason : undefined;
}

function issuePaths(e: unknown): string[] {
  if (!isProblem(e) || !Array.isArray(e.issues)) return [];
  return e.issues.flatMap((i: unknown) => (typeof i === 'object' && i !== null && 'path' in i && typeof i.path === 'string' ? [i.path] : []));
}

export function onboardingError(e: unknown): string {
  if (!isProblem(e)) return NETWORK;
  if (e.status === 401) return 'Tu sesión expiró. Volvé a conectar tu wallet para continuar.';
  if (e.status === 429) return 'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.';
  if (e.code === 'validation_failed') {
    const paths = issuePaths(e);
    if (paths.includes('termsVersion')) return 'Los términos se actualizaron. Recargá la página y aceptalos de nuevo.';
    if (paths.includes('email')) return 'El email no es válido.';
    if (paths.includes('displayName')) return 'El nombre no es válido: usá entre 2 y 80 caracteres.';
    if (paths.includes('country')) return 'Elegí un país de la lista.';
    return 'Revisá los datos e intentá de nuevo.';
  }
  return 'No pudimos guardar tus datos. Probá de nuevo en unos minutos.';
}

export type SendOutcome =
  | { kind: 'sent'; sentTo: string; expiresInSeconds: number }
  | { kind: 'unavailable' }
  | { kind: 'verified' }
  | { kind: 'error'; message: string };

export function sendOutcome(e: unknown): SendOutcome {
  const reason = reasonOf(e);
  if (reason === 'email_unavailable') return { kind: 'unavailable' };
  if (reason === 'already_verified') return { kind: 'verified' };
  if (reason === 'no_email') return { kind: 'error', message: 'Tu cuenta no tiene un email cargado. Podés agregarlo más tarde desde tu perfil.' };
  if (isProblem(e) && e.status === 429) return { kind: 'error', message: 'Pediste varios códigos seguidos. Esperá unos minutos antes de pedir otro.' };
  return { kind: 'error', message: isProblem(e) ? 'No pudimos enviar el código. Probá de nuevo en unos minutos.' : NETWORK };
}

export function confirmError(e: unknown): string {
  const reason = reasonOf(e);
  if (reason === 'invalid_code') {
    const left = isProblem(e) && typeof e.attemptsLeft === 'number' ? e.attemptsLeft : null;
    if (left === null) return 'El código no es correcto.';
    if (left <= 0) return 'El código no es correcto y no te quedan intentos. Pedí un código nuevo.';
    return `El código no es correcto. ${left === 1 ? 'Te queda 1 intento.' : `Te quedan ${left} intentos.`}`;
  }
  if (reason === 'code_expired') return 'El código venció o ya no es válido. Pedí uno nuevo.';
  if (reason === 'too_many_attempts') return 'Superaste los intentos permitidos. Pedí un código nuevo.';
  if (reason === 'email_changed') return 'Tu email cambió mientras verificabas. Pedí un código nuevo.';
  if (isProblem(e) && e.status === 429) return 'Hiciste demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.';
  if (isProblem(e) && e.code === 'validation_failed') return 'El código tiene 6 dígitos.';
  return isProblem(e) ? 'No pudimos verificar el código. Probá de nuevo.' : NETWORK;
}

export function isAlreadyVerified(e: unknown): boolean {
  return reasonOf(e) === 'already_verified';
}

/** The current code can no longer be used: the user has to request a new one. */
export function needsNewCode(e: unknown): boolean {
  const reason = reasonOf(e);
  if (reason === 'code_expired' || reason === 'too_many_attempts' || reason === 'email_changed') return true;
  return reason === 'invalid_code' && isProblem(e) && typeof e.attemptsLeft === 'number' && e.attemptsLeft <= 0;
}
