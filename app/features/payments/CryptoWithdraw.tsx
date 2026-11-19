import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { Chain } from 'thirdweb/chains';
import { toTokens } from 'thirdweb/utils';
import type { Account, Wallet } from 'thirdweb/wallets';
import { explorerUrl as chainExplorerUrl } from '~/lib/onchain';
import { sendUsdc, validateWithdraw } from '~/features/wallet/withdraw';
import { PayModal, TokenNetworkPicker, Notice, PrimaryBtn, ProgressSteps, SuccessMark, KV, CopyField } from './PayKit';
import { T, Ico, explorerUrl } from './payTheme';
import { LIVE_USDC, PLATFORM_NET } from './live';
import { TOKENS, tokenBySym, networkById, useWallet, debit, fmtToken, isAddress, shortAddr, fakeTxHash, type PayNetwork } from '~/lib/wallet';

type Step = 'form' | 'review' | 'processing' | 'done';

/** Live withdrawal: an on-chain USDC transfer signed by the connected wallet. */
export type LiveWithdraw = {
  account: Account;
  wallet: Wallet | undefined;
  chain: Chain;
  network: PayNetwork;
  gasSymbol: string;
  usdc: { address: string; decimals: number; balanceWei: bigint | null };
  /** A transfer was confirmed (refresh balances). */
  onSent: () => void;
};

type CryptoWithdrawProps = {
  open: boolean;
  onClose: () => void;
  defaultSym?: string;
  /** Live mode: real wallet and chain instead of the demo custodial balance. */
  live?: LiveWithdraw;
};

const TITLES: Record<Step, string> = { form: 'Retirar cripto', review: 'Revisa el retiro', processing: 'Enviando retiro', done: 'Retiro enviado' };
const field: CSSProperties = { width: '100%', boxSizing: 'border-box', height: 48, padding: '0 14px', borderRadius: 14, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 14, outline: 'none' };
const maxBtn: CSSProperties = { height: 34, padding: '0 10px', borderRadius: 10, border: 'none', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const errorText: CSSProperties = { marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' };

// Crypto withdrawal from the Brikme balance: token + network, destination
// address and amount, review with fees, 2FA code, processing and receipt.
export default function CryptoWithdraw({ live, ...props }: CryptoWithdrawProps) {
  return live ? <LiveWithdrawFlow {...props} live={live} /> : <DemoWithdrawFlow {...props} />;
}

function DemoWithdrawFlow({ open, onClose, defaultSym = 'USDC' }: Omit<CryptoWithdrawProps, 'live'>) {
  const [step, setStep] = useState<Step>('form');
  const [sym, setSym] = useState(defaultSym);
  const [net, setNet] = useState('polygon');
  const [addr, setAddr] = useState('');
  const [amt, setAmt] = useState('');
  const [code, setCode] = useState('');
  const [hash, setHash] = useState('');
  const { balances } = useWallet();
  const token = tokenBySym(sym);
  const network = networkById(net);

  const bal = balances[sym] || 0;
  const feeTok = network.fee / token.price;             // network fee in the token
  const amount = parseFloat(String(amt).replace(',', '.')) || 0;
  const receive = Math.max(0, amount - feeTok);
  const addrOk = isAddress(addr);
  const errors = [
    addr && !addrOk && 'La dirección no es válida (0x + 40 caracteres).',
    amount > bal && 'No tienes saldo suficiente.',
    amount > 0 && amount < token.min && `El mínimo es ${fmtToken(token.min, sym)}.`,
  ].filter((e): e is string => typeof e === 'string');
  const canReview = addrOk && amount > 0 && !errors.length;

  const reset = () => { setStep('form'); setAddr(''); setAmt(''); setCode(''); };
  const close = () => { onClose(); setTimeout(reset, 300); };
  const confirm = () => { setHash(fakeTxHash()); setStep('processing'); };
  const finish = () => {
    debit(sym, amount, `Retiro ${sym} · ${network.name} a ${shortAddr(addr)}`, { net, hash });
    setStep('done');
  };

  const footer = {
    form: <PrimaryBtn disabled={!canReview} onClick={() => setStep('review')}>Revisar retiro</PrimaryBtn>,
    review: <PrimaryBtn disabled={code.length !== 6} onClick={confirm}>{Ico.up} Confirmar retiro</PrimaryBtn>,
    processing: null,
    done: <PrimaryBtn onClick={close}>Listo</PrimaryBtn>,
  }[step];

  return (
    <PayModal open={open} onClose={close} title={TITLES[step]} onBack={step === 'review' ? () => setStep('form') : undefined} footer={footer}>
      {step === 'form' && (
        <>
          <TokenNetworkPicker tokens={TOKENS} sym={sym} setSym={setSym} net={net} setNet={setNet} balances={balances} showBalance />

          <label style={{ ...T.label, marginTop: 18 }} htmlFor="wd-addr">Dirección de destino</label>
          <input id="wd-addr" value={addr} onChange={e => setAddr(e.target.value.trim())} placeholder="0x…" spellCheck={false} autoComplete="off"
            style={{ ...field, ...T.mono, fontSize: 13, borderColor: addr && !addrOk ? 'var(--neg)' : 'var(--border-l)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16 }}>
            <label style={T.label} htmlFor="wd-amt">Monto</label>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>Disponible: <b style={{ color: 'var(--text)' }}>{fmtToken(bal, sym)}</b></span>
          </div>
          <div style={{ position: 'relative' }}>
            <input id="wd-amt" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0.00"
              style={{ ...field, paddingRight: 112, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, borderColor: amount > bal ? 'var(--neg)' : 'var(--border-l)' }} />
            <span style={{ position: 'absolute', right: 8, top: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 700, color: 'var(--ter)' }}>{sym}</span>
              <button type="button" onClick={() => setAmt(String(+bal.toFixed(token.decimals)))} style={maxBtn}>MÁX</button>
            </span>
          </div>

          {errors.length > 0 && <div role="alert" style={errorText}>{errors[0]}</div>}

          <div style={{ marginTop: 14, padding: '4px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k="Comisión de red" v={`${fmtToken(feeTok, sym)}`} />
            <KV k="Recibes" v={fmtToken(receive, sym)} strong />
          </div>
        </>
      )}

      {step === 'review' && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ textAlign: 'center', margin: '4px 0 16px' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 30, color: 'var(--text)', letterSpacing: '-0.03em' }}>{fmtToken(receive, sym)}</div>
            <div style={{ ...T.body, fontSize: 12.5 }}>llegan a destino en {network.eta}</div>
          </div>
          <div style={{ padding: '4px 14px', borderRadius: 14, background: 'var(--surface2)', marginBottom: 14 }}>
            <KV k="Moneda" v={`${token.name} (${sym})`} />
            <KV k="Red" v={network.name} />
            <KV k="Destino" v={shortAddr(addr)} mono />
            <KV k="Monto" v={fmtToken(amount, sym)} />
            <KV k="Comisión de red" v={fmtToken(feeTok, sym)} />
          </div>
          <Notice>Revisa la dirección y la red. Los retiros on-chain no se pueden revertir.</Notice>
          <label style={{ ...T.label, marginTop: 16 }} htmlFor="wd-2fa">Código de verificación (2FA)</label>
          <input id="wd-2fa" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••"
            style={{ ...field, textAlign: 'center', letterSpacing: '0.5em', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20 }} />
          <div style={{ marginTop: 6, fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Ingresa el código de 6 dígitos de tu app autenticadora.</div>
        </motion.div>
      )}

      {step === 'processing' && (
        <ProgressSteps onDone={finish} steps={[
          { label: 'Verificando código 2FA', ms: 800 },
          { label: 'Chequeo de seguridad', sub: 'Dirección y límites diarios', ms: 1000 },
          { label: `Firmando y enviando en ${network.name}`, sub: `Hash ${shortAddr(hash)}`, ms: 1400 },
          { label: 'Esperando confirmación', ms: 1200 },
        ]} />
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div role="status" style={{ ...T.title, fontSize: 24 }}>{fmtToken(receive, sym)}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>enviados a {shortAddr(addr)} por {network.name}.</div>
          <div style={{ textAlign: 'left' }}>
            <CopyField label="Hash de la transacción" value={hash} />
          </div>
          <a href={explorerUrl(net, hash)} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Ver en el explorador {Ico.chev}
          </a>
        </div>
      )}
    </PayModal>
  );
}

// Live: USDC leaves the user's own wallet with a transfer they sign (gas in
// the network's native token). No custodial balance, no 2FA: the wallet's
// signature is the confirmation.
function LiveWithdrawFlow({ open, onClose, live }: Omit<CryptoWithdrawProps, 'live'> & { live: LiveWithdraw }) {
  const { account, wallet, chain, network, gasSymbol, usdc } = live;
  const [step, setStep] = useState<Step>('form');
  const [addr, setAddr] = useState('');
  const [amt, setAmt] = useState('');
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState('');
  const bal = usdc.balanceWei === null ? null : Number(toTokens(usdc.balanceWei, usdc.decimals));
  const check = validateWithdraw({ to: addr, amount: amt }, { from: account.address, balanceWei: usdc.balanceWei, decimals: usdc.decimals });
  const message = !check.ok && (check.field === 'to' ? addr !== '' : amt !== '') ? check.message : null;
  const amount = check.ok ? Number(check.amount) : parseFloat(amt.replace(',', '.')) || 0;
  const sending = step === 'processing' && error === null;

  const reset = () => { setStep('form'); setAddr(''); setAmt(''); setError(null); setPhase(0); };
  const close = () => {
    if (sending) return; // the wallet is signing or the network is confirming
    onClose();
    setTimeout(reset, 300);
  };
  const send = async () => {
    if (!check.ok) return;
    setStep('processing');
    setError(null);
    setPhase(0);
    try {
      const h = await sendUsdc({ account, wallet, chain, token: usdc.address, to: check.to, amountWei: check.amountWei, onStep: s => setPhase(s === 'confirm' ? 1 : 0) });
      setHash(h);
      setPhase(2);
      setStep('done');
      live.onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La transferencia no se pudo completar.');
    }
  };
  const txUrl = hash ? chainExplorerUrl('tx', hash, chain.id) : null;

  const footer = {
    form: <PrimaryBtn disabled={!check.ok} onClick={() => setStep('review')}>Revisar retiro</PrimaryBtn>,
    review: <PrimaryBtn disabled={!check.ok} onClick={() => void send()}>{Ico.up} Confirmar retiro</PrimaryBtn>,
    processing: error ? <PrimaryBtn onClick={() => void send()}>Reintentar</PrimaryBtn> : null,
    done: <PrimaryBtn onClick={close}>Listo</PrimaryBtn>,
  }[step];

  return (
    <PayModal open={open} onClose={close} title={TITLES[step]} onBack={step === 'review' || (step === 'processing' && error) ? () => { setError(null); setStep(step === 'review' ? 'form' : 'review'); } : undefined} footer={footer}>
      {step === 'form' && (
        <>
          <TokenNetworkPicker tokens={[LIVE_USDC]} networks={{ [PLATFORM_NET]: network }} sym="USDC" setSym={() => undefined} net={PLATFORM_NET} setNet={() => undefined} balances={{ USDC: bal ?? 0 }} showBalance />

          <label style={{ ...T.label, marginTop: 18 }} htmlFor="wd-addr">Dirección de destino</label>
          <input id="wd-addr" value={addr} onChange={e => setAddr(e.target.value.trim())} placeholder="0x…" spellCheck={false} autoComplete="off" maxLength={42}
            style={{ ...field, ...T.mono, fontSize: 13, borderColor: message && !check.ok && check.field === 'to' ? 'var(--neg)' : 'var(--border-l)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16 }}>
            <label style={T.label} htmlFor="wd-amt">Monto</label>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>Disponible: <b style={{ color: 'var(--text)' }}>{bal === null ? '…' : fmtToken(bal, 'USDC')}</b></span>
          </div>
          <div style={{ position: 'relative' }}>
            <input id="wd-amt" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0.00" maxLength={24}
              style={{ ...field, paddingRight: 112, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, borderColor: message && !check.ok && check.field === 'amount' ? 'var(--neg)' : 'var(--border-l)' }} />
            <span style={{ position: 'absolute', right: 8, top: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 700, color: 'var(--ter)' }}>USDC</span>
              <button type="button" disabled={usdc.balanceWei === null} onClick={() => usdc.balanceWei !== null && setAmt(toTokens(usdc.balanceWei, usdc.decimals))} style={maxBtn}>MÁX</button>
            </span>
          </div>

          {message && <div role="alert" style={errorText}>{message}</div>}

          <div style={{ marginTop: 14, padding: '4px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k="Comisión de red" v={`Gas en ${gasSymbol}`} />
            <KV k="Recibes" v={fmtToken(amount, 'USDC')} strong />
          </div>
        </>
      )}

      {step === 'review' && check.ok && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ textAlign: 'center', margin: '4px 0 16px' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 30, color: 'var(--text)', letterSpacing: '-0.03em' }}>{fmtToken(amount, 'USDC')}</div>
            <div style={{ ...T.body, fontSize: 12.5 }}>llegan a destino por la red {network.name}</div>
          </div>
          <div style={{ padding: '4px 14px', borderRadius: 14, background: 'var(--surface2)', marginBottom: 14 }}>
            <KV k="Moneda" v="USD Coin (USDC)" />
            <KV k="Red" v={network.name} />
            <KV k="Destino" v={<span title={check.to}>{shortAddr(check.to)}</span>} mono />
            <KV k="Monto" v={fmtToken(amount, 'USDC')} />
            <KV k="Comisión de red" v={`Gas en ${gasSymbol} (lo cobra la red)`} />
          </div>
          <Notice>Revisa la dirección y la red. Los retiros on-chain no se pueden revertir.</Notice>
          <div style={{ marginTop: 12, fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Vas a confirmar el envío con tu wallet.</div>
        </motion.div>
      )}

      {step === 'processing' && (
        <>
          <ProgressSteps current={phase} failed={error !== null} steps={[
            { label: 'Firma el retiro en tu wallet', sub: `${fmtToken(amount, 'USDC')} a ${check.ok ? shortAddr(check.to) : ''}` },
            { label: `Enviando en ${network.name}`, sub: 'Esperando la confirmación de la red' },
          ]} />
          {error && <div style={{ marginTop: 12 }}><Notice>{error}</Notice></div>}
        </>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div role="status" style={{ ...T.title, fontSize: 24 }}>{fmtToken(amount, 'USDC')}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>enviados a {check.ok ? shortAddr(check.to) : shortAddr(addr)} por {network.name}.</div>
          <div style={{ textAlign: 'left' }}>
            <CopyField label="Hash de la transacción" value={hash} />
          </div>
          {txUrl && (
            <a href={txUrl} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Ver en el explorador {Ico.chev}
            </a>
          )}
        </div>
      )}
    </PayModal>
  );
}
