import { motion } from 'framer-motion';
import { PCard, PBtn, PTag, PImg, Icons } from '../components/ui';
import { ACADEMY_POSTS } from '../data';

export default function Article({ nav, post }) {
  const article = post || ACADEMY_POSTS[0];
  const related = ACADEMY_POSTS.filter(p => p.id !== article.id).slice(0, 3);

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => nav('academia')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13.5, marginBottom: 24, padding: 0 }}>
        {Icons.back} Volver a Academia
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <PTag label={article.cat} color="neutral" style={{ marginBottom: 16 }} />
        <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 38, color: 'var(--text)', letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: 16 }}>{article.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>F</div>
          <div>
            <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>FACTORACT Editorial</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{article.date} · {article.read} de lectura</div>
          </div>
        </div>

        <PImg src={article.img} height={380} style={{ borderRadius: 20, marginBottom: 32 }} />

        <div style={{ fontFamily: 'var(--font-b)', fontSize: 17, color: 'var(--sec)', lineHeight: 1.75, marginBottom: 28, fontWeight: 450 }}>
          {article.excerpt} Este artículo te explica en detalle cada concepto clave para que puedas tomar decisiones informadas al invertir en activos tokenizados del mundo real.
        </div>

        {[
          ['¿Qué son los activos tokenizados?', 'La tokenización convierte la propiedad de activos físicos en tokens digitales en una blockchain. Cada token representa una fracción del activo subyacente, permitiendo a múltiples inversores participar en proyectos que antes requerían grandes capitales. En Polygon, esto se implementa mediante contratos ERC-20 auditados con distribución automática de rendimientos en USDC.'],
          ['Ventajas clave para el inversor', 'Los RWA tokenizados ofrecen liquidez secundaria, rendimientos distributos on-chain, transparencia total vía blockchain y acceso desde montos mínimos de inversión. La custodia institucional y los contratos auditados garantizan la seguridad de tu capital.'],
          ['Cómo funciona el flujo de inversión', 'Al comprar tokens de un proyecto, tu inversión se registra en el smart contract del activo. Los rendimientos generados (alquileres, operaciones, cosechas) se distribuyen mensualmente de forma proporcional a tu tenencia de tokens, directo a tu wallet en USDC sin intermediarios.'],
        ].map(([title, content], i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 12 }}>{title}</h2>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 16, color: 'var(--sec)', lineHeight: 1.75 }}>{content}</p>
          </div>
        ))}

        {/* CTA */}
        <PCard style={{ padding: '24px 28px', marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>¿Listo para invertir?</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', marginBottom: 18 }}>Explorá proyectos disponibles en el Mercado Primario.</div>
          <PBtn variant="accent" onClick={() => nav('primario')} style={{ padding: '13px 28px' }}>Ver proyectos</PBtn>
        </PCard>

        {/* Related */}
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 18 }}>Seguí leyendo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {related.map(p => (
            <PCard key={p.id} onClick={() => nav('articulo', p)} style={{ cursor: 'pointer' }}>
              <PImg src={p.img} height={120} />
              <div style={{ padding: '14px 16px' }}>
                <PTag label={p.cat} color="neutral" style={{ marginBottom: 8 }} />
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 6 }}>{p.read} de lectura</div>
              </div>
            </PCard>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
