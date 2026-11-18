import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSession } from '~/lib/session';
import { GuideContext, useGuidesSeen, type GuideContextValue } from './context';
import { bindGuideUser, markGuideSeen } from './store';
import TourOverlay from './TourOverlay';
import { GUIDE_PARAM, isGuideId, TOURS, tourForPath, type GuideId } from './tours';

/** Delay before a first-visit tour starts, so the page settles (transition + data). */
const AUTO_DELAY_MS = 900;

/** Something else owns the screen: an open modal, the onboarding flow or another overlay. */
function screenBusy(): boolean {
  return document.querySelector('[aria-modal="true"], [data-guide-block], [data-guide-overlay]') !== null;
}

/**
 * Guided tours for the app shell. Live mode only: in demo mode (no API) nothing is shown so the
 * original design stays untouched. Each section's tour starts automatically on the first visit of
 * a signed-in, onboarded user (the welcome tour goes first) and can be replayed at any time.
 */
export default function GuideProvider({ children }: { children: ReactNode }) {
  const { status, user } = useSession();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const enabled = status !== 'disabled';
  const signedIn = status === 'authenticated' && !!user && user.onboarded;
  const userId = signedIn ? user.id : null;
  const guides = useGuidesSeen();
  // A tour belongs to the page it started on: navigating away ends it (its anchors are gone).
  const [running, setRunning] = useState<{ id: GuideId; path: string } | null>(null);
  const active = running && running.path === pathname ? running.id : null;
  /** Pathname whose first-visit check already ran (one auto tour per visit). */
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (enabled) bindGuideUser(userId);
  }, [enabled, userId]);

  // Replay requested by a link (Help Center: `?guia=<id>`), honored even if already seen.
  const requestedParam = new URLSearchParams(search).get(GUIDE_PARAM);
  const requested = isGuideId(requestedParam) ? requestedParam : null;

  useEffect(() => {
    if (!enabled || active) return;
    let candidate: GuideId | null = requested;
    if (!candidate) {
      if (!userId || !guides.synced || guides.userId !== userId) return;
      if (handled.current === pathname) return;
      const section = tourForPath(pathname);
      if (!section) return;
      candidate = !guides.seen.includes('welcome') ? 'welcome' : guides.seen.includes(section) ? null : section;
      if (!candidate) {
        handled.current = pathname;
        return;
      }
    }
    const id = candidate;
    let timer = 0;
    const attempt = () => {
      if (screenBusy()) {
        timer = window.setTimeout(attempt, 1000);
        return;
      }
      handled.current = pathname;
      setRunning({ id, path: pathname });
      if (requested) void navigate({ pathname, search: '' }, { replace: true });
    };
    timer = window.setTimeout(attempt, AUTO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, userId, guides, pathname, active, requested, navigate]);

  const start = useCallback(
    (id: GuideId) => {
      handled.current = pathname;
      setRunning({ id, path: pathname });
    },
    [pathname],
  );

  const end = useCallback(
    () => {
      // Completed and dismissed tours are both remembered (the replay button is always there).
      if (active) markGuideSeen(active);
      setRunning(null);
    },
    [active],
  );

  const value = useMemo<GuideContextValue>(() => ({ enabled, active, start }), [enabled, active, start]);

  return (
    <GuideContext.Provider value={value}>
      {children}
      {enabled && active && <TourOverlay key={active} tour={TOURS[active]} onEnd={end} />}
    </GuideContext.Provider>
  );
}
