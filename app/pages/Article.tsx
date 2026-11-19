import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PCard, PBtn, PTag, PImg, Icons } from '~/components/ui';
import { ACADEMY_POSTS, type AcademyPost } from '~/data';
import type { NavFn } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { useMobile } from '~/hooks/useMobile';
import { isProblem } from '~/lib/api/client';
import { SITE_NAME } from '~/lib/site';
import { errorText } from '~/features/profile/api';
import { Notice, Skeleton } from '~/features/profile/kit';
import { bodyBlocks, markRead, toAcademyPost, useAcademyPost, useAcademyPosts } from '~/features/academy/api';
import NotFound from '~/routes/not-found';

type ArticleProps = { nav: NavFn; post?: AcademyPost; slug?: string };

export default function Article({ nav, post, slug }: ArticleProps) {
  const { status } = useSession();
  const liveSlug = slug ?? post?.slug;
  if (status !== 'disabled' && liveSlug) return <ArticleLive nav={nav} slug={liveSlug} preview={post} />;
  return <ArticleDemo nav={nav} post={post} />;
}

// ─── Shared pieces (same markup in demo and live) ────────────────────────────

function BackLink({ nav }: { nav: NavFn }) {
  return (
    <button onClick={() => nav('academia')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13.5, marginBottom: 24, padding: 0 }}>
      {Icons.back} Volver a Academia
    </button>
  );
}

function ArticleHeader({ article, isMobile, badge }: { article: AcademyPost; isMobile: boolean; badge?: ReactNode }) {
  return (
    <>
      <PTag label={article.cat} color="neutral" style={{ marginBottom: 16 }} />
      {badge}
      <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 28 : 38, color: 'var(--text)', letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: 16 }}>{article.title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>F</div>
        <div>
          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>La 33 Editorial</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{article.date} · {article.read} de lectura</div>
        </div>
      </div>

      <PImg src={article.img} alt={article.title} priority height={isMobile ? 220 : 380} style={{ borderRadius: 20, marginBottom: 32 }} />
    </>
  );
}

function ArticleCta({ nav }: { nav: NavFn }) {
  return (
    <PCard style={{ padding: '24px 28px', marginBottom: 36, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>¿Listo para invertir?</div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', marginBottom: 18 }}>Explorá proyectos disponibles en el Mercado Primario.</div>
      <PBtn variant="accent" onClick={() => nav('primario')} style={{ padding: '13px 28px' }}>Ver proyectos</PBtn>
    </PCard>
  );
}

function Related({ nav, posts, isMobile }: { nav: NavFn; posts: AcademyPost[]; isMobile: boolean }) {
  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 18 }}>Seguí leyendo</h2>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(3, 1fr)', gap: 16 }}>
        {posts.map(p => (
          <PCard key={p.id} onClick={() => nav('articulo', { slug: p.slug })} style={{ cursor: 'pointer' }}>
            <PImg src={p.img} height={120} />
            <div style={{ padding: '14px 16px' }}>
              <PTag label={p.cat} color="neutral" style={{ marginBottom: 8 }} />
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>{p.title}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 6 }}>{p.read} de lectura</div>
            </div>
          </PCard>
        ))}
      </div>
    </>
  );
}

const leadStyle: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 17, color: 'var(--sec)', lineHeight: 1.75, marginBottom: 28, fontWeight: 450 };

// ─── Demo (static data) ──────────────────────────────────────────────────────

function ArticleDemo({ nav, post }: { nav: NavFn; post?: AcademyPost }) {
  const isMobile = useMobile();
  const article = post || ACADEMY_POSTS[0];
  const related = ACADEMY_POSTS.filter(p => p.id !== article.id).slice(0, 3);

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <BackLink nav={nav} />

      <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <ArticleHeader article={article} isMobile={isMobile} />

        <div style={leadStyle}>
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
        <ArticleCta nav={nav} />

        {/* Related */}
        <Related nav={nav} posts={related} isMobile={isMobile} />
      </motion.article>
    </div>
  );
}

// ─── Live (API) ──────────────────────────────────────────────────────────────

/**
 * Article from GET /v1/academy/posts/{slug}. While it loads, a post that also exists in
 * the static list shows its header (title, category, cover, date) — that is what the
 * prerendered HTML carries — but never the static placeholder body.
 */
function ArticleLive({ nav, slug, preview }: { nav: NavFn; slug: string; preview?: AcademyPost }) {
  const isMobile = useMobile();
  const { status } = useSession();
  const detail = useAcademyPost(slug);
  const list = useAcademyPosts();
  const [marked, setMarked] = useState<string | null>(null);
  const sent = useRef<string | null>(null);
  const data = detail.data;
  const loaded = data !== null;

  // Record the read once per slug for signed-in users (idempotent; errors are ignored).
  useEffect(() => {
    if (status !== 'authenticated' || !loaded || sent.current === slug) return;
    sent.current = slug;
    void markRead(slug).then(r => {
      if (r.data) setMarked(r.data.slug);
    });
  }, [status, loaded, slug]);

  // The route meta only knows the static posts; name the tab after an API-only post.
  const apiOnlyTitle = !preview && data ? data.title : null;
  useEffect(() => {
    if (apiOnlyTitle) document.title = `${apiOnlyTitle} | ${SITE_NAME}`;
  }, [apiOnlyTitle]);

  if (isProblem(detail.error) && detail.error.status === 404) return <NotFound />;

  const header = data ? toAcademyPost(data) : preview;
  const blocks = data ? bodyBlocks(data.body) : [];
  const related = (list.data ?? []).filter(p => p.slug !== slug).slice(0, 3).map(toAcademyPost);
  const badge = marked === slug ? <PTag label="Marcado como leído ✓" color="green" style={{ marginBottom: 16, marginLeft: 8 }} /> : null;

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <BackLink nav={nav} />

      <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {header ? (
          <ArticleHeader article={header} isMobile={isMobile} badge={badge} />
        ) : (
          <div style={{ marginBottom: 32 }}>
            <Skeleton rows={3} height={isMobile ? 22 : 28} />
          </div>
        )}

        {data ? (
          <>
            <div style={leadStyle}>{data.excerpt}</div>
            {blocks.length > 0 ? (
              <div style={{ marginBottom: 28 }}>
                {blocks.map((b, i) =>
                  b.kind === 'h2' ? (
                    <h2 key={i} style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em', marginTop: i === 0 ? 0 : 12, marginBottom: 12 }}>{b.text}</h2>
                  ) : (
                    <p key={i} style={{ fontFamily: 'var(--font-b)', fontSize: 16, color: 'var(--sec)', lineHeight: 1.75, marginBottom: 20, whiteSpace: 'pre-line' }}>{b.text}</p>
                  ),
                )}
              </div>
            ) : (
              <Notice tone="info" style={{ marginBottom: 32 }}>El artículo completo estará disponible pronto.</Notice>
            )}
          </>
        ) : detail.error ? (
          <Notice tone="error" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{errorText(detail.error, 'No pudimos cargar el artículo. Probá de nuevo en unos minutos.')}</span>
            <PBtn variant="secondary" small onClick={detail.reload}>Reintentar</PBtn>
          </Notice>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <Skeleton rows={6} />
          </div>
        )}

        {/* CTA */}
        <ArticleCta nav={nav} />

        {/* Related */}
        {related.length > 0 && <Related nav={nav} posts={related} isMobile={isMobile} />}
      </motion.article>
    </div>
  );
}
