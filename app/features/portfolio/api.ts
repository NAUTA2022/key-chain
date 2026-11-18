import { api, apiEnabled } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { useSession } from '~/lib/session';
import { useApiData } from './useApiData';

// Live portfolio reads (backend enabled). Each hook is keyed by the signed-in
// user so a wallet switch never shows the previous account's data.

type Json<P extends keyof paths> = paths[P] extends { get: { responses: { 200: { content: { 'application/json': infer T } } } } } ? T : never;

export type PortfolioHistory = Json<'/v1/me/portfolio/history'>;
export type HistoryPoint = PortfolioHistory['points'][number];
export type HistoryRange = '3m' | '6m' | '12m' | 'all';
export type MeStats = Json<'/v1/me/stats'>;
export type AcademyPostDto = Json<'/v1/academy/posts'>[number];
export type ActivityItem = Json<'/v1/me/activity'>[number];

function useUserKey(): string | null {
  const { status, user } = useSession();
  return status === 'authenticated' && user ? user.id : null;
}

export function usePortfolioHistory(range: HistoryRange) {
  const userKey = useUserKey();
  return useApiData<PortfolioHistory>(userKey && `${userKey}:history:${range}`, async () => {
    const { data } = await api.GET('/v1/me/portfolio/history', { params: { query: { range } } });
    return data ?? null;
  });
}

export function useMeStats() {
  const userKey = useUserKey();
  return useApiData<MeStats>(userKey && `${userKey}:stats`, async () => (await api.GET('/v1/me/stats')).data ?? null);
}

/** The user's recent activity (orders, market trades, dividends, KYC…), newest first. */
export function useMeActivity() {
  const userKey = useUserKey();
  return useApiData<ActivityItem[]>(userKey && `${userKey}:activity`, async () => (await api.GET('/v1/me/activity')).data ?? null);
}

/** Published Academy posts (public) plus which of them the user already read. */
export function useAcademyFeed() {
  const userKey = useUserKey();
  const posts = useApiData<AcademyPostDto[]>(apiEnabled ? 'academy:posts' : null, async () => (await api.GET('/v1/academy/posts')).data ?? null);
  const reads = useApiData<string[]>(userKey && `${userKey}:academy-reads`, async () => (await api.GET('/v1/me/academy-reads')).data?.slugs ?? null);
  return { posts: posts.data, loading: posts.loading, readSlugs: reads.data ?? [] };
}
