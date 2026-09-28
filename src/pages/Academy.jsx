import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PSection, PTag, PImg, PChip } from '../components/ui';
import { ACADEMY_POSTS } from '../data';

const CATS = ['Todos', 'Tokenización', 'Guías', 'RWA', 'DeFi'];

export default function Academy({ nav }) {
  const [cat, setCat] = useState('Todos');
  const filtered = cat === 'Todos' ? ACADEMY_POSTS : ACADEMY_POSTS.filter(p => p.cat === cat);
  const featured = ACADEMY_POSTS.find(p => p.featured);
  const rest = filtered.filter(p => !p.featured || cat !== 'Todos');

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PSection title="Academia" sub="Aprendé sobre tokenización, RWA y finanzas descentralizadas." />

      {/* Featured */}
      {cat === 'Todos' && featured && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <PCard onClick={() => nav('articulo', featured)} style={{ display: 'flex', marginBottom: 28, minHeight: 260, cursor: 'pointer' }}>
            <PImg src={featured.img} height="auto" style={{ width: '46%', height: 'auto', minHeight: 260 }}>
              <div style={{ position: 'absolute', top: 14, left: 14 }}>
                <PTag label="Artículo destacado" color="dark" />
              </div>
            </PImg>
            <div style={{ flex: 1, padding: '30px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <PTag label={featured.cat} color="neutral" style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.2 }}>{featured.title}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.6, marginBottom: 20 }}>{featured.excerpt}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{featured.date}</span>
                <span style={{ color: 'var(--ter)' }}>·</span>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{featured.read} de lectura</span>
              </div>
            </div>
          </PCard>
        </motion.div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {CATS.map(c => <PChip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {rest.map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <PCard onClick={() => nav('articulo', post)} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%' }}>
              <PImg src={post.img} height={170} />
              <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PTag label={post.cat} color="neutral" />
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15.5, color: 'var(--text)', lineHeight: 1.3, letterSpacing: '-0.015em' }}>{post.title}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5, flex: 1 }}>{post.excerpt}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-l)' }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{post.date}</span>
                  <span style={{ color: 'var(--ter)' }}>·</span>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{post.read} lectura</span>
                </div>
              </div>
            </PCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
