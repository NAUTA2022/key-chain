import { useEffect, useRef, useState } from 'react';
import { useMotionValue } from 'framer-motion';

// Drives the Feed's "magnet" toolbar. `sentinelRef` marks where the toolbar
// naturally starts (right under the featured-profiles rail):
// - stuck:  the toolbar reached `pinTop` px from the top of the scroll area
//           and is pinned there.
// - reveal: while pinned, the user scrolled up, so a copy of the profiles
//           rail should slide in above the toolbar; scrolling down hides it.
// - instant: reveal just turned off because the real rail scrolled back to
//           exactly where the copy sits (`handoff` px above the toolbar), so
//           the swap must happen with no animation.
// - sentinelTop: motion value with the sentinel's live distance from the top
//           of the scroll area, for positions that follow the scroll.
// The scroll area is the app's <main> (see App.jsx Shell), falling back to
// the window.
const DIRECTION_THRESHOLD = 6; // px per frame before a direction change counts

export function useMagnetScroll(sentinelRef, { pinTop = 0, handoff = 0 } = {}) {
  const [state, setState] = useState({ stuck: false, reveal: false, instant: false });
  const sentinelTop = useMotionValue(Number.POSITIVE_INFINITY);
  const config = useRef({ pinTop, handoff });
  useEffect(() => { config.current = { pinTop, handoff }; }, [pinTop, handoff]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;
    const scroller = sentinel.closest('main') || window;
    const scrollTop = () => (scroller === window ? window.scrollY : scroller.scrollTop);
    const areaTop = () => (scroller === window ? 0 : scroller.getBoundingClientRect().top);
    let last = scrollTop();
    let raf = 0;

    const update = () => {
      const st = scrollTop();
      const delta = st - last;
      last = st;
      const top = sentinel.getBoundingClientRect().top - areaTop();
      sentinelTop.set(top);
      const { pinTop: pin, handoff: hand } = config.current;
      const stuck = top <= pin;
      setState(prev => {
        let { reveal } = prev;
        let instant = false;
        if (top >= pin + hand) {
          if (reveal) { reveal = false; instant = true; }
        } else if (delta > DIRECTION_THRESHOLD) {
          reveal = false;
        } else if (delta < -DIRECTION_THRESHOLD && (stuck || reveal)) {
          reveal = true;
        }
        return prev.stuck === stuck && prev.reveal === reveal && prev.instant === instant ? prev : { stuck, reveal, instant };
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [sentinelRef, sentinelTop]);

  return { ...state, sentinelTop };
}
