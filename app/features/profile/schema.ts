import { z } from 'zod';
import { COUNTRY_NAMES, type CountryCode } from '~/lib/countries';
import type { ProfileLocale } from './hooks';

// Client-side mirrors of the API validation (key-chain-api users.schemas.ts). Messages are
// `profile`-namespace keys (validation.*): translate them with t() where they are shown.

export const LOCALES = ['es', 'en'] as const satisfies readonly ProfileLocale[];

export const profileForm = z.object({
  displayName: z.union([
    z.literal(''),
    z.string().trim().min(2, 'validation.nameMin').max(80, 'validation.max80').regex(/^[^\p{Cc}]+$/u, 'validation.nameChars'),
  ]),
  email: z.union([z.literal(''), z.email('validation.email').max(200, 'validation.max200')]),
  country: z.union([z.literal(''), z.custom<CountryCode>(v => typeof v === 'string' && v in COUNTRY_NAMES, 'validation.country')]),
  locale: z.enum(LOCALES),
});
export type ProfileForm = z.infer<typeof profileForm>;

export const emailCode = z.string().regex(/^\d{6}$/, 'validation.codeDigits');

export const deletionReason = z.string().trim().max(500, 'validation.max500');
