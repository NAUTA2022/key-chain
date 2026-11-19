import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { PTag } from '~/components/ui';
import { useT } from '~/i18n/useT';
import { DEMO_IMAGES } from './api';

const CSS = `
@property --df-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.df-featured { position: relative; display: block; border-radius: 22px; padding: 1.5px; text-decoration: none; color: inherit;
  background: conic-gradient(from var(--df-angle), #F0B90B, rgba(240,185,11,0.08) 25%, var(--border) 50%, rgba(240,185,11,0.08) 75%, #F0B90B);
  animation: df-spin 5s linear infinite; box-shadow: 0 10px 36px rgba(240,185,11,0.16); transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s; }
.df-featured:hover { transform: translateY(-2px); box-shadow: 0 16px 44px rgba(240,185,11,0.24); }
.df-featured:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }
.df-featured-in { display: flex; border-radius: 20.5px; overflow: hidden; background: linear-gradient(var(--surface), var(--surface)), var(--bg); min-height: 150px; }
.df-featured-img { position: relative; flex: 0 0 38%; overflow: hidden; background: #0b0b0d; }
.df-featured-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 1.2s cubic-bezier(.16,1,.3,1); }
.df-featured:hover .df-featured-img img { transform: scale(1.05); }
.df-featured-cta { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; background: #F0B90B; color: #1a1406; font: 700 13px var(--font-h); }
@keyframes df-spin { to { --df-angle: 360deg; } }
@media (max-width: 767px) { .df-featured-in { flex-direction: column; } .df-featured-img { flex-basis: 150px; } }
@media (prefers-reduced-motion: reduce) { .df-featured { animation: none; } .df-featured, .df-featured-img img { transition: none; } }
`;

/** Highlighted entry to the live demo project on the primary market (live mode only). */
export default function FeaturedDemoCard({ style }: { style?: CSSProperties }) {
  const { t } = useT('market');
  return (
    <div style={style}>
      <style>{CSS}</style>
      <Link to="/demo-en-vivo" className="df-featured" aria-label={t('demo.featured.aria')}>
        <div className="df-featured-in">
          <div className="df-featured-img">
            <img src={DEMO_IMAGES[0]} alt="" width={1600} height={900} loading="lazy" />
            <div style={{ position: 'absolute', top: 12, left: 12 }}><PTag label={t('demo.featured.tag')} color="dark" /></div>
          </div>
          <div style={{ flex: 1, minWidth: 0, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 21, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.15 }}>{t('demo.featured.title')}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5, maxWidth: '62ch' }}>
              {t('demo.featured.body')}
            </div>
            <div style={{ marginTop: 4 }}><span className="df-featured-cta">{t('demo.featured.cta')}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span></div>
          </div>
        </div>
      </Link>
    </div>
  );
}
