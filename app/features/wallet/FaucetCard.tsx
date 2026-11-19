import { useState } from 'react';
import { PBtn, PTag } from '~/components/ui';
import { useT } from '~/i18n/useT';
import { requestFaucet, timeUntil, useChainInfo, useFaucetStatus, useNow } from './chain';

type FaucetCardProps = {
  /** Called after the faucet sent funds (refresh balances, retry an action…). */
  onFunded?: () => void;
};

/** Test-network faucet: only renders when the API says it is enabled for this user. */
export default function FaucetCard({ onFunded }: FaucetCardProps) {
  const { t, locale } = useT('portfolio');
  const status = useFaucetStatus();
  const info = useChainInfo();
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const faucet = status.data;
  if (!faucet?.enabled) return null;
  const gasSymbol = info.data?.nativeSymbol ?? 'POL';
  const until = timeUntil(faucet.nextAvailableAt, now);
  const wait = until && (until.h > 0 ? t('wallet.faucet.hoursMinutes', until) : t('wallet.faucet.minutes', { min: until.min }));
  const num = (n: number) => n.toLocaleString(locale);

  const claim = async () => {
    setBusy(true);
    setMsg(null);
    const r = await requestFaucet();
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: t('wallet.faucet.sent', { usdc: num(r.usdc), gas: num(r.gas), symbol: gasSymbol }) });
      onFunded?.();
    } else {
      setMsg({ ok: false, text: t(`wallet.faucet.errors.${r.reason}`) });
    }
    status.reload();
  };

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border-l)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{t('wallet.faucet.title')}</span>
        <PTag label={t('wallet.faucet.testnet')} color="purple" />
      </div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', lineHeight: 1.5 }}>
        {t('wallet.faucet.body', { usdc: num(faucet.usdcAmount), gas: num(faucet.gasAmount), symbol: gasSymbol })}
      </div>
      <PBtn variant="accent" small disabled={busy || wait !== null} onClick={() => void claim()} style={{ marginTop: 10, width: '100%' }}>
        {busy ? t('wallet.faucet.sending') : wait ? t('wallet.faucet.availableIn', { time: wait }) : t('wallet.faucet.request')}
      </PBtn>
      {msg && (
        <div role="status" style={{ marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 12, color: msg.ok ? 'var(--pos)' : 'var(--neg)' }}>{msg.text}</div>
      )}
    </div>
  );
}
