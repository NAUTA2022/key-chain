import { useState } from 'react';
import { PBtn } from '~/components/ui';
import { CopyField } from '~/features/payments/PayKit';
import { markPayoutSent, usePendingPayouts } from './api';

/** Admin: send each pending payout from the Binance app (Pay → Enviar → Binance ID), then mark it sent. */
export default function AdminPayouts() {
  const list = usePendingPayouts(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = list.data ?? [];

  const mark = async (id: string) => {
    setBusy(id);
    setError(null);
    const r = await markPayoutSent(id);
    setBusy(null);
    if (!r.ok) setError(r.message);
    list.reload();
  };

  return (
    <section aria-labelledby="df-payouts" style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 20, padding: '18px 20px' }}>
      <h2 id="df-payouts" style={{ margin: '0 0 4px', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>Devoluciones pendientes</h2>
      <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>
        Solo admins. Enviá el monto desde tu Binance (Pay → Enviar al Binance ID, o Retirar USDT a la dirección y red indicadas) y marcalo como enviado.
      </p>
      {list.loading && !list.data ? (
        <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Cargando…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>No hay devoluciones pendientes.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map(r => (
            <div key={r.runId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'end', paddingTop: 12, borderTop: '1px solid var(--border-l)' }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', fontVariantNumeric: 'tabular-nums' }}>
                  Pagó {r.paidUsdt?.toFixed(2) ?? '—'} USDT · devolver <strong style={{ color: 'var(--text)' }}>{r.amountUsdt.toFixed(2)} USDT</strong> · {new Date(r.completedAt).toLocaleString('es-AR')}
                </div>
                {r.method === 'crypto' && r.refundAddress
                  ? <CopyField label={`Dirección ${r.network ?? ''} (retiro de USDT por esa red)`} value={r.refundAddress} />
                  : r.payerId ? <CopyField label="Binance ID (Pay → Enviar)" value={r.payerId} /> : <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>Binance no informó el ID del pagador: buscalo en tu historial de Pay.</div>}
              </div>
              <PBtn variant="accent" small disabled={busy !== null} onClick={() => void mark(r.runId)}>{busy === r.runId ? 'Guardando…' : 'Marcar enviado'}</PBtn>
            </div>
          ))}
        </div>
      )}
      {error && <div role="alert" style={{ marginTop: 10, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>{error}</div>}
    </section>
  );
}
