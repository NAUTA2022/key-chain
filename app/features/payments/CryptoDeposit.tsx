import { useEffect, useEffectEvent, useState } from 'react';
import { motion } from 'framer-motion';
import FaucetCard from '~/features/wallet/FaucetCard';
import { PayModal, TokenNetworkPicker, QRCode, CopyField, Notice, PrimaryBtn, GhostBtn, ProgressSteps, SuccessMark, KV } from './PayKit';
import { T, Ico } from './payTheme';
import { LIVE_USDC, PLATFORM_NET } from './live';
import { useT } from '~/i18n/useT';
import { richText, type TFn } from '~/features/market/i18n';
import { TOKENS, DEPOSIT_ADDRESS, tokenBySym, networkById, useWallet, credit, fmtToken, fakeTxHash, shortAddr, type PayNetwork } from '~/lib/wallet';

type Step = 'pick' | 'address' | 'tracking' | 'done';

/** Live deposit: the user's own wallet on the platform network, USDC only. */
export type LiveDeposit = {
  address: string;
  network: PayNetwork;
  /** USDC balance of the wallet (null while loading). */
  usdc: number | null;
  /** Re-reads the wallet balances (polled while waiting for a transfer). */
  refresh: () => void;
};

type CryptoDepositProps = {
  open: boolean;
  onClose: () => void;
  defaultSym?: string;
  onDone?: (sym: string, amount: number) => void;
  /** Live mode: real wallet data instead of the demo custodial balance. */
  live?: LiveDeposit;
};

const titleOf = (step: Step, sym: string, t: TFn) => t(`deposit.titles.${step}`, { sym });
const bold = (c: string, k: number) => <b key={k}>{c}</b>;

// Crypto deposit into the Brikme balance: pick token + network, get the
// personal deposit address (QR + copy) and track the deposit until it's
// credited. Steps: pick → address → tracking → done.
export default function CryptoDeposit({ live, ...props }: CryptoDepositProps) {
  return live ? <LiveDepositFlow {...props} live={live} /> : <DemoDepositFlow {...props} />;
}

function DemoDepositFlow({ open, onClose, defaultSym = 'USDC', onDone }: Omit<CryptoDepositProps, 'live'>) {
  const [step, setStep] = useState<Step>('pick');
  const [sym, setSym] = useState(defaultSym);
  const [net, setNet] = useState('polygon');
  const [amount, setAmount] = useState<number | null>(null);
  const [hash, setHash] = useState('');
  const { balances } = useWallet();
  const { t } = useT('market');
  const token = tokenBySym(sym);
  const network = networkById(net);
  const received = amount ?? 0;

  const close = () => { onClose(); setTimeout(() => { setStep('pick'); setAmount(null); }, 300); };
  const startTracking = () => {
    // Demo: simulate an incoming transfer of a typical size for the token.
    setAmount(sym === 'ETH' ? 0.25 : sym === 'POL' ? 500 : 1000);
    setHash(fakeTxHash());
    setStep('tracking');
  };
  const finish = () => {
    credit(sym, received, t('deposit.historyLabel', { sym, network: network.name }), { net, hash });
    setStep('done');
    onDone?.(sym, received);
  };

  const footer = {
    pick: <PrimaryBtn onClick={() => setStep('address')}>{t('pay.continue')}</PrimaryBtn>,
    address: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn onClick={startTracking}>{t('deposit.sentFunds')}</PrimaryBtn>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{t('deposit.autoDetect')}</div>
      </div>
    ),
    tracking: null,
    done: <PrimaryBtn onClick={close}>{t('pay.done')}</PrimaryBtn>,
  }[step];

  return (
    <PayModal open={open} onClose={close} title={titleOf(step, sym, t)} onBack={step === 'address' ? () => setStep('pick') : undefined} footer={footer}>
      {step === 'pick' && (
        <>
          <p style={{ ...T.body, margin: '0 0 18px' }}>{t('deposit.pickIntro')}</p>
          <TokenNetworkPicker tokens={TOKENS} sym={sym} setSym={setSym} net={net} setNet={setNet} balances={balances} />
        </>
      )}

      {step === 'address' && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
            <QRCode value={DEPOSIT_ADDRESS} logo={token.icon} />
          </div>
          <Chips items={[[token.icon, token.sym], [network.icon, network.name]]} />
          <CopyField label={t('deposit.yourAddress')} value={DEPOSIT_ADDRESS} />
          <div style={{ marginTop: 14 }}>
            <KV k={t('deposit.minimum')} v={fmtToken(token.min, sym)} />
            <KV k={t('deposit.eta')} v={network.eta} />
            <KV k={t('deposit.confirmations')} v={network.confirmations} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Notice>{richText(t('deposit.sendOnly', { sym, network: network.name }), bold)}</Notice>
          </div>
        </motion.div>
      )}

      {step === 'tracking' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'var(--text)', letterSpacing: '-0.03em' }}>{fmtToken(received, sym)}</div>
            <div style={{ ...T.body, fontSize: 12.5 }}>{t('deposit.from', { address: shortAddr('0x9b2C51aE07D6f4E1c8A3b5D29e0F7c41aB6d3E58'), network: network.name })}</div>
          </div>
          <ProgressSteps onDone={finish} steps={[
            { label: t('deposit.detected'), sub: t('pay.hash', { hash: shortAddr(hash) }), ms: 1100 },
            { label: t('pay.confirmingOn', { network: network.name }), sub: t('pay.confirmations', { count: network.confirmations }), ms: 1800 },
            { label: t('deposit.originCheck'), sub: t('deposit.amlCheck'), ms: 1000 },
            { label: t('deposit.crediting'), ms: 800 },
          ]} />
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div role="status" style={{ ...T.title, fontSize: 24 }}>+{fmtToken(received, sym)}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>{t('deposit.availableBalance')}</div>
          <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k={t('pay.network')} v={network.name} />
            <KV k="Hash" v={shortAddr(hash)} mono />
            <KV k={t('pay.balanceOf', { sym })} v={fmtToken(balances[sym] || 0, sym)} strong />
          </div>
          <div style={{ marginTop: 10 }}>
            <GhostBtn onClick={() => { setStep('pick'); setAmount(null); }}>{Ico.down} {t('deposit.another')}</GhostBtn>
          </div>
        </div>
      )}
    </PayModal>
  );
}

// Live: no custodial balance. The deposit address is the user's own wallet on
// the platform network; "Ya envié los fondos" watches its USDC balance until
// the transfer lands. The test faucet sits under the address.
function LiveDepositFlow({ open, onClose, live }: Omit<CryptoDepositProps, 'live'> & { live: LiveDeposit }) {
  const [step, setStep] = useState<Exclude<Step, 'done'>>('pick');
  const [baseline, setBaseline] = useState<number | null>(null);
  const { t } = useT('market');
  const network = live.network;
  const networks = { [PLATFORM_NET]: network };
  const received = step === 'tracking' && baseline !== null && live.usdc !== null && live.usdc > baseline + 1e-9 ? live.usdc - baseline : null;
  const view: Step = received !== null ? 'done' : step;

  const refresh = useEffectEvent(() => live.refresh());
  useEffect(() => {
    if (view !== 'tracking') return undefined;
    const id = setInterval(() => refresh(), 4000);
    return () => clearInterval(id);
  }, [view]);

  const reset = () => { setStep('pick'); setBaseline(null); };
  const close = () => { onClose(); setTimeout(reset, 300); };
  const startTracking = () => {
    setBaseline(live.usdc ?? 0);
    setStep('tracking');
  };

  const footer = {
    pick: <PrimaryBtn onClick={() => setStep('address')}>{t('pay.continue')}</PrimaryBtn>,
    address: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn disabled={live.usdc === null} onClick={startTracking}>{t('deposit.sentFunds')}</PrimaryBtn>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{t('deposit.liveAutoUpdate')}</div>
      </div>
    ),
    tracking: null,
    done: <PrimaryBtn onClick={close}>{t('pay.done')}</PrimaryBtn>,
  }[view];

  return (
    <PayModal open={open} onClose={close} title={titleOf(view, 'USDC', t)} onBack={view === 'address' ? () => setStep('pick') : undefined} footer={footer}>
      {view === 'pick' && (
        <>
          <p style={{ ...T.body, margin: '0 0 18px' }}>{t('deposit.livePickIntro')}</p>
          <TokenNetworkPicker tokens={[LIVE_USDC]} networks={networks} sym="USDC" setSym={() => undefined} net={PLATFORM_NET} setNet={() => undefined} balances={{ USDC: live.usdc ?? 0 }} />
        </>
      )}

      {view === 'address' && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
            <QRCode value={live.address} logo={LIVE_USDC.icon} />
          </div>
          <Chips items={[[LIVE_USDC.icon, 'USDC'], [network.icon, network.name]]} />
          <CopyField label={t('deposit.yourAddress')} value={live.address} />
          <div style={{ marginTop: 14 }}>
            <KV k={t('pay.currency')} v={t('pay.usdCoin')} />
            <KV k={t('pay.network')} v={network.name} />
            <KV k={t('deposit.currentBalance')} v={live.usdc === null ? '…' : fmtToken(live.usdc, 'USDC')} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Notice>{richText(t('deposit.sendOnly', { sym: 'USDC', network: network.name }), bold)}</Notice>
          </div>
          <div style={{ marginTop: 12 }}>
            <FaucetCard onFunded={live.refresh} />
          </div>
        </motion.div>
      )}

      {view === 'tracking' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'var(--text)', letterSpacing: '-0.03em' }}>USDC</div>
            <div style={{ ...T.body, fontSize: 12.5 }}>{t('deposit.to', { address: shortAddr(live.address), network: network.name })}</div>
          </div>
          <ProgressSteps current={0} steps={[
            { label: t('deposit.waiting'), sub: t('deposit.waitingSub') },
            { label: t('pay.confirmingOn', { network: network.name }) },
            { label: t('deposit.crediting') },
          ]} />
          <div style={{ marginTop: 10, textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{t('deposit.canClose')}</div>
        </div>
      )}

      {view === 'done' && received !== null && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div role="status" style={{ ...T.title, fontSize: 24 }}>+{fmtToken(received, 'USDC')}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>{t('deposit.walletAvailable')}</div>
          <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k={t('pay.network')} v={network.name} />
            <KV k={t('deposit.usdcBalance')} v={fmtToken(live.usdc ?? 0, 'USDC')} strong />
          </div>
          <div style={{ marginTop: 10 }}>
            <GhostBtn onClick={reset}>{Ico.down} {t('deposit.another')}</GhostBtn>
          </div>
        </div>
      )}
    </PayModal>
  );
}

function Chips({ items }: { items: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {items.map(([src, l]) => (
        <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 6px', borderRadius: 999, background: 'var(--surface2)', border: '1px solid var(--border-l)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
          <img src={src} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />{l}
        </span>
      ))}
    </div>
  );
}
