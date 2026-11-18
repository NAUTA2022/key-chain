import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PAvatar, PBtn, PTag } from '~/components/ui';
import { kycStatusTag } from '~/features/kyc/status';
import { useMobile } from '~/hooks/useMobile';
import { mediaUrl } from '~/lib/catalog';
import { useSession } from '~/lib/session';
import { fmtDate, IMAGE_TYPES } from './api';
import EditProfileModal from './EditProfileModal';
import { useAvatarActions, type Stats } from './hooks';
import { CopyButton } from './kit';

// Live profile header: real photo (upload from the camera badge), name, KYC/level tags,
// wallet with copy, email status and member-since date. Same layout as the demo header.

const RING = 'linear-gradient(135deg, #8247E5, #3b82f6)';

function LiveAvatar({ name, url, size, busy, onPick }: { name: string; url: string | null; size: number; busy: boolean; onPick: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const total = size + 7;
  return (
    <div style={{ position: 'relative', width: total, height: total }}>
      {url ? (
        <div style={{ width: total, height: total, borderRadius: '50%', background: RING, padding: 2, boxSizing: 'border-box' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0d0d0f', padding: 1.5, boxSizing: 'border-box' }}>
            <img src={mediaUrl(url)} alt={`Foto de ${name}`} width={size} height={size} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
          </div>
        </div>
      ) : (
        <PAvatar name={name} size={size} gradient={RING} />
      )}
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPick(f);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={url ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
        title={url ? 'Cambiar foto' : 'Subir foto'}
        style={{
          position: 'absolute', right: 0, bottom: 2, width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--bg)',
          background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: busy ? 'wait' : 'pointer', zIndex: 2, padding: 0, opacity: busy ? 0.6 : 1,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}

export default function ProfileHeaderLive({ stats }: { stats: Stats | null }) {
  const isMobile = useMobile();
  const { user } = useSession();
  const avatar = useAvatarActions();
  const [editing, setEditing] = useState(false);
  if (!user) return null;

  const wallet = user.walletAddress;
  const shortWallet = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  const name = user.displayName || shortWallet;
  const tag = kycStatusTag(user.kycStatus);
  const since = stats?.memberSince ?? user.createdAt;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 14 : 22, marginTop: -44, flexWrap: isMobile ? 'wrap' : undefined }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
          <LiveAvatar name={(user.displayName || wallet.slice(2) || 'U')} url={user.avatarUrl} size={84} busy={avatar.busy} onPick={f => void avatar.upload(f)} />
        </motion.div>

        <div style={{ flex: 1, paddingBottom: 4, minWidth: isMobile ? '100%' : 0, order: isMobile ? 3 : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: isMobile ? 22 : 26, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0, overflowWrap: 'anywhere' }}>{name}</h1>
            <PTag label={user.kycStatus === 'verified' ? 'KYC ✓' : `KYC · ${tag.label}`} color={tag.color} />
            {stats && <PTag label={`Nivel ${stats.level.level} · ${stats.level.name}`} color="purple" />}
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span title={wallet} style={{ fontVariantNumeric: 'tabular-nums' }}>{shortWallet}</span>
            <CopyButton value={wallet} label="Copiar" />
            {user.email && (
              <>
                <span aria-hidden="true">·</span>
                <span style={{ overflowWrap: 'anywhere' }}>{user.email}</span>
                {!user.emailVerified && (
                  <button type="button" onClick={() => setEditing(true)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} aria-label="Verificar email">
                    <PTag label="Sin verificar" color="neutral" />
                  </button>
                )}
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>Miembro desde {fmtDate(since, { month: 'long', year: 'numeric' })}</span>
          </div>
          {avatar.error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)', marginTop: 6 }}>{avatar.error}</div>}
        </div>
        <PBtn variant="secondary" small style={{ marginBottom: 6, ...(isMobile ? { marginLeft: 'auto', order: 2 } : null) }} onClick={() => setEditing(true)}>Editar perfil</PBtn>
      </div>
      <EditProfileModal open={editing} onClose={() => setEditing(false)} avatar={avatar} />
    </>
  );
}
