import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { PBtn, PInput } from '~/components/ui';
import { fmtUSD2 } from '~/data';
import WalletModal from '~/features/wallet/WalletModal';
import type { NavFn } from '~/lib/navigation';
import { type ApiHolding, useHoldings } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { type MarketInfo, type MarketListing, type TradeStep, buyOnchain, feePercent, netOfFee, sellOnchain, sellableTokens, useMyListings } from './api';

const label = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 6, display: 'block' } as const;
const note = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', lineHeight: 1.5 } as const;

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'var(--font-b)', fontSize: 13.5 }}>
      <span style={{ color: 'var(--sec)' }}>{k}</span>
      <span style={{ color: 'var(--text)', fontWeight: strong ? 800 : 600 }}>{v}</span>
    </div>
  );
}

function Summary({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: '10px 14px', margin: '14px 0' }}>{children}</div>;
}

function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return <div role="alert" style={{ ...note, color: '#ef4444', marginBottom: 12 }}>{text}</div>;
}

type Gate = { text: string; cta: string; action: () => void } | null;

/** Signed in, profile complete and KYC verified (the token only moves to verified wallets). */
function useTradeGate(nav: NavFn, verb: string): Gate {
  const { status, user } = useSession();
  const account = useActiveAccount();
  if (status !== 'authenticated' || !user || !account) return { text: `Conectá tu wallet para ${verb}.`, cta: 'Conectar wallet', action: () => nav('login') };
  if (!user.onboarded) return { text: `Completá tu perfil para ${verb}.`, cta: 'Completar mi perfil', action: () => nav('perfil') };
  if (user.kycStatus !== 'verified') {
    const pending = user.kycStatus === 'pending';
    return {
      text: pending ? 'Tu verificación (KYC) está en revisión. Te avisamos cuando puedas operar.' : `Para ${verb} necesitás verificar tu identidad (KYC): los tokens solo se transfieren entre wallets verificadas.`,
      cta: pending ? 'Ver estado del KYC' : 'Verificar mi identidad',
      action: () => nav('perfil'),
    };
  }
  return null;
}

function GateNote({ gate }: { gate: NonNullable<Gate> }) {
  return (
    <div>
      <p style={{ ...note, margin: '0 0 16px' }}>{gate.text}</p>
      <PBtn variant="accent" style={{ width: '100%' }} onClick={gate.action}>{gate.cta}</PBtn>
    </div>
  );
}

const STEP_COPY: Record<'buy' | 'sell', Record<Exclude<TradeStep, 'done'>, string>> = {
  buy: { approve: 'Aprobá el pago en USDC en tu wallet…', confirm: 'Confirmá la compra en tu wallet…', sync: 'Actualizando el mercado…' },
  sell: { approve: 'Autorizá tus tokens en tu wallet…', confirm: 'Confirmá la publicación en tu wallet…', sync: 'Actualizando el mercado…' },
};

const wholeTokens = (raw: string) => {
  const n = Number(raw);
  return Number.isInteger(n) ? n : 0;
};

// ─── Buy ──────────────────────────────────────────────────────────────────────
type BuyModalProps = { nav: NavFn; info: MarketInfo; listing: MarketListing; assetName: string; onClose: () => void; onDone: () => void };

export function BuyModal({ nav, info, listing, assetName, onClose, onDone }: BuyModalProps) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const gate = useTradeGate(nav, 'comprar');
  const max = Math.floor(listing.available);
  const [qty, setQty] = useState('1');
  const [step, setStep] = useState<TradeStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(true);
  const quantity = wholeTokens(qty);
  const valid = quantity >= 1 && quantity <= max;
  const total = quantity * listing.pricePerToken;
  const busy = step !== null && step !== 'done';

  const submit = async () => {
    if (!account || !valid) return;
    setError(null);
    try {
      const result = await buyOnchain({ info, listing, quantity, account, wallet, onStep: setStep });
      setSynced(result.synced);
      onDone();
    } catch (e) {
      setStep(null);
      setError(e instanceof Error ? e.message : 'No se pudo completar la compra.');
    }
  };

  return (
    <WalletModal title={step === 'done' ? 'Compra completada' : `Comprar ${assetName}`} onClose={busy ? () => undefined : onClose}>
      {step === 'done' ? (
        <div>
          <p style={{ ...note, margin: '0 0 16px' }}>
            Recibiste {quantity} token{quantity !== 1 ? 's' : ''} de {assetName} por {fmtUSD2(total)}. Ya están en tu wallet.
            {!synced && ' El mercado y tus pertenencias se actualizan en unos segundos.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <PBtn variant="accent" style={{ flex: 1 }} onClick={() => nav('pertenencias')}>Ver mis pertenencias</PBtn>
            <PBtn variant="ghost" onClick={onClose}>Cerrar</PBtn>
          </div>
        </div>
      ) : gate ? (
        <GateNote gate={gate} />
      ) : (
        <div>
          <label style={label} htmlFor="buy-qty">Cantidad de tokens (máx. {max.toLocaleString('es-AR')})</label>
          <PInput type="number" value={qty} onChange={e => setQty(e.target.value)} ariaLabel="Cantidad de tokens" name="buy-qty" />
          <Summary>
            <Row k="Precio por token" v={fmtUSD2(listing.pricePerToken)} />
            <Row k="Precio de referencia" v={fmtUSD2(listing.referencePrice)} />
            <Row k="Total a pagar (USDC)" v={valid ? fmtUSD2(total) : '—'} strong />
          </Summary>
          <p style={{ ...note, margin: '0 0 14px' }}>
            Pagás exactamente el total: la comisión del mercado ({feePercent(info).toLocaleString('es-AR')}%) la cubre el vendedor. Los tokens y el USDC se intercambian en una sola transacción.
          </p>
          <ErrorNote text={error} />
          {busy && <div aria-live="polite" style={{ ...note, marginBottom: 12 }}>{STEP_COPY.buy[step]}</div>}
          <PBtn variant="accent" style={{ width: '100%' }} disabled={!valid || busy} onClick={() => void submit()}>
            {busy ? 'Procesando…' : valid ? `Comprar por ${fmtUSD2(total)}` : 'Elegí una cantidad válida'}
          </PBtn>
        </div>
      )}
    </WalletModal>
  );
}

// ─── Sell ─────────────────────────────────────────────────────────────────────
type SellModalProps = { nav: NavFn; info: MarketInfo; initialAssetId: number | null; onClose: () => void; onDone: () => void };

const tradable = (h: ApiHolding, info: MarketInfo) => h.poolStatus === 'active' && Boolean(h.token) && h.chainId === info.chainId && h.tokens >= 1;

export function SellModal({ nav, info, initialAssetId, onClose, onDone }: SellModalProps) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const gate = useTradeGate(nav, 'vender');
  const { data: holdings, loading } = useHoldings();
  const options = useMemo(() => (holdings ?? []).filter(h => tradable(h, info)), [holdings, info]);
  const [picked, setPicked] = useState<number | null>(initialAssetId);
  const holding = options.find(h => h.assetId === picked) ?? options[0] ?? null;
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState<string | null>(null);
  const [free, setFree] = useState<{ assetId: number; tokens: number } | null>(null);
  const [step, setStep] = useState<TradeStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(true);
  const mine = useMyListings();
  // Open offers of this asset share one token approval: publishing re-funds them at their prices.
  const openOffers = (mine.data ?? []).filter(l => l.status === 'active' && l.asset.id === holding?.assetId);

  // Tokens already on sale stay committed: only the rest can be listed.
  useEffect(() => {
    if (!holding || !account) return;
    let alive = true;
    sellableTokens(info, holding, account.address)
      .then(tokens => alive && setFree({ assetId: holding.assetId, tokens }))
      .catch(() => alive && setFree({ assetId: holding.assetId, tokens: Math.floor(holding.tokens) }));
    return () => {
      alive = false;
    };
  }, [holding, account, info]);

  const available = free && holding && free.assetId === holding.assetId ? free.tokens : null;
  const quantity = wholeTokens(qty);
  const priceText = price ?? (holding ? String(holding.tokenPrice) : '');
  const unit = Number(priceText);
  const validPrice = Number.isFinite(unit) && unit > 0 && Math.round(unit * 100) === unit * 100;
  const valid = Boolean(holding) && available !== null && quantity >= 1 && quantity <= available && validPrice;
  const total = quantity * unit;
  const busy = step !== null && step !== 'done';

  const submit = async () => {
    if (!account || !holding || !valid) return;
    setError(null);
    try {
      const result = await sellOnchain({ info, holding, quantity, priceUsd: unit, account, wallet, onStep: setStep });
      setSynced(result.synced);
      onDone();
    } catch (e) {
      setStep(null);
      setError(e instanceof Error ? e.message : 'No se pudo publicar la venta.');
    }
  };

  let body: ReactNode;
  if (step === 'done') {
    body = (
      <div>
        <p style={{ ...note, margin: '0 0 16px' }}>Tu oferta de {quantity} token{quantity !== 1 ? 's' : ''} de {holding?.assetName} a {fmtUSD2(unit)} c/u ya está publicada. Los tokens siguen en tu wallet hasta que alguien compre; podés retirarla cuando quieras.{!synced && ' Va a aparecer en el mercado en unos segundos.'}</p>
        <PBtn variant="accent" style={{ width: '100%' }} onClick={onClose}>Listo</PBtn>
      </div>
    );
  } else if (gate) {
    body = <GateNote gate={gate} />;
  } else if (loading && !holdings) {
    body = <p style={note}>Cargando tus tokens…</p>;
  } else if (!holding) {
    body = (
      <div>
        <p style={{ ...note, margin: '0 0 16px' }}>No tenés tokens que se puedan vender todavía. Invertí en una tokenización y vas a poder revenderlos acá.</p>
        <PBtn variant="accent" style={{ width: '100%' }} onClick={() => nav('primario')}>Ver tokenizaciones</PBtn>
      </div>
    );
  } else {
    body = (
      <div>
        <label style={label} htmlFor="sell-asset">Activo</label>
        <select id="sell-asset" value={holding.assetId} onChange={e => { setPicked(Number(e.target.value)); setPrice(null); setQty('1'); }}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 14, marginBottom: 12 }}>
          {options.map(h => <option key={h.assetId} value={h.assetId}>{h.assetName} · {h.tokens.toLocaleString('es-AR')} tokens</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
          <div>
            <label style={label} htmlFor="sell-qty">Tokens {available !== null ? `(libres: ${available.toLocaleString('es-AR')})` : ''}</label>
            <PInput type="number" value={qty} onChange={e => setQty(e.target.value)} ariaLabel="Cantidad de tokens" name="sell-qty" />
          </div>
          <div>
            <label style={label} htmlFor="sell-price">Precio por token (USD)</label>
            <PInput type="number" value={priceText} onChange={e => setPrice(e.target.value)} ariaLabel="Precio por token en USD" name="sell-price" prefix="$" />
          </div>
        </div>
        <Summary>
          <Row k="Precio de referencia" v={fmtUSD2(holding.tokenPrice)} />
          <Row k="Total de la oferta" v={valid ? fmtUSD2(total) : '—'} />
          <Row k={`Comisión del mercado (${feePercent(info).toLocaleString('es-AR')}%)`} v={valid ? fmtUSD2(total - netOfFee(total, info)) : '—'} />
          <Row k="Recibirás (USDC)" v={valid ? fmtUSD2(netOfFee(total, info)) : '—'} strong />
        </Summary>
        <p style={{ ...note, margin: '0 0 14px' }}>
          Tus tokens no salen de tu wallet al publicar: solo autorizás al contrato del mercado a entregarlos cuando un inversor verificado pague el precio.
        </p>
        {openOffers.length > 0 && (
          <p style={{ ...note, margin: '0 0 14px', color: 'var(--text)' }}>
            Ya tenés {openOffers.length === 1 ? 'una oferta activa' : `${openOffers.length} ofertas activas`} de este activo ({openOffers.map(l => `${l.remaining.toLocaleString('es-AR')} a ${fmtUSD2(l.pricePerToken)}`).join(', ')}). Siguen vigentes a ese precio: si no querés venderlas así, retiralas antes en «Mis publicaciones».
          </p>
        )}
        <ErrorNote text={error} />
        {busy && <div aria-live="polite" style={{ ...note, marginBottom: 12 }}>{STEP_COPY.sell[step]}</div>}
        <PBtn variant="accent" style={{ width: '100%' }} disabled={!valid || busy} onClick={() => void submit()}>
          {busy ? 'Procesando…' : valid ? 'Publicar venta' : !validPrice ? 'Elegí un precio válido' : 'Elegí una cantidad válida'}
        </PBtn>
      </div>
    );
  }

  return (
    <WalletModal title={step === 'done' ? 'Oferta publicada' : 'Publicar venta'} onClose={busy ? () => undefined : onClose}>
      {body}
    </WalletModal>
  );
}
