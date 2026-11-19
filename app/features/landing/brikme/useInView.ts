import { useEffect, useRef, useState } from 'react';

/**
 * Viewport tracking for the landing's 3D canvases:
 * - `seen`: it has come near the screen once (mount the canvas only from then on,
 *   so the page doesn't open five WebGL contexts at load);
 * - `visible`: it is on screen now (render frames only while true).
 */
export function useInView<T extends Element>(options: IntersectionObserverInit = { rootMargin: '200px' }) {
  const ref = useRef<T>(null);
  const [state, setState] = useState({ seen: false, visible: false });
  const { root, rootMargin, threshold } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([en]) => {
      setState(s => ({ seen: s.seen || en.isIntersecting, visible: en.isIntersecting }));
    }, { root, rootMargin, threshold });
    io.observe(el);
    return () => { io.disconnect(); };
  }, [root, rootMargin, threshold]);
  return { ref, ...state };
}
