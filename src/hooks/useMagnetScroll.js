import { useEffect, useState } from 'react';

// Drives the Feed's "magnet" toolbar. `sentinelRef` marks where the toolbar
// naturally starts (right under the featured-profiles rail).
// - stuck: the toolbar reached `pinTop` px from the top of the scroll area
//   and is pinned there.
// - Magnet: when the user stops scrolling with the page left halfway through
//   the top area (profiles partly visible), it glides to the nearest rest
//   point in the direction they were going: all the way up (profiles fully
//   shown) when scrolling up, or down to where the toolbar pins (profiles
//   gone) when scrolling down. The profiles never show anywhere but at the
//   top of the page.
// The scroll area is the app's <main> (see App.jsx Shell), falling back to
// the window.
const SETTLE_MS = 140; // no scroll events for this long = the user let go

export function useMagnetScroll(sentinelRef, pinTop = 0) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;
    const scroller = sentinel.closest('main') || window;
    const scrollTop = () => (scroller === window ? window.scrollY : scroller.scrollTop);
    const areaTop = () => (scroller === window ? 0 : scroller.getBoundingClientRect().top);
    const scrollTo = (top) => scroller.scrollTo({ top, behavior: 'smooth' });
    let last = scrollTop();
    let direction = 0;
    let raf = 0;
    let settle = 0;

    const update = () => {
      const st = scrollTop();
      if (st !== last) direction = Math.sign(st - last);
      last = st;
      setStuck(sentinel.getBoundingClientRect().top - areaTop() <= pinTop);
    };
    const snap = () => {
      const st = scrollTop();
      // Scroll position at which the toolbar pins (= profiles fully gone).
      const pinAt = st + sentinel.getBoundingClientRect().top - areaTop() - pinTop;
      if (st <= 1 || st >= pinAt - 1) return; // already at a rest point
      scrollTo(direction < 0 ? 0 : pinAt);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
      clearTimeout(settle);
      settle = setTimeout(snap, SETTLE_MS);
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [sentinelRef, pinTop]);

  return { stuck };
}
