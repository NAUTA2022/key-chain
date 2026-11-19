import type { CSSProperties } from 'react';
import { useGuide } from './context';
import type { GuideId } from './tours';
import { useT } from '~/i18n/useT';

const STYLE: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, verticalAlign: 'middle',
  marginLeft: 10, padding: '3px 10px 3px 7px', borderRadius: 999,
  border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
  fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 500, color: 'var(--sec)', lineHeight: 1.4, whiteSpace: 'nowrap',
};

const QUESTION_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9.6 9.3a2.5 2.5 0 0 1 4.85.85c0 1.7-2.45 2.2-2.45 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="16.9" r="1.1" fill="currentColor" />
  </svg>
);

/** Discreet "¿Cómo funciona?" entry point that replays a section's tour. Renders nothing in demo mode. */
export default function GuideButton({ tour, style }: { tour: GuideId; style?: CSSProperties }) {
  const { enabled, start } = useGuide();
  const { t } = useT('help');
  if (!enabled) return null;
  return (
    <button type="button" onClick={() => start(tour)} aria-haspopup="dialog" style={{ ...STYLE, ...style }}>
      {QUESTION_ICON}
      {t('guide.howItWorks')}
    </button>
  );
}
