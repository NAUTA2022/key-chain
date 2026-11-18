import { useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PCard, PBtn, PSection, PTag, PProgress, PDonut, PDiv, Icons } from '~/components/ui';
import { fmtUSD2 } from '~/data';
import { useMobile } from '~/hooks/useMobile';
import { explorerUrl } from '~/lib/onchain';
import { errorText } from '~/features/profile/api';
import { EmptyState, Notice, Skeleton } from '~/features/profile/kit';
import { bodyStyle } from '~/features/profile/styles';
import { usePlatformToken } from './api';
import { Hint } from './Hint';
import GuideButton from '~/features/guide/GuideButton';

// Live /token page: same layout and look as the demo, fed by GET /v1/token. Purchases
// stay closed until the presale opens, so nothing is sent to KeyPay from here.

const statLabel: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 };
const cardTitle: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 16 };
const subTitle: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 };
const th: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textAlign: 'left', padding: '0 12px 10px 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap' };
const td: CSSProperties = { padding: '12px 12px 12px 0', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' };
const note: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', lineHeight: 1.5 };

const COLUMNS: ReadonlyArray<{ label: string; help?: { text: string; label: string } }> = [
  { label: 'Ronda' },
  { label: 'Precio' },
  { label: 'Estado' },
  { label: 'Alloc.', help: { label: '¿Qué es Alloc.?', text: 'Allocation: qué porcentaje del total de tokens se ofrece en esa ronda.' } },
  { label: 'TGE', help: { label: '¿Qué es el TGE?', text: 'Token Generation Event: el día en que se emite el token. El porcentaje indica qué parte de tu compra recibís ese mismo día.' } },
  { label: 'Cliff', help: { label: '¿Qué es el cliff?', text: 'Tiempo de espera después del TGE durante el cual no se libera nada más de tu compra.' } },
  { label: 'Vesting', help: { label: '¿Qué es el vesting?', text: 'Plazo en el que se libera, de a poco, el resto de tus tokens una vez terminado el cliff.' } },
];

const BUY_AMOUNTS = [100, 250, 500, 1000];

export function TokenLive() {
  const isMobile = useMobile();
  const token = usePlatformToken();
  const [buyAmt, setBuyAmt] = useState(500);
  const t = token.data;
  const sym = t?.symbol;
  const pct = t && t.goal > 0 ? Math.round((t.raised / t.goal) * 100) : 0;
  const tokens = t && t.price > 0 ? Math.round(buyAmt / t.price) : 0;
  const active = t?.rounds.find(r => r.status === 'Activa');
  const scan = t?.contractAddress ? explorerUrl('address', t.contractAddress, t.chainId ?? undefined) : null;
  const noTokens = sym ? `Todavía no tenés ${sym}. La preventa abrirá próximamente.` : null;

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <PSection
        title={<span data-guide="token-title">{sym ? `Token de Utilidad — ${sym}` : 'Token de Utilidad'}</span>}
        sub={t ? `${t.name} · ${t.symbol}` : 'Utilidad, rondas y distribución del token de la plataforma.'}
        help={<GuideButton tour="token" />}
        action={t?.contractAddress && scan ? <ContractLink href={scan} address={t.contractAddress} /> : undefined}
      />

      {token.error && !t ? (
        <>
          <Notice tone="error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{errorText(token.error, 'No pudimos cargar los datos del token. Probá de nuevo en unos minutos.')}</span>
            <PBtn variant="secondary" small onClick={token.reload}>Reintentar</PBtn>
          </Notice>
          <Explainer sym={undefined} isMobile={isMobile} />
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 360px', gap: 24 }}>
          <div>
            {/* Sale progress */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <PCard guide="token-sale" style={{ padding: isMobile ? '20px 18px' : '24px 28px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={statLabel}>
                      Precio actual
                      <Hint size={13} label="¿Qué es el precio actual?" text={`Lo que cuesta hoy 1 ${sym ?? 'token'}, expresado en dólares (USDC).`} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 36, color: 'var(--text)', letterSpacing: '-0.04em' }}>{t ? `$${t.price}` : '—'}</div>
                    {active && <PTag label={`${active.name} · ${active.status}`} color="green" style={{ marginTop: 6 }} />}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={statLabel}>
                      Holders
                      <Hint size={13} label="¿Qué son los holders?" text={`Cantidad de wallets que tienen ${sym ?? 'el token'}.`} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, color: 'var(--text)', letterSpacing: '-0.03em' }}>{t ? t.holders.toLocaleString('en-US') : '—'}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Recaudado: <strong>{t ? fmtUSD2(t.raised) : '—'}</strong></span>
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>
                      Meta: {t ? fmtUSD2(t.goal) : '—'}
                      <Hint size={13} label="¿Qué es recaudado y meta?" text="Recaudado: lo que se juntó hasta ahora con la venta del token. Meta: el total que se busca recaudar." />
                    </span>
                  </div>
                  <PProgress value={pct} style={{ height: 8 }} />
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent-text)', fontWeight: 600, marginTop: 6 }}>{t ? `${pct}% completado` : '—'}</div>
                </div>
              </PCard>
            </motion.div>

            <Explainer sym={sym} isMobile={isMobile} />

            {/* Rounds */}
            <PCard style={{ padding: isMobile ? '18px 16px' : '20px 24px', marginBottom: 20 }}>
              <h2 style={cardTitle}>Calendario de rondas</h2>
              {!t ? (
                <Skeleton rows={3} />
              ) : t.rounds.length === 0 ? (
                <EmptyState title="Todavía no hay rondas publicadas" />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {COLUMNS.map(c => (
                          <th key={c.label} scope="col" style={th}>
                            {c.label}
                            {c.help && <Hint size={13} label={c.help.label} text={c.help.text} />}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {t.rounds.map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border-l)' }}>
                          <td style={{ ...td, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.name}</td>
                          <td style={{ ...td, fontSize: 13.5, color: 'var(--text)' }}>${r.price}</td>
                          <td style={{ padding: '12px 12px 12px 0' }}><PTag label={r.status} color={r.status === 'Activa' ? 'green' : 'neutral'} /></td>
                          <td style={td}>{r.alloc}</td>
                          <td style={td}>{r.tge}</td>
                          <td style={td}>{r.cliff}</td>
                          <td style={{ ...td, padding: '12px 0 12px 0' }}>{r.vesting}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PCard>

            {/* Tokenomics + utilities */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              <PCard style={{ padding: '20px 22px' }}>
                <CardTitle help={<Hint size={13} label="¿Qué es la tokenomics?" text={`Cómo se reparte el total de ${sym ?? 'tokens'} entre sus distintos destinos (por ejemplo ventas, reservas o equipo).`} />}>
                  Tokenomics
                </CardTitle>
                {!t ? (
                  <Skeleton rows={4} />
                ) : t.allocations.length === 0 ? (
                  <EmptyState title="La distribución todavía no está publicada" />
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                      <PDonut segments={t.allocations.map(a => ({ value: a.percent, color: a.color }))} size={130} label={t.symbol} sub="distribución" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {t.allocations.map(a => (
                        <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>{a.label}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{a.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </PCard>

              <PCard guide="token-utilities" style={{ padding: '20px 22px' }}>
                <CardTitle help={<Hint size={13} label="¿Qué son las utilidades?" text={`Para qué podés usar ${sym ?? 'el token'} dentro de la plataforma.`} />}>
                  Utilidades del token
                </CardTitle>
                {!t ? (
                  <Skeleton rows={4} />
                ) : t.utilities.length === 0 ? (
                  <div style={note}>Todavía no hay utilidades publicadas.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {t.utilities.map((u, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l5 5L20 7" stroke="var(--accent-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5 }}>{u}</span>
                      </div>
                    ))}
                  </div>
                )}

                <PDiv style={{ margin: '18px 0' }} />

                <h3 style={subTitle}>Mi vesting</h3>
                {noTokens ? <div style={note}>{noTokens}</div> : <Skeleton rows={2} height={12} />}
              </PCard>
            </div>
          </div>

          {/* Buy panel (closed until the presale opens) */}
          <div style={{ position: isMobile ? 'static' : 'sticky', top: 88 }}>
            <PCard style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 20 }}>{sym ? `Comprar ${sym}` : 'Comprar'}</h2>

              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cantidad en USDC</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {BUY_AMOUNTS.map(n => (
                  <button key={n} type="button" aria-pressed={buyAmt === n} onClick={() => setBuyAmt(n)} style={{
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
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Pagarías</span>
                  <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmtUSD2(buyAmt)} USDC</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Recibirías</span>
                  <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--accent-text)' }}>{t ? `${tokens.toLocaleString('en-US')} ${t.symbol}` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Precio por token</span>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)' }}>{t ? `$${t.price}` : '—'}</span>
                </div>
              </div>

              <PBtn guide="token-buy" variant="accent" disabled style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 10 }}>
                Preventa próximamente
              </PBtn>
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', lineHeight: 1.5 }}>
                La compra todavía no está habilitada. Cuando abra la preventa vas a poder pagar con USDC.
              </div>

              <PDiv style={{ margin: '18px 0' }} />

              <h3 data-guide="token-position" style={subTitle}>Mi posición actual</h3>
              {noTokens ? <div style={note}>{noTokens}</div> : <Skeleton rows={2} height={12} />}
            </PCard>
          </div>
        </div>
      )}
    </div>
  );
}

/** Card title with its "?" next to it (kept outside the heading so the heading reads cleanly). */
function CardTitle({ children, help }: { children: ReactNode; help: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ ...cardTitle, marginBottom: 0 }}>{children}</h2>
      {help}
    </div>
  );
}

/** Plain-language intro; rendered while loading too, so the prerendered page explains the token. */
function Explainer({ sym, isMobile }: { sym: string | undefined; isMobile: boolean }) {
  const name = sym ?? 'el token de la plataforma';
  return (
    <PCard style={{ padding: isMobile ? '18px 16px' : '20px 24px', marginBottom: 20 }}>
      <h2 style={{ ...cardTitle, marginBottom: 10 }}>{sym ? `¿Qué es ${sym}?` : '¿Qué es el token de la plataforma?'}</h2>
      <p style={bodyStyle}>
        {sym ? `${sym} es el token de utilidad de la plataforma` : 'Es el token de utilidad de la plataforma'}: sirve para acceder a los beneficios que figuran en «Utilidades del token».
      </p>
      <p style={{ ...bodyStyle, marginTop: 8 }}>
        No es una inversión en un activo del mundo real: tener {name} no te da la propiedad ni las rentas de ningún inmueble, campo o vehículo. Para eso están los tokens de cada proyecto en Tokenizaciones. Su precio puede subir o bajar.
      </p>
    </PCard>
  );
}

/** Same look as PScanLink, but pointing at the explorer of the token's own network. */
function ContractLink({ href, address }: { href: string; address: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Ver el contrato ${address} en el explorador de bloques`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
      fontFamily: 'var(--font-b)', fontSize: 12, color: '#8247E5', textDecoration: 'none',
      padding: '5px 12px', borderRadius: 999, background: 'rgba(130,71,229,0.10)', fontWeight: 600,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#8247E5" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>
      {address.slice(0, 6)}…{address.slice(-4)}
      {Icons.ext}
    </a>
  );
}
