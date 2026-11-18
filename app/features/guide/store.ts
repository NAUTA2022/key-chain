import { api } from '~/lib/api/client';
import { isGuideId, type GuideId } from './tours';

// Which guided tours the signed-in user already completed or dismissed.
// Source of truth: `preferences.guidesSeen` on the API (follows the account across devices).
// localStorage is only a fast cache so a tour never flashes before the profile loads.

type GuideState = {
  userId: string | null;
  seen: readonly GuideId[];
  /** True once the server list was loaded for `userId`. */
  synced: boolean;
};

const CACHE_PREFIX = 'kc_guides_seen:';
const EMPTY: GuideState = { userId: null, seen: [], synced: false };

let state: GuideState = EMPTY;
/** Ids marked during this session before the server answered (merged on load). */
let pending = new Set<GuideId>();
const listeners = new Set<() => void>();

function emit(next: GuideState) {
  state = next;
  for (const l of listeners) l();
}

function readCache(userId: string): GuideId[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(CACHE_PREFIX + userId) ?? '[]');
    return Array.isArray(raw) ? raw.filter(isGuideId) : [];
  } catch {
    return [];
  }
}

function writeCache(userId: string, seen: readonly GuideId[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(seen));
  } catch {
    // Private mode / quota: the API copy is enough.
  }
}

const uniq = (ids: Iterable<GuideId>): GuideId[] => [...new Set(ids)];

export function subscribeGuides(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getGuideState = (): GuideState => state;
export const getServerGuideState = (): GuideState => EMPTY;

/** Binds the store to the signed-in user (null = signed out / demo) and loads the server list. */
export function bindGuideUser(userId: string | null) {
  if (state.userId === userId) return;
  pending = new Set();
  if (!userId) return emit(EMPTY);
  emit({ userId, seen: readCache(userId), synced: false });
  void api
    .GET('/v1/me')
    .then(({ data }) => {
      if (state.userId !== userId || !data) return;
      const seen = uniq([...data.preferences.guidesSeen, ...pending]);
      writeCache(userId, seen);
      emit({ userId, seen, synced: true });
      // Something was marked while loading: make sure the server has it too.
      if ([...pending].some(id => !data.preferences.guidesSeen.includes(id))) void save(seen);
    })
    .catch(() => {
      // Offline / API down: keep the cache and never auto-show (synced stays false).
    });
}

async function save(seen: readonly GuideId[]): Promise<boolean> {
  try {
    const { data } = await api.PATCH('/v1/me', { body: { preferences: { guidesSeen: [...seen] } } });
    return Boolean(data);
  } catch {
    return false;
  }
}

/** Marks a tour as completed or dismissed. */
export function markGuideSeen(id: GuideId) {
  const { userId, seen } = state;
  if (!userId || seen.includes(id)) return;
  const next = uniq([...seen, id]);
  pending.add(id);
  writeCache(userId, next);
  emit({ ...state, seen: next });
  if (state.synced) void save(next);
}

/** Forgets every tour so they show again (Perfil → "Volver a ver las guías"). */
export async function resetGuides(): Promise<boolean> {
  const { userId } = state;
  if (!userId) return false;
  pending = new Set();
  writeCache(userId, []);
  emit({ ...state, seen: [] });
  return save([]);
}

/** Shows one tour again on the next visit of its page (Help Center, tours tied to a project or company). */
export function forgetGuide(id: GuideId) {
  const { userId, seen } = state;
  if (!userId || !seen.includes(id)) return;
  const next = seen.filter(x => x !== id);
  pending.delete(id);
  writeCache(userId, next);
  emit({ ...state, seen: next });
  if (state.synced) void save(next);
}
