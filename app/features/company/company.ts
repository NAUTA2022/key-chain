import { z } from 'zod';
import type { PTagColor } from '~/components/ui';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { COUNTRY_NAMES, type CountryCode } from '~/lib/countries';
import { call, checkFile, errorText, IMAGE_TYPES, MB, uploadFile, type ApiResult } from '~/features/profile/api';

// Self-service company accounts (live mode): form model, validation and the
// /v1/me/company calls shared by the onboarding and the Perfil section.

export type MyCompany = NonNullable<paths['/v1/me/company']['get']['responses'][200]['content']['application/json']['company']>;
export type CompanyStatus = MyCompany['status'];
type CreateBody = paths['/v1/me/company']['post']['requestBody']['content']['application/json'];

export type CompanyForm = { name: string; taxId: string; country: CountryCode | ''; website: string; bio: string; logo: File | null };
export type CompanyField = keyof CompanyForm;

export const BIO_MAX = 600;

export const emptyCompanyForm = (country?: string | null): CompanyForm => ({
  name: '',
  taxId: '',
  country: country && country in COUNTRY_NAMES ? (country as CountryCode) : '',
  website: '',
  bio: '',
  logo: null,
});

export const companyFormOf = (c: MyCompany): CompanyForm => ({
  name: c.name,
  taxId: c.taxId ?? '',
  country: c.country && c.country in COUNTRY_NAMES ? (c.country as CountryCode) : '',
  website: c.website ?? '',
  bio: c.bio ?? '',
  logo: null,
});

const isHttps = (v: string): boolean => {
  try {
    const url = new URL(v);
    return url.protocol === 'https:' && url.hostname.includes('.');
  } catch {
    return false;
  }
};

const companySchema = z.object({
  name: z.string().trim().min(2, 'Ingresá la razón social.').max(120, 'Usá como máximo 120 caracteres.'),
  taxId: z.string().trim()
    .min(4, 'Ingresá la identificación tributaria.')
    .max(40, 'Usá como máximo 40 caracteres.')
    .regex(/^[A-Za-z0-9][A-Za-z0-9.\-/ ]*$/, 'Usá solo letras, números, puntos, guiones o barras.')
    .refine(v => /\d/.test(v), 'La identificación debe incluir números.'),
  country: z.string().refine(v => v in COUNTRY_NAMES, 'Elegí el país de la empresa.').transform(v => v as CountryCode),
  website: z.string().trim().max(200, 'El enlace es demasiado largo.').refine(v => v === '' || isHttps(v), 'Usá un enlace que empiece con https://'),
  bio: z.string().trim().min(10, 'Contá en al menos 10 caracteres qué hace tu empresa.').max(BIO_MAX, `Usá como máximo ${BIO_MAX} caracteres.`),
});

export type CompanyErrors = Partial<Record<CompanyField, string>>;

/** Validates the form; returns the API body or the Spanish error of each field. */
export function parseCompanyForm(form: CompanyForm): { body: CreateBody; errors: null } | { body: null; errors: CompanyErrors } {
  const errors: CompanyErrors = {};
  const logoError = form.logo ? checkFile(form.logo, { types: IMAGE_TYPES, maxBytes: 5 * MB }) : null;
  if (logoError) errors.logo = logoError;
  const parsed = companySchema.safeParse(form);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && key in form && !errors[key as CompanyField]) errors[key as CompanyField] = issue.message;
    }
  }
  if (!parsed.success || logoError) return { body: null, errors };
  const { website, ...rest } = parsed.data;
  return { body: website ? { ...rest, website } : rest, errors: null };
}

const COMPANY_ERRORS: Record<string, string> = {
  company_exists: 'Tu cuenta ya tiene una empresa registrada.',
  company_verified: 'Tu empresa ya está verificada: editá su perfil desde la página de la empresa.',
  validation_failed: 'Revisá los datos de la empresa.',
  not_found: 'No encontramos tu empresa. Recargá la página.',
};

export const companyErrorText = (error: unknown): string => errorText(error, 'No pudimos guardar la empresa. Probá de nuevo.', COMPANY_ERRORS);

export function loadMyCompany(): Promise<ApiResult<MyCompany | null>> {
  return call(api.GET('/v1/me/company')).then(r => ({ data: r.data ? r.data.company : null, error: r.error }));
}

/**
 * Registers the company (or updates/resubmits the existing one) and uploads the logo if one was picked.
 * A failed logo upload keeps the saved company and reports `logoError`.
 */
export async function saveCompany(body: CreateBody, logo: File | null, existing: MyCompany | null): Promise<{ company: MyCompany | null; error: string | null; logoError: string | null }> {
  const saved = existing
    ? await call(api.PATCH('/v1/me/company', { body: { ...body, website: body.website ?? '' } }))
    : await call(api.POST('/v1/me/company', { body }));
  if (!saved.data) return { company: null, error: companyErrorText(saved.error), logoError: null };
  if (!logo) return { company: saved.data, error: null, logoError: null };
  const up = await uploadFile<{ logoUrl: string | null }>(`/v1/companies/${saved.data.slug}/logo`, logo);
  return up.data
    ? { company: { ...saved.data, logoUrl: up.data.logoUrl }, error: null, logoError: null }
    : { company: saved.data, error: null, logoError: errorText(up.error, 'La empresa se guardó, pero no pudimos subir el logo.') };
}

export const COMPANY_STATUS: Record<CompanyStatus, { label: string; color: PTagColor }> = {
  pending: { label: 'Pendiente de verificación', color: 'blue' },
  rejected: { label: 'Rechazada', color: 'red' },
  verified: { label: 'Verificada', color: 'green' },
};
