import { useId, useState } from 'react';
import { PBtn, PDiv } from '~/components/ui';
import { api } from '~/lib/api/client';
import { mediaUrl } from '~/lib/catalog';
import { useT } from '~/i18n/useT';
import { COUNTRY_OPTIONS } from '~/lib/countries';
import { useSession, type SessionUser } from '~/lib/session';
import { call, countryOptions, errorText, IMAGE_TYPES, MB } from './api';
import EmailVerification from './EmailVerification';
import type { AvatarActions, UpdateProfileBody } from './hooks';
import { LOCALE_LABEL } from './hooks';
import { Field, FileButton, Modal, Notice, Select, TextInput } from './kit';
import { LOCALES, profileForm, type ProfileForm } from './schema';
import { mutedStyle } from './styles';

type Props = { open: boolean; onClose: () => void; avatar: AvatarActions };

/** "Editar perfil": name, email (re-verification), country, language and photo. */
export default function EditProfileModal({ open, onClose, avatar }: Props) {
  const { t } = useT('profile');
  const { user } = useSession();
  return (
    <Modal open={open} onClose={onClose} title={t('edit.title')} width={540}>
      {open && user && <EditForm key={user.id} user={user} onClose={onClose} avatar={avatar} />}
    </Modal>
  );
}

type Errors = Partial<Record<keyof ProfileForm, string>>;

function EditForm({ user, onClose, avatar }: { user: SessionUser; onClose: () => void; avatar: AvatarActions }) {
  const { t, locale } = useT('profile');
  const { refresh } = useSession();
  const ids = { name: useId(), email: useId(), country: useId(), locale: useId() };
  const [form, setForm] = useState<ProfileForm>(() => ({
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    country: COUNTRY_OPTIONS.some(([c]) => c === user.country) ? (user.country as ProfileForm['country']) : '',
    locale: LOCALES.find(l => l === user.locale) ?? 'es',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
    setSaved(false);
  };

  async function save() {
    const parsed = profileForm.safeParse(form);
    const next: Errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const k = issue.path[0];
        if (typeof k === 'string' && !(k in next)) next[k as keyof ProfileForm] = issue.message;
      }
    }
    if (form.displayName.trim() === '' && user.displayName) next.displayName = 'validation.nameRequired';
    if (form.email.trim() === '' && user.email) next.email = 'validation.email';
    setErrors(next);
    if (!parsed.success || Object.keys(next).length) return;

    const v = parsed.data;
    const body: UpdateProfileBody = {};
    if (v.displayName && v.displayName !== (user.displayName ?? '')) body.displayName = v.displayName;
    if (v.email && v.email.toLowerCase() !== (user.email ?? '').toLowerCase()) body.email = v.email;
    if (v.country && v.country !== user.country) body.country = v.country;
    if (v.locale !== user.locale) body.locale = v.locale;
    if (!Object.keys(body).length) return onClose();

    setSaving(true);
    setError(null);
    const { data, error: e } = await call(api.PATCH('/v1/me', { body }));
    setSaving(false);
    if (!data) return setError(errorText(e, t('edit.errors.save'), { conflict: t('edit.errors.emailInUse') }, t));
    await refresh();
    // A new email must be verified again: keep the dialog open so the user can do it now.
    if (body.email) setSaved(true);
    else onClose();
  }

  const emailChanged = form.email.trim().toLowerCase() !== (user.email ?? '').toLowerCase();

  return (
    <form
      noValidate
      onSubmit={e => {
        e.preventDefault();
        void save();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Photo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div aria-hidden="true" style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #8247E5, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 22, color: '#fff', flexShrink: 0 }}>
          {user.avatarUrl ? <img src={mediaUrl(user.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.displayName || user.walletAddress.slice(2) || 'U')[0].toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <FileButton label={avatar.busy ? t('edit.uploading') : user.avatarUrl ? t('edit.changePhoto') : t('edit.uploadPhoto')} accept={IMAGE_TYPES} maxBytes={2 * MB} onFile={f => void avatar.upload(f)} onError={avatar.setError} disabled={avatar.busy} />
          {user.avatarUrl && <PBtn variant="ghost" small disabled={avatar.busy} onClick={e => { e.preventDefault(); void avatar.remove(); }}>{t('edit.removePhoto')}</PBtn>}
        </div>
        <div style={{ ...mutedStyle, fontSize: 11.5, width: '100%' }}>{t('edit.photoHint')}</div>
        {avatar.error && <Notice tone="error" style={{ width: '100%' }}>{avatar.error}</Notice>}
      </div>

      <PDiv />

      <Field label={t('edit.name')} htmlFor={ids.name} error={errors.displayName && t(errors.displayName)}>
        <TextInput id={ids.name} name="displayName" autoComplete="name" maxLength={80} value={form.displayName} invalid={Boolean(errors.displayName)} onChange={e => set('displayName', e.target.value)} placeholder={t('edit.namePlaceholder')} />
      </Field>

      <Field label={t('edit.email')} htmlFor={ids.email} error={errors.email && t(errors.email)} hint={emailChanged && user.email ? t('edit.emailChangeHint') : undefined}>
        <TextInput id={ids.email} name="email" type="email" autoComplete="email" maxLength={200} value={form.email} invalid={Boolean(errors.email)} onChange={e => set('email', e.target.value)} placeholder={t('edit.emailPlaceholder')} />
      </Field>
      {!emailChanged && <EmailVerification />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Field label={t('edit.country')} htmlFor={ids.country} error={errors.country && t(errors.country)}>
          <Select id={ids.country} value={form.country} onChange={e => set('country', e.target.value as ProfileForm['country'])}>
            {form.country === '' && <option value="">{t('edit.chooseCountry')}</option>}
            {countryOptions(locale).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </Select>
        </Field>
        <Field label={t('edit.language')} htmlFor={ids.locale}>
          <Select id={ids.locale} value={form.locale} onChange={e => set('locale', LOCALES.find(l => l === e.target.value) ?? 'es')}>
            {LOCALES.map(l => <option key={l} value={l}>{LOCALE_LABEL[l]}</option>)}
          </Select>
        </Field>
      </div>

      {saved && <Notice tone="success">{t('edit.saved')}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <PBtn variant="secondary" small onClick={e => { e.preventDefault(); onClose(); }} disabled={saving}>{saved ? t('edit.done') : t('edit.cancel')}</PBtn>
        <PBtn variant="accent" small disabled={saving}>{saving ? t('edit.saving') : t('edit.save')}</PBtn>
      </div>
    </form>
  );
}
