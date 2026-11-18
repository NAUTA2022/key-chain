import { PCard, PTag } from '~/components/ui';

import { TERMS_VERSION, type LegalSection } from './legal-content';

type Props = { title: string; intro: string; sections: LegalSection[] };

/** Legal document page (terms, privacy). Content is a draft until reviewed by counsel. */
export default function Legal({ title, intro, sections }: Props) {
  return (
    <div className="g-page" style={{ padding: '28px 32px 48px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <PTag label={`Versión ${TERMS_VERSION}`} />
        <PTag label="Borrador pendiente de revisión legal" color="purple" />
      </div>
      <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0 }}>{title}</h1>
      <p style={{ fontFamily: 'var(--font-b)', fontSize: 14.5, color: 'var(--sec)', lineHeight: 1.7, margin: '12px 0 24px' }}>{intro}</p>
      <PCard style={{ padding: '8px 28px' }}>
        {sections.map((s, i) => (
          <section key={s.title} style={{ padding: '20px 0', borderBottom: i < sections.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
            <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16.5, color: 'var(--text)', margin: '0 0 10px' }}>{`${i + 1}. ${s.title}`}</h2>
            {s.paragraphs.map(p => (
              <p key={p} style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.7, margin: '0 0 8px' }}>{p}</p>
            ))}
          </section>
        ))}
      </PCard>
    </div>
  );
}
