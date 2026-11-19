import { isProblem } from '~/lib/api/client';
import type { Translator } from '~/i18n/useT';

// Friendly messages for the onboarding and email verification API problems.
// The copy lives in the `help` dictionaries (`onboarding.messages.*`); callers pass their `t`.

type T = Translator['t'];

function reasonOf(e: unknown): string | undefined {
  return isProblem(e) && typeof e.reason === 'string' ? e.reason : undefined;
}

function issuePaths(e: unknown): string[] {
  if (!isProblem(e) || !Array.isArray(e.issues)) return [];
  return e.issues.flatMap((i: unknown) => (typeof i === 'object' && i !== null && 'path' in i && typeof i.path === 'string' ? [i.path] : []));
}

export function onboardingError(t: T, e: unknown): string {
  if (!isProblem(e)) return t('onboarding.messages.network');
  if (e.status === 401) return t('onboarding.messages.sessionExpired');
  if (e.status === 429) return t('onboarding.messages.tooManyAttempts');
  if (e.code === 'validation_failed') {
    const paths = issuePaths(e);
    if (paths.includes('termsVersion')) return t('onboarding.messages.termsUpdated');
    if (paths.includes('email')) return t('onboarding.messages.emailInvalid');
    if (paths.includes('displayName')) return t('onboarding.messages.nameInvalid');
    if (paths.includes('country')) return t('onboarding.messages.countryInvalid');
    return t('onboarding.messages.checkData');
  }
  return t('onboarding.messages.saveError');
}

export type SendOutcome =
  | { kind: 'sent'; sentTo: string; expiresInSeconds: number }
  | { kind: 'unavailable' }
  | { kind: 'verified' }
  | { kind: 'error'; message: string };

export function sendOutcome(t: T, e: unknown): SendOutcome {
  const reason = reasonOf(e);
  if (reason === 'email_unavailable') return { kind: 'unavailable' };
  if (reason === 'already_verified') return { kind: 'verified' };
  if (reason === 'no_email') return { kind: 'error', message: t('onboarding.messages.noEmail') };
  if (isProblem(e) && e.status === 429) return { kind: 'error', message: t('onboarding.messages.codesTooFast') };
  return { kind: 'error', message: isProblem(e) ? t('onboarding.messages.sendError') : t('onboarding.messages.network') };
}

export function confirmError(t: T, e: unknown): string {
  const reason = reasonOf(e);
  if (reason === 'invalid_code') {
    const left = isProblem(e) && typeof e.attemptsLeft === 'number' ? e.attemptsLeft : null;
    if (left === null) return t('onboarding.messages.codeWrong');
    if (left <= 0) return t('onboarding.messages.codeWrongNoAttempts');
    return left === 1 ? t('onboarding.messages.codeWrongLeft_one') : t('onboarding.messages.codeWrongLeft_other', { count: left });
  }
  if (reason === 'code_expired') return t('onboarding.messages.codeExpired');
  if (reason === 'too_many_attempts') return t('onboarding.messages.codeTooManyAttempts');
  if (reason === 'email_changed') return t('onboarding.messages.emailChanged');
  if (isProblem(e) && e.status === 429) return t('onboarding.messages.tooManyAttemptsRow');
  if (isProblem(e) && e.code === 'validation_failed') return t('onboarding.messages.codeDigits');
  return isProblem(e) ? t('onboarding.messages.verifyError') : t('onboarding.messages.network');
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
