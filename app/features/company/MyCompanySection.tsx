import { useState, type CSSProperties, type FormEvent } from 'react';
import { PBtn, PCard, PTag } from '~/components/ui';
import KycLive from '~/features/kyc/KycLive';
import { countryLabel, useApi } from '~/features/profile/api';
import { Notice, Skeleton } from '~/features/profile/kit';
import { useMobile } from '~/hooks/useMobile';
import { mediaUrl } from '~/lib/catalog';
import type { NavFn } from '~/lib/navigation';
import { useT } from '~/i18n/useT';
import { useSession } from '~/lib/session';
import CompanyFields from './CompanyFields';
import {
  COMPANY_STATUS,
  companyFormOf,
  emptyCompanyForm,
  loadMyCompany,
  parseCompanyForm,
  saveCompany,
  type CompanyErrors,
  type CompanyForm,
  type MyCompany,
} from './company';

// Perfil → "Mi empresa" (live mode only): register a company, follow its
// verification (pending / rejected with reason / verified), complete the KYB
// and jump to the tokenization wizard.

const cardTitle: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' };
const cardSub: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.55, margin: 0 };
const rowLabel: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' };
const rowValue: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' };

function CompanyEditor({ initial, existing, onSaved, onCancel }: { initial: CompanyForm; existing: MyCompany | null; onSaved: (c: MyCompany) => void; onCancel?: () => void }) {
  const { t } = useT('profile');
  const isMobile = useMobile();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const full = isMobile ? { width: '100%' } : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const parsed = parseCompanyForm(form, t);
    if (parsed.errors) return setErrors(parsed.errors);
    setErrors({});
    setApiError(null);
    setSaving(true);
    const r = await saveCompany(parsed.body, form.logo, existing, t);
    setSaving(false);
    if (!r.company) return setApiError(r.error);
    if (r.logoError) setApiError(r.logoError);
    onSaved(r.company);
  }

  const label = !existing ? t('company.section.submit') : existing.status === 'rejected' ? t('company.section.resubmit') : t('company.section.saveChanges');
  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CompanyFields form={form} errors={errors} logoUrl={existing?.logoUrl ? mediaUrl(existing.logoUrl) : null}
        onChange={(key, value) => { setForm(f => ({ ...f, [key]: value })); setErrors(er => ({ ...er, [key]: undefined })); }} />
      {apiError && <Notice tone="error">{apiError}</Notice>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        {onCancel && <PBtn variant="ghost" onClick={e => { e.preventDefault(); onCancel(); }} style={full}>{t('company.section.cancel')}</PBtn>}
        <PBtn variant="accent" disabled={saving} style={full}>{saving ? t('company.section.sending') : label}</PBtn>
      </div>
    </form>
  );
}

/** `profile` key of the status explanation. */
function statusKey(c: MyCompany): string {
  if (c.status === 'verified') return 'company.section.statusVerified';
  if (c.status === 'rejected') return 'company.section.statusRejected';
  return c.kyb.status === 'pending' || c.kyb.status === 'verified'
    ? 'company.section.statusReviewing'
    : 'company.section.statusNeedsKyb';
}

export default function MyCompanySection({ nav }: { nav: NavFn }) {
  const { t, locale } = useT('profile');
  const isMobile = useMobile();
  const { user, refresh } = useSession();
  const { data: company, loading, error, reload, mutate } = useApi<MyCompany | null>('me-company', loadMyCompany);
  const [editing, setEditing] = useState(false);
  const [registering, setRegistering] = useState(false);

  const onSaved = (c: MyCompany) => {
    mutate(c);
    setEditing(false);
    setRegistering(false);
    void refresh();
  };

  if (loading && company === null && !error) return <PCard style={{ padding: '22px 24px' }}><Skeleton rows={4} /></PCard>;
  if (error) return <PCard style={{ padding: '22px 24px' }}><Notice tone="error">{t('company.section.loadError')} <PBtn variant="secondary" small onClick={reload}>{t('company.section.retry')}</PBtn></Notice></PCard>;

  if (!company) {
    return (
      <PCard style={{ padding: isMobile ? '20px 18px' : '24px 26px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: registering ? 18 : 0 }}>
          <h2 style={{ ...cardTitle, margin: 0 }}>{t('company.section.registerTitle')}</h2>
          <p style={cardSub}>{t('company.section.registerText')}</p>
          {!registering && (
            <div style={{ marginTop: 8 }}>
              <PBtn variant="accent" onClick={() => setRegistering(true)}>{t('company.section.register')}</PBtn>
            </div>
          )}
        </div>
        {registering && <CompanyEditor initial={emptyCompanyForm(user?.country)} existing={null} onSaved={onSaved} onCancel={() => setRegistering(false)} />}
      </PCard>
    );
  }

  const tag = COMPANY_STATUS[company.status];
  const editable = company.selfRegistered && company.status !== 'verified';
  const rows: Array<[string, string]> = [
    [t('company.fields.legalName'), company.name],
    [t('company.fields.taxId'), company.taxId ?? '—'],
    [t('company.section.country'), countryLabel(company.country, locale)],
    [t('company.fields.website'), company.website ?? '—'],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PCard style={{ padding: isMobile ? '20px 18px' : '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          {company.logoUrl
            ? <img src={mediaUrl(company.logoUrl)} alt="" width={48} height={48} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border-l)' }} />
            : <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--sec)' }}>{company.name.slice(0, 1)}</span>}
          <div style={{ flex: 1, minWidth: 160 }}>
            <h2 style={{ ...cardTitle, margin: 0, overflowWrap: 'anywhere' }}>{company.name}</h2>
            <div style={{ marginTop: 6 }}><PTag label={t(tag.labelKey)} color={tag.color} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : undefined }}>
            <PBtn variant="secondary" small onClick={() => nav('empresa', company.slug)}>{t('company.section.viewPage')}</PBtn>
            <PBtn variant="accent" small onClick={() => nav('wizard')}>{t('company.section.tokenize')}</PBtn>
          </div>
        </div>

        {company.status === 'rejected' && company.rejectionReason && (
          <Notice tone="error" style={{ marginBottom: 12 }}>{t('company.section.rejectedReason', { reason: company.rejectionReason })}</Notice>
        )}
        <p style={{ ...cardSub, marginBottom: 16 }} role="status">{t(statusKey(company))}</p>

        {editing ? (
          <CompanyEditor initial={companyFormOf(company)} existing={company} onSaved={onSaved} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border-l)', paddingBottom: 10 }}>
                  <span style={rowLabel}>{k}</span>
                  <span style={rowValue}>{v}</span>
                </div>
              ))}
              {company.bio && <p style={{ ...cardSub, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{company.bio}</p>}
            </div>
            {editable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <PBtn variant="secondary" small onClick={() => setEditing(true)}>{company.status === 'rejected' ? t('company.section.fixData') : t('company.section.editData')}</PBtn>
              </div>
            )}
          </>
        )}
      </PCard>

      {company.selfRegistered && (
        <section aria-label={t('company.section.kybTitle')} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <h3 style={{ ...cardTitle, margin: 0 }}>{t('company.section.kybTitle')}</h3>
            <p style={{ ...cardSub, fontSize: 13 }}>
              {company.kyb.status === 'none' || company.kyb.status === 'rejected'
                ? t('company.section.kybTodo')
                : t('company.section.kybSent')}
            </p>
          </div>
          <KycLive key={company.id} onSubmitted={reload}
            initial={{ type: 'business', legalName: company.name, documentId: (company.taxId ?? '').replace(/[^A-Za-z0-9.\- ]/g, ''), country: company.country }} />
        </section>
      )}
    </div>
  );
}
