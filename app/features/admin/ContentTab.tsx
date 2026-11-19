import { useState } from 'react';
import { AcademyAdmin } from './ContentAcademy';
import { FaqAdmin } from './ContentFaq';
import { TokenAdmin } from './ContentToken';
import { Chips } from './ui';

type Section = 'academia' | 'faq' | 'token';

/** "Contenido": Academia posts, FAQ and the BRIK token page. */
export function ContentTab() {
  const [section, setSection] = useState<Section>('academia');
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Chips<Section> ariaLabel="Sección de contenido" value={section} onChange={setSection} options={[['academia', 'Academia'], ['faq', 'Preguntas frecuentes'], ['token', 'Token BRIK']]} />
      </div>
      {section === 'academia' && <AcademyAdmin />}
      {section === 'faq' && <FaqAdmin />}
      {section === 'token' && <TokenAdmin />}
    </>
  );
}
