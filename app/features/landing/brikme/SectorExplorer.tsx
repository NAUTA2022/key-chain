import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useT } from '~/i18n/useT';
import { useInView } from './useInView';

export type Sector = { id: string; t: string; d: string; img: string };

const AUTO_MS = 4800; // auto-advance until the visitor picks a sector
const ON_SCREEN: IntersectionObserverInit = { threshold: 0.35 };
const pad = (n: number) => String(n).padStart(2, '0');

type Props = { sectors: readonly Sector[]; exploreHref: string; onExplore: () => void };

/**
 * Sector tabs + a large photo stage. Hovering (mouse) or clicking a row shows that sector;
 * arrow keys move between rows; the photo wipes in and follows the pointer slightly.
 * It cycles on its own while nobody touches it.
 */
export default function SectorExplorer({ sectors, exploreHref, onExplore }: Props) {
  const { t } = useT('landing');
  const n = sectors.length;
  const [view, setView] = useState({ active: 0, prev: -1 });
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  // Cycle only while on screen, so it starts at the first sector when the visitor arrives.
  const { ref: viewRef, visible } = useInView<HTMLDivElement>(ON_SCREEN);
  const running = auto && !hover && !reduce && visible;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const { active, prev } = view;

  const show = (i: number) => { setView(v => (v.active === i ? v : { active: i, prev: v.active })); };
  const pick = (i: number) => { setAuto(false); show(i); };

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setTimeout(() => { setView(v => ({ active: (v.active + 1) % n, prev: v.active })); }, AUTO_MS);
    return () => { window.clearTimeout(id); };
  }, [running, active, n]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : step ? (i + step + n) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    pick(next);
    tabs.current[next]?.focus();
  };

  // Slight parallax: the photo drifts away from the pointer.
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onLeave = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--mx', '0');
    e.currentTarget.style.setProperty('--my', '0');
  };

  const s = sectors[active];
  return (
    <div ref={viewRef} className="bk-sx" onPointerEnter={() => { setHover(true); }} onPointerLeave={() => { setHover(false); }}>
      <div className="bk-sx-list" role="tablist" aria-orientation="vertical" aria-label={t('sectors.aria')}>
        {sectors.map((sec, i) => {
          const on = i === active;
          return (
            <button key={sec.id} ref={el => { tabs.current[i] = el; }} type="button" role="tab"
              id={`bk-sx-tab-${sec.id}`} aria-selected={on} aria-controls="bk-sx-panel" tabIndex={on ? 0 : -1}
              className={`bk-sx-item${on ? ' is-on' : ''}`}
              onClick={() => { pick(i); }}
              onPointerEnter={e => { if (e.pointerType === 'mouse') pick(i); }}
              onKeyDown={e => { onKey(e, i); }}>
              <span className="bk-sx-n">{pad(i + 1)}</span>
              <span className="bk-sx-name">{sec.t}</span>
              <span className="bk-sx-desc">{sec.d}</span>
              <span className="bk-sx-arrow" aria-hidden="true">→</span>
              {on && (
                <motion.i key={`${sec.id}-${String(running)}`} className="bk-sx-bar" aria-hidden="true"
                  initial={{ scaleX: running ? 0 : 1 }} animate={{ scaleX: 1 }}
                  transition={{ duration: running ? AUTO_MS / 1000 : 0, ease: 'linear' }} />
              )}
            </button>
          );
        })}
      </div>

      <div className="bk-sx-stage" id="bk-sx-panel" role="tabpanel" aria-labelledby={`bk-sx-tab-${s.id}`}
        onPointerMove={onMove} onPointerLeave={onLeave}>
        {sectors.map((sec, i) => (
          <img key={sec.id} src={sec.img} alt="" loading="lazy" decoding="async" width={1600} height={1067}
            className={`bk-sx-img${i === active ? ' is-on' : i === prev ? ' is-prev' : ''}`} />
        ))}
        <span className="bk-sx-count" aria-hidden="true">{pad(active + 1)} / {pad(n)}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={s.id} className="bk-sx-card"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
            <span className="bk-sx-card-n">{t('sectors.card', { n: pad(active + 1) })}</span>
            <strong>{s.t}</strong>
            <em>{s.d}</em>
            <a className="bk-sx-link" href={exploreHref} onClick={e => { e.preventDefault(); onExplore(); }}>
              {t('sectors.view')} <span className="rtl-flip" aria-hidden="true">→</span>
            </a>
          </motion.div>
        </AnimatePresence>
        <div className="bk-sx-nav">
          <button type="button" aria-label={t('sectors.prev')} onClick={() => { pick((active - 1 + n) % n); }}><span className="rtl-flip">←</span></button>
          <button type="button" aria-label={t('sectors.next')} onClick={() => { pick((active + 1) % n); }}><span className="rtl-flip">→</span></button>
        </div>
      </div>
    </div>
  );
}
