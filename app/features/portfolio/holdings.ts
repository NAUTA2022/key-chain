import type { AssetCategory, AssetStage } from '~/data';
import { mediaUrl, type CatalogAsset } from '~/lib/catalog';
import type { ApiHolding } from '~/lib/onchain';
import { CATEGORY_COLOR, CATEGORY_LABEL } from './format';

/** What the portfolio screens show about the asset behind a position. */
export type AssetInfo = {
  id: number;
  name: string;
  img: string;
  apy: number;
  tokenPrice: number;
  cat: AssetCategory;
  location: string;
  /** Unknown when the asset is no longer in the public catalog. */
  stage: AssetStage | null;
  sold: number | null;
};

/**
 * The catalog entry when the asset is published; otherwise the holding's own
 * fields, so a position is never dropped from the portfolio.
 */
export function assetInfoFor(h: ApiHolding, catalogAsset: CatalogAsset | undefined): AssetInfo {
  if (catalogAsset) return catalogAsset;
  return {
    id: h.assetId,
    name: h.assetName,
    img: mediaUrl(h.imageUrl),
    apy: h.apy,
    tokenPrice: h.tokenPrice,
    cat: CATEGORY_LABEL[h.category],
    location: h.location,
    stage: null,
    sold: null,
  };
}

export type AllocationSlice = { label: string; value: number; amount: number; color: string; sub: string };

/**
 * Allocation by category (share of value, whole percents) and a diversification
 * index on a 0–10 scale: (1 − HHI) × 10, HHI = Σ share² of the categories.
 */
export function allocationByCategory(items: ReadonlyArray<{ cat: AssetCategory; value: number; apy: number }>): { slices: AllocationSlice[]; index: number | null } {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return { slices: [], index: null };
  const byCat = new Map<AssetCategory, { val: number; apySum: number; count: number }>();
  for (const i of items) {
    const c = byCat.get(i.cat) ?? { val: 0, apySum: 0, count: 0 };
    c.val += i.value;
    c.apySum += i.apy;
    c.count += 1;
    byCat.set(i.cat, c);
  }
  const entries = [...byCat.entries()].sort((a, b) => b[1].val - a[1].val);
  const hhi = entries.reduce((s, [, d]) => s + (d.val / total) ** 2, 0);
  return {
    slices: entries.map(([cat, d]) => ({
      label: cat,
      value: Math.round((d.val / total) * 100),
      amount: d.val,
      color: CATEGORY_COLOR[cat],
      sub: `APY prom. ${(d.apySum / d.count).toFixed(1)}%`,
    })),
    index: Math.round((1 - hhi) * 100) / 10,
  };
}
