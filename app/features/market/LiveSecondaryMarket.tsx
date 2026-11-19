import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { PBtn, PCard, PSection, PTag } from '~/components/ui';
import { RWA_CATS, fmtUSD2 } from '~/data';
import CategoryCarousel from '~/components/CategoryCarousel';
import { useMobile } from '~/hooks/useMobile';
import { type CatalogAsset, useCatalog } from '~/lib/catalog';
import { goCheckout } from '~/lib/checkout';
import type { NavFn } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { FilterBar, ListingCard, MagnetToolbar, MobileMarketHeader, MobileSummary, type SortKey } from '~/pages/SecondaryMarket';
import { type MarketListing, cancelOnchain, shortWallet, useMarketInfo, useMarketListings, useMarketStats, useMyListings } from './api';
import { SellModal } from './TradeModals';
import GuideButton from '~/features/guide/GuideButton';
import { useT } from '~/i18n/useT';
import { errorText } from './i18n';

type LiveListing = MarketListing & { catalog: CatalogAsset; diff: number };

const fmtTokens = (n: number, locale: string) => n.toLocaleString(locale, { maximumFractionDigits: 4 });
const fmtVolume = (n: number, locale: string) => '$' + n.toLocaleString(locale, { maximumFractionDigits: n < 10 ? 2 : 0 });
/** Tag color of each listing status (the label is `secondary.status.<status>`). */
const STATUS_COLOR: Record<MarketListing['status'], 'green' | 'neutral' | 'red'> = { active: 'green', filled: 'neutral', cancelled: 'red' };
const sameWallet = (a: string | null | undefined, b: string | null | undefined) => Boolean(a && b) && a?.toLowerCase() === b?.toLowerCase();

/**
 * Live P2P market (FactorActSecondaryMarket): real offers only, same layout as the demo page.
 * "Comprar" opens the platform checkout (lib/checkout), which buys on-chain (buyOnchain);
 * selling, withdrawing and "Mis publicaciones" stay on this page.
 */
export default function LiveSecondaryMarket({ nav, rubro = 'Todos' }: { nav: NavFn; rubro?: string }) {
  const session = useSession();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { byId } = useCatalog();
  const info = useMarketInfo();
  const listings = useMarketListings();
  const stats = useMarketStats();
  const mine = useMyListings();
  const [params, setParams] = useSearchParams();
  const { t, locale } = useT('market');

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('descuento');
  const [cat, setCat] = useState('Todos');
  const [country, setCountry] = useState('Todos');
  const [company, setCompany] = useState('Todos');
  const [selling, setSelling] = useState<{ assetId: number | null } | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // "Vender" in Mis Pertenencias opens the sell form here (?vender=<assetId>).
  const sellParam = Number(params.get('vender'));
  const sellFromHoldings = Number.isInteger(sellParam) && sellParam > 0 ? sellParam : null;
  const sellOpen = selling ?? (sellFromHoldings ? { assetId: sellFromHoldings } : null);
  const closeSell = () => {
    setSelling(null);
    if (sellFromHoldings) setParams(p => { p.delete('vender'); return p; }, { replace: true });
  };

  const me = session.user?.walletAddress ?? null;
  const marketInfo = info.data;
  const unavailable = info.data ? (!info.data.enabled ? t('secondary.unavailable') : info.data.paused ? t('secondary.pausedLong') : null) : null;

  const refresh = () => {
    listings.reload();
    stats.reload();
    mine.reload();
  };

  const enriched = useMemo(() => (listings.data?.items ?? []).flatMap((l): LiveListing[] => {
    const a = byId(l.asset.id);
    if (!a) return [];
    if (rubro !== 'Todos' && a.cat !== rubro) return [];
    if (cat !== 'Todos' && a.cat !== cat) return [];
    if (country !== 'Todos' && a.country !== country) return [];
    if (company !== 'Todos' && a.company !== company) return [];
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !l.sellerWallet.includes(q) && !a.cat.toLowerCase().includes(q)) return [];
    }
    return [{ ...l, catalog: a, diff: l.referencePrice > 0 ? (l.pricePerToken / l.referencePrice - 1) * 100 : 0 }];
  }), [listings.data, byId, rubro, cat, country, company, search]);

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    if (sort === 'descuento') return a.diff - b.diff;
    if (sort === 'prima') return b.diff - a.diff;
    return Date.parse(b.listedAt) - Date.parse(a.listedAt);
  }), [enriched, sort]);

  const s = stats.data;
  const avg = s?.avgDiscountPercent ?? null;
  const kpis: Array<[string, string]> = [
    [t('secondary.volume24h'), s ? fmtVolume(s.volume24h, locale) : '—'],
    [t('secondary.activeListings'), s ? s.activeListings.toString() : '—'],
    // A discount is shown as a negative difference vs. the reference price (like each card).
    [t('secondary.avgDiscount'), avg === null ? '—' : `${avg > 0 ? '-' : avg < 0 ? '+' : ''}${Math.abs(avg).toFixed(1)}%`],
    [t('secondary.trades24h'), s ? s.trades24h.toString() : '—'],
  ];

  const openSell = () => (session.status === 'authenticated' ? setSelling({ assetId: null }) : nav('login'));
  const mobile = useMobile();

  // The market trades whole tokens: the checkout buys every whole token still on sale.
  const buyable = (l: LiveListing) => Math.floor(l.available);
  const buy = (l: LiveListing) => {
    if (session.status !== 'authenticated') return nav('login');
    const quantity = buyable(l);
    if (quantity < 1) return;
    goCheckout(nav, {
      title: t('secondary.buyTitle'), source: 'Mercado Secundario',
      items: [{ name: l.catalog.name, img: l.catalog.img, qty: quantity, unit: l.pricePerToken, meta: t('secondary.soldBy', { seller: shortWallet(l.sellerWallet) }) }],
      back: { route: 'secundario' }, done: { route: 'pertenencias', label: t('secondary.viewInHoldings') },
      action: { kind: 'secondary', listingId: l.id, quantity },
    });
  };

  const cancel = async (l: MarketListing) => {
    if (!marketInfo || !account) return nav('login');
    setCancelling(l.id);
    setNotice(null);
    try {
      const { synced } = await cancelOnchain({ info: marketInfo, listing: l, account, wallet });
      setNotice(t('secondary.cancelled') + (synced ? '' : t('secondary.cancelledSync')));
      refresh();
    } catch (e) {
      setNotice(errorText(e, t, 'errors.cancelFailed'));
    } finally {
      setCancelling(null);
    }
  };

  const loading = listings.loading && !listings.data;
  const filterBar = (pinned: boolean) => (
    <FilterBar search={search} setSearch={setSearch} cat={cat} setCat={setCat}
      country={country} setCountry={setCountry} company={company} setCompany={setCompany}
      sort={sort} setSort={setSort} pinned={pinned} />
  );
  const myListings = mine.data ?? [];

  return (
    <div className="g-page" style={{ padding:'28px 32px 40px', maxWidth:1200, margin:'0 auto' }}>
      {mobile ? <MobileMarketHeader onPublish={openSell} disabled={Boolean(unavailable)} help={<GuideButton tour="secondary" />} /> : (
      <PSection
        title={<span data-guide="secondary-title">{t('secondary.title')}</span>}
        sub={t('secondary.sub')}
        help={<GuideButton tour="secondary" />}
        action={<PBtn guide="secondary-sell" variant="primary" onClick={openSell} disabled={Boolean(unavailable)}>{t('secondary.publish')}</PBtn>}
      />
      )}

      {/* Stats */}
      {mobile ? <MobileSummary stats={kpis} /> : (
      <div className="g-kpi" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:26 }}>
        {kpis.map(([k, v], idx) => (
          <motion.div key={k} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.07 }}>
            <PCard style={{ padding:'16px 20px' }}>
              <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{k}</div>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)', letterSpacing:'-0.03em' }}>{v}</div>
            </PCard>
          </motion.div>
        ))}
      </div>
      )}

      {(unavailable || notice) && (
        <PCard style={{ padding:'12px 16px', marginBottom:18 }}>
          <div role="status" style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--sec)' }}>{unavailable ?? notice}</div>
        </PCard>
      )}

      <CategoryCarousel categories={RWA_CATS} value={cat} onChange={setCat} />

      {mobile ? <MagnetToolbar>{filterBar}</MagnetToolbar> : filterBar(false)}

      <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:16 }}>
        {loading ? t('secondary.loadingOffers') : t(sorted.length === 1 ? 'secondary.countOne' : 'secondary.countMany', { count: sorted.length })}
      </div>

      {/* Listings */}
      <div className="g-market-grid" style={{ display:'grid', gridTemplateColumns: mobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(auto-fill,minmax(260px,1fr))', gap: mobile ? 10 : 20 }}>
        {sorted.map((l, idx) => {
          const isDiscount = l.diff < 0;
          const own = sameWallet(l.sellerWallet, me);
          return (
            <motion.div key={l.id} data-guide="listing-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:Math.min(idx, 10)*0.06 }}>
              <ListingCard
                seller={own ? t('secondary.you') : shortWallet(l.sellerWallet)}
                asset={l.catalog}
                qty={fmtTokens(l.available, locale)}
                askPrice={l.pricePerToken}
                diff={l.diff}
                onView={() => nav('detalle', l.catalog)}
                actions={own ? (
                  <PBtn guide="listing-withdraw" variant="secondary" style={{ flex:1 }} small disabled={cancelling === l.id} onClick={() => void cancel(l)}>
                    {cancelling === l.id ? t('secondary.withdrawing') : t('secondary.withdrawOffer')}
                  </PBtn>
                ) : (
                  <PBtn guide="listing-buy" variant={isDiscount ? 'accent' : 'secondary'} style={{ flex:1 }} small disabled={Boolean(unavailable) || buyable(l) < 1}
                    onClick={() => buy(l)}>
                    {t('secondary.buy')}
                  </PBtn>
                )}
              />
            </motion.div>
          );
        })}
      </div>

      {!loading && sorted.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:14 }}>
          {listings.failed
            ? t('secondary.emptyFailed')
            : (listings.data?.items.length ?? 0) > 0
              ? t('secondary.emptyFiltered')
              : t('secondary.emptyNone')}
        </div>
      )}

      {/* The user's own offers, including sold and withdrawn ones */}
      {myListings.length > 0 && (
        <section style={{ marginTop:36 }}>
          <h2 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, color:'var(--text)', letterSpacing:'-0.02em', margin:'0 0 12px' }}>{t('secondary.myListings')}</h2>
          <PCard style={{ padding:'6px 18px' }}>
            {myListings.map((l, i) => {
              const sold = l.quantity - l.remaining;
              const stuck = l.status === 'active' && l.available < l.remaining;
              return (
                <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', padding:'12px 0', borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
                  <div style={{ flex:'1 1 200px', minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{l.asset.name}</div>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--sec)', marginTop:2 }}>
                      {t('secondary.myListingLine', { qty: fmtTokens(l.quantity, locale), price: fmtUSD2(l.pricePerToken), sold: fmtTokens(sold, locale) })}
                      {stuck && t('secondary.stuck')}
                    </div>
                  </div>
                  <PTag label={t(`secondary.status.${l.status}`)} color={STATUS_COLOR[l.status]} />
                  {l.status === 'active' && (
                    <PBtn variant="secondary" small disabled={cancelling === l.id} onClick={() => void cancel(l)}>
                      {cancelling === l.id ? t('secondary.withdrawing') : t('secondary.withdraw')}
                    </PBtn>
                  )}
                </div>
              );
            })}
          </PCard>
        </section>
      )}

      <AnimatePresence>
        {sellOpen && marketInfo && !unavailable && (
          <SellModal key="sell" nav={nav} info={marketInfo} initialAssetId={sellOpen.assetId}
            onClose={closeSell} onDone={refresh} />
        )}
      </AnimatePresence>
    </div>
  );
}
