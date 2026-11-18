import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import type { Account, Wallet } from 'thirdweb/wallets';
import { PCard, Icons } from '~/components/ui';
import FilterSelect from '~/components/social/FilterSelect';
import { useMobile } from '~/hooks/useMobile';
import { fmtUSD2 } from '~/data';
import { usePublicSettings } from '~/features/asset/api';
import { buyOnchain, useMarketInfo, useMarketListings, type TradeStep } from '~/features/market/api';
import CryptoDeposit from '~/features/payments/CryptoDeposit';
import { OptionRow, PrimaryBtn, GhostBtn, KV, Notice, QRCode, CopyField, ProgressSteps, SuccessMark, TokenIcon, type ProgressStep } from '~/features/payments/PayKit';
import { T, Ico } from '~/features/payments/payTheme';
import { LIVE_USDC, PLATFORM_NET, platformNetwork } from '~/features/payments/live';
import { useApiData } from '~/features/portfolio/useApiData';
import { networkName, usePlatformBalances } from '~/features/wallet/chain';
import FaucetCard from '~/features/wallet/FaucetCard';
import GuideButton from '~/features/guide/GuideButton';
import { api, apiEnabled } from '~/lib/api/client';
import { orderTotals, type CheckoutAction, type CheckoutOrder } from '~/lib/checkout';
import type { NavFn } from '~/lib/navigation';
import { InvestError, investOnchain, problemMessage, useKyc, type ApiAsset, type InvestStep } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { PAY_TOKENS, tokenBySym, networkById, useWallet, debit, logPayment, fmtToken, shortAddr, fakeTxHash, DEPOSIT_ADDRESS } from '~/lib/wallet';

// KEYCHAIN checkout: order summary + payment method, then processing and a
// receipt. Demo: KEYCHAIN balance, connected wallet or a crypto transfer to a
// one-time address (the design's simulated flows). Live: the single place
// that executes purchases, from the connected wallet in USDC on the platform
// network: `action` 'primary' invests on-chain (order → USDC approval →
// execution → mint), 'secondary' buys a listing of the on-chain market.

type Stage = 'select' | 'transfer' | 'processing' | 'done';

type CheckoutProps = { nav: NavFn; order: CheckoutOrder | null };

export default function Checkout({ nav, order }: CheckoutProps) {
  const live = useSession().status !== 'disabled';
  if (!order) return <EmptyCheckout nav={nav} />;
  if (!live) return <DemoCheckout nav={nav} order={order} />;
  // Live: only purchases the platform can execute are charged.
  if (!order.action) {
    return <EmptyCheckout nav={nav} title="Este pago todavía no está disponible" sub="Por ahora el checkout cobra inversiones y compras de tokens on-chain." />;
  }
  return order.action.kind === 'primary'
    ? <LivePrimaryCheckout nav={nav} order={order} action={order.action} />
    : <LiveSecondaryCheckout nav={nav} order={order} action={order.action} />;
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function EmptyCheckout({ nav, title = 'No hay nada para pagar', sub }: { nav: NavFn; title?: string; sub?: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ ...T.title, margin: '0 0 12px' }}>{title}</h1>
      {sub && <p style={{ ...T.body, margin: '-4px 0 16px' }}>{sub}</p>}
      <GhostBtn onClick={() => nav('primario')} style={{ width: 'auto', padding: '0 18px', margin: '0 auto' }}>Explorar proyectos</GhostBtn>
    </div>
  );
}

const noticeBtn = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, height: 34, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--text)', color: 'var(--surface)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700 } as const;

const methodIcon = (icon: ReactNode) => (
  <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface2)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
);

const orderLabel = (order: CheckoutOrder) => (order.items.length === 1 ? order.items[0].name : `${order.items.length} ítems`);

function OrderSummary({ order, isMobile, rows, total }: { order: CheckoutOrder; isMobile: boolean; rows: ReactNode; total: number }) {
  return (
    <PCard style={{ padding: isMobile ? '16px' : '20px 22px' }}>
      <div style={{ ...T.label, marginBottom: 12 }}>Resumen de la orden</div>
      {order.items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border-l)' }}>
          {it.img
            ? <img src={it.img} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
            : <span style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ter)', flexShrink: 0 }}>{Icons.token}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 2 }}>{it.qty.toLocaleString('es-AR')} × {fmtUSD2(it.unit)}{it.meta ? ` · ${it.meta}` : ''}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{fmtUSD2(it.qty * it.unit)}</div>
        </div>
      ))}
      {rows}
      <div style={{ borderTop: '1px solid var(--border-l)', marginTop: 6, paddingTop: 6 }}>
        <KV k="Total" v={`${fmtUSD2(total)}`} strong />
      </div>
    </PCard>
  );
}

type CheckoutFrameProps = {
  isMobile: boolean;
  order: CheckoutOrder;
  stage: Stage;
  /** Top link: "Volver" on the method step, "Cambiar método" after it. */
  onBack: () => void;
  backDisabled: boolean;
  summary: ReactNode;
  /** Payment methods (left column under "Método de pago"). */
  methods: ReactNode;
  trust: string;
  total: number;
  canPay: boolean;
  onPay: () => void;
  payLabel: string;
  mobilePayLabel: string;
  transfer?: ReactNode;
  processing: ReactNode;
  done: ReactNode;
  children?: ReactNode;
};

/** The design's checkout page: method step, transfer (demo), processing and receipt. */
function CheckoutFrame({ isMobile, order, stage, onBack, backDisabled, summary, methods, trust, total, canPay, onPay, payLabel, mobilePayLabel, transfer, processing, done, children }: CheckoutFrameProps) {
  return (
    <div style={{ padding: isMobile ? '14px 16px 120px' : '28px 32px 48px', maxWidth: 1040, margin: '0 auto' }}>
      {stage !== 'done' && (
        <button type="button" onClick={onBack} disabled={backDisabled}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, marginBottom: 14, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13, opacity: backDisabled ? 0.4 : 1 }}>
          {Ico.back} {stage === 'select' ? 'Volver' : 'Cambiar método'}
        </button>
      )}

      <AnimatePresence mode="wait">
        {stage === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <h1 style={{ ...T.title, fontSize: isMobile ? 22 : 26, margin: '0 0 4px' }}>Checkout</h1>
            <div style={{ ...T.body, marginBottom: 20 }}>{order.title ? `${order.title} · ` : ''}Pago seguro con liquidación on-chain.<GuideButton tour="checkout" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 380px', gap: isMobile ? 16 : 24, alignItems: 'start' }}>
              {isMobile && summary}
              <div>
                <div style={T.label}>Método de pago</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{methods}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>
                  <span style={{ display: 'flex', color: 'var(--pos)' }}>{Ico.shield}</span>
                  {trust}
                </div>
              </div>
              {!isMobile && (
                <div data-guide="checkout-summary" style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {summary}
                  <PrimaryBtn disabled={!canPay} onClick={onPay}>{payLabel}</PrimaryBtn>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Al pagar aceptás los términos de la emisión.</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'transfer' && transfer && (
          <motion.div key="transfer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ maxWidth: 460, margin: '0 auto' }}>
            <PCard style={{ padding: isMobile ? 18 : 24 }}>{transfer}</PCard>
          </motion.div>
        )}

        {stage === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ maxWidth: 460, margin: '0 auto' }}>
            <PCard style={{ padding: isMobile ? 18 : 24 }}>{processing}</PCard>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 480, margin: '0 auto', paddingTop: isMobile ? 10 : 24 }}>
            <PCard style={{ padding: isMobile ? 20 : 28, textAlign: 'center' }}>{done}</PCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phones: summary total + pay button pinned above the bottom bar */}
      {isMobile && stage === 'select' && (
        <div data-guide="checkout-pay" style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(64px + env(safe-area-inset-bottom))', zIndex: 60, padding: '10px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border-l)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Total</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{fmtUSD2(total)}</div>
          </div>
          <PrimaryBtn disabled={!canPay} onClick={onPay}>{mobilePayLabel}</PrimaryBtn>
        </div>
      )}

      {children}
    </div>
  );
}

/** Receipt actions: where the order says to continue, or back to the projects. */
function DoneActions({ nav, order }: { nav: NavFn; order: CheckoutOrder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <PrimaryBtn onClick={() => nav(order.done?.route || 'pertenencias', order.done?.data)}>{order.done?.label || 'Ver en Mis Pertenencias'}</PrimaryBtn>
      <GhostBtn onClick={() => nav('primario')}>Seguir explorando</GhostBtn>
    </div>
  );
}

const goBackTo = (nav: NavFn, order: CheckoutOrder) => () => (order.back ? nav(order.back.route, order.back.data) : nav('primario'));

// ─── Demo ─────────────────────────────────────────────────────────────────────

const METHODS = [
  { id: 'balance', title: 'Saldo KEYCHAIN', icon: Ico.wallet },
  { id: 'wallet', title: 'Wallet conectada', icon: Ico.link },
  { id: 'transfer', title: 'Transferencia cripto', icon: Ico.qr },
] as const;
type MethodId = typeof METHODS[number]['id'];

function DemoCheckout({ nav, order }: { nav: NavFn; order: CheckoutOrder }) {
  const isMobile = useMobile();
  const account = useActiveAccount();
  const { balances } = useWallet();
  const [method, setMethod] = useState<MethodId>('balance');
  const [sym, setSym] = useState('USDC');
  const [net, setNet] = useState('polygon');
  const [extWallet, setExtWallet] = useState<string | null>(account?.address || null);
  const [stage, setStage] = useState<Stage>('select');
  const [hash, setHash] = useState('');
  const [depositOpen, setDepositOpen] = useState(false);

  const { subtotal, fee, total } = orderTotals(order);
  const network = networkById(net);
  const netFee = method === 'balance' ? 0 : network.fee;
  const grand = total + netFee;
  const bal = balances[sym] || 0;
  const short = method === 'balance' && bal < grand;
  const wallet = extWallet || account?.address;
  const canPay = method === 'balance' ? !short : method === 'wallet' ? !!wallet : true;
  const label = orderLabel(order);

  const pay = () => {
    setHash(fakeTxHash());
    setStage(method === 'transfer' ? 'transfer' : 'processing');
  };
  const settle = () => {
    const what = `${order.title || 'Pago'} — ${label}`;
    if (method === 'balance') debit(sym, grand, what, { source: order.source });
    else logPayment(what, grand, sym, { source: order.source, net, hash });
    setStage('done');
  };

  const steps: Record<MethodId, ProgressStep[]> = {
    balance: [
      { label: 'Reservando saldo', sub: fmtToken(grand, sym), ms: 700 },
      { label: 'Ejecutando contrato', sub: 'Liquidación on-chain', ms: 1200 },
      { label: order.source === 'Tokenizaciones' || order.source === 'Mercado Secundario' ? 'Emitiendo tus tokens' : 'Confirmando pago', ms: 900 },
    ],
    wallet: [
      { label: 'Firma en tu wallet', sub: shortAddr(wallet), ms: 1300 },
      { label: `Enviando por ${network.name}`, sub: `Hash ${shortAddr(hash)}`, ms: 1300 },
      { label: 'Confirmando pago', ms: 900 },
    ],
    transfer: [
      { label: 'Pago detectado', sub: `Hash ${shortAddr(hash)}`, ms: 1000 },
      { label: `Confirmando en ${network.name}`, sub: `${network.confirmations} confirmaciones`, ms: 1500 },
      { label: 'Confirmando pago', ms: 800 },
    ],
  };

  const summary = (
    <OrderSummary order={order} isMobile={isMobile} total={grand} rows={(
      <>
        <KV k="Subtotal" v={fmtUSD2(subtotal)} />
        {fee > 0 && <KV k="Fee de plataforma" v={fmtUSD2(fee)} />}
        {netFee > 0 && <KV k={`Red (${network.name})`} v={fmtUSD2(netFee)} />}
      </>
    )} />
  );

  // ── Method details ──────────────────────────────────────────────────────
  // TODO(FilterSelect): the design shows the balance formatted ("12.480,5"); FilterOption.count is a number for now.
  const tokenOpts = PAY_TOKENS.map(s => ({ value: s, label: s, count: method === 'balance' ? Math.round((balances[s] || 0) * 100) / 100 : undefined }));
  const netOpts = tokenBySym(sym).networks.map(id => ({ value: id, label: networkById(id).name }));
  const details = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 2px 2px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <FilterSelect label="Moneda" value={sym} onChange={setSym} options={tokenOpts} allValue={sym} block={isMobile} />
        {method !== 'balance' && <FilterSelect label="Red" value={net} onChange={setNet} options={netOpts} allValue={net} block={isMobile} align="right" />}
      </div>
      {method === 'balance' && (short ? (
        <Notice>Te faltan <b>{fmtToken(grand - bal, sym)}</b>. Depositá cripto o elegí otro método.
          <button type="button" onClick={() => setDepositOpen(true)} style={noticeBtn}>{Ico.down} Depositar {sym}</button>
        </Notice>
      ) : (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Después del pago te quedan <b style={{ color: 'var(--text)' }}>{fmtToken(bal - grand, sym)}</b>. Sin comisión de red.</div>
      ))}
      {method === 'wallet' && (wallet ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--surface2)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pos)' }} />
          <span style={{ ...T.mono, fontSize: 13, color: 'var(--text)', flex: 1 }}>{shortAddr(wallet)}</span>
          {!account && <button type="button" onClick={() => setExtWallet(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: 12.5 }}>Desconectar</button>}
        </div>
      ) : (
        <GhostBtn onClick={() => setExtWallet('0x71C2a4D0b93E5f8a1c6B7d2E9F04a3C8b5D1e62F')}>{Ico.link} Conectar wallet</GhostBtn>
      ))}
      {method === 'transfer' && (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Te damos una dirección y el monto exacto para enviar desde cualquier wallet o exchange.</div>
      )}
    </div>
  );

  const subFor = (id: MethodId) => ({
    balance: `Disponible ${fmtToken(balances[sym] || 0, sym)}`,
    wallet: wallet ? shortAddr(wallet) : 'MetaMask, Coinbase, WalletConnect…',
    transfer: 'Desde cualquier wallet o exchange',
  }[id]);

  const methods = METHODS.map(m => (
    <div key={m.id}>
      <OptionRow selected={method === m.id} onClick={() => setMethod(m.id)} title={m.title} sub={subFor(m.id)} icon={methodIcon(m.icon)} />
      <AnimatePresence initial={false}>
        {method === m.id && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'visible' }}>
            {details}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ));

  const token = tokenBySym(sym);
  const transfer = (
    <>
      <div style={{ ...T.title, fontSize: 20, textAlign: 'center' }}>Enviá exactamente</div>
      <div style={{ textAlign: 'center', margin: '6px 0 16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 30, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          <TokenIcon src={token.icon} badge={network.icon} size={30} /> {fmtToken(grand, sym)}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><QRCode value={DEPOSIT_ADDRESS} logo={token.icon} /></div>
      <CopyField label={`Dirección (${network.name})`} value={DEPOSIT_ADDRESS} />
      <div style={{ marginTop: 10 }}><CopyField label="Monto exacto" value={grand.toFixed(2)} mono={false} /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '14px 0', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{Ico.clock} La orden se reserva por 15 minutos</div>
      <Notice>Enviá solo <b>{sym}</b> por <b>{network.name}</b>. Un monto distinto demora la acreditación.</Notice>
      <div style={{ marginTop: 14 }}><PrimaryBtn onClick={() => setStage('processing')}>Ya envié el pago</PrimaryBtn></div>
    </>
  );

  const processing = (
    <>
      <div style={{ ...T.title, fontSize: 20, marginBottom: 4 }}>Procesando pago</div>
      <div style={{ ...T.body, marginBottom: 12 }}>{fmtToken(grand, sym)} · {label}</div>
      <ProgressSteps steps={steps[method]} onDone={settle} />
    </>
  );

  const done = (
    <>
      <SuccessMark />
      <div role="status" style={{ ...T.title, fontSize: 24 }}>¡Pago confirmado!</div>
      <div style={{ ...T.body, marginBottom: 18 }}>{label}</div>
      <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)', marginBottom: 14 }}>
        <KV k="Total pagado" v={fmtToken(grand, sym)} strong />
        <KV k="Método" v={METHODS.find(m => m.id === method)?.title} />
        {method !== 'balance' && <KV k="Red" v={network.name} />}
        <KV k="Comprobante" v={shortAddr(hash)} mono />
        {method === 'balance' && <KV k={`Saldo ${sym}`} v={fmtToken(balances[sym] || 0, sym)} />}
      </div>
      <DoneActions nav={nav} order={order} />
    </>
  );

  return (
    <CheckoutFrame isMobile={isMobile} order={order} stage={stage}
      onBack={stage === 'select' ? goBackTo(nav, order) : () => setStage('select')} backDisabled={stage === 'processing'}
      summary={summary} methods={methods} trust="Contratos auditados · Fondos en custodia hasta liquidar · Comprobante on-chain"
      total={grand} canPay={canPay} onPay={pay}
      payLabel={method === 'transfer' ? `Generar pago · ${fmtUSD2(grand)}` : `Pagar ${fmtUSD2(grand)}`}
      mobilePayLabel={method === 'transfer' ? 'Generar pago' : 'Pagar'}
      transfer={transfer} processing={processing} done={done}>
      <CryptoDeposit open={depositOpen} onClose={() => setDepositOpen(false)} defaultSym={sym} />
    </CheckoutFrame>
  );
}

// ─── Live ─────────────────────────────────────────────────────────────────────

/** Why the user can't pay right now (null = can pay). */
type LiveBlocker = { note: ReactNode; tone?: 'warn' | 'info'; cta?: { label: string; onClick: () => void } } | null;
type LiveReceipt = { total: number; tokens: number; hash: string | null; note?: string };
type LiveFailure = { message: string; followUp: 'kyc' | 'funds' | null };

/** What a live purchase needs from its kind (primary offering or secondary market). */
type LiveEngine = {
  total: number;
  rows: ReactNode;
  blocker: LiveBlocker;
  steps: ProgressStep[];
  run: (ctx: { account: Account; wallet: Wallet | undefined; onStep: (index: number) => void }) => Promise<LiveReceipt>;
  explain: (e: unknown) => LiveFailure;
};

/** Why a signed-in user can't buy yet (completed on the profile page). */
type BuyGate = 'login' | 'onboarding' | 'none' | 'pending' | 'rejected';
const GATE_COPY: Record<BuyGate, { cta: string; note: string }> = {
  login: { cta: 'Iniciar sesión', note: 'Iniciá sesión con tu wallet para pagar.' },
  onboarding: { cta: 'Completar mi perfil', note: 'Completá tu perfil para poder invertir.' },
  none: { cta: 'Verificar mi identidad', note: 'Para invertir necesitás verificar tu identidad (KYC).' },
  pending: { cta: 'Ver estado del KYC', note: 'Tu verificación está en revisión. Te avisamos cuando puedas invertir.' },
  rejected: { cta: 'Revisar mi KYC', note: 'Tu verificación fue rechazada. Revisá tus datos en el perfil.' },
};

function useBuyGate(nav: NavFn): { gate: BuyGate | null; blocker: LiveBlocker } {
  const session = useSession();
  useKyc(); // re-reads the session when the KYC status changed since login
  const user = session.user;
  const gate: BuyGate | null = session.status !== 'authenticated' || !user
    ? 'login'
    : !user.onboarded ? 'onboarding' : user.kycStatus === 'verified' ? null : user.kycStatus;
  if (!gate) return { gate, blocker: null };
  return { gate, blocker: { note: GATE_COPY[gate].note, cta: { label: GATE_COPY[gate].cta, onClick: () => nav(gate === 'login' ? 'login' : 'perfil') } } };
}

const INVEST_INDEX: Record<InvestStep, number> = { order: 0, approve: 1, execute: 2, minting: 3, done: 4 };
const INVEST_STEPS: ProgressStep[] = [
  { label: 'Creando la orden', sub: 'La plataforma fija el precio' },
  { label: 'Autorizá el USDC en tu wallet', sub: 'Aprobación exacta al vault del activo' },
  { label: 'Ejecutando la inversión' },
  { label: 'Emitiendo tus tokens', sub: 'Se acreditan en tu wallet' },
];

// Investment errors reach the page as the messages investOnchain throws.
const INSUFFICIENT_BALANCE = problemMessage({ title: '', status: 409, code: 'conflict', reason: 'insufficient_balance' }, '');
const NOT_VERIFIED = problemMessage({ title: '', status: 403, code: 'forbidden', reason: 'not_verified' }, '');
const PAUSED_TITLE = 'Investments are paused';
const API_TITLES: Record<string, string> = {
  'Not enough tokens available': 'No quedan suficientes tokens disponibles para esa cantidad.',
};

function LivePrimaryCheckout({ nav, order, action }: { nav: NavFn; order: CheckoutOrder; action: Extract<CheckoutAction, { kind: 'primary' }> }) {
  const settings = usePublicSettings();
  const { gate, blocker: gateBlocker } = useBuyGate(nav);
  const asset = useApiData<ApiAsset>(apiEnabled ? `checkout:asset:${action.assetId}` : null, async () =>
    (await api.GET('/v1/assets/{idOrSlug}', { params: { path: { idOrSlug: String(action.assetId) } } })).data ?? null);
  const pauseNote = settings.data?.maintenanceMessage || 'Las inversiones están pausadas temporalmente.';
  const feePct = settings.data?.displayFeePercent ?? null;
  const pool = asset.data?.pool ?? null;
  // The API charges quantity × token price; the platform fee is inside that price.
  const { subtotal } = orderTotals(order);

  let blocker: LiveBlocker = null;
  if (gate === 'login') blocker = gateBlocker;
  else if (settings.data?.investmentsPaused) blocker = { note: pauseNote };
  else if (!asset.data) blocker = asset.loading ? { note: 'Cargando el activo…', tone: 'info' } : { note: 'No encontramos este activo.', cta: { label: 'Explorar proyectos', onClick: () => nav('primario') } };
  else if (pool?.status !== 'active') {
    blocker = { note: pool?.status === 'deploying' || pool?.status === 'granting_roles' ? 'El activo se está desplegando on-chain. Volvé en unos minutos.' : 'Este activo todavía no está tokenizado on-chain.' };
  } else if (gate) blocker = gateBlocker;

  const engine: LiveEngine = {
    total: subtotal,
    rows: (
      <>
        <KV k="Subtotal" v={fmtUSD2(subtotal)} />
        {feePct !== null && <KV k={`Fee de plataforma (${feePct.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%, incluida)`} v={fmtUSD2(subtotal * feePct / 100)} />}
      </>
    ),
    blocker,
    steps: INVEST_STEPS,
    run: async ({ account, wallet, onStep }) => {
      const o = await investOnchain({ assetId: action.assetId, quantity: action.quantity, account, wallet, onStep: s => onStep(INVEST_INDEX[s]) });
      return { total: o.total, tokens: o.tokenAmount ?? o.quantity, hash: o.txHash };
    },
    explain: e => {
      const msg = e instanceof Error ? e.message : 'La inversión falló.';
      // The API's machine-readable reason decides the follow-up (never the message text).
      const reason = e instanceof InvestError ? e.reason : null;
      const paused = reason === 'investments_paused' || msg === PAUSED_TITLE;
      if (paused) settings.reload();
      const followUp = reason === 'not_verified' || msg === NOT_VERIFIED ? 'kyc' : reason === 'insufficient_balance' || msg === INSUFFICIENT_BALANCE ? 'funds' : null;
      return { message: paused ? pauseNote : API_TITLES[msg] ?? msg, followUp };
    },
  };
  return <LiveCheckoutView nav={nav} order={order} engine={engine} trust="Token ERC-3643 con identidad verificada · Fondos en un vault on-chain · Comprobante on-chain" />;
}

const TRADE_INDEX: Record<TradeStep, number> = { approve: 0, confirm: 1, sync: 2, done: 3 };
const TRADE_STEPS: ProgressStep[] = [
  { label: 'Aprobá el pago en USDC en tu wallet', sub: 'Aprobación exacta al mercado' },
  { label: 'Confirmá la compra en tu wallet' },
  { label: 'Actualizando el mercado' },
];

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function LiveSecondaryCheckout({ nav, order, action }: { nav: NavFn; order: CheckoutOrder; action: Extract<CheckoutAction, { kind: 'secondary' }> }) {
  const account = useActiveAccount();
  const { gate, blocker: gateBlocker } = useBuyGate(nav);
  const listings = useMarketListings();
  const info = useMarketInfo();
  const listing = listings.data?.items.find(l => l.id === action.listingId) ?? null;
  const market = info.data;
  // Whole tokens at the listing's price: exactly what the contract charges (the fee comes out of the seller's proceeds).
  const total = listing ? action.quantity * listing.pricePerToken : orderTotals(order).subtotal;

  let blocker: LiveBlocker = null;
  if (gate === 'login') blocker = gateBlocker;
  else if (!listings.data || !market) {
    blocker = listings.loading || info.loading ? { note: 'Cargando la oferta…', tone: 'info' } : { note: 'No pudimos cargar el mercado secundario. Probá de nuevo en unos minutos.' };
  } else if (!market.enabled) blocker = { note: 'El mercado secundario no está disponible en esta red.' };
  else if (market.paused) blocker = { note: 'El mercado secundario está pausado en este momento.' };
  else if (!listing || listing.status !== 'active' || Math.floor(listing.available) < action.quantity) {
    blocker = { note: 'Esta oferta ya no está disponible en esa cantidad.', cta: { label: 'Volver al mercado', onClick: () => nav('secundario') } };
  } else if (account && sameAddress(listing.sellerWallet, account.address)) blocker = { note: 'No podés comprar tu propia oferta.' };
  else if (gate) blocker = gateBlocker;

  const engine: LiveEngine = {
    total,
    rows: (
      <>
        <KV k="Subtotal" v={fmtUSD2(total)} />
        {market && market.feeBps > 0 && <KV k="Fee del mercado" v="La paga el vendedor" />}
      </>
    ),
    blocker,
    steps: TRADE_STEPS,
    run: async ({ account: buyer, wallet, onStep }) => {
      if (!market || !listing) throw new Error('Esta oferta ya no está disponible.');
      const r = await buyOnchain({ info: market, listing, quantity: action.quantity, account: buyer, wallet, onStep: s => onStep(TRADE_INDEX[s]) });
      return { total, tokens: action.quantity, hash: null, note: r.synced ? undefined : 'La compra ya está on-chain; tu portafolio se actualiza en unos segundos.' };
    },
    explain: e => {
      const message = e instanceof Error ? e.message : 'No se pudo completar la compra.';
      return { message, followUp: /USDC suficiente/i.test(message) ? 'funds' : /KYC/.test(message) ? 'kyc' : null };
    },
  };
  return <LiveCheckoutView nav={nav} order={order} engine={engine} trust="Compra directa al contrato del mercado · Token ERC-3643 · Comprobante on-chain" />;
}

function LiveCheckoutView({ nav, order, engine, trust }: { nav: NavFn; order: CheckoutOrder; engine: LiveEngine; trust: string }) {
  const isMobile = useMobile();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const balances = usePlatformBalances(account?.address);
  const network = networkName(balances.info);
  const gasSymbol = balances.info?.nativeSymbol ?? balances.native?.symbol ?? 'POL';
  const payNet = platformNetwork(network, balances.chain?.id, gasSymbol);
  const usdc = balances.usdc ? Number(balances.usdc.displayValue) : null;
  const [stage, setStage] = useState<Stage>('select');
  const [step, setStep] = useState(0);
  const [failure, setFailure] = useState<LiveFailure | null>(null);
  const [receipt, setReceipt] = useState<LiveReceipt | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);

  const { total, blocker } = engine;
  const short = usdc !== null && usdc + 1e-9 < total;
  const canPay = Boolean(account) && !blocker && !short;
  const label = orderLabel(order);
  const working = stage === 'processing' && failure === null;

  const pay = async () => {
    if (!account) return nav('login');
    setStage('processing');
    setFailure(null);
    setStep(0);
    try {
      const r = await engine.run({ account, wallet, onStep: setStep });
      setReceipt(r);
      setStage('done');
    } catch (e) {
      setFailure(engine.explain(e));
    } finally {
      balances.refetch();
    }
  };

  const summary = <OrderSummary order={order} isMobile={isMobile} total={total} rows={engine.rows} />;

  const details = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 2px 2px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <FilterSelect label="Moneda" value="USDC" onChange={() => undefined} options={[{ value: 'USDC', label: 'USDC', count: usdc === null ? undefined : Math.floor(usdc * 100) / 100 }]} allValue="USDC" block={isMobile} />
        <FilterSelect label="Red" value={PLATFORM_NET} onChange={() => undefined} options={[{ value: PLATFORM_NET, label: network }]} allValue={PLATFORM_NET} block={isMobile} align="right" />
      </div>
      {account ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--surface2)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pos)' }} />
          <span title={account.address} style={{ ...T.mono, fontSize: 13, color: 'var(--text)', flex: 1 }}>{shortAddr(account.address)}</span>
        </div>
      ) : (
        <GhostBtn onClick={() => nav('login')}>{Ico.link} Conectar wallet</GhostBtn>
      )}
      {blocker ? (
        <Notice tone={blocker.tone}>{blocker.note}
          {blocker.cta && <button type="button" onClick={blocker.cta.onClick} style={noticeBtn}>{blocker.cta.label}</button>}
        </Notice>
      ) : short && usdc !== null ? (
        <Notice>Te faltan <b>{fmtToken(total - usdc, 'USDC')}</b> en tu wallet. Depositá USDC en la red {network} para pagar.
          <button type="button" onClick={() => setDepositOpen(true)} style={noticeBtn}>{Ico.down} Depositar USDC</button>
        </Notice>
      ) : (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>
          {usdc === null
            ? (account ? 'Cargando tu saldo de USDC…' : 'Conectá tu wallet para pagar con USDC.')
            : <>Después del pago te quedan <b style={{ color: 'var(--text)' }}>{fmtToken(usdc - total, 'USDC')}</b>. El gas de la red se paga en {gasSymbol}.</>}
        </div>
      )}
    </div>
  );

  const methods = (
    <div>
      <OptionRow selected title="Wallet conectada" icon={methodIcon(Ico.link)}
        sub={account ? `${shortAddr(account.address)} · ${usdc === null ? '…' : fmtToken(usdc, 'USDC')}` : 'MetaMask, Coinbase, WalletConnect…'} />
      {details}
    </div>
  );

  const processing = (
    <>
      <div style={{ ...T.title, fontSize: 20, marginBottom: 4 }}>Procesando pago</div>
      <div style={{ ...T.body, marginBottom: 12 }}>{fmtToken(total, 'USDC')} · {label}</div>
      <ProgressSteps steps={engine.steps} current={step} failed={failure !== null} />
      {failure && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <Notice>{failure.message}</Notice>
          <PrimaryBtn onClick={() => void pay()}>Reintentar</PrimaryBtn>
          {failure.followUp === 'kyc' && <GhostBtn onClick={() => nav('perfil')}>Ir a mi perfil</GhostBtn>}
          {failure.followUp === 'funds' && account && <GhostBtn onClick={() => setDepositOpen(true)}>{Ico.down} Depositar USDC</GhostBtn>}
          {failure.followUp === 'funds' && <FaucetCard onFunded={() => { setFailure(null); setStage('select'); balances.refetch(); }} />}
        </div>
      )}
    </>
  );

  const done = receipt && (
    <>
      <SuccessMark />
      <div role="status" style={{ ...T.title, fontSize: 24 }}>¡Pago confirmado!</div>
      <div style={{ ...T.body, marginBottom: 18 }}>{label}</div>
      <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)', marginBottom: 14 }}>
        <KV k="Total pagado" v={fmtToken(receipt.total, 'USDC')} strong />
        <KV k="Método" v="Wallet conectada" />
        <KV k="Red" v={network} />
        <KV k="Tokens" v={receipt.tokens.toLocaleString('es-AR')} />
        {receipt.hash && <KV k="Comprobante" v={<span title={receipt.hash}>{shortAddr(receipt.hash)}</span>} mono />}
      </div>
      {receipt.note && <div style={{ ...T.body, fontSize: 12.5, marginBottom: 14 }}>{receipt.note}</div>}
      <DoneActions nav={nav} order={order} />
    </>
  );

  return (
    <CheckoutFrame isMobile={isMobile} order={order} stage={stage}
      onBack={stage === 'select' ? goBackTo(nav, order) : () => { setFailure(null); setStage('select'); }} backDisabled={working}
      summary={summary} methods={methods} trust={trust}
      total={total} canPay={canPay} onPay={() => void pay()}
      payLabel={`Pagar ${fmtUSD2(total)}`} mobilePayLabel="Pagar"
      processing={processing} done={done}>
      {account && (
        <CryptoDeposit open={depositOpen} onClose={() => setDepositOpen(false)} defaultSym={LIVE_USDC.sym}
          live={{ address: account.address, network: payNet, usdc, refresh: balances.refetch }} />
      )}
    </CheckoutFrame>
  );
}
