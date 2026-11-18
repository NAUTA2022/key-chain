import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Same "?" trigger and bubble as PHelp, but the bubble is portalled to <body> with
// fixed positioning and kept inside the viewport: the token cards (overflow: hidden)
// and the horizontally scrollable rounds table would otherwise clip it.

type Anchor = { x: number; top: number; bottom: number };

const EDGE = 8;
const GAP = 8;
/** Room needed above the trigger to open the bubble upwards. */
const ROOM_ABOVE = 140;

export function Hint({ text, label = 'Más información', size = 15 }: { text: string; label?: string; size?: number }) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  // Whether the bubble was already open when the current tap/click started (toggle on tap).
  const openAtDown = useRef(false);

  const show = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  };
  const hide = () => setAnchor(null);

  useEffect(() => {
    if (!anchor) return;
    const follow = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setAnchor({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
    };
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !btnRef.current?.contains(e.target)) setAnchor(null);
    };
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [anchor]);

  // Horizontal placement needs the bubble's real width: centred on the trigger, clamped to the viewport.
  const fit = (node: HTMLSpanElement | null) => {
    if (!node || !anchor) return;
    const vw = document.documentElement.clientWidth;
    const w = node.offsetWidth;
    node.style.left = `${Math.max(EDGE, Math.min(anchor.x - w / 2, vw - EDGE - w))}px`;
  };

  const above = anchor !== null && anchor.top > ROOM_ABOVE;

  return (
    <span
      style={{ display: 'inline-flex', verticalAlign: 'middle' }}
      onPointerEnter={e => {
        if (e.pointerType === 'mouse') show();
      }}
      onPointerLeave={e => {
        if (e.pointerType === 'mouse') hide();
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={anchor ? id : undefined}
        aria-expanded={anchor !== null}
        onPointerDown={() => {
          openAtDown.current = anchor !== null;
        }}
        onClick={e => {
          e.stopPropagation();
          if (openAtDown.current) {
            openAtDown.current = false;
            hide();
          } else {
            show();
          }
        }}
        onFocus={show}
        onBlur={hide}
        onKeyDown={e => {
          if (e.key === 'Escape') hide();
        }}
        style={{
          width: size, height: size, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)',
          color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: size * 0.62, fontWeight: 700, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', padding: 0, marginLeft: 6,
        }}
      >
        ?
      </button>
      {anchor &&
        createPortal(
          <span
            ref={fit}
            id={id}
            role="tooltip"
            style={{
              position: 'fixed', left: EDGE, top: above ? anchor.top - GAP : anchor.bottom + GAP, transform: above ? 'translateY(-100%)' : undefined, zIndex: 1000,
              width: 'max-content', maxWidth: `min(260px, calc(100vw - ${EDGE * 2}px))`, padding: '9px 12px', borderRadius: 10, background: 'var(--text)', color: 'var(--bg)',
              fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 500, lineHeight: 1.45, textTransform: 'none', letterSpacing: 0,
              textAlign: 'left', boxShadow: 'var(--sh-lg)', pointerEvents: 'none', whiteSpace: 'normal',
            }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
