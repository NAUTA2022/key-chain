import { useId, useRef, type CSSProperties } from 'react';
import { PInput } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { COUNTRY_NAMES, type CountryCode } from '~/lib/countries';
import { countryOptions } from '~/features/profile/api';
import { useT } from '~/i18n/useT';
import { BIO_MAX, type CompanyErrors, type CompanyForm } from './company';

// Company registration fields (razón social, tax id, country, website, short
// description, optional logo), shared by the onboarding and the Perfil section.

const labelText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--sec)' };
const hintText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' };
const errorText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' };
const fieldBox: CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: '12px 16px', border: '1.5px solid var(--border)', width: '100%',
  boxSizing: 'border-box', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', outline: 'none',
};

type Props = {
  form: CompanyForm;
  errors: CompanyErrors;
  onChange: <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => void;
  /** Current logo URL (editing an existing company). */
  logoUrl?: string | null;
};

export default function CompanyFields({ form, errors, onChange, logoUrl }: Props) {
  const { t, locale } = useT('profile');
  const isMobile = useMobile();
  const countryId = useId();
  const bioId = useId();
  const logoId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const err = (key: keyof CompanyForm) => errors[key] && <span role="alert" style={errorText}>{errors[key]}</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={labelText}>{t('company.fields.legalName')}</span>
          <PInput name="companyName" autoComplete="organization" maxLength={120} ariaLabel={t('company.fields.legalName')} placeholder={t('company.fields.legalNamePlaceholder')} value={form.name} onChange={e => onChange('name', e.target.value)} />
          {err('name')}
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={labelText}>{t('company.fields.taxId')}</span>
          <PInput name="taxId" maxLength={40} ariaLabel={t('company.fields.taxId')} placeholder={t('company.fields.taxIdPlaceholder')} value={form.taxId} onChange={e => onChange('taxId', e.target.value)} />
          {err('taxId')}
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <label htmlFor={countryId} style={labelText}>{t('company.fields.country')}</label>
          <select id={countryId} name="companyCountry" value={form.country}
            onChange={e => onChange('country', e.target.value in COUNTRY_NAMES ? (e.target.value as CountryCode) : '')}
            style={{ ...fieldBox, cursor: 'pointer', color: form.country ? 'var(--text)' : 'var(--ter)' }}>
            <option value="" disabled>{t('company.fields.selectCountry')}</option>
            {countryOptions(locale).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          {err('country')}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={labelText}>{t('company.fields.website')} <span style={{ fontWeight: 500, color: 'var(--ter)' }}>{t('company.fields.optional')}</span></span>
          <PInput name="website" type="url" autoComplete="url" maxLength={200} ariaLabel={t('company.fields.website')} placeholder={t('company.fields.websitePlaceholder')} value={form.website} onChange={e => onChange('website', e.target.value)} />
          {err('website')}
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor={bioId} style={labelText}>{t('company.fields.bio')}</label>
        <textarea id={bioId} name="bio" rows={4} maxLength={BIO_MAX} value={form.bio} placeholder={t('company.fields.bioPlaceholder')}
          onChange={e => onChange('bio', e.target.value)} style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.5 }} />
        <span style={{ ...hintText, alignSelf: 'flex-end' }}>{form.bio.length}/{BIO_MAX}</span>
        {err('bio')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelText} id={logoId}>{t('company.fields.logo')} <span style={{ fontWeight: 500, color: 'var(--ter)' }}>{t('company.fields.optional')}</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {logoUrl && !form.logo && <img src={logoUrl} alt={t('company.fields.currentLogo')} width={40} height={40} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-l)' }} />}
          <button type="button" aria-describedby={logoId} onClick={() => fileRef.current?.click()}
            style={{ ...fieldBox, width: 'auto', padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {form.logo ? t('company.fields.changeImage') : logoUrl ? t('company.fields.replaceLogo') : t('company.fields.chooseImage')}
          </button>
          <span style={{ ...hintText, overflowWrap: 'anywhere' }}>{form.logo ? form.logo.name : t('company.fields.logoHint')}</span>
          {form.logo && (
            <button type="button" onClick={() => { onChange('logo', null); if (fileRef.current) fileRef.current.value = ''; }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', textDecoration: 'underline' }}>
              {t('company.fields.remove')}
            </button>
          )}
          <input ref={fileRef} type="file" name="logo" accept="image/png,image/jpeg,image/webp" hidden onChange={e => onChange('logo', e.target.files?.[0] ?? null)} />
        </div>
        {err('logo')}
      </div>
    </div>
  );
}
