import { useRef, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from 'react';

// Click-and-drag horizontal scrolling for mouse users. Touch devices keep
// their native swipe (pointerType 'touch' is ignored here). A drag longer
// than a few pixels swallows the click that follows, so releasing over a
// card doesn't also select it. Scroll-snap is paused while dragging and
// restored on release so the rail settles on the nearest card.
const DRAG_THRESHOLD = 5;

type DragState = { el: HTMLElement; startX: number; startScroll: number; dragged: boolean; snap: string };

/** Handlers to spread on the horizontally scrolling element: `<div {...useDragScroll()}>`. */
export type DragScrollHandlers = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onDragStart: (e: ReactDragEvent<HTMLElement>) => void;
};

export function useDragScroll(): DragScrollHandlers {
  const state = useRef<DragState | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = e.currentTarget;
    state.current = { el, startX: e.clientX, startScroll: el.scrollLeft, dragged: false, snap: el.style.scrollSnapType };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = state.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    if (!s.dragged && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!s.dragged) {
      s.dragged = true;
      s.el.setPointerCapture(e.pointerId);
      s.el.style.scrollSnapType = 'none';
      s.el.style.cursor = 'grabbing';
      s.el.style.userSelect = 'none';
    }
    s.el.scrollLeft = s.startScroll - dx;
  };

  const end = () => {
    const s = state.current;
    if (!s) return;
    state.current = null;
    if (!s.dragged) return;
    s.el.style.scrollSnapType = s.snap;
    s.el.style.cursor = '';
    s.el.style.userSelect = '';
    // Swallow the click that the browser fires right after this mouseup.
    const block = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    s.el.addEventListener('click', block, { capture: true, once: true });
    setTimeout(() => s.el.removeEventListener('click', block, { capture: true }), 0);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerCancel: end,
    onDragStart: (e) => e.preventDefault(), // no ghost-dragging the cover images
  };
}
