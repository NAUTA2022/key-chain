import { useId, useState } from 'react';
import { PBtn } from '~/components/ui';
import { CompanyLogo } from '~/components/social/IdentityAvatar';
import { Field, FileButton, Modal, Notice, TextArea, TextInput } from '~/features/profile/kit';
import type { CompanyImageKind, CompanyProfile, SocialSource } from '~/lib/social/types';
import { useT } from '~/i18n/useT';

// Live: the company owner (or an admin) edits the public profile — name, bio,
// logo and cover banner — through PATCH /v1/companies/:slug and the image
// uploads. Same dialog kit as "Editar perfil" of the personal profile.

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_IMAGE = 5 * 1024 * 1024;
const BIO_MAX = 600;

type Props = {
  open: boolean;
  onClose: () => void;
  profile: CompanyProfile;
  source: SocialSource;
};

export default function CompanyEditModal({ open, onClose, profile, source }: Props) {
  const { t } = useT('profile');
  return (
    <Modal open={open} onClose={onClose} title={t('social.companyEdit.title')} width={560}>
      {open && <EditForm key={profile.slug} profile={profile} source={source} onClose={onClose} />}
    </Modal>
  );
}

function EditForm({ profile, source, onClose }: { profile: CompanyProfile; source: SocialSource; onClose: () => void }) {
  const { t } = useT('profile');
  const ids = { name: useId(), bio: useId() };
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [saving, setSaving] = useState(false);
  const [busyImage, setBusyImage] = useState<CompanyImageKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The images apply at once; keep the fresh profile to preview them.
  const [current, setCurrent] = useState(profile);

  const image = (kind: CompanyImageKind, file: File | null) => {
    if (!source.setCompanyImage) return;
    setBusyImage(kind);
    setError(null);
    source.setCompanyImage(profile.slug, kind, file).then(
      fresh => { setCurrent(fresh); setBusyImage(null); },
      (e: unknown) => { setError(e instanceof Error ? e.message : t('social.companyEdit.imageError')); setBusyImage(null); },
    );
  };

  const save = () => {
    if (!source.updateCompany) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return setError(t('social.companyEdit.nameMin'));
    const edit = {
      ...(trimmedName !== profile.name ? { name: trimmedName } : {}),
      ...(bio.trim() !== profile.bio ? { bio: bio.trim() || null } : {}),
    };
    if (!Object.keys(edit).length) return onClose();
    setSaving(true);
    setError(null);
    source.updateCompany(profile.slug, edit).then(
      () => { setSaving(false); onClose(); },
      (e: unknown) => { setSaving(false); setError(e instanceof Error ? e.message : t('social.companyEdit.saveError')); },
    );
  };

  const banner = current.live?.bannerUrl ?? null;
  const sub = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' } as const;

  return (
    <form noValidate onSubmit={e => { e.preventDefault(); save(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <CompanyLogo company={current.name} logoUrl={current.logoUrl} size={56} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <FileButton label={busyImage === 'logo' ? t('social.companyEdit.uploading') : current.logoUrl ? t('social.companyEdit.changeLogo') : t('social.companyEdit.uploadLogo')} accept={IMAGE_TYPES} maxBytes={MAX_IMAGE}
            onFile={f => image('logo', f)} onError={setError} disabled={busyImage !== null} />
          {current.logoUrl && <PBtn variant="ghost" small disabled={busyImage !== null} onClick={e => { e.preventDefault(); image('logo', null); }}>{t('social.companyEdit.removeLogo')}</PBtn>}
        </div>
        <span style={sub}>{t('social.companyEdit.imageHint')}</span>
      </div>

      {/* Cover banner */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative', height: 96, borderRadius: 14, overflow: 'hidden', background: 'var(--surface2)' }}>
          <img src={current.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.3) brightness(0.72)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <FileButton label={busyImage === 'banner' ? t('social.companyEdit.uploading') : banner ? t('social.companyEdit.changeCover') : t('social.companyEdit.uploadCover')} accept={IMAGE_TYPES} maxBytes={MAX_IMAGE}
            onFile={f => image('banner', f)} onError={setError} disabled={busyImage !== null} />
          {banner && <PBtn variant="ghost" small disabled={busyImage !== null} onClick={e => { e.preventDefault(); image('banner', null); }}>{t('social.companyEdit.removeCover')}</PBtn>}
          {!banner && <span style={sub}>{t('social.companyEdit.coverHint')}</span>}
        </div>
      </div>

      <Field label={t('social.companyEdit.name')} htmlFor={ids.name}>
        <TextInput id={ids.name} value={name} onChange={e => setName(e.target.value)} maxLength={120} required />
      </Field>
      <Field label={t('social.companyEdit.description')} htmlFor={ids.bio} hint={t('social.companyEdit.chars', { count: bio.length, max: BIO_MAX })}>
        <TextArea id={ids.bio} value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={BIO_MAX} placeholder={t('social.companyEdit.bioPlaceholder')} />
      </Field>

      {error && <Notice tone="error">{error}</Notice>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <PBtn variant="secondary" small onClick={e => { e.preventDefault(); onClose(); }}>{t('social.companyEdit.cancel')}</PBtn>
        <PBtn variant="accent" small disabled={saving} onClick={e => { e.preventDefault(); save(); }}>{saving ? t('social.companyEdit.saving') : t('social.companyEdit.save')}</PBtn>
      </div>
    </form>
  );
}
