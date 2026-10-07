import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PBtn, PSection, PTag, PProgress, PDonut, PDiv, PScanLink } from '../components/ui';
import { FACT_TOKEN, fmtUSD2 } from '../data';
import { goCheckout } from '../lib/checkout';

export default function TokenUtility({ nav }) {
  const [buyAmt, setBuyAmt] = useState(500);
  const F = FACT_TOKEN;
  const pct = Math.round(F.raised / F.goal * 100);
  const factAmt = Math.round(buyAmt / F.price);

  // Buying opens KEYCHAIN's checkout. factAmt is rounded to a whole token
  // count, so unit is derived back from buyAmt — qty*unit must equal exactly
  // the USDC amount just quoted as "Pagás".
  const handleBuy = () => {
    goCheckout(nav, {
      title: 'ICO pública', source: 'Token FACT',
      items: [{ name: 'Token FACT — ICO Pública', img: '/icono.png', qty: factAmt, unit: buyAmt / factAmt, meta: 'TGE 15% · vesting 12 meses' }],
      back: { route: 'token' }, done: { route: 'token', label: 'Volver a Token FACT' },
    });
  };

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PSection
        title="Token de Utilidad — FACT"
        sub="ICO activa · Polygon ERC-20 · 1,000,000,000 supply total"
        action={<PScanLink contract={F.contract} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div>
          {/* ICO Progress */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <PCard style={{ padding: '24px 28px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Precio actual</div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 36, color: 'var(--text)', letterSpacing: '-0.04em' }}>${F.price}</div>
                  <PTag label="Ronda Pública Activa" color="green" style={{ marginTop: 6 }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Holders</div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, color: 'var(--text)', letterSpacing: '-0.03em' }}>{F.holders.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Recaudado: <strong>{fmtUSD2(F.raised)}</strong></span>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>Meta: {fmtUSD2(F.goal)}</span>
                </div>
                <PProgress value={pct} style={{ height: 8 }} />
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent-text)', fontWeight: 600, marginTop: 6 }}>{pct}% completado</div>
              </div>
            </PCard>
          </motion.div>

          {/* Rounds table */}
          <PCard style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Calendario de rondas</div>
            <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Ronda','Precio','Estado','Alloc.','TGE','Cliff','Vesting'].map(h => (
                      <th key={h} style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textAlign: 'left', padding: '0 12px 10px 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {F.rounds.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-l)' }}>
                      <td style={{ padding: '12px 12px 12px 0', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.name}</td>
                      <td style={{ padding: '12px 12px 12px 0', fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)' }}>${r.price}</td>
                      <td style={{ padding: '12px 12px 12px 0' }}><PTag label={r.status} color={r.status === 'Activa' ? 'green' : 'neutral'} /></td>
                      <td style={{ padding: '12px 12px 12px 0', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{r.alloc}</td>
                      <td style={{ padding: '12px 12px 12px 0', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{r.tge}</td>
                      <td style={{ padding: '12px 12px 12px 0', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{r.cliff}</td>
                      <td style={{ padding: '12px 0 12px 0', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{r.vesting}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PCard>

          {/* Tokenomics + Utility */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PCard style={{ padding: '20px 22px' }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Tokenomics</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <PDonut segments={F.tokenomics} size={130} label="1B" sub="supply" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {F.tokenomics.map(t => (
                  <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>{t.label}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{t.value}%</span>
                  </div>
                ))}
              </div>
            </PCard>

            <PCard style={{ padding: '20px 22px' }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Utilidades del token</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {F.utility.map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="var(--accent-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5 }}>{u}</span>
                  </div>
                ))}
              </div>

              <PDiv style={{ margin: '18px 0' }} />

              {/* Vesting calendar */}
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Mi vesting (ICO Pública)</div>
              {[['TGE (inmediato)','3,375 FACT','15% desbloqueado'],['Jun 2026','1,406 FACT / mes','Vesting lineal 12m'],['Jun 2027','22,500 FACT','Total liberado']].map(([date,amt,note]) => (
                <div key={date} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-l)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{date}</span>
                    <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{amt}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>{note}</div>
                </div>
              ))}
            </PCard>
          </div>
        </div>

        {/* Buy panel */}
        <div style={{ position: 'sticky', top: 88 }}>
          <PCard style={{ padding: '24px' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 20 }}>Comprar FACT</div>

            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cantidad en USDC</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[100, 250, 500, 1000].map(n => (
                <button key={n} onClick={() => setBuyAmt(n)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${buyAmt === n ? 'var(--accent)' : 'var(--border)'}`,
                  background: buyAmt === n ? 'var(--accent-bg)' : 'transparent',
                  color: buyAmt === n ? 'var(--accent-text)' : 'var(--sec)',
                  fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600,
                }}>${n}</button>
              ))}
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 13, padding: '16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Pagás</span>
                <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmtUSD2(buyAmt)} USDC</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Recibís</span>
                <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--accent-text)' }}>{factAmt.toLocaleString()} FACT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Precio por token</span>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)' }}>${F.price}</span>
              </div>
            </div>

            <>
                <PBtn variant="accent" style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 10 }} onClick={handleBuy}>
                  Comprar {factAmt.toLocaleString()} FACT
                </PBtn>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>
                  Pago con USDC · TGE: 15% inmediato · Vesting: 12 meses
                </div>
              </>

            <PDiv style={{ margin: '18px 0' }} />

            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Mi posición actual</div>
            {[['FACT en wallet','45,000'],['Valor en USD',fmtUSD2(45000*F.price)],['Próximo desbloqueo','1,406 FACT · 01 Jul 2026']].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-l)' }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-h)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </PCard>
        </div>
      </div>
    </div>
  );
}
