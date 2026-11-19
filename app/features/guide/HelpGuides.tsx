import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { PCard, PTag } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { useGuide, useGuidesSeen } from './context';
import { GLOSSARY } from './glossary';
import { forgetGuide } from './store';
import { GUIDE_PARAM, TOUR_IDS, TOURS, type GuideId } from './tours';

// Help Center sections (live mode only): the list of guided tours to replay, and the glossary.

const h2: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'var(--text)', margin: '0 0 6px' };
const lead: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', margin: '0 0 16px', lineHeight: 1.55 };
const rowTitle: CSSProperties = { fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' };
const rowSub: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3, lineHeight: 1.45 };
const linkBtn: CSSProperties = {
  padding: '7px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer',
  fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', flexShrink: 0,
};

/** "Guías de la plataforma": every tour with a button to replay it on its page. */
export function GuidesCard({ style }: { style?: CSSProperties }) {
  const { enabled } = useGuide();
  const guides = useGuidesSeen();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [rearmed, setRearmed] = useState<GuideId | null>(null);
  if (!enabled) return null;

  return (
    <PCard style={{ padding: isMobile ? '20px 18px' : '24px 28px', ...style }}>
      <h2 id="guias" style={h2}>Guías paso a paso</h2>
      <p style={lead}>Recorridos cortos que te muestran cómo funciona cada sección. Podés verlos cuantas veces quieras.</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {TOUR_IDS.map((id, i) => {
          const tour = TOURS[id];
          const seen = guides.seen.includes(id);
          return (
            <li key={id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-l)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={rowTitle}>{tour.title}</span>
                  {seen && <PTag label="Vista" />}
                </div>
                <div style={rowSub}>
                  {tour.summary}
                  {tour.where && ` ${tour.where}`}
                  {rearmed === id && ' Listo: la vas a ver la próxima vez.'}
                </div>
              </div>
              {tour.where ? (
                seen && guides.userId ? (
                  <button type="button" style={linkBtn} onClick={() => { forgetGuide(id); setRearmed(id); }}>
                    Volver a mostrar
                  </button>
                ) : null
              ) : (
                <button type="button" style={linkBtn} onClick={() => void navigate(`${tour.path}?${GUIDE_PARAM}=${id}`)}>
                  Ver guía
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </PCard>
  );
}

const COLLAPSED = 8;

/** "Glosario": plain-language definitions for people new to blockchain. */
export function GlossaryCard({ style }: { style?: CSSProperties }) {
  const { enabled } = useGuide();
  const isMobile = useMobile();
  const [all, setAll] = useState(false);
  if (!enabled) return null;
  const entries = all ? GLOSSARY : GLOSSARY.slice(0, COLLAPSED);

  return (
    <PCard style={{ padding: isMobile ? '20px 18px' : '24px 28px', ...style }}>
      <h2 id="glosario" style={h2}>Glosario</h2>
      <p style={lead}>Las palabras nuevas que vas a encontrar en La 33, explicadas sin tecnicismos.</p>
      <dl style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: isMobile ? 14 : '16px 28px', margin: 0 }}>
        {entries.map(e => (
          <div key={e.id} id={`glosario-${e.id}`} style={{ minWidth: 0 }}>
            <dt style={rowTitle}>
              {e.term}
              {e.aka && <span style={{ fontWeight: 400, color: 'var(--ter)' }}> · {e.aka}</span>}
            </dt>
            <dd style={{ ...rowSub, margin: '4px 0 0', fontSize: 13, color: 'var(--sec)' }}>{e.definition}</dd>
          </div>
        ))}
      </dl>
      {GLOSSARY.length > COLLAPSED && (
        <button type="button" aria-expanded={all} onClick={() => setAll(v => !v)} style={{ ...linkBtn, marginTop: 18 }}>
          {all ? 'Ver menos' : `Ver todo el glosario (${GLOSSARY.length})`}
        </button>
      )}
    </PCard>
  );
}
