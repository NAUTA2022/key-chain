import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionAccount, useSessionDisconnect } from '../lib/devSession';
import Login from './Login';
import { CartCheckout, KP_VARS } from './KeyPay';
import { addPendingPayment, getPendingPayments } from '../lib/keypayInbox';
import { RWA_ASSETS, fmtUSD } from '../data';
import { useMobile } from '../hooks/useMobile';

const DESKTOP_BP = 900;

// ─── Design tokens — neo-minimalist editorial: warm paper background, one
// deep forest-green accent, thin hairline borders instead of shadows, no
// gradients/glassmorphism. Photography and typography carry the weight. ───
const BG      = '#F6F4EE';
const CARD    = '#FFFFFF';
const INK     = '#1E1D19';
const SUB     = '#726C5F';
const BORDER  = '#E7E2D5';
const ACCENT  = '#33513A';
const ACCENT_SOFT = '#E7EEE1';
const TERRA   = '#B5651D';
const SHADOW  = '0 1px 3px rgba(30,29,25,0.06)';
const FONT_H  = 'var(--font-h)';
const FONT_B  = 'var(--font-b)';

const KRIcons = {
  leaf:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 20c9 0 14-5 14-14V4h-2C8 4 5 9 5 18v2z"/><path d="M5 20c3-6 6-9 12-12"/></svg>,
  pin:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>,
  arrowRight: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  chevronLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  wallet:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M17 12h.01M2 10h20"/></svg>,
  logout:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  check:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  seedling: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V13"/><path d="M12 13C12 8 8 6 4 6c0 4 2 8 8 8z"/><path d="M12 13c0-5 4-7 8-7 0 4-2 8-8 8z"/></svg>,
  shield:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z"/></svg>,
  chart:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 20V10M11 20V4M18 20v-7"/></svg>,
  home:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/></svg>,
  field:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 20h18M4 20V9l4-3 4 3v11M12 20V6l4-3 4 3v14"/></svg>,
  briefcase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  user:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  search:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  minus:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14"/></svg>,
  plus:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  chat:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  send:     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>,
};

// ─── Data — grounded in the same tokenized "Campos" assets the rest of the
// platform already knows about (RWA_ASSETS), not invented in isolation. ────
const FIELDS = RWA_ASSETS.filter(a => a.cat === 'Campos');
const MARKET_CATEGORIES = ['Todos', 'Agrícola', 'Viñedos'];

function fieldKind(field) {
  return field.name.toLowerCase().includes('viñedo') ? 'Viñedos' : 'Agrícola';
}

function fieldStats(field) {
  const soldTokens = Math.round(field.totalTokens * field.sold / 100);
  return { soldTokens, remainingTokens: field.totalTokens - soldTokens };
}

// Advisors are keyed by the same `company` field already on each tokenized
// asset, so "Contactar asesor" from a listing always reaches the team that
// actually issued it, instead of a generic inbox.
const ADVISORS = [
  { id: 'agrotoken', name: 'Equipo AgroToken', company: 'AgroToken', color: '#33513A',
    opening: '¡Hola! Somos el equipo de AgroToken. ¿En qué podemos ayudarte con el Campo Agrícola Pergamino?' },
  { id: 'vitivinarg', name: 'Equipo VitivinARG', company: 'VitivinARG', color: '#B5651D',
    opening: '¡Hola! Somos VitivinARG, a cargo del Viñedo Valle de Uco. Contanos en qué podemos asesorarte.' },
];
function advisorForField(field) {
  return ADVISORS.find(a => a.company === field.company) || ADVISORS[0];
}

// ─── Landing — the branded welcome screen shown before authentication.
// KeyPayLogin itself is a generic, unbranded connect screen shared by every
// standalone product; this is the missing piece in front of it — a real
// full-bleed editorial hero specific to Key Rural, so "Comenzar" is a
// deliberate choice rather than being dropped straight into a wallet
// prompt. It still doesn't touch auth at all: it only decides *when* to
// reveal the existing KeyPayLogin gate. ────────────────────────────────────
// ─── Landing — a proper multi-section marketing page (nav, hero with
// stats, trust statement, feature split, infrastructure strip, a preview
// of real listings, closing CTA, footer), not just a single hero card.
// Every number on it is derived from the same FIELDS data the app itself
// uses — nothing here is decorative filler. ─────────────────────────────
function LandingNav({ onStart, onExit, isMobile }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '20px 20px 0' : '28px 48px 0' }}>
      <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ color: '#fff', display: 'flex' }}>{KRIcons.leaf}</span>
        <span style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: '-0.01em' }}>Key Rural</span>
      </button>
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <span style={{ fontFamily: FONT_B, fontSize: 13.5, color: 'rgba(255,255,255,0.85)' }}>Nosotros</span>
          <span style={{ fontFamily: FONT_B, fontSize: 13.5, color: 'rgba(255,255,255,0.85)' }}>Campos</span>
          <span style={{ fontFamily: FONT_B, fontSize: 13.5, color: 'rgba(255,255,255,0.85)' }}>Cómo funciona</span>
        </div>
      )}
      <button onClick={onStart} style={{ padding: '10px 20px', borderRadius: 999, border: 'none', background: '#fff', color: INK, fontFamily: FONT_B, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        Comenzar
      </button>
    </div>
  );
}

function LandingScreen({ onStart, onExit }) {
  const isMobile = useMobile(DESKTOP_BP);
  const hero = FIELDS[0];
  const totalValuation = FIELDS.reduce((s, f) => s + f.valuation, 0);
  const avgApy = (FIELDS.reduce((s, f) => s + f.apy, 0) / FIELDS.length).toFixed(1);

  const stats = [
    [`${FIELDS.length}`, 'Campos activos'],
    [fmtUSD(totalValuation), 'Valor tokenizado'],
    [`${avgApy}%`, 'APY promedio'],
  ];

  const features = [
    'Trazabilidad on-chain de cada hectárea',
    'Rendimiento auditado por consultoras independientes',
    'Inversión fraccionada desde un token',
    'Liquidez vía mercado secundario de KEYCHAIN',
  ];

  const infra = ['KEYCHAIN', 'thirdweb', 'Base', 'USDC'];

  return (
    <div style={{ background: BG }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: isMobile ? 640 : 720, overflow: 'hidden' }}>
        <img src={hero.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(15,17,12,0.72) 0%, rgba(15,17,12,0.38) 55%, rgba(15,17,12,0.15) 100%)' }} />
        <LandingNav onStart={onStart} onExit={onExit} isMobile={isMobile} />

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: isMobile ? '0 20px 40px' : '0 48px 56px' }}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 32 : 48, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 18 }}>
              Financiá el campo del futuro, token a token
            </div>
            <div style={{ fontFamily: FONT_B, fontSize: isMobile ? 14 : 15.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, marginBottom: 28, maxWidth: 480 }}>
              Invertí en campos y viñedos productivos tokenizados on-chain, con rendimiento auditado por consultoras agronómicas independientes.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: isMobile ? 36 : 48, flexWrap: 'wrap' }}>
              <button onClick={onStart} style={{ padding: '15px 26px', borderRadius: 12, border: 'none', background: '#fff', color: INK, fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }}>
                Comenzar
              </button>
              <button onClick={onStart} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: '#fff', fontFamily: FONT_B, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', padding: 0 }}>
                Ver campos {KRIcons.arrowRight}
              </button>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 28 : 44 }}>
              {stats.map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 20 : 26, color: '#fff' }}>{val}</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ position: 'absolute', right: 48, bottom: 56, width: 260, background: 'rgba(20,22,16,0.55)', backdropFilter: 'blur(6px)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.15)', display: 'flex', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              <img src={hero.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 12.5, color: '#fff', marginBottom: 3 }}>Rendimiento auditado</div>
              <div style={{ fontFamily: FONT_B, fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>Cada campo, verificado por consultoras independientes.</div>
            </div>
          </div>
        )}
      </div>

      {/* Trust statement */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '48px 20px' : '72px 48px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 20 : 60 }}>
        <div style={{ flex: 1.3, fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 24 : 30, color: INK, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          Reconocidos por nuestro compromiso con la trazabilidad y la sustentabilidad agrícola
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_B, fontSize: 13.5, color: SUB, lineHeight: 1.7, marginBottom: 12 }}>
            Nuestra dedicación a ofrecer inversión rural transparente y respaldar a productores reales nos distingue dentro del ecosistema KEYCHAIN.
          </div>
          <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Excelencia reconocida en finanzas agrícolas</div>
        </div>
      </div>

      {/* Feature split */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '0 20px 56px' : '0 48px 88px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 24 : 56, alignItems: 'center' }}>
        <div style={{ flex: 1, width: '100%', borderRadius: 24, overflow: 'hidden', height: isMobile ? 240 : 380 }}>
          <img src={hero.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '30% 60%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 22 : 27, color: INK, letterSpacing: '-0.01em', marginBottom: 12 }}>
            Impulsando la inversión rural
          </div>
          <div style={{ fontFamily: FONT_B, fontSize: 13.5, color: SUB, lineHeight: 1.7, marginBottom: 22 }}>
            Nuestra misión es conectar capital con productores reales, reduciendo la fricción de invertir en tierra productiva.
          </div>
          {features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: `1px solid ${BORDER}` }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: ACCENT_SOFT, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{KRIcons.arrowRight}</span>
              <span style={{ fontFamily: FONT_B, fontSize: 13.5, color: INK }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure strip */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: isMobile ? '28px 20px' : '28px 48px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? 18 : 40 }}>
          <div style={{ fontFamily: FONT_B, fontSize: 12, color: SUB, whiteSpace: 'nowrap' }}>Construido sobre infraestructura on-chain verificada</div>
          <div style={{ display: 'flex', gap: isMobile ? 24 : 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {infra.map(name => (
              <span key={name} style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 15, color: SUB, opacity: 0.75 }}>{name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Fields preview */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '48px 20px' : '72px 48px' }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 22 : 27, color: INK, letterSpacing: '-0.01em', marginBottom: 24 }}>
          Explorá los campos disponibles
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
          {FIELDS.map(f => (
            <button key={f.id} onClick={onStart} style={{ display: 'block', textAlign: 'left', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', padding: 0 }}>
              <div style={{ height: 180, overflow: 'hidden' }}>
                <img src={f.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: SUB, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{f.company}</div>
                <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 16, color: INK, marginBottom: 8 }}>{f.name}</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontFamily: FONT_B, fontSize: 12.5, color: ACCENT, fontWeight: 700 }}>{f.apy}% APY</span>
                  <span style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB }}>{fmtUSD(f.tokenPrice)}/token</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ position: 'relative', margin: isMobile ? '0 20px 20px' : '0 48px 48px', borderRadius: 28, overflow: 'hidden', height: isMobile ? 280 : 340 }}>
        <img src={hero.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,17,12,0.68)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 22 : 30, color: '#fff', letterSpacing: '-0.01em', maxWidth: 460 }}>
            Sumate a la próxima cosecha tokenizada
          </div>
          <button onClick={onStart} style={{ padding: '15px 28px', borderRadius: 12, border: 'none', background: '#fff', color: INK, fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }}>
            Comenzar
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: isMobile ? '28px 20px' : '32px 48px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 20, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: ACCENT, display: 'flex' }}>{KRIcons.leaf}</span>
          <span style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK }}>Key Rural</span>
        </div>
        <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB }}>© 2026 KEYCHAIN. Todos los derechos reservados.</div>
      </div>
    </div>
  );
}

// ─── Field card — photography-led, thin hairline border instead of a
// shadow, a single flat progress fill instead of a gradient. ───────────────
function FieldCard({ field, onOpen }) {
  const { soldTokens } = fieldStats(field);
  return (
    <motion.button onClick={() => onOpen(field)} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden', cursor: 'pointer', marginBottom: 20 }}>
      <div style={{ position: 'relative', paddingTop: '58%', overflow: 'hidden' }}>
        <img src={field.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: SUB, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{field.company}</span>
          <span style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, padding: '3px 9px', borderRadius: 999 }}>{field.stage}</span>
        </div>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 19, color: INK, marginBottom: 4, letterSpacing: '-0.01em' }}>{field.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: SUB, fontFamily: FONT_B, fontSize: 12.5, marginBottom: 16 }}>{KRIcons.pin}{field.location}</div>
        <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 15, color: INK }}>{fmtUSD(field.tokenPrice)}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 11, color: SUB }}>por token</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 15, color: ACCENT }}>{field.apy}%</div>
            <div style={{ fontFamily: FONT_B, fontSize: 11, color: SUB }}>APY</div>
          </div>
          <div>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 15, color: INK }}>{field.sold}%</div>
            <div style={{ fontFamily: FONT_B, fontSize: 11, color: SUB }}>vendido</div>
          </div>
        </div>
        <div style={{ height: 3, borderRadius: 999, background: BORDER, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${field.sold}%`, background: ACCENT, borderRadius: 999 }} />
        </div>
        <div style={{ fontFamily: FONT_B, fontSize: 11, color: SUB, marginTop: 6 }}>{soldTokens.toLocaleString('es-AR')} / {field.totalTokens.toLocaleString('es-AR')} tokens</div>
      </div>
    </motion.button>
  );
}

// ─── Home — the editorial landing: one hero photograph, a one-line
// derived summary (real numbers from FIELDS, not decoration), a short
// "why Key Rural" trio, and a teaser into the full Campos list. ───────────
function HomeScreen({ onOpenField, onGoToFields, isMobile, displayName }) {
  const hero = FIELDS[0];
  const totalValuation = FIELDS.reduce((s, f) => s + f.valuation, 0);
  const avgApy = (FIELDS.reduce((s, f) => s + f.apy, 0) / FIELDS.length).toFixed(1);

  const whyPoints = [
    [KRIcons.shield, 'Trazabilidad on-chain', 'Cada hectárea tokenizada queda registrada y auditable en la blockchain.'],
    [KRIcons.chart, 'Rendimiento auditado', 'Los rindes provienen de consultoras agronómicas independientes, no estimaciones.'],
    [KRIcons.seedling, 'Diversificación real', 'Accedé a campos y viñedos productivos desde una fracción de su valor.'],
  ];

  return (
    <div style={{ maxWidth: isMobile ? undefined : 880, margin: isMobile ? 0 : '0 auto', padding: isMobile ? '0 20px 40px' : '0 32px 56px' }}>
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: isMobile ? 320 : 400, marginBottom: 28 }}>
        <img src={hero.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(20,22,16,0.72) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: isMobile ? '24px 22px' : '34px 40px' }}>
          <div style={{ fontFamily: FONT_B, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Campos tokenizados</div>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 26 : 34, color: '#fff', letterSpacing: '-0.01em', marginBottom: 10, maxWidth: 480 }}>Invertí en tierra productiva, un token a la vez</div>
          <button onClick={onGoToFields} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: '#fff', fontFamily: FONT_B, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', padding: 0 }}>
            Explorar campos {KRIcons.arrowRight}
          </button>
        </div>
      </div>

      <div style={{ fontFamily: FONT_B, fontSize: 13.5, color: SUB, marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ color: INK, fontWeight: 700 }}>{FIELDS.length} campos activos</span> · {fmtUSD(totalValuation)} en activos tokenizados · APY promedio <span style={{ color: ACCENT, fontWeight: 700 }}>{avgApy}%</span>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 24 : 32, marginBottom: 44 }}>
        {whyPoints.map(([icon, title, desc]) => (
          <div key={title} style={{ flex: 1 }}>
            <div style={{ color: ACCENT, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, color: INK, marginBottom: 5 }}>{title}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB, lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 19, color: INK }}>Destacado para {displayName}</div>
        <button onClick={onGoToFields} style={{ background: 'none', border: 'none', color: ACCENT, fontFamily: FONT_B, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          Ver todos {KRIcons.arrowRight}
        </button>
      </div>
      <FieldCard field={hero} onOpen={onOpenField} />
    </div>
  );
}

// ─── Campos — the full, searchable list. ──────────────────────────────────
function MarketplaceScreen({ onOpenField, isMobile }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [sort, setSort] = useState('relevancia');

  let filtered = FIELDS.filter(f =>
    (category === 'Todos' || fieldKind(f) === category) &&
    (f.name.toLowerCase().includes(query.toLowerCase()) || f.location.toLowerCase().includes(query.toLowerCase()))
  );
  if (sort === 'apy') filtered = [...filtered].sort((a, b) => b.apy - a.apy);
  if (sort === 'precio') filtered = [...filtered].sort((a, b) => a.tokenPrice - b.tokenPrice);

  return (
    <div style={{ maxWidth: isMobile ? undefined : 880, margin: isMobile ? 0 : '0 auto', padding: isMobile ? '20px 20px 40px' : '32px 32px 56px' }}>
      <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 24, color: INK, marginBottom: 18, letterSpacing: '-0.01em' }}>Marketplace</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, marginBottom: 18 }}>
        <span style={{ color: SUB, display: 'flex' }}>{KRIcons.search}</span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o ubicación"
          style={{ flex: 1, border: 'none', outline: 'none', fontFamily: FONT_B, fontSize: 13.5, color: INK, background: 'none' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {MARKET_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ padding: '8px 15px', borderRadius: 999, border: `1px solid ${category === c ? ACCENT : BORDER}`, background: category === c ? ACCENT : 'none', color: category === c ? '#fff' : SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD, color: INK, fontFamily: FONT_B, fontSize: 12.5, cursor: 'pointer' }}>
          <option value="relevancia">Relevancia</option>
          <option value="apy">Mayor APY</option>
          <option value="precio">Menor precio</option>
        </select>
      </div>

      {filtered.map(f => <FieldCard key={f.id} field={f} onOpen={onOpenField} />)}
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: SUB, fontFamily: FONT_B, fontSize: 13.5 }}>No hay campos que coincidan con la búsqueda.</div>}
    </div>
  );
}

// ─── Field detail — large photograph, editorial stat row, and the invest
// flow which hands off to KeyPay's existing pending-payment + checkout
// infrastructure instead of building a new one. ────────────────────────────
function FieldDetail({ field, onBack, onInvest, onContactAdvisor, isMobile }) {
  const [qty, setQty] = useState(10);
  const { soldTokens, remainingTokens } = fieldStats(field);
  const cost = qty * field.tokenPrice;
  const advisor = advisorForField(field);

  return (
    <div style={{ maxWidth: isMobile ? undefined : 880, margin: isMobile ? 0 : '0 auto', padding: isMobile ? '0 0 120px' : '0 32px 56px' }}>
      <div style={{ padding: isMobile ? '18px 20px 14px' : '20px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: INK, fontFamily: FONT_B, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', padding: 0 }}>
          {KRIcons.chevronLeft} Volver
        </button>
        <button onClick={() => onContactAdvisor(advisor)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ACCENT, fontFamily: FONT_B, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', padding: 0 }}>
          {KRIcons.chat} Contactar asesor
        </button>
      </div>

      <div style={{ position: 'relative', borderRadius: isMobile ? 0 : 24, overflow: 'hidden', height: isMobile ? 260 : 380, marginBottom: 26 }}>
        <img src={field.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      <div style={{ padding: isMobile ? '0 20px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: FONT_B, fontSize: 11.5, fontWeight: 700, color: SUB, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{field.company}</span>
          <span style={{ fontFamily: FONT_B, fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_SOFT, padding: '3px 9px', borderRadius: 999 }}>{field.stage}</span>
        </div>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 24 : 28, color: INK, marginBottom: 6, letterSpacing: '-0.01em' }}>{field.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: SUB, fontFamily: FONT_B, fontSize: 13, marginBottom: 24 }}>{KRIcons.pin}{field.location}</div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px 12px', padding: '18px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
          {[['Valuación', fmtUSD(field.valuation)], ['Precio/token', fmtUSD(field.tokenPrice)], ['APY', `${field.apy}%`], ['Vida útil', field.lifespan]].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 16, color: INK }}>{val}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 11, color: SUB, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 15, color: INK, marginBottom: 8 }}>Sobre este campo</div>
        <div style={{ fontFamily: FONT_B, fontSize: 13.5, color: SUB, lineHeight: 1.7, marginBottom: 24 }}>{field.desc}</div>

        <div style={{ marginBottom: isMobile ? 100 : 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: FONT_B, fontSize: 12.5, color: SUB }}>
            <span>{soldTokens.toLocaleString('es-AR')} de {field.totalTokens.toLocaleString('es-AR')} tokens vendidos</span>
            <span style={{ color: INK, fontWeight: 700 }}>{field.sold}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: BORDER, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${field.sold}%`, background: ACCENT, borderRadius: 999 }} />
          </div>
        </div>

        {!isMobile && (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, background: CARD, boxShadow: SHADOW }}>
            <InvestControls qty={qty} setQty={setQty} field={field} cost={cost} remainingTokens={remainingTokens} onInvest={() => onInvest(field, qty, cost)} />
          </div>
        )}
      </div>

      {isMobile && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: CARD, borderTop: `1px solid ${BORDER}`, padding: '16px 20px max(16px, env(safe-area-inset-bottom))', zIndex: 900 }}>
          <InvestControls qty={qty} setQty={setQty} field={field} cost={cost} remainingTokens={remainingTokens} onInvest={() => onInvest(field, qty, cost)} compact />
        </div>
      )}
    </div>
  );
}

function InvestControls({ qty, setQty, field, cost, remainingTokens, onInvest, compact }) {
  const clamp = (n) => Math.max(1, Math.min(remainingTokens, n));
  return (
    <div>
      {!compact && <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, color: INK, marginBottom: 14 }}>Invertir en {field.name}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setQty(q => clamp(q - 5))} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${BORDER}`, background: 'none', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{KRIcons.minus}</button>
          <div style={{ textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 17, color: INK }}>{qty}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 10.5, color: SUB }}>tokens</div>
          </div>
          <button onClick={() => setQty(q => clamp(q + 5))} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${BORDER}`, background: 'none', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{KRIcons.plus}</button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 19, color: INK }}>{fmtUSD(cost)}</div>
          <div style={{ fontFamily: FONT_B, fontSize: 10.5, color: SUB }}>USDC</div>
        </div>
      </div>
      <button onClick={onInvest} style={{ width: '100%', marginTop: 16, padding: '15px', borderRadius: 14, border: 'none', background: ACCENT, color: '#fff', fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }}>
        Invertir {fmtUSD(cost)}
      </button>
    </div>
  );
}

// ─── Portfolio — the investor's own holdings within Key Rural. ────────────
function PortfolioScreen({ holdings, isMobile }) {
  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  return (
    <div style={{ maxWidth: isMobile ? undefined : 880, margin: isMobile ? 0 : '0 auto', padding: isMobile ? '20px 20px 40px' : '32px 32px 56px' }}>
      <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 24, color: INK, marginBottom: 6, letterSpacing: '-0.01em' }}>Tu portafolio</div>
      <div style={{ fontFamily: FONT_B, fontSize: 13.5, color: SUB, marginBottom: 26 }}>{holdings.length === 0 ? 'Todavía no invertiste en ningún campo.' : `${fmtUSD(totalInvested)} invertidos en ${holdings.length} campo${holdings.length === 1 ? '' : 's'}.`}</div>
      {holdings.map(h => (
        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
            <img src={h.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, color: INK }}>{h.fieldName}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12, color: SUB }}>{h.tokens} tokens · desde {h.since}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, color: INK }}>{fmtUSD(h.invested)}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 11, color: ACCENT }}>invertido</div>
          </div>
        </div>
      ))}
      {holdings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: SUB, fontFamily: FONT_B, fontSize: 13.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ color: BORDER }}>{KRIcons.briefcase}</span>
          Explorá los campos disponibles para empezar a invertir.
        </div>
      )}
    </div>
  );
}

// ─── Chat — conversations with each asset's issuing team. Threads live in
// the parent (KeyRural) so switching tabs never resets a conversation. ────
function ChatThreadView({ advisor, messages, onSend, onBack, isMobile }) {
  const [text, setText] = useState('');
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? '100vh' : '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
        {isMobile && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: INK, cursor: 'pointer', display: 'flex', padding: 0 }}>{KRIcons.chevronLeft}</button>
        )}
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: advisor.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_H, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {advisor.name.split(' ').slice(-1)[0][0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK }}>{advisor.name}</div>
          <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB }}>{advisor.company}</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '75%', padding: '10px 14px', borderRadius: 14, background: m.from === 'me' ? ACCENT : ACCENT_SOFT, color: m.from === 'me' ? '#fff' : INK, fontFamily: FONT_B, fontSize: 13.5, lineHeight: 1.5 }}>
            {m.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: `1px solid ${BORDER}` }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Escribí un mensaje…"
          style={{ flex: 1, padding: '11px 15px', borderRadius: 999, border: `1px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5, color: INK }} />
        <button onClick={submit} style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          {KRIcons.send}
        </button>
      </div>
    </div>
  );
}

function ChatScreen({ threads, onSend, activeId, setActiveId, isMobile }) {
  const activeAdvisor = ADVISORS.find(a => a.id === activeId);

  const list = (
    <div style={{ width: isMobile ? undefined : 300, flexShrink: 0, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, overflowY: 'auto' }}>
      <div style={{ padding: isMobile ? '20px 20px 14px' : '24px 20px 14px', fontFamily: FONT_H, fontWeight: 700, fontSize: isMobile ? 24 : 18, color: INK, letterSpacing: '-0.01em' }}>Mensajes</div>
      {ADVISORS.map(a => {
        const msgs = threads[a.id] || [];
        const last = msgs[msgs.length - 1];
        return (
          <button key={a.id} onClick={() => setActiveId(a.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: activeId === a.id ? ACCENT_SOFT : 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: a.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_H, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {a.name.split(' ').slice(-1)[0][0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 13.5, color: INK }}>{a.name}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 12, color: SUB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last?.text}</div>
            </div>
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    if (activeAdvisor) {
      return <ChatThreadView advisor={activeAdvisor} messages={threads[activeAdvisor.id] || []} onSend={t => onSend(activeAdvisor.id, t)} onBack={() => setActiveId(null)} isMobile />;
    }
    return list;
  }

  return (
    <div style={{ padding: '24px 32px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', height: '100%', maxWidth: 880, margin: '0 auto', border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden', background: CARD }}>
        {list}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeAdvisor ? (
            <ChatThreadView advisor={activeAdvisor} messages={threads[activeAdvisor.id] || []} onSend={t => onSend(activeAdvisor.id, t)} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: SUB }}>
              <span style={{ color: BORDER }}>{KRIcons.chat}</span>
              <div style={{ fontFamily: FONT_B, fontSize: 13.5 }}>Elegí una conversación para ver los mensajes.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile — reuses the shared wallet session; only an explicit
// "cambiar de cuenta" disconnects, which re-triggers the KeyPayLogin gate
// below (never a separate login flow). ─────────────────────────────────────
function ProfileScreen({ account, onSwitchAccount, holdings, isMobile }) {
  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const avgApy = holdings.length ? (holdings.reduce((s, h) => s + (FIELDS.find(f => f.id === h.fieldId)?.apy || 0), 0) / holdings.length).toFixed(1) : null;

  return (
    <div style={{ maxWidth: isMobile ? undefined : 640, margin: isMobile ? 0 : '0 auto', padding: isMobile ? '20px 20px 40px' : '32px 32px 56px' }}>
      <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 24, color: INK, marginBottom: 24, letterSpacing: '-0.01em' }}>Perfil</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px', borderRadius: 16, border: `1px solid ${BORDER}`, background: CARD, marginBottom: 20 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: ACCENT_SOFT, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{KRIcons.wallet}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK }}>Wallet conectada</div>
          <div style={{ fontFamily: FONT_B, fontSize: 12, color: SUB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account?.address}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['Invertido', fmtUSD(totalInvested)],
          ['Campos', String(holdings.length)],
          ['APY prom.', avgApy ? `${avgApy}%` : '—'],
        ].map(([label, val]) => (
          <div key={label} style={{ padding: '16px 14px', borderRadius: 14, border: `1px solid ${BORDER}`, background: CARD, textAlign: 'center' }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 16, color: INK }}>{val}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 10.5, color: SUB, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: FONT_B, fontSize: 12, color: SUB, marginBottom: 20, lineHeight: 1.6 }}>
        Esta sesión se comparte con el resto del ecosistema KEYCHAIN (Bookey, Key Go, Key Jobs). Cambiar de cuenta acá cierra la sesión en toda la plataforma.
      </div>
      <button onClick={onSwitchAccount} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 12, border: `1px solid ${BORDER}`, background: 'none', color: TERRA, fontFamily: FONT_B, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
        {KRIcons.logout} Cambiar de cuenta
      </button>
    </div>
  );
}

// ─── Navigation ────────────────────────────────────────────────────────────
const TABS = [
  ['home', 'Inicio', KRIcons.home],
  ['fields', 'Marketplace', KRIcons.field],
  ['chat', 'Mensajes', KRIcons.chat],
  ['portfolio', 'Portafolio', KRIcons.briefcase],
  ['profile', 'Perfil', KRIcons.user],
];

function DesktopNav({ tab, setTab }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {TABS.map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)}
          style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: tab === id ? ACCENT : 'transparent', color: tab === id ? '#fff' : SUB, fontFamily: FONT_B, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function TabBar({ tab, setTab }) {
  return (
    <div style={{ display: 'flex', borderTop: `1px solid ${BORDER}`, background: CARD, padding: '8px 0 max(8px, env(safe-area-inset-bottom))' }}>
      {TABS.map(([id, label, icon]) => (
        <button key={id} onClick={() => setTab(id)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', color: tab === id ? ACCENT : SUB }}>
          {icon}
          <span style={{ fontFamily: FONT_B, fontSize: 10.5, fontWeight: tab === id ? 700 : 500 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// Key Rural is a standalone product (its own route, outside KEYCHAIN's
// login-gated Shell — see App.jsx PLATFORM_PATHS), same pattern as Bookey,
// Key Go and Key Jobs: it owns its own tab navigation instead of relying on
// an external nav/routeData pair, but reuses the platform's shared wallet
// session (useActiveAccount reflects a wallet connected anywhere else in
// the app, since everything sits under one root <ThirdwebProvider>) and its
// existing KeyPay checkout/pending-payment infrastructure rather than
// building new auth or payment plumbing.
export default function KeyRural() {
  const account = useSessionAccount();
  const disconnect = useSessionDisconnect();
  const routerNavigate = useNavigate();
  const isMobile = useMobile(DESKTOP_BP);
  const [showLogin, setShowLogin] = useState(false);
  const [tab, setTab] = useState('home');
  const [selectedField, setSelectedField] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [pendingInvestment, setPendingInvestment] = useState(null);
  const [chatThreads, setChatThreads] = useState(() => Object.fromEntries(ADVISORS.map(a => [a.id, [{ from: 'advisor', text: a.opening }]])));
  const [activeChatId, setActiveChatId] = useState(null);

  if (!account) {
    if (!showLogin) return <LandingScreen onStart={() => setShowLogin(true)} onExit={() => routerNavigate('/')} />;
    return <Login onSuccess={() => {}} onBack={() => setShowLogin(false)} />;
  }

  const displayName = account?.address ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : 'inversor';

  const openField = (field) => { setSelectedField(field); setTab('detail'); };
  const backFromDetail = () => setTab(selectedField ? 'fields' : 'home');
  const contactAdvisor = (advisor) => { setActiveChatId(advisor.id); setTab('chat'); };

  const sendChat = (advisorId, text) => {
    setChatThreads(t => ({ ...t, [advisorId]: [...t[advisorId], { from: 'me', text }] }));
    setTimeout(() => {
      setChatThreads(t => ({ ...t, [advisorId]: [...t[advisorId], { from: 'advisor', text: 'Gracias por tu mensaje, un asesor te responderá a la brevedad.' }] }));
    }, 1200);
  };

  const handleInvest = (field, qty, cost) => {
    const id = addPendingPayment({ name: `Inversión — ${field.name} (${qty} tokens)`, qty: 1, unit: cost, source: 'Key Rural' });
    setPaymentId(id);
    setPendingInvestment({ field, qty, cost });
    setCheckoutOpen(true);
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    if (paymentId && !getPendingPayments().some(x => x.id === paymentId) && pendingInvestment) {
      const { field, qty, cost } = pendingInvestment;
      setHoldings(hs => [{ id: Date.now(), fieldId: field.id, fieldName: field.name, img: field.img, tokens: qty, invested: cost, since: new Date().toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }) }, ...hs]);
    }
    setPaymentId(null);
    setPendingInvestment(null);
  };

  const hideChrome = tab === 'detail' || (tab === 'chat' && isMobile && activeChatId);

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {!hideChrome && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: isMobile ? '18px 20px 14px' : '20px 32px', maxWidth: isMobile ? undefined : 944, margin: isMobile ? 0 : '0 auto', width: isMobile ? undefined : '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: ACCENT, display: 'flex' }}>{KRIcons.leaf}</span>
            <span style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 18, color: INK, letterSpacing: '-0.02em' }}>Key Rural</span>
            <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: ACCENT_SOFT, color: ACCENT, fontWeight: 700, fontFamily: FONT_B }}>by KEYCHAIN</span>
          </div>
          {!isMobile && <DesktopNav tab={tab === 'detail' ? 'fields' : tab} setTab={setTab} />}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === 'home' && <HomeScreen onOpenField={openField} onGoToFields={() => setTab('fields')} isMobile={isMobile} displayName={displayName} />}
        {tab === 'fields' && <MarketplaceScreen onOpenField={openField} isMobile={isMobile} />}
        {tab === 'detail' && selectedField && <FieldDetail field={selectedField} onBack={backFromDetail} onInvest={handleInvest} onContactAdvisor={contactAdvisor} isMobile={isMobile} />}
        {tab === 'chat' && <ChatScreen threads={chatThreads} onSend={sendChat} activeId={activeChatId} setActiveId={setActiveChatId} isMobile={isMobile} />}
        {tab === 'portfolio' && <PortfolioScreen holdings={holdings} isMobile={isMobile} />}
        {tab === 'profile' && <ProfileScreen account={account} onSwitchAccount={() => disconnect()} holdings={holdings} isMobile={isMobile} />}
      </div>

      {isMobile && !hideChrome && <TabBar tab={tab} setTab={setTab} />}

      {createPortal(
        <AnimatePresence>
          {checkoutOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 2000, ...KP_VARS }}>
              <CartCheckout onClose={handleCheckoutClose} focusId={paymentId} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
