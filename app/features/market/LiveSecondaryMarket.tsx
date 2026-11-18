import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { Icons, PBtn, PCard, PSection, PTag } from '~/components/ui';
import { fmtUSD2 } from '~/data';
import { timeAgo } from '~/features/notifications/time';
import { useMobile } from '~/hooks/useMobile';
import { type CatalogAsset, useCatalog } from '~/lib/catalog';
import { goCheckout } from '~/lib/checkout';
import type { NavFn } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { FilterBar, ListingCard, MagnetToolbar, MobileListingCard, MobileMarketHeader, MobileSummary, type SortKey } from '~/pages/SecondaryMarket';
import { type MarketListing, cancelOnchain, shortWallet, useMarketInfo, useMarketListings, useMarketStats, useMyListings } from './api';
import { SellModal } from './TradeModals';
import GuideButton from '~/features/guide/GuideButton';

type LiveListing = MarketListing & { catalog: CatalogAsset; diff: number };

const fmtTokens = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 4 });
const fmtVolume = (n: number) => '$' + n.toLocaleString('es-AR', { maximumFractionDigits: n < 10 ? 2 : 0 });
const STATUS: Record<MarketListing['status'], { label: string; color: 'green' | 'neutral' | 'red' }> = {
  active: { label: 'Activa', color: 'green' },
  filled: { label: 'Vendida', color: 'neutral' },
  cancelled: { label: 'Retirada', color: 'red' },
};
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
  const unavailable = info.data ? (!info.data.enabled ? 'El mercado secundario no está disponible en esta red.' : info.data.paused ? 'El mercado secundario está pausado temporalmente: no se pueden publicar ni comprar ofertas.' : null) : null;

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
    ['Volumen 24h', s ? fmtVolume(s.volume24h) : '—'],
    ['Listados activos', s ? s.activeListings.toString() : '—'],
    // A discount is shown as a negative difference vs. the reference price (like each card).
    ['Descuento promedio', avg === null ? '—' : `${avg > 0 ? '-' : avg < 0 ? '+' : ''}${Math.abs(avg).toFixed(1)}%`],
    ['Operaciones 24h', s ? s.trades24h.toString() : '—'],
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
      title: 'Compra en mercado secundario', source: 'Mercado Secundario',
      items: [{ name: l.catalog.name, img: l.catalog.img, qty: quantity, unit: l.pricePerToken, meta: `Vende ${shortWallet(l.sellerWallet)}` }],
      back: { route: 'secundario' }, done: { route: 'pertenencias', label: 'Ver en Mis Pertenencias' },
      action: { kind: 'secondary', listingId: l.id, quantity },
    });
  };

  const cancel = async (l: MarketListing) => {
    if (!marketInfo || !account) return nav('login');
    setCancelling(l.id);
    setNotice(null);
    try {
      const { synced } = await cancelOnchain({ info: marketInfo, listing: l, account, wallet });
      setNotice(`Retiraste la oferta. Tus tokens quedan libres en tu wallet.${synced ? '' : ' La lista se actualiza en unos segundos.'}`);
      refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo retirar la oferta.');
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
        title={<span data-guide="secondary-title">Mercado Secundario</span>}
        sub="Compra y venta P2P entre inversores. Compará precio pedido vs. precio real del token."
        help={<GuideButton tour="secondary" />}
        action={<PBtn guide="secondary-sell" variant="primary" onClick={openSell} disabled={Boolean(unavailable)}>+ Publicar venta</PBtn>}
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

      {mobile ? <MagnetToolbar>{filterBar}</MagnetToolbar> : filterBar(false)}

      <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:16 }}>
        {loading ? 'Cargando ofertas…' : `${sorted.length} listado${sorted.length !== 1 ? 's' : ''} activo${sorted.length !== 1 ? 's' : ''}`}
      </div>

      {/* Listings */}
      {mobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {sorted.map((l, idx) => {
            const isDiscount = l.diff < 0;
            const own = sameWallet(l.sellerWallet, me);
            const listed = listings.data ? timeAgo(l.listedAt, listings.data.at) : '';
            return (
              <MobileListingCard key={l.id} idx={idx}
                asset={l.catalog} qty={fmtTokens(l.available)} saving={(l.referencePrice - l.pricePerToken) * l.available}
                askPrice={l.pricePerToken} realPrice={l.referencePrice} diff={l.diff} tokenLife={l.asset.lifespan}
                seller={own ? 'Tu oferta' : shortWallet(l.sellerWallet)}
                sellerNote={<>Wallet verificada (KYC){listed && ` · ${listed}`}</>}
                onView={() => nav('detalle', l.catalog)}
                action={own ? (
                  <PBtn guide="listing-withdraw" variant="secondary" small disabled={cancelling === l.id} onClick={() => void cancel(l)} style={{ flexShrink:0, padding:'9px 18px' }}>
                    {cancelling === l.id ? 'Retirando…' : 'Retirar'}
                  </PBtn>
                ) : (
                  <PBtn guide="listing-buy" variant={isDiscount ? 'accent' : 'secondary'} small disabled={Boolean(unavailable) || buyable(l) < 1} onClick={() => buy(l)} style={{ flexShrink:0, padding:'9px 18px' }}>
                    Comprar
                  </PBtn>
                )} />
            );
          })}
        </div>
      ) : (
      <div className="g-market-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>
        {sorted.map((l, idx) => {
          const isDiscount = l.diff < 0;
          const own = sameWallet(l.sellerWallet, me);
          return (
            <motion.div key={l.id} data-guide="listing-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:Math.min(idx, 10)*0.06 }}>
              <ListingCard
                seller={own ? 'Tu oferta' : shortWallet(l.sellerWallet)}
                sellerNote={<>
                  {Icons.shield}
                  <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--sec)' }}>Wallet verificada (KYC)</span>
                </>}
                listed={listings.data ? timeAgo(l.listedAt, listings.data.at) : ''}
                asset={l.catalog}
                qty={fmtTokens(l.available)}
                askPrice={l.pricePerToken}
                realPrice={l.referencePrice}
                diff={l.diff}
                tokenLife={l.asset.lifespan}
                onView={() => nav('detalle', l.catalog)}
                actions={<>
                  {own ? (
                    <PBtn guide="listing-withdraw" variant="secondary" style={{ flex:1 }} small disabled={cancelling === l.id} onClick={() => void cancel(l)}>
                      {cancelling === l.id ? 'Retirando…' : 'Retirar oferta'}
                    </PBtn>
                  ) : (
                    <PBtn guide="listing-buy" variant={isDiscount ? 'accent' : 'secondary'} style={{ flex:1 }} small disabled={Boolean(unavailable) || buyable(l) < 1}
                      onClick={() => buy(l)}>
                      Comprar
                    </PBtn>
                  )}
                  <PBtn variant="ghost" small onClick={() => nav('detalle', l.catalog)}>Ver</PBtn>
                </>}
              />
            </motion.div>
          );
        })}
      </div>
      )}

      {!loading && sorted.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:14 }}>
          {listings.failed
            ? 'No pudimos cargar las ofertas. Intentá de nuevo en unos segundos.'
            : (listings.data?.items.length ?? 0) > 0
              ? 'No hay listados activos con esos filtros.'
              : 'Todavía no hay ofertas publicadas. Publicá la primera con «+ Publicar venta» o desde Mis Pertenencias.'}
        </div>
      )}

      {/* The user's own offers, including sold and withdrawn ones */}
      {myListings.length > 0 && (
        <section style={{ marginTop:36 }}>
          <h2 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, color:'var(--text)', letterSpacing:'-0.02em', margin:'0 0 12px' }}>Mis publicaciones</h2>
          <PCard style={{ padding:'6px 18px' }}>
            {myListings.map((l, i) => {
              const sold = l.quantity - l.remaining;
              const stuck = l.status === 'active' && l.available < l.remaining;
              return (
                <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', padding:'12px 0', borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
                  <div style={{ flex:'1 1 200px', minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{l.asset.name}</div>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--sec)', marginTop:2 }}>
                      {fmtTokens(l.quantity)} tokens a {fmtUSD2(l.pricePerToken)} · vendidos {fmtTokens(sold)}
                      {stuck && ' · sin saldo o autorización suficiente para venderse'}
                    </div>
                  </div>
                  <PTag label={STATUS[l.status].label} color={STATUS[l.status].color} />
                  {l.status === 'active' && (
                    <PBtn variant="secondary" small disabled={cancelling === l.id} onClick={() => void cancel(l)}>
                      {cancelling === l.id ? 'Retirando…' : 'Retirar'}
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
