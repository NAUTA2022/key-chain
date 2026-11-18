import type { ReactNode } from 'react';
import { PBtn, PCard, PTag } from '~/components/ui';
import type { NavFn, RouteKey } from '~/lib/navigation';

type Props = {
  nav: NavFn;
  title: string;
  description: string;
  /** Short bullets of what the section will offer. */
  highlights?: string[];
  icon?: ReactNode;
  cta?: { label: string; route: RouteKey };
};

/** In-app "coming soon" screen for sections without a live product yet (same tokens as the platform). */
export default function ComingSoon({ nav, title, description, highlights = [], icon, cta = { label: 'Explorar tokenizaciones', route: 'primario' } }: Props) {
  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 760, margin: '0 auto' }}>
      <PCard style={{ padding: '40px 32px', textAlign: 'center' }}>
        {icon && <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, color: 'var(--accent-text)' }}>{icon}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <PTag label="Próximamente" color="purple" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0 }}>{title}</h1>
        <p style={{ fontFamily: 'var(--font-b)', fontSize: 14.5, color: 'var(--sec)', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 520 }}>{description}</p>
        {highlights.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px auto 0', maxWidth: 440, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {highlights.map(h => (
              <li key={h} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)' }}>
                <span aria-hidden="true" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>✓</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <PBtn variant="accent" onClick={() => nav(cta.route)}>{cta.label}</PBtn>
        </div>
      </PCard>
    </div>
  );
}
