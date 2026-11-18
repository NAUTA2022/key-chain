import { useState } from 'react';
import { api } from '~/lib/api/client';
import { errorText, unwrap, useApiData, useDebounced } from './api';
import { sub } from './styles';
import type { AdminIssuer } from './types';
import { Btn, Check, Notice, Panel, TextInput } from './ui';
import { useConfirm } from './useConfirm';

type Note = { tone: 'ok' | 'error'; text: string } | null;

const short = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

/**
 * Social profile of an asset's company (issuer): highlight it in the Feed's
 * "Perfiles destacados" rail and choose who manages it (posts, profile, logo).
 * PATCH /v1/admin/issuers/:id, audited by the API.
 */
export function IssuerPanel({ issuer, onChanged }: { issuer: AdminIssuer; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [search, setSearch] = useState('');
  // Shown at once; reverts if the API refuses.
  const [featured, setFeatured] = useState(issuer.featured);
  const { confirm, dialog } = useConfirm();
  const q = useDebounced(search.trim().slice(0, 80));
  const owner = useApiData(issuer.ownerId ? `user|${issuer.ownerId}` : null, () =>
    unwrap(api.GET('/v1/admin/users/{id}', { params: { path: { id: issuer.ownerId ?? '' } } }), 'No se pudo cargar el responsable.'));
  const results = useApiData(q.length >= 2 ? `issuer-owner-search|${q}` : null, () =>
    unwrap(api.GET('/v1/admin/users', { params: { query: { q, limit: 8 } } }), 'No se pudieron buscar usuarios.'), { keepPrevious: true });

  async function update(body: { featured?: boolean; ownerId?: string | null }, done: string): Promise<boolean> {
    setBusy(true);
    setNote(null);
    try {
      await unwrap(api.PATCH('/v1/admin/issuers/{id}', { params: { path: { id: issuer.id } }, body }), 'No se pudo actualizar la empresa.');
      setNote({ tone: 'ok', text: done });
      setSearch('');
      onChanged();
      return true;
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function assign(user: { id: string; displayName: string | null; walletAddress: string }) {
    const who = user.displayName ? `${user.displayName} (${short(user.walletAddress)})` : short(user.walletAddress);
    const ok = await confirm({
      title: 'Asignar responsable',
      message: `${who} podrá publicar en el feed de los proyectos de "${issuer.name}" y editar su perfil (descripción, logo y portada).`,
      confirmLabel: 'Asignar',
    });
    if (ok) await update({ ownerId: user.id }, 'Responsable asignado.');
  }

  async function removeOwner() {
    const ok = await confirm({ title: 'Quitar responsable', message: `Nadie podrá publicar como "${issuer.name}" hasta que asignes otro responsable.`, confirmLabel: 'Quitar', danger: true });
    if (ok) await update({ ownerId: null }, 'Responsable quitado.');
  }

  const current = owner.data;
  const candidates = (results.data?.items ?? []).filter(u => u.id !== issuer.ownerId);

  return (
    <Panel
      title="Perfil de la empresa"
      action={<a href={`/empresas/${issuer.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...sub, color: 'var(--sec)', fontWeight: 600 }}>Ver perfil público</a>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Check checked={featured} disabled={busy} label={`Destacar "${issuer.name}" en el Feed`}
            onChange={v => {
              setFeatured(v);
              void update({ featured: v }, v ? 'Empresa destacada en el Feed.' : 'La empresa ya no está destacada.').then(ok => { if (!ok) setFeatured(!v); });
            }} />
          <div style={{ ...sub, marginTop: 4 }}>Las destacadas aparecen primero en "Perfiles destacados".</div>
        </div>

        <div>
          <div style={{ ...sub, marginBottom: 6 }}>Responsable (publica en el feed y edita el perfil)</div>
          {issuer.ownerId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>
                {current ? (current.displayName ?? 'Sin nombre') : owner.error ? 'Usuario no disponible' : 'Cargando…'}
              </span>
              {current && <span style={sub}>{short(current.walletAddress)}{current.email ? ` · ${current.email}` : ''}</span>}
              <Btn small variant="ghost" disabled={busy} onClick={() => void removeOwner()}>Quitar</Btn>
            </div>
          ) : (
            <span style={sub}>Sin responsable asignado.</span>
          )}
        </div>

        <div>
          <TextInput type="search" value={search} onChange={e => setSearch(e.target.value)} maxLength={80}
            placeholder={issuer.ownerId ? 'Cambiar responsable: wallet, nombre o email' : 'Asignar responsable: wallet, nombre o email'}
            aria-label="Buscar usuario para asignar como responsable" style={{ padding: '9px 14px', fontSize: 13 }} />
          {q.length >= 2 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.error && <Notice tone="error">{results.error}</Notice>}
              {!results.error && candidates.length === 0 && <span style={sub}>{results.loading ? 'Buscando…' : 'Sin resultados.'}</span>}
              {candidates.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: 'var(--surface2)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.displayName ?? 'Sin nombre'}</div>
                    <div style={{ ...sub, overflowWrap: 'anywhere' }}>{short(u.walletAddress)}{u.email ? ` · ${u.email}` : ''}</div>
                  </div>
                  <Btn small variant="secondary" disabled={busy} onClick={() => void assign(u)}>Asignar</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {note && <div style={{ marginTop: 10 }}><Notice tone={note.tone}>{note.text}</Notice></div>}
      {dialog}
    </Panel>
  );
}
