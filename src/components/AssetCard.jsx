import { motion } from 'framer-motion';
import { PCard, PTag, PStat, PProgress, PImg, Icons, CompanyTag } from './ui';
import { ProjectCode } from './FeedPostCard';
import { fmtUSD } from '../data';

// The marketplace project card (Tokenizaciones). Reused wherever projects are
// listed — company profile projects, a person's investments — so they all
// look the same. `showCode` adds the project identifier next to the name;
// `holding` ({ tokens, current, invested, yieldEarned }) adds a strip with
// that person's position in the project.

// ─── Asset card ───────────────────────────────────────────────────────────────
// PStat hardcodes its own label/value colors (var(--ter)/var(--text)), which
// flip dark in light theme — unreadable over a photo scrim that's always
// dark regardless of the app's theme. This is the same stat shape with
// colors fixed to white so it stays legible either way.
function OverlayStat({ label, value, align = 'flex-start' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems:align }}>
      <div style={{ fontSize:11, fontFamily:'var(--font-b)', color:'rgba(255,255,255,0.65)', letterSpacing:'0.05em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:18, fontFamily:'var(--font-h)', fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>{value}</div>
    </div>
  );
}

// KEYCHAIN's own tokenizations get a distinct full-bleed photo treatment
// (name/stats readable directly over the image, dark scrim at the bottom)
// instead of just a glowing border — makes "this one is ours" obvious at a
// glance rather than something you notice only up close.
function KeychainAssetCard({ a, left, nav, showCode, holding }) {
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} whileHover={{ y:-4, boxShadow:'var(--sh-lg)' }} transition={{ duration:0.2 }}>
      <PCard onClick={() => nav('detalle', a)} style={{ height:340, position:'relative' }}>
        <PImg src={a.img} height="100%" style={{ position:'absolute', inset:0 }}>
          <div style={{ position:'absolute', top:14, left:14 }}>
            {/* This card only renders for issuer === 'keychain' — it's a
                KEYCHAIN tokenization, not AutoMax/AgroToken/etc.'s own
                listing, even though one of those companies operates it
                day-to-day. */}
            <CompanyTag company="KEYCHAIN" cat={a.cat} variant="overlay" />
          </div>
          <div style={{ position:'absolute', top:14, right:14 }}>
            <PTag label={a.stage} style={{ background: a.stage==='Operativo' ? 'rgba(110,231,114,0.92)':'rgba(255,255,255,0.92)', color:'#0a2a0d' }} />
          </div>

          <div style={{
            position:'absolute', left:0, right:0, bottom:0, height:'66%',
            background:'linear-gradient(to top, rgba(6,8,14,0.92) 0%, rgba(6,8,14,0.65) 48%, transparent 100%)',
            display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'18px 18px 16px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {showCode && <ProjectCode asset={a} overlay />}
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, color:'#fff', letterSpacing:'-0.02em' }}>{a.name}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4, color:'rgba(255,255,255,0.7)' }}>
              {Icons.location}
              <span style={{ fontFamily:'var(--font-b)', fontSize:12 }}>{a.location}</span>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', marginTop:14 }}>
              <OverlayStat label="Token" value={fmtUSD(a.tokenPrice)} />
              <OverlayStat label="APY est." value={`${a.apy}%`} />
              <OverlayStat label="Disponibles" value={left.toLocaleString()} align="flex-end" />
            </div>

            <div style={{ marginTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'rgba(255,255,255,0.65)' }}>Financiado</span>
                <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, fontWeight:700, color:'#fff' }}>{a.sold}%</span>
              </div>
              <PProgress value={a.sold} style={{ background:'rgba(255,255,255,0.22)' }} color="#fff" />
            </div>
          </div>
        </PImg>
      </PCard>
      {holding && <HoldingStrip holding={holding} />}
    </motion.div>
  );
}

export default function AssetCard({ asset: a, nav, showCode, holding }) {
  const left = a.totalTokens - Math.round(a.totalTokens * a.sold / 100);
  if (a.issuer === 'keychain') return <KeychainAssetCard a={a} left={left} nav={nav} showCode={showCode} holding={holding} />;

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} whileHover={{ y:-4, boxShadow:'var(--sh-lg)' }} transition={{ duration:0.2 }}>
      <PCard onClick={() => nav('detalle', a)} style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative' }}>
        <PImg src={a.img} height={168} className="market-card-img">
          <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:6, flexWrap:'wrap' }}>
            <PTag label={a.stage} style={{ background: a.stage==='Operativo' ? 'rgba(110,231,114,0.92)':'rgba(255,255,255,0.92)', color:'#0a2a0d' }} />
          </div>
        </PImg>

        <div style={{ padding:'15px 17px 17px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>
          <div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                {showCode && <ProjectCode asset={a} />}
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, color:'var(--text)', letterSpacing:'-0.02em' }}>{a.name}</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4, color:'var(--ter)' }}>
              {Icons.location}
              <span style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--sec)' }}>{a.location}</span>
            </div>
            {a.company && (
              <CompanyTag company={a.company} cat={a.cat} size="sm" style={{ marginTop:8 }} />
            )}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <PStat label="Token" value={fmtUSD(a.tokenPrice)} />
            <PStat label="APY est." value={`${a.apy}%`} accent />
            <PStat label="Disponibles" value={left.toLocaleString()} style={{ alignItems:'flex-end' }} />
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--sec)' }}>Financiado</span>
              <span style={{ fontFamily:'var(--font-b)', fontSize:12, fontWeight:700, color:'var(--accent-text)' }}>{a.sold}%</span>
            </div>
            <PProgress value={a.sold} />
          </div>
        </div>
        {holding && <HoldingStrip holding={holding} inside />}
      </PCard>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function HoldingStrip({ holding: h, inside }) {
  const diff = h.invested ? ((h.current - h.invested) / h.invested) * 100 : 0;
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'11px 17px',
      fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)',
      ...(inside
        ? { borderTop:'1px solid var(--border-l)', background:'var(--surface2)' }
        : { marginTop:8, borderRadius:14, border:'1px solid var(--border-l)', background:'var(--surface)' }),
    }}>
      <span><b style={{ color:'var(--text)' }}>{h.tokens}</b> tokens</span>
      <span>Valor <b style={{ color:'var(--text)' }}>{fmtUSD(h.current)}</b></span>
      <span style={{ fontWeight:700, color: diff >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span>
    </div>
  );
}
