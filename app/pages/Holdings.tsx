import { useState, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useActiveAccount, useActiveWallet, useWalletBalance } from 'thirdweb/react';
import { polygon, type Chain } from 'thirdweb/chains';
import type { Account } from 'thirdweb/wallets';
import { PBtn, PTag, PArea } from '~/components/ui';
import AssetCard from '~/components/AssetCard';
import { MY_HOLDINGS, RWA_ASSETS, fmtUSD2, type Holding } from '~/data';
import { claimCapital, claimDividend, useDividends, useHoldings, type ApiHolding } from '~/lib/onchain';
import { useCatalog } from '~/lib/catalog';
import { useSession } from '~/lib/session';
import { client } from '~/lib/thirdweb';
import { useMobile } from '~/hooks/useMobile';
import { pathFor, type NavFn } from '~/lib/navigation';
import { useMeActivity, usePortfolioHistory } from '~/features/portfolio/api';
import { assetInfoFor, type AssetInfo } from '~/features/portfolio/holdings';
import { plural } from '~/features/portfolio/format';
import { movementStatusId, movementsFromActivity, type Movement } from '~/features/portfolio/movements';
import { networkName, usePlatformBalances } from '~/features/wallet/chain';
import CryptoDeposit, { type LiveDeposit } from '~/features/payments/CryptoDeposit';
import CryptoWithdraw, { type LiveWithdraw } from '~/features/payments/CryptoWithdraw';
import { platformNetwork } from '~/features/payments/live';
import { TOKENS, useWallet, fmtToken, DEPOSIT_ADDRESS } from '~/lib/wallet';
import GuideButton from '~/features/guide/GuideButton';
import { useT, type Translator } from '~/i18n/useT';
import { useDataText } from '~/i18n/data';

type HoldingsTab = 'wallet' | 'inversiones';

type PolygonToken = { sym: string; name: string; address: string | null; abbr: string };

const POLYGON_TOKENS: PolygonToken[] = [
  { sym: 'POL',  name: 'Polygon',      address: null,                                           abbr: 'PL' },
  { sym: 'USDC', name: 'USD Coin',     address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', abbr: 'UC' },
  { sym: 'USDT', name: 'Tether',       address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', abbr: 'UT' },
  { sym: 'WETH', name: 'Wrapped ETH',  address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', abbr: 'WE' },
];

type TokenRowProps = PolygonToken & { account: Account | undefined; isLast: boolean; chain?: Chain };

function TokenRow({ account, sym, name, address, abbr, isLast, chain = polygon }: TokenRowProps) {
  const { locale } = useT('portfolio');
  const { data: balance, isLoading } = useWalletBalance({
    chain,
    address: account?.address,
    client,
    tokenAddress: address || undefined,
  });

  const qty = parseFloat(balance?.displayValue || '0');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--gl-div)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: 'var(--gl-div)',
        border: '1px solid var(--gl-bd)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gl-icon-c)', fontFamily: 'var(--font-h)', fontWeight: 800,
        fontSize: 11, flexShrink: 0, letterSpacing: '0.02em',
      }}>{abbr}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{sym}</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{name}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {isLoading || !account ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ width: 56, height: 13, background: 'var(--gl-icon)', borderRadius: 4 }} />
            <div style={{ width: 40, height: 11, background: 'var(--gl-prd-i)', borderRadius: 4 }} />
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {qty < 0.0001 && qty > 0 ? '<0.0001' : qty.toLocaleString(locale, { maximumFractionDigits: 4 })}
            </div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>
              {balance?.symbol || sym}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const ARROW_DOWN = <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v13M6 11l6 6 6-6M5 20h14" /></svg>;
const ARROW_UP = <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V7M6 13l6-6 6 6M5 4h14" /></svg>;

/* ── Parallax wallet card ── */
type WalletCardInfo = {
  addressLabel: string;
  address: string;
  network: string;
  balanceLabel: string;
  balance: string;
  sub: string;
};
type ParallaxWalletCardProps = { info: WalletCardInfo; onDeposit: () => void; onWithdraw: () => void };

function ParallaxWalletCard({ info, onDeposit, onWithdraw }: ParallaxWalletCardProps) {
  const { t } = useT('portfolio');
  const cardRef = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRotX = useSpring(rotX, { stiffness: 220, damping: 28 });
  const sRotY = useSpring(rotY, { stiffness: 220, damping: 28 });
  const shine = useMotionValue(0);
  const sShine = useSpring(shine, { stiffness: 200, damping: 30 });
  const shineOpacity = useTransform(sShine, [0, 1], [0, 0.12]);
  const orbRotX = useTransform(sRotX, v => -v * 1.5);
  const orbRotY = useTransform(sRotY, v => -v * 1.5);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;   // -0.5 → 0.5
    const y = (e.clientY - top)  / height - 0.5;
    rotX.set(-y * 14);
    rotY.set(x * 14);
    shine.set(Math.sqrt(x * x + y * y) * 2);
  };

  const handleLeave = () => {
    rotX.set(0);
    rotY.set(0);
    shine.set(0);
  };

  return (
    <div style={{ perspective: '900px' }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          rotateX: sRotX, rotateY: sRotY,
          transformStyle: 'preserve-3d',
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(38,38,38,0.95) 0%, rgba(18,18,18,0.98) 60%, rgba(8,8,8,1) 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: 'var(--sh-lg), inset 0 1px 0 rgba(255,255,255,0.10)',
          padding: '30px 28px 26px',
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {/* Specular shine layer */}
        <motion.div style={{
          position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.13) 0%, transparent 65%)',
          opacity: shineOpacity,
        }} />

        {/* Dot grid texture */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none', opacity: 0.18,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />

        {/* Moving light orb */}
        <motion.div style={{
          position: 'absolute', top: '-60%', right: '-20%', width: 320, height: 320,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, var(--gl-prd-i) 0%, transparent 70%)',
          rotateX: orbRotX,
          rotateY: orbRotY,
        }} />

        {/* Content — raised layer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 5 }}>{info.addressLabel}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>{info.address}</div>
            </div>
            {/* Network chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 20, padding: '5px 12px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.55)' }} />
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{info.network}</span>
            </div>
          </div>

          {/* Main balance */}
          <div data-guide="holdings-balance" style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>{info.balanceLabel}</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.95)' }}>{info.balance}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 4 }}>{info.sub}</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: t('holdings.card.deposit'), action: onDeposit, icon: ARROW_DOWN },
              { label: t('holdings.card.withdraw'), action: onWithdraw, icon: ARROW_UP },
            ].map(({ label, action, icon }) => (
              <button
                key={label}
                data-guide={action === onDeposit ? 'holdings-deposit' : 'holdings-withdraw'}
                type="button"
                onClick={action}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.82)',
                  cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--gl-prd-a)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--gl-icon)'; e.currentTarget.style.borderColor = 'var(--gl-prd-a)'; }}
              >
                <span style={{ display: 'flex' }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const statusText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '12px 0', textAlign: 'center' };

type HoldingsProps = { nav: NavFn };

export default function Holdings({ nav }: HoldingsProps) {
  const { t, locale } = useT('portfolio');
  const { t: tc } = useT('common');
  const { t: tm } = useT('market');
  const dataText = useDataText();
  const navigate = useNavigate();
  const [tab, setTab] = useState<HoldingsTab>('wallet');
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const isMobile = useMobile();

  // Backend enabled: positions are read from the chain; otherwise the demo portfolio.
  const live = useSession().status !== 'disabled';
  const { data: liveHoldings, loading: holdingsLoading, reload: reloadHoldings } = useHoldings();
  const { data: liveDividends, reload: reloadDividends } = useDividends();
  const holdings: Holding[] = live
    ? (liveHoldings ?? []).map(h => ({
        assetId: h.assetId, tokens: h.tokens, invested: h.invested, current: h.value, since: 'on-chain',
        yieldEarned: (liveDividends ?? []).filter(d => d.assetId === h.assetId && d.claimed).reduce((t, d) => t + d.amount, 0),
      }))
    : MY_HOLDINGS;
  const { assets: catalog, byId } = useCatalog();

  // Demo: the Brikme custodial balance (in-memory store the payment flows credit and debit).
  const { balances: demoBalances, activity: demoActivity } = useWallet();
  const balanceUSD = TOKENS.reduce((s, t) => s + (demoBalances[t.sym] || 0) * t.price, 0);

  // Live wallet: balances on the platform network, deposit (QR + faucet) and USDC withdrawals.
  const balances = usePlatformBalances(live ? account?.address : undefined);
  const network = networkName(balances.info);
  const gasSymbol = balances.info?.nativeSymbol ?? balances.native?.symbol ?? 'POL';
  const payNetwork = platformNetwork(network, balances.chain?.id, gasSymbol, tm);
  const usdcBalance = balances.usdc ? Number(balances.usdc.displayValue) : null;
  const gasBalance = balances.native ? Number(balances.native.displayValue) : null;
  const cardInfo: WalletCardInfo = live ? {
    addressLabel: t('holdings.card.yourWallet'),
    address: account ? `${account.address.slice(0, 10)}…${account.address.slice(-6)}` : t('holdings.card.noWallet'),
    network,
    balanceLabel: t('holdings.card.usdcBalance'),
    balance: !account ? '$0.00' : usdcBalance === null ? '…' : fmtUSD2(usdcBalance),
    sub: gasBalance === null
      ? t('holdings.card.usdcOn', { network })
      : t('holdings.card.usdcWithGas', { amount: gasBalance.toLocaleString(locale, { maximumFractionDigits: 4 }), symbol: gasSymbol }),
  } : {
    addressLabel: t('holdings.card.yourAddress'),
    address: `${DEPOSIT_ADDRESS.slice(0, 10)}…${DEPOSIT_ADDRESS.slice(-6)}`,
    network: t('holdings.card.multiNetwork'),
    balanceLabel: t('holdings.card.brikmeBalance'),
    balance: fmtUSD2(balanceUSD),
    sub: 'Polygon · BNB Smart Chain · Celo',
  };
  const liveDeposit: LiveDeposit | undefined = live && account
    ? { address: account.address, network: payNetwork, usdc: usdcBalance, refresh: balances.refetch }
    : undefined;
  const liveWithdraw: LiveWithdraw | undefined = live && account && balances.info && balances.chain
    ? {
        account, wallet, chain: balances.chain, network: payNetwork, gasSymbol,
        usdc: { address: balances.info.usdc, decimals: balances.usdc?.decimals ?? balances.info.usdcDecimals, balanceWei: balances.usdc?.value ?? null },
        onSent: balances.refetch,
      }
    : undefined;
  // Live never opens the demo flows: without a wallet (or the network info) the buttons wait.
  const openDeposit = () => { if (!live || liveDeposit) setDepositOpen(true); };
  const openWithdraw = () => { if (!live || liveWithdraw) setWithdrawOpen(true); };
  const walletTokens: PolygonToken[] = !live ? POLYGON_TOKENS : balances.info ? [
    { sym: 'USDC', name: 'USD Coin', address: balances.info.usdc, abbr: 'UC' },
    { sym: gasSymbol, name: t('holdings.tokens.gasToken', { symbol: gasSymbol }), address: null, abbr: gasSymbol === 'POL' ? 'PL' : gasSymbol.slice(0, 2).toUpperCase() },
  ] : [];

  const history = usePortfolioHistory('12m');
  const historyPoints = history.data?.points ?? [];
  const hasHistory = historyPoints.length >= 2 && historyPoints.some(p => p.value > 0);
  const activity = useMeActivity();

  const [claiming, setClaiming] = useState<number | null>(null);
  const [claimMsg, setClaimMsg] = useState<{ assetId: number; text: string; ok: boolean } | null>(null);
  const pendingDividends = (assetId: number) => (liveDividends ?? []).filter(d => d.assetId === assetId && !d.claimed);
  const runClaim = async (assetId: number, action: () => Promise<void>, okText: string) => {
    setClaiming(assetId);
    setClaimMsg(null);
    try {
      await action();
      setClaimMsg({ assetId, text: okText, ok: true });
    } catch (e) {
      setClaimMsg({ assetId, text: e instanceof Error ? e.message : t('holdings.claim.failed'), ok: false });
    } finally {
      setClaiming(null);
      reloadHoldings();
      reloadDividends();
      if (live) balances.refetch();
    }
  };
  const claimAllDividends = (assetId: number) => runClaim(assetId, async () => {
    if (!account) throw new Error(t('holdings.claim.connectWallet'));
    for (const d of pendingDividends(assetId)) await claimDividend(d, account, wallet);
  }, t('holdings.claim.dividendsDone'));
  const claimLiquidation = (h: ApiHolding) => runClaim(h.assetId, async () => {
    if (!account) throw new Error(t('holdings.claim.connectWallet'));
    await claimCapital(h, account, wallet);
  }, t('holdings.claim.capitalDone'));

  const holdTotal     = holdings.reduce((s, h) => s + h.current, 0);
  const investedTotal = holdings.reduce((s, h) => s + h.invested, 0);
  const yieldTotal    = holdings.reduce((s, h) => s + h.yieldEarned, 0);
  const pnlPct        = investedTotal > 0 ? (holdTotal / investedTotal - 1) * 100 : 0;
  const pnl           = pnlPct.toFixed(1);
  const pnlAbs        = holdTotal - investedTotal;
  // Live positions: the catalog entry or the holding's own fields (never dropped).
  const assetFor = (h: Holding): AssetInfo | undefined => {
    if (!live) return byId(h.assetId);
    const apiHolding = liveHoldings?.find(x => x.assetId === h.assetId);
    return apiHolding ? assetInfoFor(apiHolding, byId(h.assetId)) : undefined;
  };

  const glass: CSSProperties = {
    background: 'var(--gl-bg)', border: '1px solid var(--gl-icon)', borderRadius: 18,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: 'inset 0 1px 0 var(--gl-div)',
  };

  const tabSwitch = (
    <div role="tablist" aria-label={t('holdings.tabsLabel')} data-guide="holdings-tabs" style={{ display: 'flex', gap: 2, flex: isMobile ? 1 : undefined, height: isMobile ? 46 : undefined, boxSizing: 'border-box', background: 'var(--gl-prd-i)', border: '1px solid var(--gl-icon)', borderRadius: 12, padding: 4 }}>
      {([['wallet', t('holdings.tabs.wallet')], ['inversiones', t('holdings.tabs.investments')]] as const).map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{
          flex: isMobile ? 1 : undefined,
          padding: isMobile ? '0 10px' : '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: tab === id ? 'var(--gl-bg3)' : 'transparent',
          color: tab === id ? 'var(--text)' : 'var(--ter)',
          fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: tab === id ? 600 : 500,
          boxShadow: tab === id ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
          transition: 'all 0.18s',
        }}>{label}</button>
      ))}
    </div>
  );

  // Brikme balance (custodial, demo): what deposits credit, withdrawals and
  // checkout payments debit. Live has no custodial balance: the wallet's own
  // tokens are listed in "Activos en wallet".
  const keychainBalance = !live && (
    <div style={{ ...glass, padding: '18px 20px', marginBottom: 16 }}>
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 6px' }}>{t('holdings.balanceByCurrency')}</h2>
      {TOKENS.map((tok, i) => (
        <div key={tok.sym} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--gl-div)' : 'none' }}>
          <img src={tok.icon} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{tok.sym}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{tok.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{fmtToken(demoBalances[tok.sym] || 0, tok.sym)}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{fmtUSD2((demoBalances[tok.sym] || 0) * tok.price)}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const kpis = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 16 : 26 }}>
      {[
        { id: 'rwa',      k: t('holdings.kpi.rwaPortfolio'), v: fmtUSD2(holdTotal),                s: plural(t, 'shared.projects', holdings.length) },
        { id: 'invested', k: t('shared.invested'),           v: fmtUSD2(investedTotal),             s: t('holdings.kpi.initialCapital') },
        { id: 'pnl',      k: t('shared.pnl'),                v: `${pnlPct >= 0 ? '+' : ''}${pnl}%`, s: pnlAbs < 0 ? `-${fmtUSD2(-pnlAbs)}` : fmtUSD2(pnlAbs) },
        { id: 'yield',    k: t('shared.yieldCollected'),     v: fmtUSD2(yieldTotal),                s: live ? t('shared.onchainDividends') : t('shared.sinceDemo') },
      ].map(({ id, k, v, s }, idx) => (
        <motion.div key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
          style={{ ...glass, padding: isMobile ? '14px 14px' : '18px 20px', minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{k}</div>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 17 : 20, color: 'var(--text)', letterSpacing: '-0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 3 }}>{s}</div>
        </motion.div>
      ))}
    </div>
  );

  const tokens = (
    <div style={{ ...glass, padding: '18px 20px' }}>
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--sec)', margin: '0 0 2px' }}>{t('holdings.tokens.title')}</h2>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 12 }}>{t('holdings.tokens.on', { network: live ? network : 'Polygon' })}</div>
      {!account && (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '12px 0', textAlign: 'center' }}>
          {t('holdings.tokens.connect')}
        </div>
      )}
      {live && account && !balances.info && (
        <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '12px 0', textAlign: 'center' }}>
          {t('holdings.tokens.loadingNetwork')}
        </div>
      )}
      {walletTokens.map((t, i) => (
        <TokenRow
          key={t.sym} account={account}
          sym={t.sym} name={t.name} address={t.address} abbr={t.abbr}
          isLast={i === walletTokens.length - 1}
          chain={live ? balances.chain : polygon}
        />
      ))}
    </div>
  );

  const evolution = (
    <div style={{ ...glass, padding: isMobile ? '18px 16px' : '24px 26px', minWidth: 0 }}>
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: '0 0 3px' }}>{t('holdings.evolution.title')}</h2>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 20 }}>{t('holdings.evolution.last12Months')}</div>
      {!live && <PArea data={[28000,29200,30100,29800,31400,32600,33100,34800,35600,36900,38400,holdTotal]} height={isMobile ? 160 : 200} id="holdings" />}
      {live && hasHistory && <PArea data={historyPoints.map(p => p.value)} height={isMobile ? 160 : 200} id="holdings" />}
      {live && !hasHistory && (
        <div role="status" style={{ height: isMobile ? 160 : 200, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>
          {history.loading ? t('shared.loadingHistory') : t('shared.noHistory')}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '12px 20px' : 28, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gl-div)' }}>
        {[
          ['rwa',      t('holdings.evolution.rwa'), fmtUSD2(holdTotal)],
          ['invested', t('shared.invested'),        fmtUSD2(investedTotal)],
          ['pnl',      pnlAbs < 0 ? t('holdings.evolution.loss') : t('holdings.evolution.gain'), pnlAbs < 0 ? `-${fmtUSD2(-pnlAbs)}` : fmtUSD2(pnlAbs)],
        ].map(([id, k, v]) => (
          <div key={id}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k}</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 16 : 18, color: 'var(--text)', letterSpacing: '-0.03em' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Movimientos. Demo: the custodial wallet's activity. Live: money movements from
  // the API activity (investments, market trades, dividends).
  const moves: Movement[] = live
    ? movementsFromActivity(activity.data ?? [], locale).slice(0, 10)
    : demoActivity.slice(0, 10).map(a => {
        const status = movementStatusId(a.status);
        return {
          id: String(a.id), inbound: a.type === 'in', label: dataText.activity(a).label, amount: Math.abs(a.amount), date: a.date,
          status: status ?? 'completed', ...(status ? {} : { rawStatus: a.status }),
          assetName: a.label.split(' — ')[1] ?? null,
          // Non-dollar tokens show their own unit.
          ...(a.sym && a.sym !== 'USDC' && a.sym !== 'USDT' ? { unit: a.sym } : {}),
        };
      });
  // Demo labels name the project in Spanish: match the seed, then show the localized catalog entry.
  const projectByName = (name: string | null) => (!name ? undefined : live ? catalog.find(x => x.name === name) : byId(RWA_ASSETS.find(x => x.name === name)?.id));
  const movements = (
    <div data-guide="holdings-movements" style={{ ...glass, padding: '18px 20px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: 0 }}>{t('holdings.movements.title')}</h2>
      </div>
      {live && moves.length === 0 && (
        <div role="status" style={statusText}>{activity.loading ? t('holdings.movements.loading') : t('holdings.movements.empty')}</div>
      )}
      {moves.map((m, i, list) => {
        const asset = projectByName(m.assetName);
        const open = asset ? () => nav('detalle', asset) : undefined;
        return (
          <div key={m.id} onClick={open} role={open ? 'link' : undefined} tabIndex={open ? 0 : undefined}
            onKeyDown={open ? e => { if (e.key === 'Enter') open(); } : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < list.length - 1 ? '1px solid var(--gl-div)' : 'none', cursor: open ? 'pointer' : 'default' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: m.inbound ? 'rgba(34,197,94,0.12)' : 'var(--gl-prd-i)', color: m.inbound ? 'var(--pos)' : 'var(--sec)' }}>{m.inbound ? ARROW_DOWN : ARROW_UP}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>{m.date} · {m.rawStatus ?? t(`holdings.movements.status.${m.status}`)}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: m.inbound ? 'var(--pos)' : 'var(--text)', flexShrink: 0 }}>
              {m.inbound ? '+' : '−'}{m.unit ? fmtToken(m.amount, m.unit) : fmtUSD2(m.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Live: claim and sell actions of a position (dividends, capital after a liquidation, secondary market).
  const liveActions = (h: Holding) => {
    const apiHolding = liveHoldings?.find(x => x.assetId === h.assetId);
    const unclaimed = pendingDividends(h.assetId).reduce((sum, d) => sum + d.amount, 0);
    const claims: ReactNode[] = [];
    if (unclaimed > 0) {
      claims.push(
        <PBtn key="div" guide="holdings-dividends" variant="accent" small disabled={claiming !== null} onClick={() => void claimAllDividends(h.assetId)}>
          {claiming === h.assetId ? t('holdings.claim.claiming') : t('holdings.claim.dividends', { amount: fmtUSD2(unclaimed) })}
        </PBtn>,
      );
    }
    if (apiHolding?.claimableOnLiquidation != null) {
      claims.push(
        <PBtn key="cap" guide="holdings-capital" variant="accent" small disabled={claiming !== null} onClick={() => void claimLiquidation(apiHolding)}>
          {claiming === h.assetId ? t('holdings.claim.claiming') : t('holdings.claim.capital', { amount: fmtUSD2(apiHolding.claimableOnLiquidation) })}
        </PBtn>,
      );
    }
    const sell = apiHolding?.poolStatus === 'active' && apiHolding.tokens >= 1
      ? <PBtn variant="ghost" small onClick={() => navigate(`${pathFor('secundario')}?vender=${apiHolding.assetId}`)}>{t('holdings.sell')}</PBtn>
      : null;
    return { claims, sell };
  };

  const claimNote = (assetId: number) => claimMsg?.assetId === assetId && (
    <div role="status" style={{ marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 12.5, color: claimMsg.ok ? 'var(--pos)' : 'var(--neg)' }}>{claimMsg.text}</div>
  );

  const investments = (
    // Same cards as the marketplace, with my position in each
    <div className="g-market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
      {!live && MY_HOLDINGS.map(h => {
        const a = byId(h.assetId);
        return a && (
          <AssetCard key={h.assetId} asset={a} nav={nav} showCode holding={h}
            actions={<PBtn variant="ghost" small>{t('holdings.sell')}</PBtn>} />
        );
      })}
      {live && holdings.map(h => {
        const { claims, sell } = liveActions(h);
        const project = byId(h.assetId);
        const a = assetFor(h);
        if (!a) return null;
        return (
          <div key={h.assetId} style={{ minWidth: 0 }}>
            {project
              ? <AssetCard asset={project} nav={nav} showCode holding={h} actions={sell} />
              : <PositionCard asset={a} holding={h} onOpen={() => nav('detalle', a)} actions={sell} glass={glass} t={t} tc={tc} />}
            {claims.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{claims}</div>}
            {claimNote(h.assetId)}
          </div>
        );
      })}
    </div>
  );

  const investmentsTab = (
    <>
      {live && claimMsg && !holdings.some(h => h.assetId === claimMsg.assetId) && (
        <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: claimMsg.ok ? 'var(--pos)' : 'var(--neg)', padding: '0 2px 12px' }}>{claimMsg.text}</div>
      )}
      {live && holdings.length === 0 && (
        <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '8px 2px' }}>{holdingsLoading ? t('holdings.loadingYours') : t('holdings.emptyOnchain')}</div>
      )}
      {investments}
    </>
  );

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

      {isMobile ? (
        // Phones: balance card first, then the Wallet / Inversiones switch
        <>
          <h1 className="sr-only">{t('holdings.title')}</h1>
          <ParallaxWalletCard info={cardInfo} onDeposit={openDeposit} onWithdraw={openWithdraw} />
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 16 }}>
            {tabSwitch}
            <GuideButton tour="holdings" style={{ marginLeft: 0, alignSelf: 'center' }} />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.04em', color: 'var(--text)', margin: 0 }}>{t('holdings.title')}</h1>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 4 }}>{t('holdings.subtitle')}<GuideButton tour="holdings" /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {tabSwitch}
            </div>
          </div>
          {kpis}
        </>
      )}

      <AnimatePresence mode="wait">
        {tab === 'wallet' && (
          <motion.div key="wallet" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ marginBottom: -16 }}>{kpis}</div>
                {keychainBalance && <div style={{ marginBottom: -16 }}>{keychainBalance}</div>}
                {tokens}
                {evolution}
                {movements}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
                <div>
                  <ParallaxWalletCard info={cardInfo} onDeposit={openDeposit} onWithdraw={openWithdraw} />
                  {keychainBalance}
                  {tokens}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
                  {evolution}
                  {movements}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'inversiones' && (
          <motion.div key="inv" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            {investmentsTab}
          </motion.div>
        )}

      </AnimatePresence>

      {(!live || liveDeposit) && <CryptoDeposit open={depositOpen} onClose={() => setDepositOpen(false)} live={liveDeposit} />}
      {(!live || liveWithdraw) && <CryptoWithdraw open={withdrawOpen} onClose={() => setWithdrawOpen(false)} live={liveWithdraw} />}
    </div>
  );
}

/** A live position whose project is no longer in the public catalog: its own data, no marketplace stats. */
type PositionCardProps = {
  asset: AssetInfo; holding: Holding; onOpen: () => void; actions: ReactNode; glass: CSSProperties;
  /** Translators of the portfolio and common namespaces (passed by the page). */
  t: Translator['t']; tc: Translator['t'];
};

function PositionCard({ asset: a, holding: h, onOpen, actions, glass, t, tc }: PositionCardProps) {
  const pnlPct = h.invested ? ((h.current / h.invested - 1) * 100).toFixed(1) : '0.0';
  const isPos = h.current >= h.invested;
  return (
    <div style={{ ...glass, padding: '16px 18px' }}>
      <div onClick={onOpen} style={{ display: 'flex', gap: 14, cursor: 'pointer' }}>
        <img src={a.img} alt="" style={{ width: 84, height: 60, borderRadius: 12, objectFit: 'cover', flexShrink: 0, opacity: 0.9 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            <PTag label={tc(`categories.${a.cat}`)} color="neutral" />
            {a.stage && <PTag label={tc(`stages.${a.stage}`)} color={a.stage === 'Operativo' ? 'green' : 'neutral'} />}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
        {[
          ['tokens', t('holdings.position.tokens'), h.tokens.toLocaleString()],
          ['value',  t('holdings.position.currentValue'), fmtUSD2(h.current)],
          ['pnl',    t('shared.pnl'), `${isPos ? '+' : ''}${pnlPct}%`],
          ['yield',  t('shared.yieldCollected'), fmtUSD2(h.yieldEarned)],
        ].map(([id, k, v]) => (
          <div key={id}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{k}</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: id === 'pnl' ? (isPos ? 'var(--pos)' : 'var(--neg)') : 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>{actions}</div>}
    </div>
  );
}
