import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useActiveAccount, useWalletBalance } from 'thirdweb/react';
import { polygon } from 'thirdweb/chains';
import { PCard, PBtn, PArea, Icons } from '../components/ui';
import { MY_HOLDINGS, RWA_ASSETS, fmtUSD2 } from '../data';
import AssetCard from '../components/AssetCard';
import { client } from '../lib/client';
import KeyPay from './KeyPay';

const POLYGON_TOKENS = [
  { sym: 'POL',  name: 'Polygon',      address: null,                                           abbr: 'PL' },
  { sym: 'USDC', name: 'USD Coin',     address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', abbr: 'UC' },
  { sym: 'USDT', name: 'Tether',       address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', abbr: 'UT' },
  { sym: 'WETH', name: 'Wrapped ETH',  address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', abbr: 'WE' },
];

function TokenRow({ account, sym, name, address, abbr, isLast }) {
  const { data: balance, isLoading } = useWalletBalance({
    chain: polygon,
    address: account?.address,
    client,
    tokenAddress: address || undefined,
  });

  const qty = parseFloat(balance?.displayValue || '0');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--gl-div)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: 'var(--gl-div)',
        border: '1px solid var(--gl-bd)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gl-icon-c)', fontFamily: 'var(--font-h)', fontWeight: 800,
        fontSize: 11, flexShrink: 0, letterSpacing: '0.02em',
      }}>{abbr}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{sym}</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{name}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {isLoading || !account ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ width: 56, height: 13, background: 'var(--gl-icon)', borderRadius: 4 }} />
            <div style={{ width: 40, height: 11, background: 'var(--gl-prd-i)', borderRadius: 4 }} />
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
              {qty < 0.0001 && qty > 0 ? '<0.0001' : qty.toLocaleString('es-AR', { maximumFractionDigits: 4 })}
            </div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>
              {balance?.symbol || sym}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Parallax wallet card ── */
function ParallaxWalletCard({ account, setTab }) {
  const cardRef = useRef(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRotX = useSpring(rotX, { stiffness: 220, damping: 28 });
  const sRotY = useSpring(rotY, { stiffness: 220, damping: 28 });
  const shine = useMotionValue(0);
  const sShine = useSpring(shine, { stiffness: 200, damping: 30 });
  const shineOpacity = useTransform(sShine, [0, 1], [0, 0.12]);

  const handleMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;   // -0.5 → 0.5
    const y = (e.clientY - top)  / height - 0.5;
    rotX.set(-y * 14);
    rotY.set(x * 14);
    shine.set(Math.sqrt(x * x + y * y) * 2);
  };

  const handleLeave = () => {
    rotX.set(0);
    rotY.set(0);
    shine.set(0);
  };

  const addrShort = account
    ? `${account.address.slice(0, 10)}…${account.address.slice(-6)}`
    : 'Sin wallet conectada';

  return (
    <div style={{ perspective: '900px' }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          rotateX: sRotX, rotateY: sRotY,
          transformStyle: 'preserve-3d',
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(38,38,38,0.95) 0%, rgba(18,18,18,0.98) 60%, rgba(8,8,8,1) 100%)',
          border: '1px solid var(--gl-bg3)',
          boxShadow: 'var(--sh-lg), inset 0 1px 0 var(--gl-bg3)',
          padding: '30px 28px 26px',
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {/* Specular shine layer */}
        <motion.div style={{
          position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.13) 0%, transparent 65%)',
          opacity: shineOpacity,
        }} />

        {/* Dot grid texture */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none', opacity: 0.18,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />

        {/* Moving light orb */}
        <motion.div style={{
          position: 'absolute', top: '-60%', right: '-20%', width: 320, height: 320,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, var(--gl-prd-i) 0%, transparent 70%)',
          rotateX: useTransform(sRotX, v => -v * 1.5),
          rotateY: useTransform(sRotY, v => -v * 1.5),
        }} />

        {/* Content — raised layer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 5 }}>Dirección</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--sec)', letterSpacing: '0.02em' }}>{addrShort}</div>
            </div>
            {/* Network chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--gl-div)', border: '1px solid var(--gl-bd)',
              borderRadius: 20, padding: '5px 12px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.55)' }} />
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600, color: 'var(--sec)' }}>Polygon</span>
            </div>
          </div>

          {/* Main balance */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Balance total</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.95)' }}>$0.00</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 4 }}>Polygon Mainnet</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Depositar', action: null, icon: '↓' },
              { label: 'Retirar',   action: null, icon: '↑' },
              { label: 'Swap',      action: 'swap', icon: '⇄' },
            ].map(({ label, action, icon }) => (
              <button
                key={label}
                onClick={() => action && setTab(action)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  border: '1px solid var(--gl-prd-a)',
                  background: 'var(--gl-icon)',
                  color: 'rgba(255,255,255,0.82)',
                  cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--gl-prd-a)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--gl-icon)'; e.currentTarget.style.borderColor = 'var(--gl-prd-a)'; }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Holdings({ nav }) {
  const [tab, setTab] = useState('wallet');
  const [keyPayOpen, setKeyPayOpen] = useState(false);
  const account = useActiveAccount();

  const holdTotal     = MY_HOLDINGS.reduce((s, h) => s + h.current, 0);
  const investedTotal = MY_HOLDINGS.reduce((s, h) => s + h.invested, 0);
  const yieldTotal    = MY_HOLDINGS.reduce((s, h) => s + h.yieldEarned, 0);
  const pnl           = ((holdTotal / investedTotal - 1) * 100).toFixed(1);

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.04em', color: 'var(--text)' }}>Mis Pertenencias</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 4 }}>Wallet y portafolio de inversiones</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--gl-prd-i)', border: '1px solid var(--gl-icon)', borderRadius: 12, padding: 4 }}>
            {[['wallet','Wallet'], ['inversiones','Inversiones']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: tab === id ? 'var(--gl-bg3)' : 'transparent',
                color: tab === id ? 'var(--text)' : 'var(--ter)',
                fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: tab === id ? 600 : 500,
                boxShadow: tab === id ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                transition: 'all 0.18s',
              }}>{label}</button>
            ))}
          </div>
          <PBtn variant="accent" small onClick={() => setKeyPayOpen(true)}>Abrir en Key Pay</PBtn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 26 }}>
        {[
          { k: 'Portafolio RWA', v: fmtUSD2(holdTotal),              s: `${MY_HOLDINGS.length} proyectos` },
          { k: 'Invertido',      v: fmtUSD2(investedTotal),           s: 'capital inicial'                 },
          { k: 'P&L',           v: `+${pnl}%`,                       s: fmtUSD2(holdTotal - investedTotal)},
          { k: 'Yield cobrado',  v: fmtUSD2(yieldTotal),              s: 'desde Mar 2025'                  },
        ].map(({ k, v, s }, idx) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
            style={{
              background: 'var(--gl-bg)',
              border: '1px solid var(--gl-icon)',
              borderRadius: 18, padding: '18px 20px',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 var(--gl-div)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{k}</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: 'var(--text)', letterSpacing: '-0.03em' }}>{v}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 3 }}>{s}</div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'wallet' && (
          <motion.div key="wallet" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
              {/* Left column */}
              <div>
                <ParallaxWalletCard account={account} setTab={setTab} />

                {/* Token balances */}
                <div style={{
                  background: 'var(--gl-bg)',
                  border: '1px solid var(--gl-icon)',
                  borderRadius: 18, padding: '18px 20px',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: 'inset 0 1px 0 var(--gl-div)',
                }}>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--sec)', marginBottom: 2 }}>Activos en wallet</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 12 }}>Tokens en Polygon</div>
                  {!account && (
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '12px 0', textAlign: 'center' }}>
                      Conectá tu wallet para ver balances reales
                    </div>
                  )}
                  {POLYGON_TOKENS.map((t, i) => (
                    <TokenRow
                      key={t.sym} account={account}
                      sym={t.sym} name={t.name} address={t.address} abbr={t.abbr}
                      isLast={i === POLYGON_TOKENS.length - 1}
                    />
                  ))}
                </div>
              </div>

              {/* Portfolio evolution */}
              <div style={{
                background: 'var(--gl-bg)',
                border: '1px solid var(--gl-icon)',
                borderRadius: 18, padding: '24px 26px',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                boxShadow: 'inset 0 1px 0 var(--gl-div)',
              }}>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 3 }}>Evolución del portafolio RWA</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 20 }}>Últimos 12 meses</div>
                <PArea data={[28000,29200,30100,29800,31400,32600,33100,34800,35600,36900,38400,holdTotal]} height={200} id="holdings" />
                <div style={{ display: 'flex', gap: 28, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gl-div)' }}>
                  {[
                    ['RWA',             fmtUSD2(holdTotal)],
                    ['Invertido',       fmtUSD2(investedTotal)],
                    ['Ganancia',        fmtUSD2(holdTotal - investedTotal)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{k}</div>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.03em' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'inversiones' && (
          <motion.div key="inv" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            {/* Same cards as the marketplace, with my position in each */}
            <div className="g-market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {MY_HOLDINGS.map(h => {
                const a = RWA_ASSETS.find(x => x.id === h.assetId);
                return a && (
                  <AssetCard key={h.assetId} asset={a} nav={nav} showCode holding={h}
                    actions={<PBtn variant="ghost" small>Vender</PBtn>} />
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {keyPayOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setKeyPayOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 430, height: '90vh', maxHeight: 860,
                borderRadius: 32, overflow: 'hidden', boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
              }}
            >
              <KeyPay nav={nav} onClose={() => setKeyPayOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
