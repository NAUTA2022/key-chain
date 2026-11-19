import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PTag } from '~/components/ui';
import { fmtUSD } from '~/data';
import { useT } from '~/i18n/useT';
import { fmtRelative } from './api';
import type { ActivityItem, Stats } from './hooks';
import { EmptyState, Notice, Skeleton } from './kit';

// Live versions of the profile's summary cards (activity, level, achievements, referrals).
// Same markup and styles as the demo cards, fed by /v1/me/activity and /v1/me/stats.

const ACTIVITY_COLOR: Record<ActivityItem['type'], string> = { dividend: '#22c55e', investment: '#8247E5', kyc: '#3b82f6', support: '#F5A623', account: '#5BC4BE' };
const ACTIVITY_DOT: Record<ActivityItem['type'], string> = { dividend: '↑', investment: '⬡', kyc: '✓', support: '?', account: '◆' };
const ACHIEVEMENT_ICON: Record<Stats['achievements'][number]['id'], string> = {
  first_investment: '🏆', kyc_complete: '🛡️', six_months: '⭐', invested_50k: '💎',
  diversified: '🧩', yield_1k: '💸', one_year: '📅', ten_projects: '🏗️',
};
const LEVEL_COUNT = 5;
const PAGE = 6;

export function ActivityCardLive({ items, loading, error }: { items: ActivityItem[] | null; loading: boolean; error: boolean }) {
  const { t, locale } = useT('profile');
  const [now] = useState(() => Date.now());
  const [all, setAll] = useState(false);
  const list = items ?? [];
  const shown = all ? list : list.slice(0, PAGE);
  return (
    <PCard className="dual-glow" style={{ padding: '22px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>{t('cardsLive.activityTitle')}</h2>
      {loading && !items ? (
        <Skeleton rows={4} />
      ) : error && !items ? (
        <Notice tone="error">{t('cardsLive.activityError')}</Notice>
      ) : list.length === 0 ? (
        <EmptyState title={t('cardsLive.emptyTitle')} text={t('cardsLive.emptyText')} />
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.map((a, i) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, PAGE) * 0.06 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < shown.length - 1 ? '1px solid var(--border-l)' : 'none' }}
            >
              <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: ACTIVITY_COLOR[a.type] + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ACTIVITY_COLOR[a.type] }}>{ACTIVITY_DOT[a.type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)', overflowWrap: 'anywhere' }}>{a.title}{a.detail ? ` — ${a.detail}` : ''}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>
                  <time dateTime={a.at}>{fmtRelative(a.at, now, t, locale)}</time>
                </div>
              </div>
              {a.amount !== null && (
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: a.type === 'dividend' ? 'var(--pos)' : 'var(--text)', flexShrink: 0 }}>
                  {a.type === 'dividend' ? '+' : ''}{fmtUSD(a.amount)}
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      )}
      {list.length > PAGE && (
        <button type="button" onClick={() => setAll(v => !v)} aria-expanded={all} style={{ marginTop: 12, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>
          {all ? t('cardsLive.showLess') : t('cardsLive.showAll', { count: list.length })}
        </button>
      )}
    </PCard>
  );
}

function monthsSince(iso: string, now: number): number {
  const d = new Date(iso);
  const n = new Date(now);
  return Math.max(0, (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth() - (n.getDate() < d.getDate() ? 1 : 0));
}

export function LevelCardLive({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const { t } = useT('profile');
  const [now] = useState(() => Date.now());
  const lvl = stats?.level;
  const months = stats ? monthsSince(stats.memberSince, now) : 0;
  return (
    <div className="anim-border-slow" style={{ borderRadius: 18, padding: '1.5px' }}>
      <PCard style={{ padding: '22px 24px', border: 'none', borderRadius: 17 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{t('cardsLive.levelTitle')}{lvl ? ` · ${lvl.name}` : ''}</h2>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>
              {!stats ? (loading ? t('cardsLive.loading') : t('cardsLive.noData')) : lvl && lvl.nextLevelAt !== null ? t('cardsLive.toNextLevel', { amount: fmtUSD(Math.max(0, lvl.nextLevelAt - stats.invested)), level: lvl.level + 1 }) : t('cardsLive.maxLevel')}
            </div>
          </div>
          <div aria-label={lvl ? t('cardsLive.levelBadge', { level: lvl.level }) : undefined} style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #8247E5, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>{lvl?.level ?? '—'}</div>
        </div>
        {/* Track: full segments up to the current level, the next one filled by the progress. */}
        <div style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 10 }} role="img" aria-label={lvl ? (lvl.nextLevelAt !== null ? t('cardsLive.trackAriaProgress', { level: lvl.level, total: LEVEL_COUNT, pct: Math.round(lvl.progress * 100) }) : t('cardsLive.trackAria', { level: lvl.level, total: LEVEL_COUNT })) : t('cardsLive.trackNoData')}>
          {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map(n => {
            const fill = !lvl ? 0 : n <= lvl.level ? 100 : n === lvl.level + 1 ? Math.round(lvl.progress * 100) : 0;
            return (
              <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: n === LEVEL_COUNT ? 'flex-end' : n === 1 ? 'flex-start' : 'center', gap: 6 }}>
                <div style={{ height: 6, width: '100%', background: 'var(--surface2)', borderRadius: n === 1 ? '99px 0 0 99px' : n === LEVEL_COUNT ? '0 99px 99px 0' : 0, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${fill}%`, background: 'linear-gradient(90deg, #8247E5, #3b82f6)' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: lvl && n <= lvl.level ? 'var(--accent-text)' : 'var(--ter)', fontWeight: lvl && n === lvl.level ? 700 : 400 }}>{t('cardsLive.levelShort', { n })}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
          {([
            [stats ? fmtUSD(stats.invested) : '—', t('cardsLive.invested')],
            [stats ? (months < 1 ? t('cardsLive.monthsLess') : t(months === 1 ? 'cardsLive.monthsOne' : 'cardsLive.monthsOther', { count: months })) : '—', t('cardsLive.seniority')],
            [stats ? String(stats.assetsCount) : '—', stats?.assetsCount === 1 ? t('cardsLive.assetsOne') : t('cardsLive.assetsOther')],
          ] as const).map(([v, l]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{v}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </PCard>
    </div>
  );
}

export function AchievementsCardLive({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const { t } = useT('profile');
  return (
    <div className="anim-border" style={{ borderRadius: 18, padding: '1.5px' }}>
      <PCard style={{ padding: '22px 22px', border: 'none', borderRadius: 17 }}>
        <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>{t('cardsLive.achievementsTitle')}</h2>
        {!stats ? (
          loading ? <Skeleton rows={2} height={56} /> : <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{t('cardsLive.achievementsError')}</div>
        ) : (
          <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, listStyle: 'none', margin: 0, padding: 0 }}>
            {stats.achievements.map((ach, i) => (
              <motion.li
                key={ach.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                aria-label={`${ach.label}: ${ach.done ? t('cardsLive.achieved') : t('cardsLive.pending')}`}
                style={{ padding: '14px 12px', borderRadius: 14, textAlign: 'center', background: ach.done ? 'var(--accent-bg)' : 'var(--surface2)', border: `1.5px solid ${ach.done ? 'var(--accent)' : 'var(--border-l)'}`, opacity: ach.done ? 1 : 0.45 }}
              >
                <div aria-hidden="true" style={{ fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{ACHIEVEMENT_ICON[ach.id]}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600, color: ach.done ? 'var(--text)' : 'var(--ter)' }}>{ach.label}</div>
              </motion.li>
            ))}
          </ul>
        )}
      </PCard>
    </div>
  );
}

/** Referral programme placeholder: no code and nothing to copy until it exists. */
export function ReferralSoon() {
  const { t } = useT('profile');
  return (
    <div className="shimmer-surface" style={{ borderRadius: 18, padding: '20px 22px', background: 'linear-gradient(135deg, oklch(0.20 0.03 265) 0%, oklch(0.28 0.08 270) 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16 }}>{t('cardsLive.referralTitle')}</h2>
        <PTag label={t('cardsLive.soon')} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, opacity: 0.7, lineHeight: 1.55 }}>
        {t('cardsLive.referralText')}
      </div>
    </div>
  );
}
