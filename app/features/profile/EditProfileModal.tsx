import { useId, useState } from 'react';
import { PBtn, PDiv } from '~/components/ui';
import { api } from '~/lib/api/client';
import { mediaUrl } from '~/lib/catalog';
import { COUNTRY_OPTIONS } from '~/lib/countries';
import { useSession, type SessionUser } from '~/lib/session';
import { call, errorText, IMAGE_TYPES, MB } from './api';
import EmailVerification from './EmailVerification';
import type { AvatarActions, UpdateProfileBody } from './hooks';
import { LOCALE_LABEL } from './hooks';
import { Field, FileButton, Modal, Notice, Select, TextInput } from './kit';
import { LOCALES, profileForm, type ProfileForm } from './schema';
import { mutedStyle } from './styles';

type Props = { open: boolean; onClose: () => void; avatar: AvatarActions };

/** "Editar perfil": name, email (re-verification), country, language and photo. */
export default function EditProfileModal({ open, onClose, avatar }: Props) {
  const { user } = useSession();
  return (
    <Modal open={open} onClose={onClose} title="Editar perfil" width={540}>
      {open && user && <EditForm key={user.id} user={user} onClose={onClose} avatar={avatar} />}
    </Modal>
  );
}

type Errors = Partial<Record<keyof ProfileForm, string>>;

function EditForm({ user, onClose, avatar }: { user: SessionUser; onClose: () => void; avatar: AvatarActions }) {
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
    if (form.displayName.trim() === '' && user.displayName) next.displayName = 'Ingresa tu nombre.';
    if (form.email.trim() === '' && user.email) next.email = 'Ingresa un email válido.';
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
    if (!data) return setError(errorText(e, 'No pudimos guardar los cambios. Revisa los datos.', { conflict: 'Ese email ya está en uso por otra cuenta.' }));
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
          <FileButton label={avatar.busy ? 'Subiendo…' : user.avatarUrl ? 'Cambiar foto' : 'Subir foto'} accept={IMAGE_TYPES} maxBytes={2 * MB} onFile={f => void avatar.upload(f)} onError={avatar.setError} disabled={avatar.busy} />
          {user.avatarUrl && <PBtn variant="ghost" small disabled={avatar.busy} onClick={e => { e.preventDefault(); void avatar.remove(); }}>Quitar foto</PBtn>}
        </div>
        <div style={{ ...mutedStyle, fontSize: 11.5, width: '100%' }}>PNG, JPG o WebP de hasta 2 MB.</div>
        {avatar.error && <Notice tone="error" style={{ width: '100%' }}>{avatar.error}</Notice>}
      </div>

      <PDiv />

      <Field label="Nombre visible" htmlFor={ids.name} error={errors.displayName}>
        <TextInput id={ids.name} name="displayName" autoComplete="name" maxLength={80} value={form.displayName} invalid={Boolean(errors.displayName)} onChange={e => set('displayName', e.target.value)} placeholder="Cómo quieres que te veamos" />
      </Field>

      <Field label="Email" htmlFor={ids.email} error={errors.email} hint={emailChanged && user.email ? 'Al cambiar el email vas a tener que verificarlo de nuevo.' : undefined}>
        <TextInput id={ids.email} name="email" type="email" autoComplete="email" maxLength={200} value={form.email} invalid={Boolean(errors.email)} onChange={e => set('email', e.target.value)} placeholder="tu@email.com" />
      </Field>
      {!emailChanged && <EmailVerification />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <Field label="País de residencia" htmlFor={ids.country} error={errors.country}>
          <Select id={ids.country} value={form.country} onChange={e => set('country', e.target.value as ProfileForm['country'])}>
            {form.country === '' && <option value="">Elige un país</option>}
            {COUNTRY_OPTIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </Select>
        </Field>
        <Field label="Idioma" htmlFor={ids.locale}>
          <Select id={ids.locale} value={form.locale} onChange={e => set('locale', LOCALES.find(l => l === e.target.value) ?? 'es')}>
            {LOCALES.map(l => <option key={l} value={l}>{LOCALE_LABEL[l]}</option>)}
          </Select>
        </Field>
      </div>

      {saved && <Notice tone="success">Guardamos tus cambios. Verifica tu nuevo email para recibir avisos.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <PBtn variant="secondary" small onClick={e => { e.preventDefault(); onClose(); }} disabled={saving}>{saved ? 'Listo' : 'Cancelar'}</PBtn>
        <PBtn variant="accent" small disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</PBtn>
      </div>
    </form>
  );
}
