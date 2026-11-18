import { z } from 'zod';
import { COUNTRY_NAMES, type CountryCode } from '~/lib/countries';
import type { ProfileLocale } from './hooks';

// Client-side mirrors of the API validation (key-chain-api users.schemas.ts), Spanish messages.

export const LOCALES = ['es', 'en'] as const satisfies readonly ProfileLocale[];

export const profileForm = z.object({
  displayName: z.union([
    z.literal(''),
    z.string().trim().min(2, 'Ingresá al menos 2 caracteres.').max(80, 'Máximo 80 caracteres.').regex(/^[^\p{Cc}]+$/u, 'El nombre tiene caracteres no permitidos.'),
  ]),
  email: z.union([z.literal(''), z.email('Ingresá un email válido.').max(200, 'Máximo 200 caracteres.')]),
  country: z.union([z.literal(''), z.custom<CountryCode>(v => typeof v === 'string' && v in COUNTRY_NAMES, 'Elegí un país de la lista.')]),
  locale: z.enum(LOCALES),
});
export type ProfileForm = z.infer<typeof profileForm>;

export const emailCode = z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos.');

export const deletionReason = z.string().trim().max(500, 'Máximo 500 caracteres.');
