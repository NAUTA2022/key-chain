import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PBtn, PSection, PTag, PArea } from '../components/ui';
import { fmtUSD2 } from '../data';

const TOKENS = [
  { sym: 'USDC', name: 'USD Coin',        bal: 12450.80, color: '#2775CA' },
  { sym: 'MATIC', name: 'Polygon',         bal: 4856.70,  color: '#8247E5' },
  { sym: 'FACT',  name: 'Factoract Token', bal: 3825.00,  color: 'var(--accent)' },
  { sym: 'ETH',   name: 'Ethereum',        bal: 2940.00,  color: '#627EEA' },
];

const OPPORTUNITIES = [
  { from: 'USDC', to: 'FACT', reason: 'FACT cotiza 12% bajo promedio 30d', badge: 'Oportunidad', badgeColor: 'green' },
  { from: 'MATIC', to: 'USDC', reason: 'MATIC en máximo semanal, buena toma de ganancias', badge: 'Toma ganancias', badgeColor: 'red' },
];

const HISTORY = [
  { from: 'USDC', to: 'FACT',  amt: 500,  received: 5882, date: '11 Jun 2026', pnl: '+$68' },
  { from: 'MATIC', to: 'USDC', amt: 1200, received: 1248, date: '03 Jun 2026', pnl: '+$41' },
  { from: 'USDC', to: 'ETH',   amt: 800,  received: 0.226, date: '28 May 2026', pnl: '+$22' },
];

export default function Swap({ nav }) {
  const [from, setFrom] = useState('USDC');
  const [to, setTo] = useState('FACT');
  const [amt, setAmt] = useState('100');
  const [slippage, setSlippage] = useState('0.5');

  const fromToken = TOKENS.find(t => t.sym === from);
  const toToken   = TOKENS.find(t => t.sym === to);
  const rate = from === 'USDC' && to === 'FACT' ? 11.76 : from === 'USDC' && to === 'ETH' ? 0.000280 : from === 'MATIC' && to === 'USDC' ? 0.59 : 1;
  const received = (parseFloat(amt) || 0) * rate;

  const swapPair = () => { const tmp = from; setFrom(to); setTo(tmp); };

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <PSection title="Swap" sub="Intercambiá tokens con liquidez de QuickSwap y Uniswap en Polygon." />

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24 }}>
        {/* Swap panel */}
        <div>
          {/* Opportunities */}
          <div style={{ marginBottom: 16 }}>
            {OPPORTUNITIES.map((o, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <PCard style={{ padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }} onClick={() => { setFrom(o.from); setTo(o.to); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PTag label={o.badge} color={o.badgeColor} />
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', flex: 1 }}>{o.reason}</span>
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{o.from} → {o.to}</span>
                  </div>
                </PCard>
              </motion.div>
            ))}
          </div>

          <PCard style={{ padding: '22px 22px' }}>
            {/* From */}
            <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: '16px', marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>De</span>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>Balance: {fmtUSD2(fromToken?.bal || 0)}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="number" value={amt} onChange={e => setAmt(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'var(--text)', letterSpacing: '-0.03em' }}
                  placeholder="0"
                />
                <select value={from} onChange={e => setFrom(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                  {TOKENS.map(t => <option key={t.sym} value={t.sym}>{t.sym}</option>)}
                </select>
              </div>
              <button onClick={() => setAmt(String(fromToken?.bal || 0))} style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>MAX</button>
            </div>

            {/* Swap arrow */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
              <motion.button whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }} onClick={swapPair} style={{
                width: 36, height: 36, borderRadius: '50%', border: '1.5px solid var(--border-l)',
                background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="var(--sec)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.button>
            </div>

            {/* To */}
            <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginBottom: 10 }}>A</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'var(--accent-text)', letterSpacing: '-0.03em' }}>
                  {received > 0 ? received.toFixed(to === 'ETH' ? 6 : 2) : '0'}
                </div>
                <select value={to} onChange={e => setTo(e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                  {TOKENS.filter(t => t.sym !== from).map(t => <option key={t.sym} value={t.sym}>{t.sym}</option>)}
                </select>
              </div>
            </div>

            {/* Details */}
            <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              {[['Tasa', `1 ${from} = ${rate} ${to}`], ['Slippage', `${slippage}%`], ['Ruta', `${from} → QuickSwap → ${to}`], ['Gas estimado', '~$0.01 MATIC']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <PBtn variant="accent" style={{ width: '100%', padding: '14px', fontSize: 15 }}>
              Swap {from} → {to}
            </PBtn>
          </PCard>
        </div>

        {/* Right column: chart + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Precio {to} — 30 días</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>Referencia de mercado</div>
              </div>
              <PTag label="+12.4% vs. promedio" color="green" />
            </div>
            <PArea data={[0.072,0.074,0.071,0.078,0.076,0.080,0.082,0.079,0.085,0.084,0.087,0.085]} height={100} id="swapChart" />
          </PCard>

          <PCard style={{ padding: '20px 22px' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Historial de swaps</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {HISTORY.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < HISTORY.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M16 3l4 4-4 4M20 7H7M8 21l-4-4 4-4M4 17h13" stroke="var(--sec)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {h.amt} {h.from} → {h.received} {h.to}
                    </div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>{h.date}</div>
                  </div>
                  <PTag label={h.pnl} color="green" />
                </div>
              ))}
            </div>
          </PCard>
        </div>
      </div>
    </div>
  );
}
