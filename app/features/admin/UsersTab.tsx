import { useState } from 'react';
import { Link } from 'react-router';
import { PAvatar, PTag } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { countryName } from '~/lib/countries';
import { errorText, unwrap, useApiData, useDebounced, usePaged } from './api';
import { fmtDate, fmtDateTime, fmtInt, fmtMoney, fmtPrice, shortHex, userName } from './format';
import { KYC_STATUS, ONCHAIN_IDENTITY, ORDER_STATUS, ROLE } from './labels';
import { reasonSchema, ROLES, validate } from './schemas';
import { errText, strong, sub, td, tdDim, tdMuted, tdStrong, toolbar } from './styles';
import type { AdminUser, AdminUserDetail, UserKycStatus, UserRole, UsersQuery } from './types';
import { Btn, Check, DataTable, Drawer, Field, FormGrid, Hash, KV, LoadMore, Notice, Panel, Row, Select, Tag, TextInput } from './ui';
import { useConfirm } from './useConfirm';

type Any<T extends string> = 'all' | T;

/** "Usuarios": search + filters with cursor pagination, and a detail drawer with role/block/session actions. */
export function UsersTab({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const mobile = useMobile();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Any<UserRole>>('all');
  const [kyc, setKyc] = useState<Any<UserKycStatus>>('all');
  const [blocked, setBlocked] = useState<Any<'true' | 'false'>>('all');
  const [deletion, setDeletion] = useState(false);
  const q = useDebounced(search.trim().slice(0, 80));

  const query: UsersQuery = {
    limit: 24,
    ...(q ? { q } : {}),
    ...(role !== 'all' ? { role } : {}),
    ...(kyc !== 'all' ? { kyc } : {}),
    ...(blocked !== 'all' ? { blocked } : {}),
    ...(deletion ? { deletionRequested: 'true' as const } : {}),
  };
  const users = usePaged<AdminUser>(`users|${JSON.stringify(query)}`, cursor =>
    unwrap(api.GET('/v1/admin/users', { params: { query: { ...query, ...(cursor ? { cursor } : {}) } } }), 'No se pudieron cargar los usuarios.'));

  return (
    <>
      <div style={toolbar}>
        <div style={{ width: mobile ? '100%' : 280 }}>
          <TextInput type="search" value={search} onChange={e => setSearch(e.target.value)} maxLength={80} placeholder="Wallet, nombre o email" aria-label="Buscar usuarios" style={{ padding: '9px 14px', fontSize: 13 }} />
        </div>
        <Select value={role} onChange={e => setRole(e.target.value as Any<UserRole>)} aria-label="Filtrar por rol" style={{ width: mobile ? 'calc(50% - 5px)' : 160, padding: '9px 12px', fontSize: 13 }}>
          <option value="all">Todos los roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE[r].label}</option>)}
        </Select>
        <Select value={kyc} onChange={e => setKyc(e.target.value as Any<UserKycStatus>)} aria-label="Filtrar por KYC" style={{ width: mobile ? 'calc(50% - 5px)' : 160, padding: '9px 12px', fontSize: 13 }}>
          <option value="all">Todo KYC</option>
          {(['none', 'pending', 'verified', 'rejected'] as const).map(k => <option key={k} value={k}>{KYC_STATUS[k].label}</option>)}
        </Select>
        <Select value={blocked} onChange={e => setBlocked(e.target.value as Any<'true' | 'false'>)} aria-label="Filtrar por bloqueo" style={{ width: mobile ? 'calc(50% - 5px)' : 160, padding: '9px 12px', fontSize: 13 }}>
          <option value="all">Activos y bloqueados</option>
          <option value="false">Solo activos</option>
          <option value="true">Solo bloqueados</option>
        </Select>
        <Check checked={deletion} onChange={setDeletion} label="Pidieron la baja" />
      </div>

      <DataTable
        head={['Usuario', 'Email', 'KYC', 'Rol', 'Invertido', 'Desde', 'Estado', '']}
        minWidth={980}
        loading={users.loading} error={users.error} empty={users.items.length === 0} emptyText="No hay usuarios con estos filtros."
      >
        {users.items.map((u, i) => (
          <Row key={u.id} last={i === users.items.length - 1}>
            <td style={td}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PAvatar name={userName(u)} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{userName(u)}</div>
                  <div style={{ ...sub, fontSize: 11.5, marginTop: 2 }} title={u.walletAddress}>{shortHex(u.walletAddress)}</div>
                </div>
              </div>
            </td>
            <td style={tdMuted}>{u.email ?? '—'}</td>
            <td style={td}><Tag spec={KYC_STATUS[u.kycStatus]} /></td>
            <td style={td}><Tag spec={ROLE[u.role]} /></td>
            <td style={tdStrong}>{u.invested > 0 ? fmtMoney(u.invested) : '—'}</td>
            <td style={tdDim}>{fmtDate(u.createdAt)}</td>
            <td style={td}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {u.blocked && <PTag label="Bloqueado" color="red" />}
                {u.deletionRequestedAt && <PTag label="Pidió la baja" color="dark" />}
                {!u.onboarded && <PTag label="Sin onboarding" color="neutral" />}
                {!u.blocked && !u.deletionRequestedAt && u.onboarded && <span style={sub}>Activo</span>}
              </div>
            </td>
            <td style={td}><Btn small variant="ghost" onClick={() => onSelect(u.id)}>Ver</Btn></td>
          </Row>
        ))}
      </DataTable>
      <LoadMore visible={users.hasMore} busy={users.loadingMore} error={users.moreError} onClick={() => void users.loadMore()} />

      {selected && <UserDrawer key={selected} id={selected} onClose={() => onSelect(null)} onUserChange={users.replace} />}
    </>
  );
}

type Note = { tone: 'ok' | 'error'; text: string } | null;

function UserDrawer({ id, onClose, onUserChange }: { id: string; onClose: () => void; onUserChange: (u: AdminUser) => void }) {
  const detail = useApiData(`user|${id}`, () => unwrap(api.GET('/v1/admin/users/{id}', { params: { path: { id } } }), 'No se pudo cargar el usuario.'));
  const u = detail.data;
  return (
    <Drawer title={u ? userName(u) : 'Usuario'} subtitle={u ? <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}><Tag spec={ROLE[u.role]} /><Tag spec={KYC_STATUS[u.kycStatus]} />{u.blocked && <PTag label="Bloqueado" color="red" />}</span> : undefined} onClose={onClose}>
      {!u && (detail.error ? <Notice tone="error">{detail.error}</Notice> : <span style={sub}>Cargando…</span>)}
      {u && <UserDetailBody user={u} onChanged={next => { if (next) onUserChange(next); detail.reload(); }} />}
    </Drawer>
  );
}

function UserDetailBody({ user: u, onChanged }: { user: AdminUserDetail; onChanged: (u: AdminUser | null) => void }) {
  const [role, setRole] = useState<UserRole>(u.role);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const { confirm, dialog } = useConfirm();
  const path = { params: { path: { id: u.id } } };
  const name = userName(u);

  async function run(work: () => Promise<string>) {
    setBusy(true);
    setNote(null);
    try {
      setNote({ tone: 'ok', text: await work() });
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole() {
    if (role === u.role) return setNote({ tone: 'ok', text: 'El usuario ya tiene ese rol.' });
    const ok = await confirm({
      title: 'Cambiar rol',
      message: `${name} pasará de ${ROLE[u.role].label} a ${ROLE[role].label}.${role === 'admin' ? ' Tendrá acceso total a este panel.' : ''}`,
      confirmLabel: 'Cambiar rol',
      danger: role === 'admin' || u.role === 'admin',
    });
    if (!ok) return;
    await run(async () => {
      onChanged(await unwrap(api.PATCH('/v1/admin/users/{id}/role', { ...path, body: { role } }), 'No se pudo cambiar el rol.'));
      return `Rol actualizado a ${ROLE[role].label}.`;
    });
  }

  async function block() {
    const v = validate(reasonSchema, { reason });
    if (!v.ok) return setReasonError(v.errors.reason ?? 'Indica el motivo.');
    setReasonError(null);
    const ok = await confirm({ title: 'Bloquear usuario', message: `${name} no podrá operar ni iniciar sesión y se cerrarán sus sesiones activas.`, confirmLabel: 'Bloquear', danger: true });
    if (!ok) return;
    await run(async () => {
      onChanged(await unwrap(api.POST('/v1/admin/users/{id}/block', { ...path, body: v.data }), 'No se pudo bloquear al usuario.'));
      setReason('');
      return 'Usuario bloqueado.';
    });
  }

  async function unblock() {
    if (!(await confirm({ title: 'Desbloquear usuario', message: `${name} podrá volver a iniciar sesión y operar.`, confirmLabel: 'Desbloquear' }))) return;
    await run(async () => {
      onChanged(await unwrap(api.POST('/v1/admin/users/{id}/unblock', path), 'No se pudo desbloquear al usuario.'));
      return 'Usuario desbloqueado.';
    });
  }

  async function revoke() {
    if (!(await confirm({ title: 'Cerrar sesiones', message: `Se cerrarán todas las sesiones activas de ${name} (${u.activeSessions}). Tendrá que volver a firmar el acceso.`, confirmLabel: 'Cerrar sesiones', danger: true }))) return;
    await run(async () => {
      const r = await unwrap(api.POST('/v1/admin/users/{id}/sessions/revoke', path), 'No se pudieron cerrar las sesiones.');
      onChanged(null);
      return `Se cerraron ${fmtInt(r.revoked)} sesion${r.revoked === 1 ? '' : 'es'}.`;
    });
  }

  return (
    <>
      <Panel title="Perfil">
        <KV rows={[
          ['Wallet', <Hash key="w" value={u.walletAddress} kind="address" />],
          ['Nombre', u.displayName ?? '—'],
          ['Email', u.email ? `${u.email}${u.emailVerified ? ' · verificado' : ' · sin verificar'}` : '—'],
          ['País', u.country ? countryName(u.country) : '—'],
          ['Alta', fmtDateTime(u.createdAt)],
          ['Onboarding', u.onboardedAt ? fmtDateTime(u.onboardedAt) : 'Pendiente'],
          ['Invertido', fmtMoney(u.invested)],
          ['Sesiones activas', fmtInt(u.activeSessions)],
          ['Tickets de soporte', u.tickets > 0 ? <Link key="t" to="/admin?tab=soporte" style={{ color: 'var(--text)' }}>{fmtInt(u.tickets)}</Link> : '0'],
          ...(u.blockedAt ? [['Bloqueado desde', fmtDateTime(u.blockedAt)] as [string, string]] : []),
          ...(u.deletionRequestedAt ? [['Pidió la baja', fmtDateTime(u.deletionRequestedAt)] as [string, string]] : []),
        ]} />
      </Panel>

      <Panel title="Administración">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormGrid>
            <Field label="Rol">
              <Select value={role} onChange={e => setRole(e.target.value as UserRole)} disabled={busy}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE[r].label}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Btn small variant="secondary" disabled={busy || role === u.role} onClick={() => void changeRole()}>Cambiar rol</Btn>
            </div>
          </FormGrid>

          {u.blocked ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={sub}>Bloqueado desde {fmtDateTime(u.blockedAt)}.</span>
              <Btn small variant="accent" disabled={busy} onClick={() => void unblock()}>Desbloquear</Btn>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); void block(); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} noValidate>
              <Field label="Bloquear usuario" error={reasonError ?? undefined} hint="El motivo queda en la auditoría.">
                <TextInput value={reason} onChange={e => setReason(e.target.value)} maxLength={300} placeholder="Motivo del bloqueo" invalid={Boolean(reasonError)} />
              </Field>
              <div><Btn small variant="secondary" type="submit" disabled={busy} style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }}>Bloquear</Btn></div>
            </form>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={sub}>{fmtInt(u.activeSessions)} sesion{u.activeSessions === 1 ? '' : 'es'} activa{u.activeSessions === 1 ? '' : 's'}.</span>
            <Btn small variant="ghost" disabled={busy || u.activeSessions === 0} onClick={() => void revoke()}>Cerrar sesiones</Btn>
          </div>
          {note && <Notice tone={note.tone}>{note.text}</Notice>}
        </div>
      </Panel>

      <Panel title="KYC" action={u.kycStatus === 'pending' ? <Link to="/admin?tab=kyc" style={{ ...sub, fontWeight: 600, color: 'var(--sec)' }}>Ir a la cola KYC</Link> : undefined}>
        {u.kyc ? (
          <KV rows={[
            ['Estado', <Tag key="s" spec={KYC_STATUS[u.kyc.status]} />],
            ['Tipo', u.kyc.type === 'business' ? 'Empresa' : 'Persona'],
            ['Nombre legal', u.kyc.legalName ?? '—'],
            ['Documento', u.kyc.documentId ?? '—'],
            ['País', u.kyc.country ? countryName(u.kyc.country) : '—'],
            ['Enviado', fmtDateTime(u.kyc.submittedAt)],
            ['Revisado', fmtDateTime(u.kyc.reviewedAt)],
            ...(u.kyc.rejectionReason ? [['Motivo de rechazo', u.kyc.rejectionReason] as [string, string]] : []),
          ]} />
        ) : <div style={sub}>Todavía no envió datos de verificación.</div>}
      </Panel>

      <Panel title="Identidad on-chain">
        {u.onchainIdentity ? (
          <>
            <KV rows={[
              ['Estado', <Tag key="s" spec={ONCHAIN_IDENTITY[u.onchainIdentity.status]} />],
              ['ONCHAINID', <Hash key="i" value={u.onchainIdentity.identityAddress} kind="address" />],
            ]} />
            {u.onchainIdentity.error && <div style={{ ...errText, marginTop: 10 }}>{u.onchainIdentity.error}</div>}
          </>
        ) : <div style={sub}>Sin identidad on-chain (se crea al aprobar el KYC).</div>}
      </Panel>

      <Panel title={`Órdenes (${u.orders.length})`}>
        {u.orders.length === 0 ? <div style={sub}>Sin órdenes.</div> : (
          <div style={{ overflowX: 'auto', margin: '0 -20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-l)' }}>
                  {['Fecha', 'Activo', 'Cant.', 'Precio', 'Fee', 'Total', 'Estado', 'Tx'].map(h => (
                    <th key={h} scope="col" style={{ padding: '10px 14px', fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {u.orders.map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: i < u.orders.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                    <td style={{ ...tdDim, padding: '10px 14px' }}>{fmtDate(o.createdAt)}</td>
                    <td style={{ ...td, padding: '10px 14px' }}><span style={strong}>{o.assetName}</span><div style={sub}>{o.mode === 'onchain' ? 'On-chain' : 'Brikme Pay'}</div></td>
                    <td style={{ ...td, padding: '10px 14px' }}>{fmtInt(o.quantity)}</td>
                    <td style={{ ...td, padding: '10px 14px' }}>{fmtPrice(o.unitPrice)}</td>
                    <td style={{ ...td, padding: '10px 14px' }}>{fmtMoney(o.fee)}</td>
                    <td style={{ ...tdStrong, padding: '10px 14px' }}>{fmtMoney(o.total)}</td>
                    <td style={{ ...td, padding: '10px 14px' }}><Tag spec={ORDER_STATUS[o.status]} /></td>
                    <td style={{ ...td, padding: '10px 14px' }}><Hash value={o.txHash} kind="tx" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {dialog}
    </>
  );
}
