import { useState } from 'react';
import { Link } from 'react-router';
import { PAvatar, PCard, PTag } from '~/components/ui';
import { api } from '~/lib/api/client';
import { countryName } from '~/lib/countries';
import { useMobile } from '~/hooks/useMobile';
import { ensureOk, errorText } from './api';
import { fmtDate, fmtMoney } from './format';
import { ONCHAIN_IDENTITY, POOL_STATUS } from './labels';
import { reasonSchema, validate } from './schemas';
import { errText, sub } from './styles';
import { Btn, Chips, Hash, TextInput } from './ui';
import { useConfirm } from './useConfirm';
import type { AdminPool, KycReview } from './useAdminData';

// Live admin widgets (backend enabled). Same row/table look as the demo admin.

/** On-chain actions of one asset: tokenize, distribute dividends, liquidate. */
export function PoolActions({ assetId, assetName, pool, onChange }: { assetId: number; assetName?: string; pool: AdminPool | undefined; onChange: () => void }) {
  const [mode, setMode] = useState<'dividend' | 'liquidate' | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const name = assetName ?? `#${assetId}`;

  async function run(call: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await call();
      setMode(null);
      setAmount('');
      onChange();
    } catch (e) {
      setError(errorText(e, 'La operación falló.'));
    } finally {
      setBusy(false);
    }
  }
  const path = { params: { path: { assetId } } };
  const value = Number(amount.replace(',', '.'));

  async function tokenize() {
    const ok = await confirm({
      title: pool ? 'Reintentar despliegue' : 'Tokenizar activo',
      message: `Se desplegarán on-chain los contratos del pool de "${name}" (token, vault, emisión y dividendos). El precio y la cantidad de tokens quedan bloqueados.`,
      confirmLabel: pool ? 'Reintentar' : 'Tokenizar',
    });
    if (ok) await run(() => ensureOk(api.POST('/v1/admin/assets/{assetId}/pool', path), 'No se pudo iniciar el despliegue.'));
  }

  async function submit() {
    if (!(value > 0) || !Number.isFinite(value)) return setError('Ingresá un monto mayor a 0.');
    const dividend = mode === 'dividend';
    const ok = await confirm({
      title: dividend ? 'Distribuir dividendo' : 'Liquidar activo',
      message: dividend
        ? `Se distribuirán ${fmtMoney(value)} USDC entre los holders de "${name}" (descontando fees). La operación es on-chain e irreversible.`
        : `Se liquidará "${name}" a ${fmtMoney(value)} USDC por token. Los holders podrán cobrar su capital y el pool queda cerrado. Es irreversible.`,
      confirmLabel: dividend ? 'Distribuir' : 'Liquidar',
      danger: !dividend,
    });
    if (!ok) return;
    await run(() => dividend
      ? ensureOk(api.POST('/v1/admin/assets/{assetId}/dividends', { ...path, body: { amountUsdc: value } }), 'No se pudo distribuir el dividendo.')
      : ensureOk(api.POST('/v1/admin/assets/{assetId}/liquidate', { ...path, body: { pricePerTokenUsdc: value } }), 'No se pudo liquidar el activo.'));
  }

  if (!pool || pool.status === 'failed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <Btn small variant="accent" disabled={busy} onClick={() => void tokenize()}>{busy ? '…' : pool ? 'Reintentar' : 'Tokenizar'}</Btn>
        {(error || pool?.error) && <span style={errText} title={pool?.error ?? undefined}>{error ?? 'Despliegue fallido'}</span>}
        {dialog}
      </div>
    );
  }
  const tag = POOL_STATUS[pool.status];
  if (pool.status !== 'active') return <PTag label={tag.label} color={tag.color} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <PTag label={tag.label} color={tag.color} />
        <Btn small variant="secondary" onClick={() => { setError(null); setMode(mode === 'dividend' ? null : 'dividend'); }}>Dividendo</Btn>
        <Btn small variant="ghost" onClick={() => { setError(null); setMode(mode === 'liquidate' ? null : 'liquidate'); }}>Liquidar</Btn>
      </div>
      {mode && (
        <form style={{ display: 'flex', gap: 6 }} onSubmit={e => { e.preventDefault(); void submit(); }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>$</span>
            <TextInput
              type="number" inputMode="decimal" min="0" step="any" name={mode} value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={mode === 'dividend' ? 'Total USDC a distribuir' : 'Precio por token (USDC)'}
              aria-label={mode === 'dividend' ? 'Total USDC a distribuir' : 'Precio por token en USDC'}
              style={{ padding: '8px 12px 8px 24px', fontSize: 13 }}
            />
          </div>
          <Btn small variant="accent" type="submit" disabled={busy}>{busy ? '…' : 'Confirmar'}</Btn>
        </form>
      )}
      {(error || pool.error) && <span style={errText}>{error ?? pool.error}</span>}
      {dialog}
    </div>
  );
}

type KycFilter = 'pending' | 'verified' | 'rejected' | 'all';

/** KYC review queue backed by /v1/admin/kyc: approval verifies the wallet on-chain (polled while in flight). */
export function KycQueueLive({ queue, loaded, loadError = null, onChange }: { queue: KycReview[]; loaded: boolean; loadError?: string | null; onChange: () => void }) {
  const mobile = useMobile();
  const [filter, setFilter] = useState<KycFilter>('pending');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ userId: string; text: string } | null>(null);
  const { confirm, dialog } = useConfirm();

  async function act(userId: string, call: () => Promise<void>) {
    setBusy(userId);
    setError(null);
    try {
      await call();
      setRejecting(null);
      setReason('');
      onChange();
    } catch (e) {
      setError({ userId, text: errorText(e, 'No se pudo completar la acción.') });
    } finally {
      setBusy(null);
    }
  }

  async function approve(k: KycReview, retry: boolean) {
    const ok = await confirm({
      title: retry ? 'Reintentar verificación on-chain' : 'Aprobar KYC',
      message: `${k.legalName ?? k.walletAddress}: se creará su identidad on-chain (ONCHAINID), se firmará el claim KYC y se registrará la wallet para poder invertir.`,
      confirmLabel: retry ? 'Reintentar' : 'Aprobar',
    });
    if (ok) await act(k.userId, () => ensureOk(api.POST('/v1/admin/kyc/{userId}/approve', { params: { path: { userId: k.userId } } }), 'No se pudo aprobar el KYC.'));
  }

  function reject(k: KycReview) {
    const v = validate(reasonSchema, { reason });
    if (!v.ok) return setError({ userId: k.userId, text: v.errors.reason ?? 'Revisá el motivo.' });
    void act(k.userId, () => ensureOk(api.POST('/v1/admin/kyc/{userId}/reject', { params: { path: { userId: k.userId } }, body: v.data }), 'No se pudo rechazar el KYC.'));
  }

  const counts = { pending: 0, verified: 0, rejected: 0 };
  for (const k of queue) counts[k.status] += 1;
  const rows = filter === 'all' ? queue : queue.filter(k => k.status === filter);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Chips<KycFilter>
          ariaLabel="Filtrar por estado de KYC" value={filter} onChange={setFilter}
          options={[['pending', `Pendientes (${counts.pending})`], ['verified', `Aprobados (${counts.verified})`], ['rejected', `Rechazados (${counts.rejected})`], ['all', 'Todos']]}
        />
      </div>
      <PCard style={{ padding: '16px' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14, padding: '0 8px' }}>Cola de verificación KYC</div>
        {loadError && <div role="alert" style={{ ...errText, padding: '8px' }}>{loadError}</div>}
        {rows.length === 0 && !loadError && <div style={{ ...sub, padding: '8px' }}>{loaded ? 'No hay solicitudes de verificación en este estado.' : 'Cargando…'}</div>}
        {rows.map((k, i) => {
          const tag = k.status === 'pending' ? { label: 'Pendiente', color: 'neutral' as const } : k.status === 'rejected' ? { label: 'Rechazado', color: 'red' as const } : ONCHAIN_IDENTITY[k.onchainStatus ?? 'queued'];
          const name = k.legalName ?? `${k.walletAddress.slice(0, 6)}…${k.walletAddress.slice(-4)}`;
          const pad = mobile ? 0 : 50;
          return (
            <div key={k.userId} style={{ padding: '14px 8px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: mobile ? 'wrap' : 'nowrap' }}>
                <PAvatar name={name} size={36} />
                <div style={{ flex: 1, minWidth: mobile ? 'calc(100% - 60px)' : 0 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>
                    <Link to={`/admin?tab=usuarios&id=${encodeURIComponent(k.userId)}`} style={{ color: 'inherit', textDecoration: 'none' }}>{name}</Link>
                  </div>
                  <div style={{ ...sub, marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: '2px 6px', alignItems: 'center' }}>
                    <Hash value={k.walletAddress} kind="address" />
                    <span>· {k.type === 'business' ? 'Empresa' : 'Persona'}</span>
                    {k.documentId && <span>· Doc. {k.documentId}</span>}
                    <span>· {countryName(k.country)}</span>
                    {k.submittedAt && <span>· {fmtDate(k.submittedAt)}</span>}
                  </div>
                </div>
                <PTag label={tag.label} color={tag.color} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {k.status === 'pending' && <Btn small variant="accent" disabled={busy !== null} onClick={() => void approve(k, false)}>Aprobar</Btn>}
                  {k.status === 'verified' && k.onchainStatus === 'failed' && <Btn small variant="accent" disabled={busy !== null} onClick={() => void approve(k, true)}>Reintentar</Btn>}
                  {k.status === 'pending' && <Btn small variant="secondary" disabled={busy !== null} onClick={() => { setError(null); setReason(''); setRejecting(rejecting === k.userId ? null : k.userId); }}>Rechazar</Btn>}
                </div>
              </div>
              {rejecting === k.userId && (
                <form style={{ display: 'flex', gap: 8, marginTop: 10, paddingLeft: pad, flexWrap: mobile ? 'wrap' : 'nowrap' }} onSubmit={e => { e.preventDefault(); reject(k); }}>
                  <TextInput name="reason" maxLength={300} placeholder="Motivo del rechazo (lo verá el usuario)" aria-label="Motivo del rechazo" value={reason} onChange={e => setReason(e.target.value)} style={{ padding: '8px 12px', fontSize: 13 }} />
                  <Btn small variant="secondary" type="submit" disabled={busy !== null}>{busy === k.userId ? '…' : 'Confirmar rechazo'}</Btn>
                </form>
              )}
              {error?.userId === k.userId && <div style={{ ...errText, marginTop: 8, paddingLeft: pad }}>{error.text}</div>}
              {k.onchainError && <div style={{ ...errText, marginTop: 8, paddingLeft: pad }}>{k.onchainError}</div>}
            </div>
          );
        })}
      </PCard>
      {dialog}
    </>
  );
}
