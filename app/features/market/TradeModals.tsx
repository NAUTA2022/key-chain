import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { PBtn, PInput } from '~/components/ui';
import { fmtUSD2 } from '~/data';
import WalletModal from '~/features/wallet/WalletModal';
import type { NavFn } from '~/lib/navigation';
import { type ApiHolding, useHoldings } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { useT } from '~/i18n/useT';
import { type MarketInfo, type MarketListing, type TradeStep, buyOnchain, feePercent, netOfFee, sellOnchain, sellableTokens, useMyListings } from './api';
import { errorText } from './i18n';

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
function useTradeGate(nav: NavFn, side: 'buy' | 'sell'): Gate {
  const { status, user } = useSession();
  const account = useActiveAccount();
  const { t } = useT('market');
  const verb = t(side === 'buy' ? 'trade.gate.verbBuy' : 'trade.gate.verbSell');
  if (status !== 'authenticated' || !user || !account) return { text: t('trade.gate.connect', { verb }), cta: t('trade.gate.connectCta'), action: () => nav('login') };
  if (!user.onboarded) return { text: t('trade.gate.profile', { verb }), cta: t('trade.gate.profileCta'), action: () => nav('perfil') };
  if (user.kycStatus !== 'verified') {
    const pending = user.kycStatus === 'pending';
    return {
      text: pending ? t('trade.gate.kycPending') : t('trade.gate.kycNeeded', { verb }),
      cta: pending ? t('trade.gate.kycStatusCta') : t('trade.gate.kycVerifyCta'),
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

const wholeTokens = (raw: string) => {
  const n = Number(raw);
  return Number.isInteger(n) ? n : 0;
};

// ─── Buy ──────────────────────────────────────────────────────────────────────
type BuyModalProps = { nav: NavFn; info: MarketInfo; listing: MarketListing; assetName: string; onClose: () => void; onDone: () => void };

export function BuyModal({ nav, info, listing, assetName, onClose, onDone }: BuyModalProps) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const gate = useTradeGate(nav, 'buy');
  const { t, locale } = useT('market');
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
      setError(errorText(e, t, 'errors.buyFailed'));
    }
  };

  return (
    <WalletModal title={step === 'done' ? t('trade.buy.doneTitle') : t('trade.buy.title', { name: assetName })} onClose={busy ? () => undefined : onClose}>
      {step === 'done' ? (
        <div>
          <p style={{ ...note, margin: '0 0 16px' }}>
            {t(quantity === 1 ? 'trade.buy.receivedOne' : 'trade.buy.receivedMany', { count: quantity, name: assetName, total: fmtUSD2(total) })}
            {!synced && t('trade.buy.notSynced')}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <PBtn variant="accent" style={{ flex: 1 }} onClick={() => nav('pertenencias')}>{t('trade.buy.viewHoldings')}</PBtn>
            <PBtn variant="ghost" onClick={onClose}>{t('trade.buy.close')}</PBtn>
          </div>
        </div>
      ) : gate ? (
        <GateNote gate={gate} />
      ) : (
        <div>
          <label style={label} htmlFor="buy-qty">{t('trade.buy.qtyLabel', { max: max.toLocaleString(locale) })}</label>
          <PInput type="number" value={qty} onChange={e => setQty(e.target.value)} ariaLabel={t('trade.buy.qtyAria')} name="buy-qty" />
          <Summary>
            <Row k={t('trade.buy.pricePerToken')} v={fmtUSD2(listing.pricePerToken)} />
            <Row k={t('trade.buy.referencePrice')} v={fmtUSD2(listing.referencePrice)} />
            <Row k={t('trade.buy.totalToPay')} v={valid ? fmtUSD2(total) : '—'} strong />
          </Summary>
          <p style={{ ...note, margin: '0 0 14px' }}>
            {t('trade.buy.feeNote', { fee: feePercent(info).toLocaleString(locale) })}
          </p>
          <ErrorNote text={error} />
          {busy && <div aria-live="polite" style={{ ...note, marginBottom: 12 }}>{t(`trade.steps.buy.${step}`)}</div>}
          <PBtn variant="accent" style={{ width: '100%' }} disabled={!valid || busy} onClick={() => void submit()}>
            {busy ? t('trade.buy.processing') : valid ? t('trade.buy.buyFor', { total: fmtUSD2(total) }) : t('trade.buy.pickValidQty')}
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
  const gate = useTradeGate(nav, 'sell');
  const { t, locale } = useT('market');
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
      setError(errorText(e, t, 'errors.sellFailed'));
    }
  };

  let body: ReactNode;
  if (step === 'done') {
    body = (
      <div>
        <p style={{ ...note, margin: '0 0 16px' }}>{t(quantity === 1 ? 'trade.sell.doneOne' : 'trade.sell.doneMany', { count: quantity, name: holding?.assetName ?? '', price: fmtUSD2(unit) })}{!synced && t('trade.sell.notSynced')}</p>
        <PBtn variant="accent" style={{ width: '100%' }} onClick={onClose}>{t('trade.sell.done')}</PBtn>
      </div>
    );
  } else if (gate) {
    body = <GateNote gate={gate} />;
  } else if (loading && !holdings) {
    body = <p style={note}>{t('trade.sell.loadingTokens')}</p>;
  } else if (!holding) {
    body = (
      <div>
        <p style={{ ...note, margin: '0 0 16px' }}>{t('trade.sell.noTokens')}</p>
        <PBtn variant="accent" style={{ width: '100%' }} onClick={() => nav('primario')}>{t('trade.sell.viewTokenizations')}</PBtn>
      </div>
    );
  } else {
    body = (
      <div>
        <label style={label} htmlFor="sell-asset">{t('trade.sell.asset')}</label>
        <select id="sell-asset" value={holding.assetId} onChange={e => { setPicked(Number(e.target.value)); setPrice(null); setQty('1'); }}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 14, marginBottom: 12 }}>
          {options.map(h => <option key={h.assetId} value={h.assetId}>{t('trade.sell.assetOption', { name: h.assetName, tokens: h.tokens.toLocaleString(locale) })}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
          <div>
            <label style={label} htmlFor="sell-qty">{t('trade.sell.tokens')} {available !== null ? t('trade.sell.free', { n: available.toLocaleString(locale) }) : ''}</label>
            <PInput type="number" value={qty} onChange={e => setQty(e.target.value)} ariaLabel={t('trade.sell.qtyAria')} name="sell-qty" />
          </div>
          <div>
            <label style={label} htmlFor="sell-price">{t('trade.sell.priceLabel')}</label>
            <PInput type="number" value={priceText} onChange={e => setPrice(e.target.value)} ariaLabel={t('trade.sell.priceAria')} name="sell-price" prefix="$" />
          </div>
        </div>
        <Summary>
          <Row k={t('trade.sell.referencePrice')} v={fmtUSD2(holding.tokenPrice)} />
          <Row k={t('trade.sell.offerTotal')} v={valid ? fmtUSD2(total) : '—'} />
          <Row k={t('trade.sell.marketFee', { fee: feePercent(info).toLocaleString(locale) })} v={valid ? fmtUSD2(total - netOfFee(total, info)) : '—'} />
          <Row k={t('trade.sell.youReceive')} v={valid ? fmtUSD2(netOfFee(total, info)) : '—'} strong />
        </Summary>
        <p style={{ ...note, margin: '0 0 14px' }}>
          {t('trade.sell.custodyNote')}
        </p>
        {openOffers.length > 0 && (
          <p style={{ ...note, margin: '0 0 14px', color: 'var(--text)' }}>
            {t('trade.sell.openOffers', {
              offers: openOffers.length === 1 ? t('trade.sell.openOne') : t('trade.sell.openMany', { count: openOffers.length }),
              list: openOffers.map(l => t('trade.sell.openOfferItem', { qty: l.remaining.toLocaleString(locale), price: fmtUSD2(l.pricePerToken) })).join(', '),
            })}
          </p>
        )}
        <ErrorNote text={error} />
        {busy && <div aria-live="polite" style={{ ...note, marginBottom: 12 }}>{t(`trade.steps.sell.${step}`)}</div>}
        <PBtn variant="accent" style={{ width: '100%' }} disabled={!valid || busy} onClick={() => void submit()}>
          {busy ? t('trade.sell.processing') : valid ? t('trade.sell.publish') : !validPrice ? t('trade.sell.pickValidPrice') : t('trade.sell.pickValidQty')}
        </PBtn>
      </div>
    );
  }

  return (
    <WalletModal title={step === 'done' ? t('trade.sell.doneTitle') : t('trade.sell.title')} onClose={busy ? () => undefined : onClose}>
      {body}
    </WalletModal>
  );
}
