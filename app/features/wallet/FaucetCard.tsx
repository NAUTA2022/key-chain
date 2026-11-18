import { useState } from 'react';
import { PBtn, PTag } from '~/components/ui';
import { requestFaucet, timeUntil, useChainInfo, useFaucetStatus, useNow } from './chain';

type FaucetCardProps = {
  /** Called after the faucet sent funds (refresh balances, retry an action…). */
  onFunded?: () => void;
};

/** Test-network faucet: only renders when the API says it is enabled for this user. */
export default function FaucetCard({ onFunded }: FaucetCardProps) {
  const status = useFaucetStatus();
  const info = useChainInfo();
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const faucet = status.data;
  if (!faucet?.enabled) return null;
  const gasSymbol = info.data?.nativeSymbol ?? 'POL';
  const wait = timeUntil(faucet.nextAvailableAt, now);

  const claim = async () => {
    setBusy(true);
    setMsg(null);
    const r = await requestFaucet();
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: `Listo: te enviamos ${r.usdc.toLocaleString('es-AR')} USDC y ${r.gas.toLocaleString('es-AR')} ${gasSymbol} de prueba.` });
      onFunded?.();
    } else {
      setMsg({ ok: false, text: r.message });
    }
    status.reload();
  };

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border-l)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>Fondos de prueba</span>
        <PTag label="Red de pruebas" color="purple" />
      </div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', lineHeight: 1.5 }}>
        Recibí {faucet.usdcAmount.toLocaleString('es-AR')} USDC y {faucet.gasAmount.toLocaleString('es-AR')} {gasSymbol} para probar inversiones. No tienen valor real.
      </div>
      <PBtn variant="accent" small disabled={busy || wait !== null} onClick={() => void claim()} style={{ marginTop: 10, width: '100%' }}>
        {busy ? 'Enviando fondos…' : wait ? `Disponible de nuevo en ${wait}` : 'Pedir fondos de prueba'}
      </PBtn>
      {msg && (
        <div role="status" style={{ marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 12, color: msg.ok ? 'var(--pos)' : 'var(--neg)' }}>{msg.text}</div>
      )}
    </div>
  );
}
