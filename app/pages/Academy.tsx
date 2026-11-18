import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PSection, PTag, PImg, PChip } from '~/components/ui';
import { ACADEMY_POSTS, type AcademyPost } from '~/data';
import type { NavFn } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { useMobile } from '~/hooks/useMobile';
import { EmptyState } from '~/features/profile/kit';
import { categoriesOf, toAcademyPost, useAcademyPosts, useAcademyReads } from '~/features/academy/api';

const CATS = ['Todos', 'Tokenización', 'Guías', 'RWA', 'DeFi'];
const NO_READS: ReadonlySet<string> = new Set();

type AcademyProps = { nav: NavFn };

export default function Academy({ nav }: AcademyProps) {
  const { status } = useSession();
  return status !== 'disabled' ? <AcademyLive nav={nav} /> : <AcademyView nav={nav} posts={ACADEMY_POSTS} cats={CATS} />;
}

/**
 * Live list from the API. Until it arrives (and if it fails) the static posts are shown
 * exactly as in the demo, so the prerendered HTML keeps the same crawlable content.
 */
function AcademyLive({ nav }: AcademyProps) {
  const posts = useAcademyPosts();
  const reads = useAcademyReads();
  const live = useMemo(() => posts.data?.map(toAcademyPost) ?? null, [posts.data]);
  const cats = useMemo(() => (live ? categoriesOf(live) : CATS), [live]);
  const read = useMemo<ReadonlySet<string>>(() => new Set(reads.data?.slugs ?? []), [reads.data]);
  if (live && live.length === 0) return <AcademyEmpty />;
  return <AcademyView nav={nav} posts={live ?? ACADEMY_POSTS} cats={cats} read={read} />;
}

function AcademyEmpty() {
  const isMobile = useMobile();
  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PSection title="Academia" sub="Aprendé sobre tokenización, RWA y finanzas descentralizadas." />
      <PCard style={{ padding: '8px 24px' }}>
        <EmptyState
          title="Todavía no hay artículos publicados"
          text="Muy pronto vas a encontrar acá guías sobre tokenización, activos reales y finanzas descentralizadas."
        />
      </PCard>
    </div>
  );
}

type AcademyViewProps = AcademyProps & { posts: AcademyPost[]; cats: string[]; read?: ReadonlySet<string> };

function AcademyView({ nav, posts, cats, read = NO_READS }: AcademyViewProps) {
  const isMobile = useMobile();
  const [selected, setCat] = useState('Todos');
  // The chip list can change when live posts replace the static ones.
  const cat = cats.includes(selected) ? selected : 'Todos';
  const filtered = cat === 'Todos' ? posts : posts.filter(p => p.cat === cat);
  const featured = posts.find(p => p.featured);
  const rest = filtered.filter(p => p !== featured || cat !== 'Todos');

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PSection title="Academia" sub="Aprendé sobre tokenización, RWA y finanzas descentralizadas." />

      {/* Featured */}
      {cat === 'Todos' && featured && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <PCard onClick={() => nav('articulo', { slug: featured.slug })} style={{ display: 'flex', flexDirection: isMobile ? 'column' : undefined, marginBottom: 28, minHeight: 260, cursor: 'pointer' }}>
            <PImg src={featured.img} alt={featured.title} priority height="auto" style={isMobile ? { width: '100%', height: 200, minHeight: 200 } : { width: '46%', height: 'auto', minHeight: 260 }}>
              <div style={{ position: 'absolute', top: 14, left: 14 }}>
                <PTag label="Artículo destacado" color="dark" />
              </div>
            </PImg>
            <div style={{ flex: 1, padding: isMobile ? '20px 18px 22px' : '30px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <PTag label={featured.cat} color="neutral" style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: isMobile ? 21 : 26, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.2 }}>{featured.title}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.6, marginBottom: 20 }}>{featured.excerpt}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{featured.date}</span>
                <span style={{ color: 'var(--ter)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{featured.read} de lectura</span>
                {read.has(featured.slug) && <PTag label="Leído ✓" color="green" style={{ marginLeft: 'auto' }} />}
              </div>
            </div>
          </PCard>
        </motion.div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {cats.map(c => <PChip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {rest.map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <PCard onClick={() => nav('articulo', { slug: post.slug })} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%' }}>
              <PImg src={post.img} height={170} />
              <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PTag label={post.cat} color="neutral" />
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15.5, color: 'var(--text)', lineHeight: 1.3, letterSpacing: '-0.015em' }}>{post.title}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5, flex: 1 }}>{post.excerpt}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-l)' }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{post.date}</span>
                  <span style={{ color: 'var(--ter)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{post.read} lectura</span>
                  {read.has(post.slug) && <PTag label="Leído ✓" color="green" style={{ marginLeft: 'auto' }} />}
                </div>
              </div>
            </PCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
