import { useEffect, useEffectEvent, useState } from 'react';
import { motion } from 'framer-motion';
import FaucetCard from '~/features/wallet/FaucetCard';
import { PayModal, TokenNetworkPicker, QRCode, CopyField, Notice, PrimaryBtn, GhostBtn, ProgressSteps, SuccessMark, KV } from './PayKit';
import { T, Ico } from './payTheme';
import { LIVE_USDC, PLATFORM_NET } from './live';
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

const TITLES = (sym: string): Record<Step, string> => ({ pick: 'Depositar cripto', address: `Depositar ${sym}`, tracking: 'Recibiendo depósito', done: 'Depósito acreditado' });

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
    credit(sym, received, `Depósito ${sym} · ${network.name}`, { net, hash });
    setStep('done');
    onDone?.(sym, received);
  };

  const footer = {
    pick: <PrimaryBtn onClick={() => setStep('address')}>Continuar</PrimaryBtn>,
    address: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn onClick={startTracking}>Ya envié los fondos</PrimaryBtn>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>También lo detectamos solo, aunque cierres esta ventana.</div>
      </div>
    ),
    tracking: null,
    done: <PrimaryBtn onClick={close}>Listo</PrimaryBtn>,
  }[step];

  return (
    <PayModal open={open} onClose={close} title={TITLES(sym)[step]} onBack={step === 'address' ? () => setStep('pick') : undefined} footer={footer}>
      {step === 'pick' && (
        <>
          <p style={{ ...T.body, margin: '0 0 18px' }}>Elige qué moneda vas a enviar y por qué red. Te damos tu dirección personal de depósito.</p>
          <TokenNetworkPicker tokens={TOKENS} sym={sym} setSym={setSym} net={net} setNet={setNet} balances={balances} />
        </>
      )}

      {step === 'address' && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
            <QRCode value={DEPOSIT_ADDRESS} logo={token.icon} />
          </div>
          <Chips items={[[token.icon, token.sym], [network.icon, network.name]]} />
          <CopyField label="Tu dirección de depósito" value={DEPOSIT_ADDRESS} />
          <div style={{ marginTop: 14 }}>
            <KV k="Depósito mínimo" v={fmtToken(token.min, sym)} />
            <KV k="Tiempo estimado" v={network.eta} />
            <KV k="Confirmaciones" v={network.confirmations} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Notice>Envía solo <b>{sym}</b> por la red <b>{network.name}</b>. Si usas otra moneda o red, los fondos pueden perderse.</Notice>
          </div>
        </motion.div>
      )}

      {step === 'tracking' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'var(--text)', letterSpacing: '-0.03em' }}>{fmtToken(received, sym)}</div>
            <div style={{ ...T.body, fontSize: 12.5 }}>desde {shortAddr('0x9b2C51aE07D6f4E1c8A3b5D29e0F7c41aB6d3E58')} · {network.name}</div>
          </div>
          <ProgressSteps onDone={finish} steps={[
            { label: 'Transacción detectada', sub: `Hash ${shortAddr(hash)}`, ms: 1100 },
            { label: `Confirmando en ${network.name}`, sub: `${network.confirmations} confirmaciones`, ms: 1800 },
            { label: 'Verificación de origen', sub: 'Chequeo AML automático', ms: 1000 },
            { label: 'Acreditando en tu saldo', ms: 800 },
          ]} />
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div role="status" style={{ ...T.title, fontSize: 24 }}>+{fmtToken(received, sym)}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>Ya está disponible en tu saldo Brikme.</div>
          <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k="Red" v={network.name} />
            <KV k="Hash" v={shortAddr(hash)} mono />
            <KV k={`Saldo ${sym}`} v={fmtToken(balances[sym] || 0, sym)} strong />
          </div>
          <div style={{ marginTop: 10 }}>
            <GhostBtn onClick={() => { setStep('pick'); setAmount(null); }}>{Ico.down} Hacer otro depósito</GhostBtn>
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
    pick: <PrimaryBtn onClick={() => setStep('address')}>Continuar</PrimaryBtn>,
    address: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn disabled={live.usdc === null} onClick={startTracking}>Ya envié los fondos</PrimaryBtn>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Tu saldo se actualiza solo cuando llega la transferencia.</div>
      </div>
    ),
    tracking: null,
    done: <PrimaryBtn onClick={close}>Listo</PrimaryBtn>,
  }[view];

  return (
    <PayModal open={open} onClose={close} title={TITLES('USDC')[view]} onBack={view === 'address' ? () => setStep('pick') : undefined} footer={footer}>
      {view === 'pick' && (
        <>
          <p style={{ ...T.body, margin: '0 0 18px' }}>Deposita USDC en tu wallet por la red de la plataforma. Te mostramos tu dirección para recibirlos.</p>
          <TokenNetworkPicker tokens={[LIVE_USDC]} networks={networks} sym="USDC" setSym={() => undefined} net={PLATFORM_NET} setNet={() => undefined} balances={{ USDC: live.usdc ?? 0 }} />
        </>
      )}

      {view === 'address' && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
            <QRCode value={live.address} logo={LIVE_USDC.icon} />
          </div>
          <Chips items={[[LIVE_USDC.icon, 'USDC'], [network.icon, network.name]]} />
          <CopyField label="Tu dirección de depósito" value={live.address} />
          <div style={{ marginTop: 14 }}>
            <KV k="Moneda" v="USD Coin (USDC)" />
            <KV k="Red" v={network.name} />
            <KV k="Saldo actual" v={live.usdc === null ? '…' : fmtToken(live.usdc, 'USDC')} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Notice>Envía solo <b>USDC</b> por la red <b>{network.name}</b>. Si usas otra moneda o red, los fondos pueden perderse.</Notice>
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
            <div style={{ ...T.body, fontSize: 12.5 }}>a {shortAddr(live.address)} · {network.name}</div>
          </div>
          <ProgressSteps current={0} steps={[
            { label: 'Esperando la transferencia', sub: 'La detectamos cuando llega a tu wallet' },
            { label: `Confirmando en ${network.name}` },
            { label: 'Acreditando en tu saldo' },
          ]} />
          <div style={{ marginTop: 10, textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Puedes cerrar esta ventana: tu saldo se actualiza solo.</div>
        </div>
      )}

      {view === 'done' && received !== null && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div role="status" style={{ ...T.title, fontSize: 24 }}>+{fmtToken(received, 'USDC')}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>Ya está disponible en tu wallet.</div>
          <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k="Red" v={network.name} />
            <KV k="Saldo USDC" v={fmtToken(live.usdc ?? 0, 'USDC')} strong />
          </div>
          <div style={{ marginTop: 10 }}>
            <GhostBtn onClick={reset}>{Ico.down} Hacer otro depósito</GhostBtn>
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
