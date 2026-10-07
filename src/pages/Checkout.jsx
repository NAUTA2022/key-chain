import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveAccount } from 'thirdweb/react';
import { PCard, Icons } from '../components/ui';
import { useMobile } from '../hooks/useMobile';
import FilterSelect from '../components/FilterSelect';
import CryptoDeposit from '../components/payments/CryptoDeposit';
import { OptionRow, PrimaryBtn, GhostBtn, KV, Notice, QRCode, CopyField, ProgressSteps, SuccessMark, TokenIcon } from '../components/payments/PayKit';
import { T, Ico } from '../components/payments/payTheme';
import { NETWORKS, PAY_TOKENS, tokenBySym, useWallet, debit, logPayment, fmtToken, shortAddr, fakeTxHash, DEPOSIT_ADDRESS } from '../lib/wallet';
import { orderTotals } from '../lib/checkout';
import { fmtUSD2 } from '../data';

// KEYCHAIN checkout: order summary + payment method (KEYCHAIN balance,
// connected wallet or a crypto transfer to a one-time address), then
// processing and a receipt. Accepts the order from lib/checkout.js and, for
// older links, the legacy { asset, qty } shape.
const METHODS = [
  { id: 'balance', title: 'Saldo KEYCHAIN', icon: Ico.wallet },
  { id: 'wallet', title: 'Wallet conectada', icon: Ico.link },
  { id: 'transfer', title: 'Transferencia cripto', icon: Ico.qr },
];

function normalize(data) {
  if (data?.items) return data;
  const a = data?.asset;
  if (!a) return null;
  const qty = data.qty || 1;
  return {
    title: 'Inversión', source: 'Tokenizaciones', fee: qty * a.tokenPrice * 0.005,
    items: [{ name: a.name, img: a.img, qty, unit: a.tokenPrice, meta: `${a.apy}% APY · ${a.cat}` }],
    back: { route: 'detalle', data: a }, done: { route: 'pertenencias', label: 'Ver en Mis Pertenencias' },
  };
}

export default function Checkout({ nav, data }) {
  const order = normalize(data);
  const isMobile = useMobile();
  const account = useActiveAccount();
  const { balances } = useWallet();
  const [method, setMethod] = useState('balance');
  const [sym, setSym] = useState('USDC');
  const [net, setNet] = useState('polygon');
  const [extWallet, setExtWallet] = useState(account?.address || null);
  const [stage, setStage] = useState('select'); // select | transfer | processing | done
  const [hash, setHash] = useState('');
  const [depositOpen, setDepositOpen] = useState(false);

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ ...T.title, marginBottom: 12 }}>No hay nada para pagar</div>
        <GhostBtn onClick={() => nav('primario')} style={{ width: 'auto', padding: '0 18px', margin: '0 auto' }}>Explorar proyectos</GhostBtn>
      </div>
    );
  }

  const { subtotal, fee, total } = orderTotals(order);
  const network = NETWORKS[net];
  const netFee = method === 'balance' ? 0 : network.fee;
  const grand = total + netFee;
  const bal = balances[sym] || 0;
  const short = method === 'balance' && bal < grand;
  const wallet = extWallet || account?.address;
  const canPay = method === 'balance' ? !short : method === 'wallet' ? !!wallet : true;
  const goBack = () => (order.back ? nav(order.back.route, order.back.data) : nav('primario'));
  const label = order.items.length === 1 ? order.items[0].name : `${order.items.length} ítems`;

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

  const steps = {
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
  }[method];

  // ── Summary card ────────────────────────────────────────────────────────
  const summary = (
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
      <KV k="Subtotal" v={fmtUSD2(subtotal)} />
      {fee > 0 && <KV k="Fee de plataforma" v={fmtUSD2(fee)} />}
      {netFee > 0 && <KV k={`Red (${network.name})`} v={fmtUSD2(netFee)} />}
      <div style={{ borderTop: '1px solid var(--border-l)', marginTop: 6, paddingTop: 6 }}>
        <KV k="Total" v={`${fmtUSD2(grand)}`} strong />
      </div>
    </PCard>
  );

  // ── Method details ──────────────────────────────────────────────────────
  const tokenOpts = PAY_TOKENS.map(s => ({ value: s, label: s, count: method === 'balance' ? (balances[s] || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : null }));
  const netOpts = tokenBySym(sym).networks.map(id => ({ value: id, label: NETWORKS[id].name }));
  const details = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 2px 2px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <FilterSelect label="Moneda" value={sym} onChange={setSym} options={tokenOpts} allValue={sym} block={isMobile} />
        {method !== 'balance' && <FilterSelect label="Red" value={net} onChange={setNet} options={netOpts} allValue={net} block={isMobile} align="right" />}
      </div>
      {method === 'balance' && (short ? (
        <Notice>Te faltan <b>{fmtToken(grand - bal, sym)}</b>. Depositá cripto o elegí otro método.
          <button onClick={() => setDepositOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, height: 34, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--text)', color: 'var(--surface)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700 }}>{Ico.down} Depositar {sym}</button>
        </Notice>
      ) : (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Después del pago te quedan <b style={{ color: 'var(--text)' }}>{fmtToken(bal - grand, sym)}</b>. Sin comisión de red.</div>
      ))}
      {method === 'wallet' && (wallet ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--surface2)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pos)' }} />
          <span style={{ ...T.mono, fontSize: 13, color: 'var(--text)', flex: 1 }}>{shortAddr(wallet)}</span>
          {!account && <button onClick={() => setExtWallet(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: 12.5 }}>Desconectar</button>}
        </div>
      ) : (
        <GhostBtn onClick={() => setExtWallet('0x71C2a4D0b93E5f8a1c6B7d2E9F04a3C8b5D1e62F')}>{Ico.link} Conectar wallet</GhostBtn>
      ))}
      {method === 'transfer' && (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Te damos una dirección y el monto exacto para enviar desde cualquier wallet o exchange.</div>
      )}
    </div>
  );

  const subFor = (id) => ({
    balance: `Disponible ${fmtToken(balances[sym] || 0, sym)}`,
    wallet: wallet ? shortAddr(wallet) : 'MetaMask, Coinbase, WalletConnect…',
    transfer: 'Desde cualquier wallet o exchange',
  }[id]);

  const payLabel = method === 'transfer' ? `Generar pago · ${fmtUSD2(grand)}` : `Pagar ${fmtUSD2(grand)}`;

  return (
    <div style={{ padding: isMobile ? '14px 16px 120px' : '28px 32px 48px', maxWidth: 1040, margin: '0 auto' }}>
      {stage !== 'done' && (
        <button onClick={stage === 'select' ? goBack : () => setStage('select')} disabled={stage === 'processing'}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, marginBottom: 14, cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13, opacity: stage === 'processing' ? 0.4 : 1 }}>
          {Ico.back} {stage === 'select' ? 'Volver' : 'Cambiar método'}
        </button>
      )}

      <AnimatePresence mode="wait">
        {stage === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ ...T.title, fontSize: isMobile ? 22 : 26, marginBottom: 4 }}>Checkout</div>
            <div style={{ ...T.body, marginBottom: 20 }}>{order.title ? `${order.title} · ` : ''}Pago seguro con liquidación on-chain.</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 380px', gap: isMobile ? 16 : 24, alignItems: 'start' }}>
              {isMobile && summary}
              <div>
                <div style={T.label}>Método de pago</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {METHODS.map(m => (
                    <div key={m.id}>
                      <OptionRow selected={method === m.id} onClick={() => setMethod(m.id)} title={m.title} sub={subFor(m.id)}
                        icon={<span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface2)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{m.icon}</span>} />
                      <AnimatePresence initial={false}>
                        {method === m.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'visible' }}>
                            {details}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>
                  <span style={{ display: 'flex', color: 'var(--pos)' }}>{Ico.shield}</span>
                  Contratos auditados · Fondos en custodia hasta liquidar · Comprobante on-chain
                </div>
              </div>
              {!isMobile && (
                <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {summary}
                  <PrimaryBtn disabled={!canPay} onClick={pay}>{payLabel}</PrimaryBtn>
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Al pagar aceptás los términos de la emisión.</div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'transfer' && (
          <motion.div key="transfer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ maxWidth: 460, margin: '0 auto' }}>
            <PCard style={{ padding: isMobile ? 18 : 24 }}>
              <div style={{ ...T.title, fontSize: 20, textAlign: 'center' }}>Enviá exactamente</div>
              <div style={{ textAlign: 'center', margin: '6px 0 16px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 30, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                  <TokenIcon src={tokenBySym(sym).icon} badge={network.icon} size={30} /> {fmtToken(grand, sym)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><QRCode value={DEPOSIT_ADDRESS} logo={tokenBySym(sym).icon} /></div>
              <CopyField label={`Dirección (${network.name})`} value={DEPOSIT_ADDRESS} />
              <div style={{ marginTop: 10 }}><CopyField label="Monto exacto" value={grand.toFixed(2)} mono={false} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '14px 0', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{Ico.clock} La orden se reserva por 15 minutos</div>
              <Notice>Enviá solo <b>{sym}</b> por <b>{network.name}</b>. Un monto distinto demora la acreditación.</Notice>
              <div style={{ marginTop: 14 }}><PrimaryBtn onClick={() => setStage('processing')}>Ya envié el pago</PrimaryBtn></div>
            </PCard>
          </motion.div>
        )}

        {stage === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ maxWidth: 460, margin: '0 auto' }}>
            <PCard style={{ padding: isMobile ? 18 : 24 }}>
              <div style={{ ...T.title, fontSize: 20, marginBottom: 4 }}>Procesando pago</div>
              <div style={{ ...T.body, marginBottom: 12 }}>{fmtToken(grand, sym)} · {label}</div>
              <ProgressSteps steps={steps} onDone={settle} />
            </PCard>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 480, margin: '0 auto', paddingTop: isMobile ? 10 : 24 }}>
            <PCard style={{ padding: isMobile ? 20 : 28, textAlign: 'center' }}>
              <SuccessMark />
              <div style={{ ...T.title, fontSize: 24 }}>¡Pago confirmado!</div>
              <div style={{ ...T.body, marginBottom: 18 }}>{label}</div>
              <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)', marginBottom: 14 }}>
                <KV k="Total pagado" v={fmtToken(grand, sym)} strong />
                <KV k="Método" v={METHODS.find(m => m.id === method).title} />
                {method !== 'balance' && <KV k="Red" v={network.name} />}
                <KV k="Comprobante" v={shortAddr(hash)} mono />
                {method === 'balance' && <KV k={`Saldo ${sym}`} v={fmtToken(balances[sym] || 0, sym)} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PrimaryBtn onClick={() => nav(order.done?.route || 'pertenencias', order.done?.data)}>{order.done?.label || 'Ver en Mis Pertenencias'}</PrimaryBtn>
                <GhostBtn onClick={() => nav('primario')}>Seguir explorando</GhostBtn>
              </div>
            </PCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phones: summary total + pay button pinned above the bottom bar */}
      {isMobile && stage === 'select' && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(64px + env(safe-area-inset-bottom))', zIndex: 60, padding: '10px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border-l)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Total</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{fmtUSD2(grand)}</div>
          </div>
          <PrimaryBtn disabled={!canPay} onClick={pay}>{method === 'transfer' ? 'Generar pago' : 'Pagar'}</PrimaryBtn>
        </div>
      )}

      <CryptoDeposit open={depositOpen} onClose={() => setDepositOpen(false)} defaultSym={sym} />
    </div>
  );
}
