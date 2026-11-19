import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { PBtn } from '~/components/ui';
import { stepKey, type GuidePlacement, type GuideStep, type Tour } from './tours';
import { useT } from '~/i18n/useT';

// Coach-mark renderer: dims the page, cuts a spotlight around the step's anchor
// (`[data-guide="…"]`) and shows a bubble next to it. Fixed positioning in a portal,
// flips/clamps to the viewport; on narrow screens (or when the anchor is off-screen
// or tiny) the bubble becomes a bottom sheet. Steps whose anchor is missing are skipped.

export type TourEndReason = 'done' | 'skip';

type Rect = { top: number; left: number; width: number; height: number };
type Layout =
  | { mode: 'anchored'; spot: Rect; bubble: { top: number; left: number }; side: Exclude<GuidePlacement, 'auto'>; arrow: number }
  | { mode: 'center'; spot: Rect | null }
  | { mode: 'sheet'; spot: Rect | null };

const MARGIN = 12;
const GAP = 14;
const SPOT_PAD = 6;
const MOBILE_MAX = 640;
const BUBBLE_W = 340;
const Z = 10050;
/** How long a tour waits for its anchors (data loads after navigation). */
const ANCHOR_WAIT_MS = 2500;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isRendered(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
}

function inViewport(r: DOMRect): boolean {
  return r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}

function inScrollableRow(el: Element): boolean {
  for (let a = el.parentElement; a; a = a.parentElement) {
    const { overflowX } = getComputedStyle(a);
    if ((overflowX === 'auto' || overflowX === 'scroll') && a.scrollWidth > a.clientWidth) return true;
  }
  return false;
}

/** First rendered element for the step's anchors, preferring ones already on screen. */
function findAnchor(step: GuideStep): HTMLElement | null {
  if (!step.target) return null;
  let fallback: HTMLElement | null = null;
  for (const name of step.target) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-guide="${CSS.escape(name)}"]`)) {
      if (!isRendered(el)) continue;
      // Off-canvas drawers sit outside the viewport horizontally: never scroll to them
      // (items of a horizontally scrollable row, such as tabs on a phone, are fine).
      const r = el.getBoundingClientRect();
      if ((r.right <= 0 || r.left >= window.innerWidth) && !inScrollableRow(el)) continue;
      if (inViewport(r)) return el;
      fallback ??= el;
    }
  }
  return fallback;
}

/** Steps that can be shown right now (anchor present, or a concept step). */
function usableSteps(tour: Tour): GuideStep[] {
  return tour.steps.filter(s => (s.when ? s.when() : true) && (!s.target || s.fallback === 'center' || findAnchor(s) !== null));
}

function computeLayout(step: GuideStep, anchor: HTMLElement | null, size: { w: number; h: number }): Layout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw <= MOBILE_MAX;
  if (!anchor) return { mode: mobile ? 'sheet' : 'center', spot: null };
  const r = anchor.getBoundingClientRect();
  // Spotlight clamped to the viewport (big anchors such as a whole card list).
  const top = Math.max(r.top - SPOT_PAD, 4);
  const left = Math.max(r.left - SPOT_PAD, 4);
  const spot: Rect = { top, left, width: Math.min(r.right + SPOT_PAD, vw - 4) - left, height: Math.min(r.bottom + SPOT_PAD, vh - 4) - top };
  const visible = inViewport(r);
  const tiny = r.width < 8 || r.height < 8;
  if (!visible || tiny) return { mode: mobile ? 'sheet' : 'center', spot: visible && !tiny ? spot : null };
  const { w, h } = size;
  const s = { top: spot.top, left: spot.left, bottom: spot.top + spot.height, right: spot.left + spot.width };
  const fits: Record<Exclude<GuidePlacement, 'auto'>, boolean> = {
    bottom: s.bottom + GAP + h <= vh - MARGIN,
    top: s.top - GAP - h >= MARGIN,
    right: s.right + GAP + w <= vw - MARGIN,
    left: s.left - GAP - w >= MARGIN,
  };
  const order: Exclude<GuidePlacement, 'auto'>[] = ['bottom', 'top', 'right', 'left'];
  const preferred = step.placement && step.placement !== 'auto' ? [step.placement, ...order.filter(o => o !== step.placement)] : order;
  // Phones only get a bubble above or below the anchor; otherwise a bottom sheet.
  const side = (mobile ? preferred.filter(o => o === 'bottom' || o === 'top') : preferred).find(o => fits[o]);
  if (!side) return { mode: mobile ? 'sheet' : 'center', spot };
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
  const cx = s.left + spot.width / 2;
  const cy = s.top + spot.height / 2;
  let bubble: { top: number; left: number };
  if (side === 'bottom' || side === 'top') {
    bubble = { left: clamp(cx - w / 2, MARGIN, vw - w - MARGIN), top: side === 'bottom' ? s.bottom + GAP : s.top - GAP - h };
  } else {
    bubble = { top: clamp(cy - h / 2, MARGIN, vh - h - MARGIN), left: side === 'right' ? s.right + GAP : s.left - GAP - w };
  }
  // Arrow offset along the bubble edge, pointing at the anchor's center.
  const arrow = side === 'bottom' || side === 'top' ? clamp(cx - bubble.left, 18, w - 18) : clamp(cy - bubble.top, 18, h - 18);
  return { mode: 'anchored', spot, bubble, side, arrow };
}

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

function sameLayout(a: Layout | null, b: Layout): boolean {
  if (!a || a.mode !== b.mode || !sameRect(a.spot, b.spot)) return false;
  if (a.mode === 'anchored' && b.mode === 'anchored') {
    return a.side === b.side && Math.abs(a.bubble.top - b.bubble.top) < 0.5 && Math.abs(a.bubble.left - b.bubble.left) < 0.5 && Math.abs(a.arrow - b.arrow) < 0.5;
  }
  return true;
}

type Props = { tour: Tour; onEnd: (reason: TourEndReason) => void };

export default function TourOverlay({ tour, onEnd }: Props) {
  const [steps, setSteps] = useState<GuideStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [size, setSize] = useState({ w: BUBBLE_W, h: 180 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [reduced] = useState(prefersReducedMotion);
  const titleId = useId();
  const bodyId = useId();
  const { t } = useT('help');

  // Wait (briefly) for the anchors of a freshly loaded page, then freeze the step list.
  useEffect(() => {
    let alive = true;
    const started = Date.now();
    const tick = () => {
      if (!alive) return;
      const all = tour.steps.filter(s => !s.when || s.when());
      const ready = all.every(s => !s.target || findAnchor(s) !== null);
      if (ready || Date.now() - started > ANCHOR_WAIT_MS) {
        const usable = usableSteps(tour);
        if (usable.length === 0) onEnd('skip');
        else setSteps(usable);
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
    return () => {
      alive = false;
    };
    // Runs once per tour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  const step = steps?.[index] ?? null;

  // Bring the anchor into view, then follow it every frame (scroll containers, resizes, animations).
  useEffect(() => {
    if (!step) return;
    const first = findAnchor(step);
    if (first) {
      const r = first.getBoundingClientRect();
      const fullyVisible = r.top >= 70 && r.bottom <= window.innerHeight - 80;
      if (!fullyVisible) first.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
    let raf = 0;
    let last: Layout | null = null;
    const loop = () => {
      const next = computeLayout(step, findAnchor(step), size);
      if (!sameLayout(last, next)) {
        last = next;
        setLayout(next);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [step, size, reduced]);

  // Measure the bubble so placement can flip/clamp with its real size.
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize(s => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step, layout?.mode]);

  // Focus: remember the trigger, move focus into the dialog on every step, restore on close.
  useEffect(() => {
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => restoreFocus.current?.focus({ preventScroll: true });
  }, []);
  const shown = layout !== null;
  useEffect(() => {
    if (step && shown) titleRef.current?.focus({ preventScroll: true });
  }, [step, shown]);

  const total = steps?.length ?? 0;
  const next = useCallback(() => {
    if (index >= total - 1) onEnd('done');
    else setIndex(i => i + 1);
  }, [index, total, onEnd]);
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onEnd('skip');
      } else if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [next, back, onEnd]);

  // Keep Tab inside the bubble (aria-modal).
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !bubbleRef.current) return;
    const items = [...bubbleRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    if (!firstEl || !lastEl) return;
    if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === titleRef.current)) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  if (!step || !layout || typeof document === 'undefined') return null;

  const isLast = index === total - 1;
  const stepTitle = t(stepKey(tour.id, step, 'title'));
  const fade = reduced ? undefined : 'kcGuideIn 0.2s ease-out';
  const spot = layout.spot;
  const vw = window.innerWidth;
  const bubbleWidth = Math.min(BUBBLE_W, vw - MARGIN * 2);

  let bubbleStyle: CSSProperties;
  if (layout.mode === 'anchored') {
    bubbleStyle = { position: 'fixed', top: layout.bubble.top, left: layout.bubble.left, width: bubbleWidth, borderRadius: 18 };
  } else if (layout.mode === 'center') {
    bubbleStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: Math.min(400, vw - MARGIN * 2), borderRadius: 20 };
  } else {
    bubbleStyle = {
      position: 'fixed', left: 0, right: 0, bottom: 0, width: '100%', borderRadius: '22px 22px 0 0',
      paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', maxHeight: '70vh', overflowY: 'auto',
    };
  }

  const arrowStyle: CSSProperties | null =
    layout.mode === 'anchored'
      ? {
          position: 'absolute', width: 12, height: 12, background: 'var(--gl-panel-strong)', transform: 'rotate(45deg)',
          border: '1px solid var(--border)',
          ...(layout.side === 'bottom' && { top: -7, left: layout.arrow - 6, borderRight: 'none', borderBottom: 'none' }),
          ...(layout.side === 'top' && { bottom: -7, left: layout.arrow - 6, borderLeft: 'none', borderTop: 'none' }),
          ...(layout.side === 'right' && { left: -7, top: layout.arrow - 6, borderRight: 'none', borderTop: 'none' }),
          ...(layout.side === 'left' && { right: -7, top: layout.arrow - 6, borderLeft: 'none', borderBottom: 'none' }),
        }
      : null;

  return createPortal(
    <div data-guide-overlay="" style={{ position: 'fixed', inset: 0, zIndex: Z }}>
      <style>{`@keyframes kcGuideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      {/* Backdrop: dims the page and swallows clicks so the tour is not left behind by accident. */}
      {spot ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', top: spot.top, left: spot.left, width: spot.width, height: spot.height, borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(5,7,12,0.58)', outline: '2px solid var(--accent)', outlineOffset: 0,
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,12,0.58)' }} />
      )}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0 }} />

      <div
        ref={bubbleRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={trapTab}
        key={index}
        style={{
          ...bubbleStyle,
          boxSizing: 'border-box',
          padding: layout.mode === 'sheet' ? '20px 20px 18px' : '18px 20px 16px',
          background: 'var(--gl-panel-strong)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--sh-lg)',
          color: 'var(--text)',
          animation: layout.mode === 'center' ? undefined : fade,
        }}
      >
        {arrowStyle && <span aria-hidden="true" style={arrowStyle} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <span data-guide-progress="" style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ter)' }}>
            {t('guide.overlay.progress', { current: index + 1, total })}
          </span>
          <button
            type="button"
            onClick={() => onEnd('skip')}
            style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 500, color: 'var(--sec)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {t('guide.overlay.skip')}
          </button>
        </div>
        <h2 ref={titleRef} id={titleId} tabIndex={-1} style={{ margin: '0 0 6px', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16.5, letterSpacing: '-0.01em', color: 'var(--text)', outline: 'none' }}>
          {stepTitle}
        </h2>
        <p id={bodyId} style={{ margin: 0, fontFamily: 'var(--font-b)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--sec)' }}>
          {t(stepKey(tour.id, step, 'body'))}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
          <div aria-hidden="true" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 99, background: i === index ? 'var(--accent)' : 'var(--border)', transition: reduced ? undefined : 'width .2s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {index > 0 && (
              <PBtn variant="secondary" small onClick={back}>
                {t('guide.overlay.back')}
              </PBtn>
            )}
            <PBtn variant="primary" small onClick={next}>
              {isLast ? t('guide.overlay.done') : t('guide.overlay.next')}
            </PBtn>
          </div>
        </div>
        <span aria-live="polite" className="sr-only">{t('guide.overlay.announce', { current: index + 1, total, title: stepTitle })}</span>
      </div>
    </div>,
    document.body,
  );
}
