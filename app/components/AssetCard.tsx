import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '~/components/ui';
import { ProjectCode } from '~/components/social/FeedPostCard';
import { fmtUSD } from '~/data';
import { useT, type Translator } from '~/i18n/useT';
import type { NavFn } from '~/lib/navigation';
import type { SocialAsset } from '~/lib/social/types';

// The marketplace project card (Tokenizaciones). Reused wherever projects are
// listed — company profile projects, a person's investments — so they all
// look the same. `showCode` adds the project identifier next to the name;
// `holding` ({ tokens, current, invested, yieldEarned }) adds a strip with
// that person's position in the project, plus optional `actions` buttons.
// `asset` is a demo RwaAsset or a live CatalogAsset (its pool adds the
// "On-chain" tag).
//
// Photo-led, same family as the secondary market card (`.sm-card` styles in
// global.css): issuer and status on top; name, place, key numbers and the
// funding bar over the photo. The whole card opens the project.

/** A person's position in the project, shown under the card. */
export type AssetCardHolding = { tokens: number; current: number; invested: number; yieldEarned?: number };

export type AssetCardProps = {
  asset: SocialAsset;
  nav: NavFn;
  showCode?: boolean;
  holding?: AssetCardHolding | null;
  actions?: ReactNode;
  /** First cards above the fold: load their photo eagerly. */
  priority?: boolean;
};

const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
};

/** Translated data value (category or stage); values without a translation are shown as given. */
const dataLabel = (raw: Translator['raw'], group: 'categories' | 'stages', value: string): string => {
  const v = raw<unknown>(`${group}.${value}`);
  return typeof v === 'string' ? v : value;
};

/** Status chip: open for investment (live), operating, or anything else as given. */
function StatusChip({ stage }: { stage: string }) {
  const { raw } = useT('common');
  if (stage === 'Recaudación') {
    return <span className="sm-chip sm-chip-live"><i style={{ borderRadius: '50%' }} aria-hidden="true" />{dataLabel(raw, 'stages', stage)}</span>;
  }
  return <span className={`sm-chip ${stage === 'Operativo' ? 'sm-chip-dark' : 'sm-chip-trade'}`}>{dataLabel(raw, 'stages', stage)}</span>;
}

export default function AssetCard({ asset: a, nav, showCode, holding, actions, priority }: AssetCardProps) {
  const { t, raw } = useT('common');
  const left = a.totalTokens - Math.round(a.totalTokens * a.sold / 100);
  // Brikme's own tokenizations carry the Brikme name even when a partner operates the asset.
  const issuer = a.issuer === 'keychain' ? 'BRIKME' : (a.company || 'BRIKME');
  const onchain = a.pool?.status === 'active';
  const open = () => nav('detalle', a);
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
      <article className="sm-card sm-card-asset" data-guide="asset-card">
        <img className="sm-card-img" src={a.img} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" draggable={false} />
        <span className="sm-card-shade" aria-hidden="true" />
        <button type="button" className="sm-card-hit" onClick={open} aria-label={t('asset.view', { name: a.name })} />
        <header className="sm-card-top">
          <span className="sm-card-logo" aria-hidden="true">{initials(issuer)}</span>
          <span className="sm-card-issuer"><strong>{issuer}</strong><em>{dataLabel(raw, 'categories', a.cat)}</em></span>
          {onchain && <span className="sm-chip sm-chip-onchain">{t('asset.onchain')}</span>}
          <StatusChip stage={a.stage} />
        </header>
        <div className="sm-card-body">
          <h3>{showCode && <ProjectCode asset={a} overlay />}{a.name}</h3>
          <p className="sm-card-loc">{Icons.location}<span>{a.location}</span></p>
          <dl className="sm-card-stats">
            <div><dt>{t('asset.token')}</dt><dd>{fmtUSD(a.tokenPrice)}</dd></div>
            <div data-guide="asset-apy"><dt>{t('asset.apy')}</dt><dd>{a.apy}%</dd></div>
            <div><dt>{t('asset.available')}</dt><dd>{left > 0 ? left.toLocaleString('en-US') : t('asset.soldOut')}</dd></div>
          </dl>
          <div className="sm-card-funded" data-guide="asset-funded">
            <div><span>{t('asset.funded')}</span><span>{a.sold}%</span></div>
            <span className="sm-card-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, a.sold))}%` }} /></span>
          </div>
        </div>
      </article>
      {holding && <HoldingStrip holding={holding} actions={actions} />}
    </motion.div>
  );
}

// The person's position, as a strip under the card.
function HoldingStrip({ holding: h, actions }: { holding: AssetCardHolding; actions?: ReactNode }) {
  const { t } = useT('common');
  const diff = h.invested ? ((h.current - h.invested) / h.invested) * 100 : 0;
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'11px 17px',
      fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)',
      marginTop:8, border:'1px solid var(--border-l)', background:'var(--surface)',
    }}>
      <span><b style={{ color:'var(--text)' }}>{h.tokens}</b> {t('asset.tokens')}</span>
      <span>{t('asset.value')} <b style={{ color:'var(--text)' }}>{fmtUSD(h.current)}</b></span>
      <span style={{ fontWeight:700, color: diff >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span>
      {/* Clicks on the actions must not open the project behind them. */}
      {actions && <span onClick={e => e.stopPropagation()} style={{ display:'flex', gap:6 }}>{actions}</span>}
    </div>
  );
}
