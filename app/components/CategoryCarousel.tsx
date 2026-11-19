import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useT } from '~/i18n/useT';

// "Explorar por categoría": a row of category tiles that scrolls sideways
// (arrows on desktop, swipe on touch). Picking a tile filters the market;
// picking it again goes back to every category. Shared by the primary and
// secondary market.

const stroke = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
const ICONS: Record<string, ReactNode> = {
  Todos: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
  Autos: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M5 17h14v-5l-2-5H7l-2 5v5z" /><path d="M3 12h18" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="16.5" cy="17.5" r="1.5" /></svg>,
  Campos: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M12 21v-9" /><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z" /><path d="M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" /><path d="M5 21h14" /></svg>,
  Drones: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><rect x="9" y="10" width="6" height="4" /><path d="M9 12H5M15 12h4M5 9v6M19 9v6" /><path d="M3 8h4M17 8h4" /></svg>,
  Inmuebles: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  Edificios: <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M4 21V5l8-2v18" /><path d="M12 9h8v12" /><path d="M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2" /><path d="M2 21h20" /></svg>,
};
const FALLBACK_ICON = <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /></svg>;

type Props = {
  /** Categories to show; 'Todos' (all) included. */
  categories: readonly string[];
  value: string;
  onChange: (cat: string) => void;
  title?: string;
};

export default function CategoryCarousel({ categories, value, onChange, title: titleProp }: Props) {
  const { t, raw } = useT('common');
  const title = titleProp ?? t('carousel.title');
  // Category names are data in Spanish; unknown ones are shown as given.
  const catLabel = (c: string): string => {
    const v = raw<unknown>(`categories.${c}`);
    return typeof v === 'string' ? v : c;
  };
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const update = () => { setEdges({ prev: el.scrollLeft > 2, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 }); };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [categories.length]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="cat-carousel" aria-label={title}>
      <div className="cat-carousel-head">
        <h2>{title}</h2>
        {(edges.prev || edges.next) && (
          <div className="cat-carousel-nav">
            <button type="button" aria-label={t('carousel.prev')} disabled={!edges.prev} onClick={() => { page(-1); }}><span className="rtl-flip">←</span></button>
            <button type="button" aria-label={t('carousel.next')} disabled={!edges.next} onClick={() => { page(1); }}><span className="rtl-flip">→</span></button>
          </div>
        )}
      </div>
      <div ref={track} className="cat-carousel-track">
        {categories.map(c => {
          const on = c === value;
          return (
            <button key={c} type="button" className={`cat-tile${on ? ' is-on' : ''}`} aria-pressed={on}
              onClick={() => { onChange(on && c !== 'Todos' ? 'Todos' : c); }}>
              <span className="cat-tile-ico" aria-hidden="true">{ICONS[c] ?? FALLBACK_ICON}</span>
              {catLabel(c)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
