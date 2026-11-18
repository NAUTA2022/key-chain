import { createContext, useContext, useSyncExternalStore } from 'react';
import { getGuideState, getServerGuideState, subscribeGuides } from './store';
import type { GuideId } from './tours';

export type GuideContextValue = {
  /** Live mode only: demo mode keeps the original design (no tours, no entry points). */
  enabled: boolean;
  active: GuideId | null;
  /** Starts (or replays) a tour on the current page. */
  start: (id: GuideId) => void;
};

const NOOP: GuideContextValue = { enabled: false, active: null, start: () => {} };

export const GuideContext = createContext<GuideContextValue>(NOOP);

export function useGuide(): GuideContextValue {
  return useContext(GuideContext);
}

/** Tours the signed-in user already completed or dismissed (API-backed, cached locally). */
export function useGuidesSeen() {
  return useSyncExternalStore(subscribeGuides, getGuideState, getServerGuideState);
}
