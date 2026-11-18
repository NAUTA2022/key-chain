import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { useSession } from '~/lib/session';

export type NotificationSummary = paths['/v1/me/notifications/summary']['get']['responses'][200]['content']['application/json'];
export type LiveNotification = NotificationSummary['items'][number];
export type LiveNotificationType = LiveNotification['type'];

const POLL_MS = 30_000;

type Snapshot = { userId: string; items: LiveNotification[]; unread: number; fetchedAt: number };

export type NotificationsState = {
  /** Live mode with a signed-in user. */
  enabled: boolean;
  /** First summary received for the current user. */
  loaded: boolean;
  items: LiveNotification[];
  unread: number;
  /** When the current data was fetched (reference for relative times). */
  fetchedAt: number;
  reload: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

/**
 * The signed-in user's notifications (GET /v1/me/notifications/summary), polled
 * every 30 s while the tab is visible and refreshed when it becomes visible again.
 */
export function useNotifications(): NotificationsState {
  const { status, user } = useSession();
  const userId = status === 'authenticated' && user ? user.id : null;
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const tickRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const tick = () => {
      if (document.hidden) return;
      api.GET('/v1/me/notifications/summary')
        .then(({ data }) => {
          if (alive && data) setSnap({ userId, items: data.items, unread: data.unread, fetchedAt: Date.now() });
        })
        .catch(() => undefined);
    };
    tickRef.current = tick;
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      tickRef.current = () => undefined;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  const reload = useCallback(() => tickRef.current(), []);

  const markRead = useCallback(async (id: string) => {
    setSnap(s => {
      if (!s) return s;
      const target = s.items.find(n => n.id === id);
      if (!target?.unread) return s;
      return { ...s, unread: Math.max(0, s.unread - 1), items: s.items.map(n => (n.id === id ? { ...n, unread: false } : n)) };
    });
    const { response } = await api.POST('/v1/me/notifications/{id}/read', { params: { path: { id } } }).catch(() => ({ response: null }));
    if (!response?.ok) tickRef.current();
  }, []);

  const markAllRead = useCallback(async () => {
    setSnap(s => (s ? { ...s, unread: 0, items: s.items.map(n => ({ ...n, unread: false })) } : s));
    const { response } = await api.POST('/v1/me/notifications/read-all').catch(() => ({ response: null }));
    if (!response?.ok) tickRef.current();
  }, []);

  // Never show another account's data after a wallet switch.
  const current = userId && snap?.userId === userId ? snap : null;
  return {
    enabled: userId !== null,
    loaded: current !== null,
    items: current?.items ?? [],
    unread: current?.unread ?? 0,
    fetchedAt: current?.fetchedAt ?? 0,
    reload,
    markRead,
    markAllRead,
  };
}
