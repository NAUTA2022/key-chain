import { z } from 'zod';
import type { PTagColor } from '~/components/ui';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { COUNTRY_NAMES, type CountryCode } from '~/lib/countries';
import { call, checkFile, errorText, IMAGE_TYPES, MB, profileSourceT, uploadFile, type ApiResult, type ProfileT } from '~/features/profile/api';

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

// Messages are `profile` keys, translated in parseCompanyForm.
const companySchema = z.object({
  name: z.string().trim().min(2, 'company.errors.nameRequired').max(120, 'company.errors.max120'),
  taxId: z.string().trim()
    .min(4, 'company.errors.taxIdRequired')
    .max(40, 'company.errors.max40')
    .regex(/^[A-Za-z0-9][A-Za-z0-9.\-/ ]*$/, 'company.errors.taxIdChars')
    .refine(v => /\d/.test(v), 'company.errors.taxIdDigits'),
  country: z.string().refine(v => v in COUNTRY_NAMES, 'company.errors.country').transform(v => v as CountryCode),
  website: z.string().trim().max(200, 'company.errors.websiteLong').refine(v => v === '' || isHttps(v), 'company.errors.websiteHttps'),
  bio: z.string().trim().min(10, 'company.errors.bioMin').max(BIO_MAX, 'company.errors.bioMax'),
});

export type CompanyErrors = Partial<Record<CompanyField, string>>;

/** Validates the form; returns the API body or the error of each field (`t`: profile translator; Spanish without it). */
export function parseCompanyForm(form: CompanyForm, t: ProfileT = profileSourceT): { body: CreateBody; errors: null } | { body: null; errors: CompanyErrors } {
  const errors: CompanyErrors = {};
  const logoError = form.logo ? checkFile(form.logo, { types: IMAGE_TYPES, maxBytes: 5 * MB }, t) : null;
  if (logoError) errors.logo = logoError;
  const parsed = companySchema.safeParse(form);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && key in form && !errors[key as CompanyField]) errors[key as CompanyField] = t(issue.message, { max: BIO_MAX });
    }
  }
  if (!parsed.success || logoError) return { body: null, errors };
  const { website, ...rest } = parsed.data;
  return { body: website ? { ...rest, website } : rest, errors: null };
}

/** API reason → `profile` key. */
const COMPANY_ERRORS: Record<string, string> = {
  company_exists: 'company.errors.exists',
  company_verified: 'company.errors.alreadyVerified',
  validation_failed: 'company.errors.validation',
  not_found: 'company.errors.notFound',
};

export const companyErrorText = (error: unknown, t: ProfileT = profileSourceT): string =>
  errorText(error, t('company.errors.saveFailed'), Object.fromEntries(Object.entries(COMPANY_ERRORS).map(([k, key]) => [k, t(key)])), t);

export function loadMyCompany(): Promise<ApiResult<MyCompany | null>> {
  return call(api.GET('/v1/me/company')).then(r => ({ data: r.data ? r.data.company : null, error: r.error }));
}

/**
 * Registers the company (or updates/resubmits the existing one) and uploads the logo if one was picked.
 * A failed logo upload keeps the saved company and reports `logoError`.
 */
export async function saveCompany(body: CreateBody, logo: File | null, existing: MyCompany | null, t: ProfileT = profileSourceT): Promise<{ company: MyCompany | null; error: string | null; logoError: string | null }> {
  const saved = existing
    ? await call(api.PATCH('/v1/me/company', { body: { ...body, website: body.website ?? '' } }))
    : await call(api.POST('/v1/me/company', { body }));
  if (!saved.data) return { company: null, error: companyErrorText(saved.error, t), logoError: null };
  if (!logo) return { company: saved.data, error: null, logoError: null };
  const up = await uploadFile<{ logoUrl: string | null }>(`/v1/companies/${saved.data.slug}/logo`, logo);
  return up.data
    ? { company: { ...saved.data, logoUrl: up.data.logoUrl }, error: null, logoError: null }
    : { company: saved.data, error: null, logoError: errorText(up.error, t('company.errors.logoFailed'), {}, t) };
}

/** Status tag: `labelKey` is a `profile` key. */
export const COMPANY_STATUS: Record<CompanyStatus, { labelKey: string; color: PTagColor }> = {
  pending: { labelKey: 'company.status.pending', color: 'blue' },
  rejected: { labelKey: 'company.status.rejected', color: 'red' },
  verified: { labelKey: 'company.status.verified', color: 'green' },
};
