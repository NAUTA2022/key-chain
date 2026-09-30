import { useEffect, useState } from 'react';

// Tracks a sticky toolbar placed right after `sentinelRef` (pinned `pinTop`
// px below the top of the scroll area):
// - stuck:  the toolbar has reached the top of the scroll area and is pinned.
// - reveal: while stuck, the user is scrolling up, so the content hidden above
//           (the featured profiles) should slide back in; scrolling down hides
//           it again.
// The scroll area is the app's <main> (see App.jsx Shell), falling back to
// the window.
const DIRECTION_THRESHOLD = 6; // px per frame before a direction change counts

export function useMagnetScroll(sentinelRef, pinTop = 0) {
  const [state, setState] = useState({ stuck: false, reveal: false });

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
      const stuck = sentinel.getBoundingClientRect().top - areaTop() <= pinTop;
      setState(prev => {
        let reveal = prev.reveal;
        if (!stuck) reveal = false;
        else if (delta > DIRECTION_THRESHOLD) reveal = false;
        else if (delta < -DIRECTION_THRESHOLD) reveal = true;
        return prev.stuck === stuck && prev.reveal === reveal ? prev : { stuck, reveal };
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
  }, [sentinelRef, pinTop]);

  return state;
}
