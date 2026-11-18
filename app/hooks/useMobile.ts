import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

// Prerendered HTML is generated for a desktop viewport; on the client the real
// width takes over right after hydration without a hydration mismatch.
const SERVER_WIDTH = 1440;
const SERVER_HEIGHT = 900;

export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, () => window.innerWidth, () => SERVER_WIDTH);
}

export function useViewportHeight(): number {
  return useSyncExternalStore(subscribe, () => window.innerHeight, () => SERVER_HEIGHT);
}

/** True when the viewport is narrower than `bp` pixels. */
export function useMobile(bp = 768): boolean {
  return useViewportWidth() < bp;
}
