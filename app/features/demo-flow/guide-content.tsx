import type { ReactNode } from 'react';
import { richText, type TFn } from '~/features/market/i18n';
import type { DemoRun, Progress } from './api';
import { Dots, HitoReceipt } from './Guide';
import type { GuideStep, Hito } from './guide-data';

export type GuideContext = { step: GuideStep; ready: boolean; run: DemoRun | null; p: Progress; hito: Hito; mine: number; t: TFn };
export type GuideContent = { kicker: string; title: string; body: ReactNode; status?: ReactNode };

const strong = (text: ReactNode, key?: number) => <strong key={key} style={{ color: 'var(--text)', fontWeight: 700 }}>{text}</strong>;
/** A translated sentence with its `<b>…</b>` spans in bold. */
const rich = (text: string) => <>{richText(text, strong)}</>;

/** What the guide says at each moment, in plain words (one idea per step). */
export function guideContent({ step, ready, run, p, hito, mine, t }: GuideContext): GuideContent {
  const others = 5 - mine;
  const parts = (n: number) => t(n === 1 ? 'demo.guide.partOne' : 'demo.guide.partMany', { count: n });
  switch (step) {
    case 0: return {
      kicker: t('demo.guide.s0.kicker'),
      title: t('demo.guide.s0.title'),
      body: rich(t('demo.guide.s0.body')),
    };
    case 1: return {
      kicker: t('demo.guide.s1.kicker'),
      title: ready ? t('demo.guide.s1.titleReady', { count: mine }) : t('demo.guide.s1.title'),
      body: ready
        ? rich(t(mine === 1 ? 'demo.guide.s1.bodyReadyOne' : 'demo.guide.s1.bodyReadyMany', { count: mine }))
        : run?.status === 'awaiting_payment'
          ? rich(t('demo.guide.s1.bodyAwaiting'))
          : rich(t('demo.guide.s1.bodyChoose')),
    };
    case 2: return {
      kicker: t('demo.guide.s2.kicker'),
      title: t('demo.guide.s2.title'),
      body: others > 0
        ? rich(t('demo.guide.s2.bodyShared', {
            parts: parts(mine),
            range: `W1${mine > 1 ? `–W${mine}` : ''}`,
            others: others === 1 ? t('demo.guide.s2.otherOne') : t('demo.guide.s2.otherMany', { count: others }),
          }))
        : rich(t('demo.guide.s2.bodyAll')),
      status: <Dots done={p.invested} label={t('demo.guide.s2.status', { n: p.invested })} />,
    };
    case 3: return {
      kicker: t('demo.guide.s3.kicker'),
      title: t('demo.guide.s3.title'),
      body: p.deposit || ready
        ? rich(t('demo.guide.s3.bodyDone', { story: hito.story }))
        : rich(t('demo.guide.s3.bodyChoose')),
      status: p.deposit || ready ? <HitoReceipt hito={hito} /> : undefined,
    };
    case 4: return {
      kicker: t('demo.guide.s4.kicker'),
      title: t('demo.guide.s4.title'),
      body: rich(t('demo.guide.s4.body', { mine })),
      status: <Dots done={p.claimed} label={t('demo.guide.s4.status', { n: p.claimed })} />,
    };
    case 5: return {
      kicker: t('demo.guide.s5.kicker'),
      title: t('demo.guide.s5.title'),
      body: rich(t('demo.guide.s5.body', {
        lead: mine === 1 ? t('demo.guide.s5.sendOne') : t('demo.guide.s5.sendMany', { parts: parts(mine) }),
        others: others > 0 ? t('demo.guide.s5.othersKeep') : '',
      })),
      status: <Dots done={p.swept} total={mine} label={t('demo.guide.s5.status', { n: p.swept, mine })} />,
    };
    default: return {
      kicker: t('demo.guide.s6.kicker'),
      title: t('demo.guide.s6.title'),
      body: (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>{rich(t('demo.guide.s6.put', { mine, parts: parts(mine), pct: mine * 20 }))}</li>
          <li>{rich(t('demo.guide.s6.earned', { hito: hito.title.toLowerCase(), mine }))}</li>
          {mine < 5 && <li>{rich(t('demo.guide.s6.allParts'))}</li>}
          {run && !run.simulated && <li>{rich(t('demo.guide.s6.refund', { mine }))}</li>}
        </ul>
      ),
    };
  }
}

