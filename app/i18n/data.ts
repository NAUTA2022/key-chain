import { useMemo } from 'react';
import { SOURCE_MESSAGES, lookup } from './messages';
import { useT } from './useT';

// Demo content (projects, academy cards, achievements, seed wallet movements) is kept in
// Spanish in app/data and translated here from the `data` namespace, by id. Live data from
// the API is shown as it comes (the API serves its own content).

type AssetText = { id: number; name: string; location: string; desc: string; lifespan: string; live?: boolean };
type PostText = { id: number; title: string; excerpt: string };
type AchievementText = { icon: string; label: string; desc: string };
type ActivityText = { id: number; label: string };

export type DataText = {
  asset: <A extends AssetText>(a: A) => A;
  post: <P extends PostText>(p: P) => P;
  achievement: <X extends AchievementText>(x: X) => X;
  activity: <M extends ActivityText>(m: M) => M;
};

const source = (key: string) => lookup(SOURCE_MESSAGES.data, key);

export function useDataText(): DataText {
  const { raw, lang } = useT('data');
  return useMemo<DataText>(() => {
    const str = (key: string): string | undefined => {
      const v = raw<unknown>(key);
      return typeof v === 'string' ? v : undefined;
    };
    // Only rewrite a value that is still the Spanish seed text (renamed or live items stay as they are).
    const pick = (key: string, current: string) => (lang !== 'es' && source(key) === current ? str(key) ?? current : current);
    return {
      asset: a => (a.live ? a : {
        ...a,
        name: pick(`assets.${a.id}.name`, a.name),
        location: pick(`assets.${a.id}.location`, a.location),
        desc: pick(`assets.${a.id}.desc`, a.desc),
        lifespan: pick(`assets.${a.id}.lifespan`, a.lifespan),
      }),
      post: p => ({ ...p, title: pick(`academy.${p.id}.title`, p.title), excerpt: pick(`academy.${p.id}.excerpt`, p.excerpt) }),
      achievement: x => ({ ...x, label: pick(`achievements.${x.icon}.label`, x.label), desc: pick(`achievements.${x.icon}.desc`, x.desc) }),
      activity: m => ({ ...m, label: pick(`activity.${m.id}`, m.label) }),
    };
  }, [raw, lang]);
}
