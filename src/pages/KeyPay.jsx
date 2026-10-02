import { TRANSACTIONS } from '../lib/walletActivity';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { LuHouse, LuActivity, LuSettings, LuLayoutGrid } from 'react-icons/lu';
import { useFetchWithPayment, useActiveAccount, CheckoutWidget, SwapWidget } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { RWA_ASSETS, MY_HOLDINGS, MY_BALANCES, FACT_TOKEN } from '../data';
import { getPendingPayments, removePendingPayment, subscribePendingPayments } from '../lib/keypayInbox';
import { client } from '../lib/client';

// Looks up the real project thumbnail (shared with PrimaryMarket/Holdings)
// by project name, so tokenized-asset rows show the actual project photo
// instead of a generic icon.
function projectThumb(name) {
  return RWA_ASSETS.find(a => a.name === name)?.img;
}

// Subscribes to the shared pending-payments inbox (src/lib/keypayInbox.js)
// so KeyPay's Checkout always reflects what other parts of the platform
// (investing in KYCN, reserving a tokenization) have handed off to it.
function usePendingPayments() {
  const [items, setItems] = useState(getPendingPayments());
  useEffect(() => subscribePendingPayments(setItems), []);
  return items;
}

// Real, scannable QR (api.qrserver.com — no key required) instead of a
// decorative checkerboard placeholder.
function qrUrl(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&bgcolor=ffffff&color=000000&qzone=1&data=${encodeURIComponent(data)}`;
}

// Interpolates dark-text -> green as the swipe-to-confirm handle is dragged.
function mixToGreen(t) {
  const from = [17, 17, 17], to = [110, 231, 114];
  const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

// Transaction labels embed the project name after an em dash, e.g.
// "Distribución de renta — Campo Agrícola Pergamino" — reuse that to look
// up a thumbnail for transaction rows too.
function txThumb(label) {
  const name = label.split(' — ')[1];
  return name ? projectThumb(name) : undefined;
}

// Full RWA_ASSETS entry by name — used to deep-link rows (holdings,
// distributions, transactions) into KEYCHAIN's ProductDetail page via
// nav('detalle', asset), since that route expects the whole asset object.
function projectByName(name) {
  return RWA_ASSETS.find(a => a.name === name);
}

function txProject(label) {
  const name = label.split(' — ')[1];
  return name ? projectByName(name) : undefined;
}

// x402 (thirdweb): "Enviar" is implemented as a real x402-paid HTTP call —
// the transfer endpoint responds 402 Payment Required until the connected
// wallet signs a payment header, which thirdweb attaches and retries
// automatically. See src/stubs/thirdweb-react.jsx for how this hook behaves
// in this preview sandbox vs. a real wallet-connected deployment.
// Reuses the same client as login (src/lib/client.js) instead of a second
// thirdweb project, so the whole app — connect wallet, Checkout, Swap —
// runs through a single thirdweb client/API key.
// Settled by server/x402-server.mjs (npm run dev:x402) — see that file for
// the settlePayment/facilitator side of this same flow.
const X402_TRANSFER_ENDPOINT = import.meta.env.VITE_X402_ENDPOINT || 'http://localhost:8787/x402/keypay/transfer';

// Thirdweb's own dark-theme tokens (darkThemeObj in
// thirdweb/src/react/core/design-system/index.ts) — reused as-is so the
// x402 SignInRequiredModal / PaymentErrorModal below render pixel-for-pixel
// like thirdweb's native x402 UI, not a KeyPay-themed reinterpretation.
const TW_THEME = {
  modalOverlayBg:  'rgba(0, 0, 0, 0.7)',
  modalBg:         'hsl(0 0% 3.92%)',
  borderColor:     'hsl(0 0% 15%)',
  primaryText:     'hsl(0 0% 98%)',
  secondaryText:   'hsl(0 0% 63%)',
  danger:          'hsl(360 72% 55%)',
  accentButtonBg:  'hsl(221 83% 54%)',
  accentButtonText:'hsl(0 0% 100%)',
  secondaryButtonBg: 'hsl(0 0% 9%)',
  secondaryButtonText: 'hsl(0 0% 98%)',
};

// Mirrors thirdweb's <Modal> + <ModalHeader> + <ScreenBottomContainer> shell
// (see node_modules/thirdweb/src/react/web/ui/components/{Modal,basic,buttons}.*)
function TwModal({ title, children, footer, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{ position:'absolute', inset:0, zIndex:320, display:'flex', alignItems:'center', justifyContent:'center', background: TW_THEME.modalOverlayBg }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.95, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:8 }}
        transition={{ type:'spring', stiffness:340, damping:32 }}
        onClick={e => e.stopPropagation()}
        style={{ width:360, background: TW_THEME.modalBg, border:`1px solid ${TW_THEME.borderColor}`, borderRadius:20, overflow:'hidden' }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 0' }}>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:16, color: TW_THEME.primaryText }}>{title}</div>
        </div>
        <div style={{ padding:'16px 20px 20px' }}>
          <div style={{ fontFamily:'var(--kp-font-b)', fontSize:13.5, lineHeight:1.5, color: TW_THEME.secondaryText }}>{children}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'0 20px 20px' }}>
          {footer}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TwButton({ children, variant = 'accent', onClick }) {
  const bg = variant === 'accent' ? TW_THEME.accentButtonBg : TW_THEME.secondaryButtonBg;
  const fg = variant === 'accent' ? TW_THEME.accentButtonText : TW_THEME.secondaryButtonText;
  return (
    <button onClick={onClick} style={{
      width:'100%', padding:'12px', borderRadius:12, border:'none', cursor:'pointer',
      background:bg, color:fg, fontFamily:'var(--kp-font-b)', fontWeight:600, fontSize:14,
    }}>{children}</button>
  );
}

// Faithful port of thirdweb/src/react/web/ui/x402/SignInRequiredModal.tsx
function X402SignInRequiredModal({ onSignIn, onCancel }) {
  return (
    <TwModal
      title="Sign in required"
      onCancel={onCancel}
      footer={<>
        <TwButton variant="accent" onClick={onSignIn}>Sign in</TwButton>
        <TwButton variant="secondary" onClick={onCancel}>Cancel</TwButton>
      </>}
    >
      Account required to complete payment, please sign in to continue.
    </TwModal>
  );
}

// Faithful port of thirdweb/src/react/web/ui/x402/PaymentErrorModal.tsx (error screen)
function X402PaymentErrorModal({ message, onRetry, onCancel }) {
  return (
    <TwModal
      title="Payment failed"
      onCancel={onCancel}
      footer={<>
        <TwButton variant="accent" onClick={onRetry}>Try Again</TwButton>
        <TwButton variant="secondary" onClick={onCancel}>Cancel</TwButton>
      </>}
    >
      {message || 'An error occurred while processing your payment.'}
    </TwModal>
  );
}

/**
 * KeyPay — standalone financial-hub component.
 *
 * Deliberately self-contained: it does NOT use the host platform's design
 * tokens (var(--text), var(--font-h), <PCard>/<PBtn> from ../components/ui,
 * etc). Every color/font/spacing token it needs is scoped locally via the
 * `--kp-*` CSS variables set on its own root element, and every UI
 * primitive it uses (KCard, KBtn, ...) is defined in this file.
 *
 * This lets <KeyPay /> be dropped into any container — a route in this app,
 * a modal, an iframe, another product entirely — and always render the same
 * way regardless of the host's theme. It also fills 100% of its parent's
 * width/height instead of assuming a page layout, so the caller controls
 * sizing (full viewport, a panel, an embed) just by sizing the wrapper.
 */

export const KP_VARS = {
  '--kp-bg':        '#0a0a0d',
  '--kp-sheet':     '#111116',
  '--kp-surface':   '#1a1a20',
  '--kp-surface2':  '#222229',
  '--kp-border':    'rgba(255,255,255,0.09)',
  '--kp-border-l':  'rgba(255,255,255,0.06)',
  '--kp-text':      '#f4f4f6',
  '--kp-sec':       '#a8a8b3',
  '--kp-ter':       '#6f6f7a',
  '--kp-accent':    '#6C63FF',
  '--kp-accent-fg': '#ffffff',
  '--kp-green':     '#6ee772',
  '--kp-gold':      '#f5b942',
  '--kp-shadow':    '0 12px 32px rgba(0,0,0,0.45)',
  '--kp-font-h':    '"Space Grotesk", "DM Sans", system-ui, sans-serif',
  '--kp-font-b':    '"Inter", system-ui, sans-serif',
};

const ACCENT = 'var(--kp-accent)';
const GREEN  = 'var(--kp-green)';
const GOLD   = 'var(--kp-gold)';

// ─── ICONS (self-contained, no shared platform icon set) ────────────────────
const KIcons = {
  receive:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  send:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  lock:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.7"/></svg>,
  check:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  back:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  navHome:  <LuHouse size={22} strokeWidth={2} />,
  navPulse: <LuActivity size={22} strokeWidth={2} />,
  navGrid:  <LuLayoutGrid size={22} strokeWidth={2} />,
  navGear:  <LuSettings size={22} strokeWidth={2} />,
  bell:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  chevD:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  swapBig:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 8h13l-3.5-3.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 16H7l3.5 3.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  fiatBig:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="3" fill="currentColor" fillOpacity="0.14"/><path d="M3 10h18" stroke="currentColor" strokeWidth="1.7"/><circle cx="8" cy="14.5" r="1.6" fill="currentColor"/><path d="M13 14.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  cart:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 4h2l2.4 12.4a2 2 0 002 1.6h7.2a2 2 0 002-1.6L20 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9.5" cy="20.5" r="1.4" fill="currentColor"/><circle cx="17" cy="20.5" r="1.4" fill="currentColor"/></svg>,
  swap:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 4v13M7 17l-3-3M7 17l3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 20V7M17 7l-3 3M17 7l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  card:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.7"/></svg>,
  plus:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  minus:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  multiply: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  divide:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="1.6" fill="currentColor"/><path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="18" r="1.6" fill="currentColor"/></svg>,
  snow:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  dots:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="8" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 12h.01M11 12h.01M15 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  gear:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.3"/></svg>,
  hex:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  bolt:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  target:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>,
  shield:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  list:     <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="3.5" cy="6" r="1.4" fill="currentColor"/><circle cx="3.5" cy="12" r="1.4" fill="currentColor"/><circle cx="3.5" cy="18" r="1.4" fill="currentColor"/></svg>,
  user:     <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  idCard:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.6"/><circle cx="8" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.5"/><path d="M13 10h6M13 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  idCal:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M3 9.5h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  idPin:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.5"/></svg>,
  idGlobe:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="currentColor" strokeWidth="1.4"/></svg>,
  idFinger: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3a7 7 0 00-7 7v2c0 3 1 5.5 2.5 7.5M12 3a7 7 0 017 7v2c0 1.5-.2 2.8-.6 4M8 20a13 13 0 01-1.5-6v-4a5.5 5.5 0 0111 0M16.5 18.5c.6-1.6 1-3.3 1-6.5v-2M9.5 21c-.6-1-1-2-1.3-3.2M12 8a3.5 3.5 0 013.5 3.5c0 2-.3 3.7-.9 5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  eye:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/></svg>,
  eyeOff:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  wallet2:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h13a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="16.5" cy="13.5" r="1.4" fill="currentColor"/></svg>,
  scan:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M12 8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  camera:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 8h3l2-2h6l2 2h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  help:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M9.5 9a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>,
};

// Circular colored icon badge — softer, more "designed" look than a bare
// icon (matching a polished icon-library style) instead of a flat glyph
// floating on its own.
function IconBadge({ children, color = ACCENT, size = 34 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:`${color}1f`, border:`1px solid ${color}33`, color,
    }}>{children}</div>
  );
}

// Deterministic placeholder portraits for the P2P contacts grid — same
// service (i.pravatar.cc) for every avatar so they read as a cohesive set.
const CONTACTS = [
  { id:'sarah',  name:'Sarah',  handle:'@sarahsdesi...',  img:'https://i.pravatar.cc/160?img=47' },
  { id:'pavlo',  name:'Pavlo',  handle:'@designwitha...', img:'https://i.pravatar.cc/160?img=13' },
  { id:'jordan', name:'Jordan', handle:'@jordan.creat...',img:'https://i.pravatar.cc/160?img=53' },
  { id:'chris',  name:'Chris',  handle:'@chrisgraph...',  img:'https://i.pravatar.cc/160?img=14' },
  { id:'emily',  name:'Emily',  handle:'@emilyartis...',  img:'https://i.pravatar.cc/160?img=32' },
  { id:'taylor', name:'Taylor', handle:'@taylorcrea...',  img:'https://i.pravatar.cc/160?img=48' },
];

const NETWORKS = [
  { id:'base',    label:'Base',     symbol:'USDC' },
  { id:'polygon', label:'Polygon',  symbol:'USDC' },
  { id:'ethereum',label:'Ethereum', symbol:'USDC' },
];

// ─── SELF-CONTAINED UI PRIMITIVES ───────────────────────────────────────────
function hexRow(seed, len) {
  let out = '';
  for (let i = 0; i < len; i++) {
    const v = Math.floor(Math.abs(Math.sin(seed * 999 + i * 37.13)) * 255);
    out += v.toString(16).padStart(2, '0').toUpperCase() + ' ';
  }
  return out;
}

function HexPattern() {
  const rows = Array.from({ length: 14 }, (_, i) => hexRow(i + 1, 11));
  return (
    <div style={{
      position:'absolute', inset:0, overflow:'hidden', borderRadius:'inherit', pointerEvents:'none',
      WebkitMaskImage:'linear-gradient(120deg, rgba(0,0,0,0.9), rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.7))',
      maskImage:'linear-gradient(120deg, rgba(0,0,0,0.9), rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.7))',
    }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          whiteSpace:'nowrap', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize:10.5, letterSpacing:1.5, color:'rgba(255,255,255,0.09)', lineHeight:'19px',
        }}>{r}</div>
      ))}
    </div>
  );
}

function HexCard({ children, style = {}, pattern = true }) {
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 220, damping: 24 });
  const sy = useSpring(my, { stiffness: 220, damping: 24 });
  const rotateX = useTransform(sy, [0, 1], [8, -8]);
  const rotateY = useTransform(sx, [0, 1], [-8, 8]);
  const glowX = useTransform(sx, [0, 1], ['0%', '100%']);
  const glowY = useTransform(sy, [0, 1], ['0%', '100%']);

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <div style={{ perspective: 900, width:'100%' }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          position:'relative', borderRadius:24, overflow:'hidden',
          background:'linear-gradient(155deg, #17181c 0%, #08090b 55%, #000 100%)',
          rotateX, rotateY, transformStyle:'preserve-3d',
          display:'flex', flexDirection:'column', width:'100%', minHeight:0,
          ...style,
        }}
      >
        {pattern && <HexPattern />}
        <motion.div style={{
          position:'absolute', inset:-1, borderRadius:24, padding:1, pointerEvents:'none',
          background: useTransform([glowX, glowY], ([gx, gy]) =>
            `radial-gradient(280px circle at ${gx} ${gy}, rgba(140,170,255,0.55), rgba(124,92,255,0.18) 40%, transparent 70%)`
          ),
          WebkitMask:'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite:'xor', maskComposite:'exclude',
        }} />
        <motion.div style={{
          position:'absolute', inset:0, borderRadius:24, pointerEvents:'none',
          background: useTransform([glowX, glowY], ([gx, gy]) =>
            `radial-gradient(420px circle at ${gx} ${gy}, rgba(140,170,255,0.10), transparent 60%)`
          ),
        }} />
        <div style={{ position:'absolute', inset:0, borderRadius:24, border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none' }} />
        <div style={{ position:'relative', transform:'translateZ(30px)', display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function KCard({ children, style = {}, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      style={{
        background: 'var(--kp-surface)',
        borderRadius: 20,
        boxShadow: 'var(--kp-shadow)',
        border: '1px solid var(--kp-border-l)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function KBtn({ children, variant = 'primary', onClick, style = {}, small, disabled }) {
  const variants = {
    primary:   { background: 'var(--kp-text)',    color: 'var(--kp-bg)' },
    accent:    { background: ACCENT,               color: 'var(--kp-accent-fg)' },
    secondary: { background: 'transparent',        color: 'var(--kp-text)', border: '1.5px solid var(--kp-border)' },
    ghost:     { background: 'var(--kp-surface2)', color: 'var(--kp-text)' },
  };
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ opacity: 0.88 }}
      whileTap={{ scale: 0.97 }}
      style={{
        padding: small ? '9px 16px' : '13px 22px',
        borderRadius: small ? 11 : 13,
        fontFamily: 'var(--kp-font-b)',
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.15s',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

function KTag({ label, color = 'neutral', style = {} }) {
  const map = {
    neutral: ['var(--kp-surface2)', 'var(--kp-sec)'],
    green:   [`${GREEN}1f`, GREEN],
    blue:    ['rgba(39,117,202,0.14)', '#2775CA'],
    gold:    [`${GOLD}20`, GOLD],
  };
  const [bg, tc] = map[color] || map.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: bg, color: tc,
      fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--kp-font-b)', whiteSpace: 'nowrap', ...style,
    }}>{label}</span>
  );
}

function KStat({ label, value, sub, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, ...style }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--kp-font-b)', color: 'var(--kp-ter)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontFamily: 'var(--kp-font-h)', fontWeight: 700, color: 'var(--kp-text)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontFamily: 'var(--kp-font-b)', color: 'var(--kp-sec)' }}>{sub}</div>}
    </div>
  );
}

function KProgress({ value, style = {}, color }) {
  return (
    <div style={{ width: '100%', height: 5, borderRadius: 999, background: 'var(--kp-surface2)', overflow: 'hidden', ...style }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', background: color || ACCENT, borderRadius: 999 }}
      />
    </div>
  );
}

// Glowing glass chart card — same visual language as KEYCHAIN's dot-grid
// background (radial-gradient dots, 24px pitch, see src/index.css
// .dot-pattern) reused locally since KeyPay doesn't depend on the host's
// stylesheet, plus a glowing peak marker with a value tooltip.
// Interactive: drag/hover along the line to scrub the tooltip + marker to the
// nearest point (defaults to the peak when idle), and the line draws itself
// in on mount instead of appearing static.
function GlowChart({ label, value, delta, data, labels, color = 'var(--kp-text)' }) {
  const W = 320, H = 130;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - ((v - min) / range) * (H - 28) - 14]);
  const linePts = pts.map(p => p.join(',')).join(' ');
  const peakIdx = data.indexOf(max);
  const svgRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(peakIdx);
  const [scrubbing, setScrubbing] = useState(false);
  const active = pts[activeIdx];

  const scrubAt = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round((x / W) * (data.length - 1));
    setActiveIdx(Math.min(data.length - 1, Math.max(0, idx)));
  };

  return (
    <div style={{
      position:'relative', borderRadius:26, padding:'22px 22px 18px', overflow:'hidden',
      background:'var(--kp-surface)',
      border:'1px solid var(--kp-border-l)',
      boxShadow:'var(--kp-shadow)',
    }}>
      <div style={{ position:'relative' }}>
        <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, letterSpacing:'0.12em', color:'var(--kp-ter)', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
        <motion.div key={fmt(data[activeIdx])} initial={{ opacity:0.4, y:-2 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.15 }} style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:32, color:'var(--kp-text)', letterSpacing:'-0.02em', marginBottom:4 }}>
          {scrubbing ? fmt(data[activeIdx]) : fmt(value)}
        </motion.div>
        <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:GREEN }}>{scrubbing ? labels[activeIdx] : delta}</div>
      </div>

      <div style={{ position:'relative', marginTop:16 }}>
        <svg
          ref={svgRef}
          width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow:'visible', touchAction:'none', cursor:'crosshair' }}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setScrubbing(true); scrubAt(e.clientX); }}
          onPointerMove={e => { if (scrubbing) scrubAt(e.clientX); }}
          onPointerUp={() => setScrubbing(false)}
          onPointerLeave={() => setScrubbing(false)}
        >
          {labels.map((_, i) => (
            <line key={i} x1={(i / (labels.length - 1)) * W} x2={(i / (labels.length - 1)) * W} y1={16} y2={H - 18} stroke="var(--kp-border-l)" strokeWidth="1" />
          ))}
          <motion.polyline
            points={linePts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:1, ease:'easeOut' }}
          />
          {scrubbing && <line x1={active[0]} x2={active[0]} y1={16} y2={H - 18} stroke="var(--kp-border-l)" strokeWidth="1" strokeDasharray="3 3" />}
          <motion.circle animate={{ cx:active[0], cy:active[1] }} transition={{ type:'spring', stiffness:400, damping:30 }} r="4.5" fill={color} stroke="var(--kp-surface)" strokeWidth="2" />
        </svg>
        <motion.div
          animate={{ left:`${(activeIdx / (data.length - 1)) * 100}%`, top: Math.max(0, active[1] - 30) }}
          transition={{ type:'spring', stiffness:400, damping:30 }}
          style={{
            position:'absolute', transform:'translateX(-50%)', background:'var(--kp-surface2)', border:'1px solid var(--kp-border-l)',
            borderRadius:10, padding:'4px 10px', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:11.5, color:'var(--kp-text)',
            whiteSpace:'nowrap', boxShadow:'var(--kp-shadow)', pointerEvents:'none',
          }}
        >{fmt(data[activeIdx])}</motion.div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
          {labels.map((l, i) => <span key={i} style={{ fontFamily:'var(--kp-font-b)', fontSize:10, color: i === activeIdx ? 'var(--kp-text)' : 'var(--kp-ter)', transition:'color 0.15s' }}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}

function KDonut({ segments, size = 120, label, sub, thickness = 13 }) {
  const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  let off = 0;
  const paths = segments.map((s, i) => {
    const dash = (s.value / 100) * circ;
    const el = (
      <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    );
    off += dash; return el;
  });
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">{paths}</svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {label && <div style={{ fontFamily: 'var(--kp-font-h)', fontWeight: 800, fontSize: size * 0.15, color: 'var(--kp-text)', letterSpacing: '-0.02em' }}>{label}</div>}
        {sub && <div style={{ fontFamily: 'var(--kp-font-b)', fontSize: size * 0.075, color: 'var(--kp-ter)' }}>{sub}</div>}
      </div>
    </div>
  );
}

function KSection({ title, sub, action, style = {} }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, ...style }}>
      <div>
        <div style={{ fontFamily: 'var(--kp-font-h)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', color: 'var(--kp-text)' }}>{title}</div>
        {sub && <div style={{ fontFamily: 'var(--kp-font-b)', fontSize: 13.5, color: 'var(--kp-sec)', marginTop: 4 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

// A single row in any list (transactions, distributions, escrow, cart...).
// Fixes the "tiny photo + squished long text" problem by giving the
// thumbnail a fixed larger size and letting the title wrap onto two lines
// (line-clamp) instead of being crushed onto one truncated line.
function KListRow({ thumb, thumbNode, title, subtitle, trailing, trailingSub, onClick, last }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px',
        borderBottom: last ? 'none' : '1px solid var(--kp-border-l)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {thumb ? (
        <img src={thumb} alt="" style={{ width: 48, height: 48, borderRadius: 13, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--kp-surface2)' }}>{thumbNode}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--kp-font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--kp-text)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35,
        }}>{title}</div>
        {subtitle && <div style={{ fontFamily: 'var(--kp-font-b)', fontSize: 11.5, color: 'var(--kp-ter)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      {trailing !== undefined && (
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--kp-font-h)', fontWeight: 700, fontSize: 14, color: 'var(--kp-text)' }}>{trailing}</div>
          {trailingSub && <div style={{ fontFamily: 'var(--kp-font-b)', fontSize: 11, color: 'var(--kp-ter)', marginTop: 2 }}>{trailingSub}</div>}
        </div>
      )}
    </div>
  );
}

// ─── SIMULATED DATA ──────────────────────────────────────────────────────────
const WALLETS = [
  { id:'usdc', name:'USDC', kind:'Cripto', balance:12480.32, symbol:'$', color:'#2775CA', history:[10800,11100,10950,11600,11900,12100,12480] },
  { id:'kycn', name:'Token KYCN', kind:'Ecosistema', balance:3260, symbol:'', color:ACCENT, history:[2800,2900,2950,3040,3110,3190,3260] },
];

const ESCROWS = [
  { id:1, title:'Contenedor 20ft — Puerto de Balboa', amount:3200, party:'SeaToken', status:'En custodia', release:'12 Jul 2026', pct:100 },
  { id:2, title:'Depósito garantía — Edificio Corporativo Palermo', amount:6120, party:'PropChain', status:'En custodia', release:'30 Ago 2026', pct:100 },
  { id:3, title:'Contenedor 40ft #118', amount:940, party:'SeaToken', status:'Liberado', release:'22 Jun 2026', pct:0 },
];

const DISTRIBUTIONS = [
  { id:1, asset:'Campo Agrícola Pergamino', next:'01 Ago 2026', est:398, freq:'Mensual' },
  { id:2, asset:'Flota Tesla Model 3',       next:'28 Jul 2026', est:191, freq:'Mensual' },
  { id:3, asset:'Token KYCN — Staking',      next:'15 Jul 2026', est:54,  freq:'Quincenal' },
];

const BENEFITS = [
  { icon:'hex',    title:'Fees reducidos', desc:'-50% en comisiones de mercado secundario por holdear KYCN', active:true },
  { icon:'bolt',   title:'Retiros prioritarios', desc:'Liquidación de fiat en <24h en vez de 3-5 días hábiles', active:true },
  { icon:'target', title:'Acceso anticipado', desc:'48h de ventana exclusiva antes del lanzamiento público de nuevos proyectos', active:true },
  { icon:'shield', title:'Seguro extendido', desc:'Cobertura ampliada en activos con custodia KEYCHAIN', active:false },
];

const TAB_LABELS = { fondos:'Fondos', inversiones:'Inversiones', escrow:'Escrow', beneficios:'Beneficios', movimientos:'Movimientos' };

function fmt(n, symbol = '$') {
  return `${symbol}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: symbol ? 2 : 0, maximumFractionDigits: 2 })}`;
}

// KeyPay doesn't hold a fiat account itself — fiat only ever passes through
// briefly during a P2P Fiat trade (escrowed crypto ↔ bank transfer), so there's
// no "Cuenta Fiat" wallet to normalize here. ARS_PER_USD is only used to quote
// P2P Fiat offers in pesos.
const ARS_PER_USD = 830;
const usdValue = (w) => w.balance;

// ─── RECEIVE MODAL (unchanged, simple QR/link generator) ────────────────────
// Real QR (api.qrserver.com) encoding the profile/address, not a decorative
// checkerboard — this is what "representa el address o el perfil" means:
// scanning it should actually carry the address (and, once real accounts
// exist, the profile handle) somewhere useful.
function ReceiveModal({ onClose, myAddress = '0x0000000000000000000000000000000000dEaD', myName = 'Max' }) {
  const [amount, setAmount] = useState('');
  const payload = amount ? `https://realworldassets.lat/pay?to=${myAddress}&amount=${amount}` : `https://realworldassets.lat/pay?to=${myAddress}`;
  const [copied, setCopied] = useState(false);

  const copyAddr = () => {
    navigator.clipboard?.writeText(myAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(4,4,7,0.72)', backdropFilter:'blur(4px)' }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.94, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.94, y:8 }}
        transition={{ type:'spring', stiffness:340, damping:30 }}
        onClick={e => e.stopPropagation()}
        style={{ width:340, background:'var(--kp-surface)', border:'1px solid var(--kp-border-l)', borderRadius:20, padding:'24px 24px 22px', boxShadow:'var(--kp-shadow)' }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:17, color:'var(--kp-text)' }}>Recibir fondos</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--kp-ter)', cursor:'pointer', padding:0 }}>{KIcons.close}</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:16 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#7c5cff,#5b8cff)', marginBottom:8 }} />
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14, color:'var(--kp-text)' }}>{myName}</div>
          <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>Perfil KeyPay</div>
        </div>

        <div style={{ padding:16, borderRadius:16, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          <img src={qrUrl(payload, 200)} alt="QR de cobro" width={200} height={200} style={{ display:'block' }} />
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)', marginBottom:6 }}>Monto a solicitar (opcional)</div>
          <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" type="number"
            style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:11, border:'1.5px solid var(--kp-border)', background:'var(--kp-surface2)', color:'var(--kp-text)', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:16, outline:'none' }} />
        </div>

        <button onClick={copyAddr} style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px',
          borderRadius:11, border:'1px solid var(--kp-border)', background:'var(--kp-surface2)', cursor:'pointer', marginBottom:14,
        }}>
          <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'var(--kp-sec)' }}>{myAddress.slice(0,10)}…{myAddress.slice(-6)}</span>
          <span style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, fontWeight:700, color: copied ? GREEN : ACCENT }}>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>

        <KBtn variant="accent" style={{ width:'100%', justifyContent:'center' }} onClick={() => {
          if (navigator.share) navigator.share({ title: 'Pagame por KeyPay', url: payload }).catch(() => {});
          else copyAddr();
        }}>Compartir</KBtn>
      </motion.div>
    </motion.div>
  );
}

// ─── SEND CHECKOUT (x402) ────────────────────────────────────────────────────
// Deliberately built as a checkout, not a wallet screen: left column is the
// order line (what's being paid for, quantity, asset type), right column is
// the price breakdown (subtotal, network fee, total) and the pay action —
// the wallet-looking sign-in/error states only appear if x402 actually needs
// them, as native thirdweb modals layered on top.
const KEYPAD_KEYS = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

// ─── P2P SEND (numpad flow) ──────────────────────────────────────────────────
// Three screens, same shape as a native wallet's send flow: numpad amount
// entry → confirm transaction details → success. The actual payment is
// still real x402 (fetchWithPayment) underneath — this only changes how the
// amount/recipient are collected and confirmed.
// Circular swipe-to-confirm slider: dragging the handle to the end turns
// the track green and fires onConfirm; releasing early snaps back.
function SwipeToConfirm({ onConfirm, onProgress, disabled, label = 'Swipe right to confirm' }) {
  const trackRef = useRef(null);
  const [width, setWidth] = useState(240);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (trackRef.current) setWidth(trackRef.current.offsetWidth - 52);
  }, []);

  return (
    <div ref={trackRef} style={{
      position:'relative', width:'100%', height:52, borderRadius:26,
      background: done ? 'rgba(110,231,114,0.16)' : '#f0f0f2',
      display:'flex', alignItems:'center', overflow:'hidden', transition:'background 0.25s',
    }}>
      <div style={{
        position:'absolute', left:0, right:0, textAlign:'center',
        fontFamily:'var(--kp-font-b)', fontSize:13, fontWeight:600,
        color: done ? GREEN : '#9a9aa2', pointerEvents:'none',
      }}>{done ? 'Confirmado' : label}</div>
      <motion.div
        drag={disabled || done ? false : 'x'}
        dragConstraints={{ left: 0, right: width }}
        dragElastic={0.05}
        onDrag={(e, info) => onProgress?.(Math.min(1, Math.max(0, info.offset.x / width)))}
        onDragEnd={(e, info) => {
          if (info.offset.x > width * 0.72) {
            setDone(true);
            onProgress?.(1);
            onConfirm?.();
          } else {
            onProgress?.(0);
          }
        }}
        animate={done ? { x: width } : { x: 0 }}
        transition={{ type:'spring', stiffness:400, damping:34 }}
        style={{
          width:44, height:44, borderRadius:'50%', margin:'0 4px', flexShrink:0,
          background: done ? GREEN : '#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.18)',
          display:'flex', alignItems:'center', justifyContent:'center', cursor: disabled ? 'default' : 'grab',
          color: done ? '#fff' : '#9a9aa2', zIndex:1,
        }}
      >{done ? KIcons.check : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</motion.div>
    </div>
  );
}

// ─── P2P SEND ────────────────────────────────────────────────────────────────
// recipients (avatar grid, matches a contacts picker) → amount (light numpad
// + network/currency selector + swipe-to-confirm) → success (checkmark
// merged onto the recipient's avatar). Payment underneath is still real x402
// (fetchWithPayment) — this only changes how it's collected and confirmed.
function SendCheckout({ onClose, initialContact }) {
  const [screen, setScreen] = useState(initialContact ? 'amount' : 'recipients'); // recipients | amount | success
  const [contact, setContact] = useState(initialContact || null);
  const [customAddr, setCustomAddr] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState(NETWORKS[0]);
  const [netPickerOpen, setNetPickerOpen] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [x402Screen, setX402Screen] = useState(null); // null | 'signin' | 'error'
  const account = useActiveAccount();
  const { fetchWithPayment, isPending: x402Pending, error: x402Error } = useFetchWithPayment(client, { uiEnabled: false });

  const amountNum = Number(amount) || 0;
  const target = contact ? contact.handle : customAddr;
  const recipientLabel = contact ? contact.name : (customAddr ? `${customAddr.slice(0,6)}…${customAddr.slice(-4)}` : '0x...');

  const pressKey = (k) => {
    if (k === '⌫') { setAmount(a => a.slice(0, -1)); return; }
    if (k === '.' && amount.includes('.')) return;
    setAmount(a => (a === '0' ? k : a + k));
  };

  const attemptPayment = async () => {
    try {
      await fetchWithPayment(`${X402_TRANSFER_ENDPOINT}?to=${encodeURIComponent(target)}&amount=${encodeURIComponent(amountNum)}&network=${network.id}`);
      setScreen('success');
    } catch {
      setX402Screen('error');
    }
  };

  // Mirrors thirdweb's useFetchWithPayment: no connected wallet → show the
  // native SignInRequiredModal first; only attempt the paid request once
  // signed in.
  const handleConfirm = () => {
    if (!account) { setX402Screen('signin'); return; }
    attemptPayment();
  };

  const openAmount = (c, addr) => {
    setContact(c || null);
    setCustomAddr(addr || '');
    setScreen('amount');
  };

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', padding:20 }}
    >
      {screen === 'recipients' && (
        <motion.div
          initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
          transition={{ type:'spring', stiffness:340, damping:32 }}
          onClick={e => e.stopPropagation()}
          style={{ width:'100%', maxWidth:360, maxHeight:'82vh', borderRadius:24, border:'1px solid rgba(255,255,255,0.12)', background:'#000', padding:'22px 20px', display:'flex', flexDirection:'column' }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:20, color:'#fff' }}>Recipients</div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#8a8a92', cursor:'pointer', padding:0 }}>{KIcons.close}</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:20 }}>
            {CONTACTS.map(c => (
              <button key={c.id} onClick={() => openAmount(c)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                <img src={c.img} alt={c.name} style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover' }} />
                <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13, color:'#fff' }}>{c.name}</div>
                <div style={{ fontFamily:'var(--kp-font-b)', fontSize:10.5, color:'#6f6f7a' }}>{c.handle}</div>
              </button>
            ))}
          </div>

          <div style={{ background:'#141416', borderRadius:18, padding:'16px', flex:1, overflowY:'auto', minHeight:0 }}>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'#6f6f7a', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Enviar a una address</div>
            <input
              value={customAddr}
              onChange={e => setCustomAddr(e.target.value)}
              placeholder="0x..."
              style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'#000', color:'#fff', fontFamily:'var(--kp-font-b)', fontSize:13.5, outline:'none', marginBottom:12 }}
            />
            <button
              onClick={() => openAmount(null, customAddr)}
              disabled={!customAddr.trim()}
              style={{
                width:'100%', padding:'12px', borderRadius:12, border:'none',
                background:'#fff', color:'#000', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5,
                cursor: customAddr.trim() ? 'pointer' : 'not-allowed', opacity: customAddr.trim() ? 1 : 0.4,
              }}
            >Continuar</button>
          </div>
        </motion.div>
      )}

      {screen === 'amount' && (
        <motion.div
          initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
          transition={{ type:'spring', stiffness:340, damping:32 }}
          onClick={e => e.stopPropagation()}
          style={{ width:'100%', maxWidth:340, borderRadius:24, background:'#fdfdfd', padding:'20px 22px 24px' }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <button onClick={() => setScreen('recipients')} style={{ background:'none', border:'none', color:'#111', cursor:'pointer', padding:0 }}>{KIcons.back}</button>
            <div style={{ flex:1 }} />
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#9a9aa2', cursor:'pointer', padding:0 }}>{KIcons.close}</button>
          </div>

          <div style={{ display:'flex', justifyContent:'center', marginBottom:18 }}>
            <div style={{ display:'inline-flex', padding:4, borderRadius:999, background:'#f0f0f2' }}>
              <div style={{ padding:'7px 18px', borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13, color:'#111' }}>Send</div>
              <div style={{ padding:'7px 18px', fontFamily:'var(--kp-font-h)', fontWeight:600, fontSize:13, color:'#9a9aa2' }}>Request</div>
            </div>
          </div>

          <div style={{ position:'relative', display:'flex', justifyContent:'center', marginBottom:20 }}>
            <button onClick={() => setNetPickerOpen(v => !v)} style={{
              display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
              fontFamily:'var(--kp-font-b)', fontSize:13, color:'#6b6b73', padding:0,
            }}>
              {recipientLabel} · {network.symbol} <span style={{ color:'#b5b5ba' }}>{KIcons.chevD}</span>
            </button>
            {netPickerOpen && (
              <div style={{ position:'absolute', top:26, background:'#fff', borderRadius:14, boxShadow:'0 8px 24px rgba(0,0,0,0.14)', overflow:'hidden', zIndex:2, minWidth:180 }}>
                {NETWORKS.map(n => (
                  <button key={n.id} onClick={() => { setNetwork(n); setNetPickerOpen(false); }} style={{
                    width:'100%', padding:'11px 16px', background: n.id === network.id ? '#f5f5f7' : '#fff', border:'none', cursor:'pointer',
                    display:'flex', justifyContent:'space-between', fontFamily:'var(--kp-font-b)', fontSize:13, color:'#111',
                  }}>
                    <span>{n.label}</span><span style={{ color:'#9a9aa2' }}>{n.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, margin:'8px 0 6px' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:48, letterSpacing:'-0.02em',
                color: amountNum <= 0 ? '#c7c7cc' : mixToGreen(dragProgress) }}>
                <span style={{ fontSize:30, verticalAlign:'middle' }}>$</span>{amount || '0.00'}
              </div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#9a9aa2', marginTop:4 }}>Available {fmt(WALLETS.find(w=>w.id==='usdc').balance)}</div>
            </div>
            {contact ? (
              <img src={contact.img} alt={contact.name} style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover', opacity: 1 - dragProgress * 0.8, transform:`scale(${1 - dragProgress * 0.3})` }} />
            ) : (
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#3a3a40,#c7c7cc)', opacity: 1 - dragProgress * 0.8 }} />
            )}
          </div>

          <div style={{ display:'flex', justifyContent:'center', gap:26, margin:'14px 0 10px', color:'#c2c2c7' }}>
            <span>{KIcons.plus}</span><span>{KIcons.minus}</span><span>{KIcons.multiply}</span><span>{KIcons.divide}</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:20 }}>
            {KEYPAD_KEYS.map(k => (
              <button key={k} onClick={() => pressKey(k)} style={{
                padding:'13px 0', background:'none', border:'none', cursor:'pointer',
                fontFamily:'var(--kp-font-h)', fontWeight:500, fontSize:21, color:'#111',
              }}>{k}</button>
            ))}
          </div>

          <SwipeToConfirm disabled={amountNum <= 0 || x402Pending} onConfirm={handleConfirm} onProgress={setDragProgress} />
        </motion.div>
      )}

      {screen === 'success' && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          onClick={onClose}
          style={{
            position:'absolute', inset:0, zIndex:310, background: GREEN,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            cursor:'pointer', textAlign:'center',
          }}
        >
          <motion.div
            initial={{ scale:0.4, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', stiffness:380, damping:22 }}
            style={{ marginBottom:22 }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </motion.div>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:36, color:'#fff', marginBottom:8 }}>${amount || amountNum}</div>
          <div style={{ fontFamily:'var(--kp-font-b)', fontSize:16, color:'rgba(255,255,255,0.9)' }}>Sent to {contact ? contact.name : recipientLabel}</div>
          <div style={{ position:'absolute', bottom:36, fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'rgba(255,255,255,0.7)' }}>Tap anywhere to close</div>
        </motion.div>
      )}

      <AnimatePresence>
        {x402Screen === 'signin' && (
          <X402SignInRequiredModal
            onSignIn={() => {
              // No real wallet in this preview sandbox — mirrors the stub
              // ConnectButton's behavior (src/stubs/thirdweb-react.jsx).
              alert('Wallet preview only. Use npm run dev for real wallet.');
              setX402Screen(null);
            }}
            onCancel={() => setX402Screen(null)}
          />
        )}
        {x402Screen === 'error' && (
          <X402PaymentErrorModal
            message={x402Error?.message}
            onRetry={() => { setX402Screen(null); attemptPayment(); }}
            onCancel={() => setX402Screen(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── CART CHECKOUT (thirdweb CheckoutWidget) ────────────────────────────────
// A real shopping-cart checkout fed by the shared pending-payments inbox
// (src/lib/keypayInbox.js): whatever the platform handed off — investing in
// Token FACT's ICO, reserving a tokenization — shows up here as a line item.
// Left is the cart; thirdweb's own <CheckoutWidget /> owns the summary/fee/
// total math and the pay button, instead of us reimplementing payment UI.
const KEYCHAIN_TREASURY = '0x000000000000000000000000000000000000dead';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// focusId scopes the checkout to a single just-added payment instead of the
// whole shared inbox — otherwise clicking one "Invertir" button would also
// bundle in whatever else happened to be pending (e.g. the seed demo items),
// charging for things the user never asked to buy right now. KeyPay's own
// "Checkout" button on its home screen omits focusId to show everything.
export function CartCheckout({ onClose, focusId }) {
  const allPending = usePendingPayments();
  const pending = focusId ? allPending.filter(p => p.id === focusId) : allPending;
  const total = pending.reduce((s, i) => s + i.qty * i.unit + (i.fee || 0), 0);
  const [paidId, setPaidId] = useState(null);

  if (pending.length === 0) {
    return (
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', padding:20 }}
      >
        <motion.div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:340, borderRadius:20, background:'var(--kp-surface)', border:'1px solid var(--kp-border-l)', padding:'32px 24px', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:16, color:'var(--kp-text)', marginBottom:8 }}>No tenés pagos pendientes</div>
          <div style={{ fontFamily:'var(--kp-font-b)', fontSize:13, color:'var(--kp-sec)', marginBottom:20 }}>
            Cuando inviertas en el token FACT o reserves una tokenización desde KEYCHAIN, aparecerán acá para pagar.
          </div>
          <KBtn variant="accent" style={{ width:'100%', justifyContent:'center' }} onClick={onClose}>Cerrar</KBtn>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', padding:20 }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
        transition={{ type:'spring', stiffness:340, damping:32 }}
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:420, maxHeight:'88vh', overflowY:'auto', background:'var(--kp-surface)', border:'1px solid var(--kp-border-l)', borderRadius:22, boxShadow:'var(--kp-shadow)' }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px', borderBottom:'1px solid var(--kp-border-l)' }}>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:16, color:'var(--kp-text)' }}>Checkout — Pendientes de KEYCHAIN</div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:'none', background:'var(--kp-surface2)', color:'var(--kp-sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{KIcons.close}</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column' }}>
          {/* Cart — what's pending, quantity, source */}
          <div style={{ padding:'8px 20px 4px', borderBottom:'1px solid var(--kp-border-l)' }}>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'var(--kp-ter)', textTransform:'uppercase', letterSpacing:'0.05em', margin:'12px 0 4px' }}>Pendientes ({pending.length})</div>
            {pending.map((item, i) => (
              <KListRow
                key={item.id}
                last={i === pending.length - 1}
                thumbNode={<div style={{ width:'100%', height:'100%', borderRadius:13, background:`${ACCENT}18`, display:'flex', alignItems:'center', justifyContent:'center', color:ACCENT, fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13 }}>{item.qty}×</div>}
                title={item.name}
                subtitle={`${item.source} · ${fmt(item.unit)} c/u${item.fee ? ` + ${fmt(item.fee)} fee` : ''}`}
                trailing={fmt(item.qty * item.unit + (item.fee || 0))}
              />
            ))}
          </div>

          {/* thirdweb's native CheckoutWidget owns the summary/fee/total + pay button */}
          <div style={{ padding:20, display:'flex', flexDirection:'column' }}>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'var(--kp-ter)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:14 }}>Resumen</div>
            <CheckoutWidget
              client={client}
              chain={base}
              tokenAddress={USDC_BASE}
              amount={total.toFixed(2)}
              seller={KEYCHAIN_TREASURY}
              name="Pendientes de KEYCHAIN"
              description={`${pending.length} ítem${pending.length === 1 ? '' : 's'} pendiente${pending.length === 1 ? '' : 's'} de pago`}
              buttonLabel={`Pagar ${fmt(total)}`}
              style={{ flex:1 }}
              onSuccess={() => { pending.forEach(p => removePendingPayment(p.id)); setPaidId('all'); }}
              onCancel={onClose}
            />
            {paidId === 'all' && (
              <div style={{ marginTop:12, fontFamily:'var(--kp-font-b)', fontSize:12.5, color:GREEN, textAlign:'center' }}>Pagado — se acreditará en tu posición.</div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── SWAP (thirdweb SwapWidget) ─────────────────────────────────────────────
// The third arista of KeyPay as an exchange: swapping between assets in the
// ecosystem (USDC ↔ KYCN), via thirdweb's own <SwapWidget /> tool instead of
// a hand-built rate calculator.
function SwapModal({ onClose }) {
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', padding:20 }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
        transition={{ type:'spring', stiffness:340, damping:32 }}
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:16 }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:17, color:'#fff' }}>Swap — USDC / KYCN</div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9, border:'none', background:'#141416', color:'#8a8a92', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{KIcons.close}</button>
        </div>
        <SwapWidget
          client={client}
          prefill={{
            sellToken: { chainId: base.id, amount: '100' },
            buyToken: { chainId: base.id, tokenAddress: USDC_BASE },
          }}
          onSuccess={() => {}}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── WALLETS (connect multiple wallets via thirdweb) ────────────────────────
// Each connected wallet renders as a colored card, matching a native "Cards"
// screen. Connecting is real thirdweb — useConnect/ConnectButton — gated the
// same way as everywhere else in this preview sandbox.
const WALLET_SLOTS = [
  { id:'metamask',  label:'MetaMask',        addr:'0x4a91…7642', gradient:'linear-gradient(135deg,#f6d746,#f0b429)', text:'#1a1400' },
  { id:'coinbase',  label:'Coinbase Wallet', addr:'0x22e0…5123', gradient:'linear-gradient(135deg,#2fe8b0,#1ec98f)', text:'#00251b' },
  { id:'walletconnect', label:'WalletConnect', addr:'0x91cb…3413', gradient:'linear-gradient(135deg,#5fc7ff,#3ba0f2)', text:'#001a33' },
];

// Third-party apps that verified identity through KeyPay's KYC — shown on
// the KYC screen and revocable one by one, like OAuth app permissions.
const LINKED_COMPANIES = [
  { id:1, name:'Colombia Invierte', desc:'Inversiones en acciones', initial:'C', color:'#6366f1', lastUse:'Hoy, 02:15 PM', scopes:['Verificación KYC', 'Nombre completo', 'Documento de identidad'] },
  { id:2, name:'Deal Custody', desc:'Custodia de activos digitales', initial:'D', color:'#f59e0b', lastUse:'Ayer, 11:45 AM', scopes:['Verificación KYC', 'Nombre completo'] },
  { id:3, name:'Stoic Silence', desc:'Gestión de patrimonio privado', initial:'S', color:'#8b5cf6', lastUse:'5 Jun 2025', scopes:['Verificación KYC', 'Nombre completo', 'Documento de identidad', 'Nacionalidad'] },
  { id:4, name:'AgroToken Argentina', desc:'Tokenización de campos agrícolas', initial:'A', color:'#22c55e', lastUse:'2 Jun 2025', scopes:['Verificación KYC'] },
  { id:5, name:'PropChain', desc:'Custodia de garantías inmobiliarias', initial:'P', color:'#ef4444', lastUse:'28 May 2025', scopes:['Verificación KYC', 'Documento de identidad'] },
];

function WalletCard({ slot, connected, onToggle }) {
  return (
    <div style={{ position:'relative', borderRadius:22, padding:'20px 20px 18px', background: slot.gradient, color: slot.text, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:34 }}>
        <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:15 }}>{slot.label}</div>
        <div style={{ fontFamily:'var(--kp-font-b)', fontSize:13, letterSpacing:'0.05em' }}>{slot.addr}</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:8 }}>
          {[KIcons.snow, KIcons.card, KIcons.gear].map((ic, i) => (
            <div key={i} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>{ic}</div>
          ))}
        </div>
        <button onClick={onToggle} style={{
          width:44, height:26, borderRadius:999, border:'none', cursor:'pointer', padding:2,
          background: connected ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.12)', display:'flex', justifyContent: connected ? 'flex-end' : 'flex-start',
        }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background: connected ? '#fff' : 'rgba(255,255,255,0.7)' }} />
        </button>
      </div>
    </div>
  );
}

function WalletsModal({ onClose }) {
  const [connected, setConnected] = useState({ metamask: true, coinbase: false, walletconnect: false });

  const toggle = (id) => {
    if (!connected[id]) {
      alert('Wallet preview only. Use npm run dev for real wallet.');
      return;
    }
    setConnected(c => ({ ...c, [id]: !c[id] }));
  };

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', padding:20 }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
        transition={{ type:'spring', stiffness:340, damping:32 }}
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:360, maxHeight:'86vh', overflowY:'auto', borderRadius:24, border:'1px solid rgba(255,255,255,0.12)', background:'#000', padding:'22px 20px 26px' }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:22, color:'#fff' }}>Wallets</div>
          <button onClick={() => alert('Wallet preview only. Use npm run dev for real wallet.')} style={{
            padding:'9px 16px', borderRadius:999, border:'none', background:'#fff', color:'#000',
            fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13, cursor:'pointer',
          }}>Connect a wallet</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {WALLET_SLOTS.map(slot => (
            <WalletCard key={slot.id} slot={slot} connected={connected[slot.id]} onToggle={() => toggle(slot.id)} />
          ))}
        </div>

        <button onClick={onClose} style={{
          width:'100%', marginTop:20, padding:'13px', borderRadius:12, border:'none',
          background:'#1e1e22', color:'#fff', fontFamily:'var(--kp-font-b)', fontWeight:600, fontSize:13.5, cursor:'pointer',
        }}>Close</button>
      </motion.div>
    </motion.div>
  );
}

// ─── SCAN QR ─────────────────────────────────────────────────────────────────
// Honest about what this preview can and can't do: there's no real camera
// access wired up, so the "Escanear" tab is a viewfinder with a "Simular
// escaneo" action instead of silently pretending to scan. "Mi código" is the
// real thing — the same QR ReceiveModal generates.
function ScanQRModal({ onClose, onScanned, myAddress = '0x0000000000000000000000000000000000dEaD', mode = 'pay' }) {
  const [tab, setTab] = useState('scan');
  const [linked, setLinked] = useState(false);

  if (mode === 'kyc') {
    return (
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', padding:20 }}
      >
        <motion.div
          initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
          transition={{ type:'spring', stiffness:340, damping:32 }}
          onClick={e => e.stopPropagation()}
          style={{ width:'100%', maxWidth:340, borderRadius:24, border:'1px solid rgba(255,255,255,0.12)', background:'#000', padding:'20px 20px 24px' }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14.5, color:'#fff' }}>Vincular empresa</div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#8a8a92', cursor:'pointer', padding:0 }}>{KIcons.close}</button>
          </div>

          {!linked ? (
            <>
              <div style={{ position:'relative', width:'100%', aspectRatio:'1', borderRadius:18, background:'#0d0d0f', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, overflow:'hidden' }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{
                    position:'absolute', width:26, height:26,
                    top: i<2 ? 16 : 'auto', bottom: i>=2 ? 16 : 'auto',
                    left: i%2===0 ? 16 : 'auto', right: i%2===1 ? 16 : 'auto',
                    borderTop: i<2 ? '2.5px solid #fff' : 'none', borderBottom: i>=2 ? '2.5px solid #fff' : 'none',
                    borderLeft: i%2===0 ? '2.5px solid #fff' : 'none', borderRight: i%2===1 ? '2.5px solid #fff' : 'none',
                    borderRadius: 6,
                  }} />
                ))}
                <span style={{ color:ACCENT }}>{KIcons.shield}</span>
              </div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92', textAlign:'center', marginBottom:16 }}>
                Escaneá el código QR que te comparta la empresa para vincular tu identidad verificada de forma segura.
              </div>
              <button onClick={() => setLinked(true)} style={{
                width:'100%', padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
                background:'#fff', color:'#000', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5,
              }}>Simular escaneo</button>
            </>
          ) : (
            <div style={{ padding:'20px 4px', textAlign:'center' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:`${GREEN}1f`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:GREEN }}>{KIcons.check}</div>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:15, color:'#fff', marginBottom:6 }}>Empresa vinculada</div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92', marginBottom:18 }}>Compartiste tu identidad verificada de forma segura.</div>
              <button onClick={() => { onScanned?.(); onClose(); }} style={{
                width:'100%', padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
                background:'#fff', color:'#000', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5,
              }}>Listo</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', padding:20 }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
        transition={{ type:'spring', stiffness:340, damping:32 }}
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:340, borderRadius:24, border:'1px solid rgba(255,255,255,0.12)', background:'#000', padding:'20px 20px 24px' }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'inline-flex', padding:4, borderRadius:999, background:'#141416' }}>
            <button onClick={() => setTab('scan')} style={{ padding:'7px 16px', borderRadius:999, border:'none', cursor:'pointer', background: tab==='scan' ? '#fff' : 'transparent', color: tab==='scan' ? '#000' : '#9a9aa2', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:12.5 }}>Escanear</button>
            <button onClick={() => setTab('mine')} style={{ padding:'7px 16px', borderRadius:999, border:'none', cursor:'pointer', background: tab==='mine' ? '#fff' : 'transparent', color: tab==='mine' ? '#000' : '#9a9aa2', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:12.5 }}>Mi código</button>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8a8a92', cursor:'pointer', padding:0 }}>{KIcons.close}</button>
        </div>

        {tab === 'scan' ? (
          <>
            <div style={{ position:'relative', width:'100%', aspectRatio:'1', borderRadius:18, background:'#0d0d0f', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, overflow:'hidden' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{
                  position:'absolute', width:26, height:26,
                  top: i<2 ? 16 : 'auto', bottom: i>=2 ? 16 : 'auto',
                  left: i%2===0 ? 16 : 'auto', right: i%2===1 ? 16 : 'auto',
                  borderTop: i<2 ? '2.5px solid #fff' : 'none', borderBottom: i>=2 ? '2.5px solid #fff' : 'none',
                  borderLeft: i%2===0 ? '2.5px solid #fff' : 'none', borderRight: i%2===1 ? '2.5px solid #fff' : 'none',
                  borderRadius: 6,
                }} />
              ))}
              <span style={{ color:'#4a4a52' }}>{KIcons.card}</span>
            </div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92', textAlign:'center', marginBottom:16 }}>
              Apuntá la cámara al código QR de la otra persona para completar el pago.
            </div>
            <button onClick={() => onScanned?.(CONTACTS[Math.floor(Math.random() * CONTACTS.length)])} style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none', cursor:'pointer',
              background:'#fff', color:'#000', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5,
            }}>Simular escaneo</button>
          </>
        ) : (
          <>
            <div style={{ padding:16, borderRadius:16, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <img src={qrUrl(`https://realworldassets.lat/pay?to=${myAddress}`, 220)} alt="Mi QR" width={220} height={220} style={{ display:'block' }} />
            </div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92', textAlign:'center' }}>{myAddress.slice(0,10)}…{myAddress.slice(-6)}</div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── P2P FIAT (crypto ↔ fiat with escrow) ───────────────────────────────────
// Fourth arista: selling crypto for fiat peer-to-peer. The crypto is put in
// escrow immediately and only released when the seller confirms the fiat
// payment arrived, or once a support appeal resolves the dispute — it is
// never released just because the buyer says so.
// Binance-style P2P: you publish a request, individual people (never
// companies) apply to take it, you pick one, your crypto gets locked, the
// counterpart wires fiat to your bank account and uploads a receipt, and the
// escrow only releases once BOTH sides have said okay — your confirmation
// after reviewing the receipt, and their confirmation that they sent it
// (represented here by them actually attaching the comprobante).
const MY_BANK = { alias: 'max.keypay.mp', cbu: '0000003100000000123456' };

function P2PFiatModal({ onClose }) {
  const [screen, setScreen] = useState('setup'); // setup | matching | escrow | released | dispute
  const [amount, setAmount] = useState('100');
  const [applicants, setApplicants] = useState([]);
  const [counterpart, setCounterpart] = useState(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);
  const amountNum = Number(amount) || 0;
  const fiatAmount = amountNum * ARS_PER_USD;

  const publish = () => {
    // Simulates other individual users applying to your open request —
    // in a real backend this would be a live queue of interested buyers.
    const shuffled = [...CONTACTS].sort(() => Math.random() - 0.5).slice(0, 3);
    setApplicants(shuffled);
    setScreen('matching');
  };

  const choose = (c) => {
    setCounterpart(c);
    setScreen('escrow');
  };

  const confirmAndRelease = () => {
    setSellerConfirmed(true);
    setScreen('released');
  };

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={screen === 'released' ? onClose : undefined}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background: screen === 'released' ? GREEN : 'rgba(0,0,0,0.8)', backdropFilter: screen === 'released' ? 'none' : 'blur(4px)', padding:20 }}
    >
      {screen === 'released' ? (
        <div style={{ textAlign:'center' }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ marginBottom:18 }}><path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:32, color:'#fff', marginBottom:6 }}>{fmt(amountNum)}</div>
          <div style={{ fontFamily:'var(--kp-font-b)', fontSize:15, color:'rgba(255,255,255,0.9)' }}>Liberado a {counterpart?.name}</div>
          <div style={{ position:'absolute', bottom:36, left:0, right:0, fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'rgba(255,255,255,0.7)' }}>Tap anywhere to close</div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
          transition={{ type:'spring', stiffness:340, damping:32 }}
          onClick={e => e.stopPropagation()}
          style={{ width:'100%', maxWidth:360, maxHeight:'86vh', overflowY:'auto', borderRadius:24, border:'1px solid rgba(255,255,255,0.12)', background:'#000', padding:'22px 22px 24px' }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:17, color:'#fff' }}>P2P Fiat</div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#8a8a92', cursor:'pointer', padding:0 }}>{KIcons.close}</button>
          </div>

          {screen === 'setup' && (
            <>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92', marginBottom:18, lineHeight:1.5 }}>
                Publicá una solicitud para vender USDC por pesos. Personas (no empresas) se postulan para comprarte; elegís una, tu cripto queda bloqueada, y solo se libera cuando ambos confirman la operación.
              </div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'#6f6f7a', marginBottom:6 }}>Vendés (USDC)</div>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" style={{
                width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)',
                background:'#141416', color:'#fff', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:18, outline:'none', marginBottom:14,
              }} />
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, background:'#141416', marginBottom:18 }}>
                <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92' }}>Recibís (ARS · {ARS_PER_USD}/USD)</span>
                <span style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13.5, color:'#fff' }}>{fiatAmount.toLocaleString('es-AR')}</span>
              </div>
              <button onClick={publish} disabled={amountNum <= 0} style={{
                width:'100%', padding:'14px', borderRadius:13, border:'none', cursor: amountNum > 0 ? 'pointer' : 'not-allowed',
                background:'#fff', color:'#000', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:15, opacity: amountNum > 0 ? 1 : 0.5,
              }}>Publicar solicitud</button>
            </>
          )}

          {screen === 'matching' && (
            <>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92', marginBottom:16, lineHeight:1.5 }}>
                {applicants.length} persona{applicants.length === 1 ? '' : 's'} se postularon para pagarte {fiatAmount.toLocaleString('es-AR')} ARS por tus {fmt(amountNum)}. Elegí con quién operar.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {applicants.map(c => (
                  <button key={c.id} onClick={() => choose(c)} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14,
                    border:'1px solid rgba(255,255,255,0.1)', background:'#141416', cursor:'pointer', textAlign:'left',
                  }}>
                    <img src={c.img} alt={c.name} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13.5, color:'#fff' }}>{c.name}</div>
                      <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'#8a8a92' }}>{c.handle}</div>
                    </div>
                    <span style={{ fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:12, color:ACCENT }}>Elegir</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {screen === 'escrow' && (
            <>
              <div style={{ textAlign:'center', padding:'8px 0 18px' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:`${GOLD}18`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:GOLD }}>{KIcons.lock}</div>
                <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:26, color:'#fff', marginBottom:4 }}>{fmt(amountNum)}</div>
                <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#6f6f7a' }}>bloqueado · {counterpart.name} te debe {fiatAmount.toLocaleString('es-AR')} ARS</div>
              </div>

              <div style={{ padding:'12px 14px', borderRadius:12, background:'#141416', marginBottom:14 }}>
                <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'#6f6f7a', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Compartile tus datos para la transferencia</div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#9a9aa2' }}>Alias</span>
                  <span style={{ fontFamily:'var(--kp-font-h)', fontWeight:600, fontSize:12.5, color:'#fff' }}>{MY_BANK.alias}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#9a9aa2' }}>CBU</span>
                  <span style={{ fontFamily:'var(--kp-font-h)', fontWeight:600, fontSize:12.5, color:'#fff' }}>{MY_BANK.cbu}</span>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11, background:'#141416' }}>
                  <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: receiptUploaded ? GREEN : 'rgba(255,255,255,0.1)', color: receiptUploaded ? '#08130a' : '#6f6f7a' }}>{receiptUploaded ? KIcons.check : '1'}</span>
                  <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color: receiptUploaded ? '#fff' : '#9a9aa2' }}>{counterpart.name} envió la transferencia y subió el comprobante</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11, background:'#141416' }}>
                  <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: sellerConfirmed ? GREEN : 'rgba(255,255,255,0.1)', color: sellerConfirmed ? '#08130a' : '#6f6f7a' }}>{sellerConfirmed ? KIcons.check : '2'}</span>
                  <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color: sellerConfirmed ? '#fff' : '#9a9aa2' }}>Vos confirmás que recibiste el dinero</span>
                </div>
              </div>

              {!receiptUploaded ? (
                <button onClick={() => setReceiptUploaded(true)} style={{
                  width:'100%', padding:'13px', borderRadius:12, border:'1px dashed rgba(255,255,255,0.2)', cursor:'pointer',
                  background:'transparent', color:'#9a9aa2', fontFamily:'var(--kp-font-b)', fontWeight:600, fontSize:12.5, marginBottom:8,
                }}>Simular: {counterpart.name} subió el comprobante</button>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'#141416', marginBottom:14 }}>
                  <div style={{ width:38, height:38, borderRadius:9, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', color:'#9a9aa2', flexShrink:0 }}>{KIcons.card}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:12.5, color:'#fff' }}>Comprobante de transferencia</div>
                    <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'#6f6f7a' }}>{fiatAmount.toLocaleString('es-AR')} ARS · a {MY_BANK.alias}</div>
                  </div>
                </div>
              )}

              <button onClick={confirmAndRelease} disabled={!receiptUploaded} style={{
                width:'100%', padding:'14px', borderRadius:13, border:'none', marginBottom:8,
                cursor: receiptUploaded ? 'pointer' : 'not-allowed', opacity: receiptUploaded ? 1 : 0.4,
                background:GREEN, color:'#08130a', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14,
              }}>Confirmar recepción y liberar cripto</button>
              <button onClick={() => setScreen('dispute')} style={{
                width:'100%', padding:'13px', borderRadius:13, border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer',
                background:'transparent', color:'#9a9aa2', fontFamily:'var(--kp-font-b)', fontWeight:600, fontSize:13,
              }}>Apelar</button>
            </>
          )}

          {screen === 'dispute' && (
            <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,120,120,0.14)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:'#ff8a8a' }}>{KIcons.shield}</div>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:17, color:'#fff', marginBottom:8 }}>En revisión</div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:13, color:'#8a8a92', lineHeight:1.5, marginBottom:20 }}>
                Tu cripto sigue bloqueada. El equipo de soporte de KEYCHAIN va a revisar el caso y resolverá en 24–48h.
              </div>
              <button onClick={onClose} style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'#1e1e22', color:'#fff', fontFamily:'var(--kp-font-b)', fontWeight:600, fontSize:13.5, cursor:'pointer' }}>Cerrar</button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── KYC / KYB (bases) ───────────────────────────────────────────────────────
// Not a real identity-verification integration — this lays the groundwork
// (data shape + submission UI) that a real provider (Sumsub, Veriff, etc.)
// would plug into later: choose individual vs business, collect the basic
// fields a provider would need, "submit" moves status to pending.
function KYCModal({ verification, onSubmit, onClose }) {
  const [type, setType] = useState(verification.type);
  const [step, setStep] = useState(verification.type ? 1 : 0);
  const [legalName, setLegalName] = useState(verification.legalName || '');
  const [docId, setDocId] = useState(verification.docId || '');
  const [country, setCountry] = useState(verification.country || 'Argentina');
  const [fileName, setFileName] = useState('');

  const canSubmit = legalName.trim() && docId.trim() && fileName;

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(4px)', padding:20 }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.96, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:8 }}
        transition={{ type:'spring', stiffness:340, damping:32 }}
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:360, borderRadius:24, border:'1px solid rgba(255,255,255,0.12)', background:'#000', padding:'22px 22px 24px' }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          {step > 0 && <button onClick={() => setStep(0)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:0 }}>{KIcons.back}</button>}
          <div style={{ flex:1, fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:17, color:'#fff' }}>Verificación de identidad</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8a8a92', cursor:'pointer', padding:0 }}>{KIcons.close}</button>
        </div>

        {step === 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              ['individual', 'Persona (KYC)', 'Verificación de identidad individual — DNI/Pasaporte.'],
              ['business',   'Empresa (KYB)', 'Verificación de la razón social — CUIT y datos legales.'],
            ].map(([id, label, desc]) => (
              <button key={id} onClick={() => { setType(id); setStep(1); }} style={{
                textAlign:'left', padding:'16px', borderRadius:14, border:'1px solid rgba(255,255,255,0.1)',
                background:'#141416', cursor:'pointer',
              }}>
                <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14.5, color:'#fff', marginBottom:4 }}>{label}</div>
                <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12, color:'#8a8a92' }}>{desc}</div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'#6f6f7a', marginBottom:6 }}>{type === 'business' ? 'Razón social' : 'Nombre completo'}</div>
              <input value={legalName} onChange={e => setLegalName(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:11, border:'1px solid rgba(255,255,255,0.12)', background:'#141416', color:'#fff', fontFamily:'var(--kp-font-b)', fontSize:13.5, outline:'none' }} />
            </div>
            <div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'#6f6f7a', marginBottom:6 }}>{type === 'business' ? 'CUIT' : 'DNI / Pasaporte'}</div>
              <input value={docId} onChange={e => setDocId(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:11, border:'1px solid rgba(255,255,255,0.12)', background:'#141416', color:'#fff', fontFamily:'var(--kp-font-b)', fontSize:13.5, outline:'none' }} />
            </div>
            <div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'#6f6f7a', marginBottom:6 }}>País</div>
              <select value={country} onChange={e => setCountry(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:11, border:'1px solid rgba(255,255,255,0.12)', background:'#141416', color:'#fff', fontFamily:'var(--kp-font-b)', fontSize:13.5, outline:'none' }}>
                {['Argentina','España','México','EE.UU.','Otro'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => setStep(2)} disabled={!legalName.trim() || !docId.trim()} style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none', marginTop:6,
              background:'#fff', color:'#000', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5,
              cursor: legalName.trim() && docId.trim() ? 'pointer' : 'not-allowed', opacity: legalName.trim() && docId.trim() ? 1 : 0.5,
            }}>Continuar</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'#8a8a92', marginBottom:14, lineHeight:1.5 }}>
              Subí una foto de tu {type === 'business' ? 'constancia de CUIT' : 'DNI o pasaporte'}. Esto queda listo para conectar un proveedor real de verificación (Sumsub, Veriff, etc.) más adelante.
            </div>
            <label style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'26px 16px',
              borderRadius:14, border:'1.5px dashed rgba(255,255,255,0.18)', cursor:'pointer', marginBottom:18,
            }}>
              <span style={{ color:'#8a8a92' }}>{KIcons.card}</span>
              <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color: fileName ? '#fff' : '#8a8a92' }}>{fileName || 'Elegir archivo'}</span>
              <input type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={e => setFileName(e.target.files?.[0]?.name || '')} />
            </label>
            <button onClick={() => { onSubmit({ type, status:'pending', legalName, docId, country }); onClose(); }} disabled={!canSubmit} style={{
              width:'100%', padding:'14px', borderRadius:13, border:'none',
              background:'#fff', color:'#000', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14,
              cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5,
            }}>Enviar verificación</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function ResumenTab({ wallets, total, nav, onOpenWallets }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div>
        <div style={{ marginBottom:18 }}>
          <GlowChart
            label="Balance total"
            value={total}
            delta={`+${fmt(total * 0.062)} este mes (+6,2%)`}
            data={[89000, 91200, 92800, 93900, 95600, 97100, total]}
            labels={['ENE','FEB','MAR','ABR','MAY','JUN','JUL']}
          />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
          {wallets.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06, duration:0.3 }}>
              <KCard onClick={() => (w.id === 'kycn' ? nav?.('token') : onOpenWallets?.())} style={{ padding:'16px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:w.color }} />
                  <div style={{ fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:12.5, color:'var(--kp-text)' }}>{w.name}</div>
                </div>
                <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:19, color:'var(--kp-text)', marginBottom:2 }}>{fmt(w.balance, w.symbol)}</div>
                <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'var(--kp-ter)' }}>{w.kind}</div>
              </KCard>
            </motion.div>
          ))}
        </div>

        <KSection title="Actividad reciente" sub="Últimos movimientos en todas tus billeteras" />
        <KCard style={{ padding:'6px 14px' }}>
          {TRANSACTIONS.slice(0, 5).map((t, i) => {
            const project = txProject(t.label);
            const toEscrow = !project && t.label.toLowerCase().includes('escrow');
            return (
              <motion.div key={t.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05, duration:0.25 }}>
                <KListRow
                  last={i === Math.min(4, TRANSACTIONS.length - 1)}
                  thumb={txThumb(t.label)}
                  thumbNode={t.type==='in' ? <span style={{ color:GREEN }}>{KIcons.receive}</span> : <span style={{ color:'var(--kp-sec)' }}>{KIcons.send}</span>}
                  title={t.label}
                  subtitle={`${t.date} · ${t.status}`}
                  trailing={`${t.type==='in' ? '+' : '−'}${fmt(t.amount)}`}
                  onClick={project ? () => nav?.('detalle', project) : toEscrow ? () => nav?.('escrow') : undefined}
                />
              </motion.div>
            );
          })}
        </KCard>
      </div>

      <div>
        <KCard style={{ padding:'20px' }}>
          <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14, color:'var(--kp-text)', marginBottom:16 }}>Distribución de balance</div>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
            <KDonut
              segments={wallets.map(w => ({ value: Math.round((usdValue(w) / total) * 100), color: w.color }))}
              label={fmt(total)} sub="Total" size={150}
            />
          </div>
          {wallets.map(w => (
            <div key={w.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:w.color, flexShrink:0 }} />
              <div style={{ flex:1, fontFamily:'var(--kp-font-b)', fontSize:12, color:'var(--kp-sec)' }}>{w.name}</div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontWeight:600, fontSize:12, color:'var(--kp-text)' }}>{Math.round((usdValue(w)/total)*100)}%</div>
            </div>
          ))}
        </KCard>
      </div>
    </div>
  );
}

// Real coin artwork — same CDN (cryptocurrency-icons) already used by
// Landing.jsx's floating coin animation, so KeyPay stays visually
// consistent with the rest of KEYCHAIN instead of inventing its own icon set.
// FACT (KEYCHAIN's own ecosystem token, shown as "Token KYCN") uses the
// KEYCHAIN cube mark from /public instead of a third-party coin logo.
export const COIN_ICON_URL = {
  USDC: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/usdc.svg',
  MATIC: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/matic.svg',
  ETH: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/eth.svg',
  FACT: '/icono.png',
  KYCN: '/icono.png',
};

function CoinIcon({ sym, dot }) {
  const url = COIN_ICON_URL[sym];
  return (
    <div style={{ width:32, height:32, borderRadius:'50%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
      {url
        ? <img src={url} alt={sym} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:dot, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>{KIcons.hex}</div>}
    </div>
  );
}

// MY_BALANCES (shared data/index.js, also used by Dashboard.jsx) still
// calls this "Factoract Token" — KeyPay displays it as "Token KYCN" like
// everywhere else in KeyPay (WALLETS, sidebar) without renaming the shared
// constant, since ICO branding elsewhere ("Token de Utilidad — FACT") still
// depends on the FACT name.
function balanceDisplayName(b) {
  return b.sym === 'FACT' ? 'Token KYCN' : b.name;
}

function FondosTab({ nav, onOpenWallets }) {
  const totalUsd = MY_BALANCES.reduce((s, b) => s + b.usd, 0);
  return (
    <div>
      <KCard style={{ padding:'20px 24px', marginBottom:22, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <KStat label="Fondos totales" value={fmt(totalUsd)} sub={`${MY_BALANCES.length} monedas`} />
        <KTag label="Multi-chain" color="blue" />
      </KCard>
      <KSection title="Tus monedas" sub="Stablecoins, cripto y tokens del ecosistema que manejás en KeyPay" />
      <KCard style={{ padding:'6px 14px' }}>
        {MY_BALANCES.map((b, i) => (
          <KListRow
            key={b.sym}
            last={i === MY_BALANCES.length - 1}
            thumbNode={<CoinIcon sym={b.sym} dot={b.dot} />}
            title={balanceDisplayName(b)}
            subtitle={`${b.qty.toLocaleString('es-AR', { maximumFractionDigits: 4 })} ${b.sym}`}
            trailing={fmt(b.usd)}
            onClick={b.sym === 'FACT' ? () => nav?.('token') : () => onOpenWallets?.()}
          />
        ))}
      </KCard>
    </div>
  );
}

function InversionesTab({ nav }) {
  const holdTotal = MY_HOLDINGS.reduce((s, h) => s + h.current, 0);
  const factBalance = MY_BALANCES.find(b => b.sym === 'FACT');
  const totalEst = DISTRIBUTIONS.reduce((s, d) => s + d.est, 0);

  return (
    <div>
      <KCard style={{ padding:'20px 24px', marginBottom:22, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <KStat label="Invertido en proyectos tokenizados" value={fmt(holdTotal)} sub={`${MY_HOLDINGS.length} proyectos activos`} />
        <KTag label="RWA" color="green" />
      </KCard>

      <KSection title="Proyectos tokenizados" sub="Activos del mundo real donde tenés tokens — tocá uno para ver el detalle" />
      <KCard style={{ padding:'6px 14px', marginBottom:22 }}>
        {MY_HOLDINGS.map((h, i) => {
          const a = RWA_ASSETS.find(x => x.id === h.assetId);
          const pnl = ((h.current / h.invested - 1) * 100).toFixed(1);
          const isPos = h.current >= h.invested;
          return (
            <KListRow
              key={h.assetId}
              last={i === MY_HOLDINGS.length - 1}
              thumb={a?.img}
              title={a?.name || 'Proyecto'}
              subtitle={`${h.tokens} tokens · desde ${h.since}`}
              trailing={fmt(h.current)}
              trailingSub={`${isPos ? '+' : ''}${pnl}%`}
              onClick={a ? () => nav?.('detalle', a) : undefined}
            />
          );
        })}
      </KCard>

      <KSection title="ICO" sub="Tokens de utilidad en oferta inicial donde participás" />
      <KCard onClick={() => nav?.('token')} style={{ padding:'20px', marginBottom:22 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:`${ACCENT}18`, display:'flex', alignItems:'center', justifyContent:'center', color:ACCENT }}>{KIcons.hex}</div>
            <div>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14, color:'var(--kp-text)' }}>Token de Utilidad — FACT</div>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>Precio actual ${FACT_TOKEN.price} · {FACT_TOKEN.holders.toLocaleString('es-AR')} holders</div>
            </div>
          </div>
          <KTag label="Ronda activa" color="gold" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ background:'var(--kp-surface2)', borderRadius:12, padding:'10px 14px' }}>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:10.5, color:'var(--kp-ter)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Mi tenencia</div>
            <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14.5, color:'var(--kp-text)' }}>{factBalance ? factBalance.qty.toLocaleString('es-AR') : 0} FACT</div>
          </div>
          <div style={{ background:'var(--kp-surface2)', borderRadius:12, padding:'10px 14px' }}>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:10.5, color:'var(--kp-ter)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Valor estimado</div>
            <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14.5, color:'var(--kp-text)' }}>{fmt(factBalance?.usd || 0)}</div>
          </div>
        </div>
      </KCard>

      <KSection title="Próximas distribuciones" sub={`${fmt(totalEst)} estimados · rentas y recompensas recurrentes`} />
      <KCard style={{ padding:'6px 14px' }}>
        {DISTRIBUTIONS.map((d, i) => {
          const a = projectByName(d.asset);
          return (
            <KListRow
              key={d.id}
              last={i === DISTRIBUTIONS.length - 1}
              thumb={projectThumb(d.asset)}
              thumbNode={<span style={{ color:GOLD }}>{KIcons.clock}</span>}
              title={d.asset}
              subtitle={`Próximo cobro: ${d.next} · ${d.freq}`}
              trailing={`+${fmt(d.est)}`}
              onClick={() => nav?.(a ? 'detalle' : 'token', a)}
            />
          );
        })}
      </KCard>
    </div>
  );
}

function MovimientosListTab({ nav }) {
  return (
    <div>
      <KSection title="Historial completo" sub={`${TRANSACTIONS.length} movimientos`} />
      <KCard style={{ padding:'6px 14px' }}>
        {TRANSACTIONS.map((t, i) => {
          const project = txProject(t.label);
          const toEscrow = !project && t.label.toLowerCase().includes('escrow');
          return (
            <KListRow
              key={t.id}
              last={i === TRANSACTIONS.length - 1}
              thumb={txThumb(t.label)}
              thumbNode={t.type==='in' ? <span style={{ color:GREEN }}>{KIcons.receive}</span> : <span style={{ color:'var(--kp-sec)' }}>{KIcons.send}</span>}
              title={t.label}
              subtitle={t.date}
              trailing={`${t.type==='in' ? '+' : '−'}${fmt(t.amount)}`}
              trailingSub={t.status}
              onClick={project ? () => nav?.('detalle', project) : toEscrow ? () => nav?.('escrow') : undefined}
            />
          );
        })}
      </KCard>
    </div>
  );
}

function EscrowTab({ nav }) {
  return (
    <div>
      <KSection title="Fondos en custodia" sub="Garantías y depósitos gestionados por el escrow de KEYCHAIN — tocá uno para verlo en Escrow Chain" />
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {ESCROWS.map(e => (
          <KCard key={e.id} onClick={() => nav?.('escrow')} style={{ padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background: e.pct > 0 ? `${GOLD}18` : `${GREEN}18`, display:'flex', alignItems:'center', justifyContent:'center', color: e.pct > 0 ? GOLD : GREEN }}>{KIcons.lock}</div>
                <div>
                  <div style={{ fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5, color:'var(--kp-text)' }}>{e.title}</div>
                  <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>Contraparte: {e.party}</div>
                </div>
              </div>
              <KTag label={e.status} color={e.pct > 0 ? 'neutral' : 'green'} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>{e.pct > 0 ? `Liberación estimada: ${e.release}` : `Liberado el ${e.release}`}</span>
              <span style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13, color:'var(--kp-text)' }}>{fmt(e.amount)}</span>
            </div>
            <KProgress value={e.pct} color={e.pct > 0 ? GOLD : GREEN} />
          </KCard>
        ))}
      </div>
    </div>
  );
}

function BeneficiosTab() {
  return (
    <div>
      <KCard style={{ padding:'22px 24px', marginBottom:22, background:`linear-gradient(135deg, ${ACCENT}14, var(--kp-surface))` }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:`${ACCENT}22`, display:'flex', alignItems:'center', justifyContent:'center', color:ACCENT }}>{KIcons.hex}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:16, color:'var(--kp-text)' }}>Nivel Holder: Gold</div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'var(--kp-sec)' }}>3,260 KYCN en staking · faltan 1,740 KYCN para Platinum</div>
          </div>
        </div>
        <KProgress value={65} style={{ marginTop:14 }} color={ACCENT} />
      </KCard>
      <KSection title="Beneficios activos" sub="Ventajas desbloqueadas por tu balance en KYCN" />
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {BENEFITS.map((b, i) => (
          <KCard key={i} style={{ padding:'18px 20px', opacity: b.active ? 1 : 0.5 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <span style={{ color:ACCENT, display:'flex' }}>{KIcons[b.icon]}</span>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14, color:'var(--kp-text)' }}>{b.title}</div>
              {b.active ? <KTag label="Activo" color="green" style={{ marginLeft:'auto' }} /> : <KTag label="Platinum" color="neutral" style={{ marginLeft:'auto' }} />}
            </div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'var(--kp-sec)', lineHeight:1.5 }}>{b.desc}</div>
          </KCard>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN CHROME ───────────────────────────────────────────────────────────
function ScreenHeader({ title, onBack, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
      <button onClick={onBack} style={{ width:36, height:36, borderRadius:'50%', border:'1px solid var(--kp-border)', background:'var(--kp-surface2)', color:'var(--kp-text)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>{KIcons.back}</button>
      <div style={{ flex:1, fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:20, color:'var(--kp-text)' }}>{title}</div>
      {action}
    </div>
  );
}

function BinaryNoise({ count = 300 }) {
  const [chars, setChars] = useState(() => Array.from({ length: count }, () => (Math.random() > 0.5 ? '1' : '0')));
  useEffect(() => {
    const id = setInterval(() => {
      setChars(prev => prev.map(c => (Math.random() < 0.15 ? (Math.random() > 0.5 ? '1' : '0') : c)));
    }, 90);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      position:'absolute', inset:0, display:'grid', gridTemplateColumns:'repeat(20, 1fr)',
      alignContent:'center', justifyItems:'center', overflow:'hidden',
      color:'rgba(150,130,255,0.5)', fontFamily:'monospace', fontSize:10.5, letterSpacing:'0.05em',
      userSelect:'none', pointerEvents:'none',
    }}>
      {chars.map((c, i) => <span key={i}>{c}</span>)}
    </div>
  );
}

function KycRevealOverlay({ revealed, onToggle }) {
  return (
    <AnimatePresence>
      {!revealed && (
        <motion.div
          key="binary-overlay"
          initial={{ clipPath:'inset(0 0 0 100%)' }}
          animate={{ clipPath:'inset(0 0 0 0%)' }}
          exit={{ clipPath:'inset(0 0 0 100%)' }}
          transition={{ duration:0.55, ease:'easeInOut' }}
          style={{ position:'absolute', inset:0, borderRadius:14, background:'#0a0714', zIndex:5, overflow:'hidden' }}
        >
          <BinaryNoise />
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}>
            <motion.img
              src="/Logo/keypay.png"
              alt=""
              initial={{ opacity:0, scale:0.8 }}
              animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.8 }}
              transition={{ delay:0.3, duration:0.3 }}
              style={{ display:'block', height:24, width:'auto', filter:'drop-shadow(0 0 10px rgba(140,120,255,0.65))' }}
            />
          </div>
          <button
            onClick={onToggle}
            title="Mostrar datos"
            style={{
              position:'absolute', top:12, right:12, zIndex:6,
              display:'flex', alignItems:'center', justifyContent:'center',
              width:28, height:28, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.18)',
              background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.8)', cursor:'pointer',
            }}
          >{KIcons.eyeOff}</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KycMini({ icon, label, value }) {
  return (
    <div style={{ minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:4, color:ACCENT, marginBottom:2 }}>
        {icon}
        <span style={{ fontFamily:'var(--kp-font-b)', fontSize:7.5, letterSpacing:'0.05em', color:'rgba(255,255,255,0.45)', textTransform:'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:11.5, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{value}</div>
    </div>
  );
}

function KycIdentityCard({ profile, verification, onOpenKYC, onOpenWallets, onViewCompanies, companiesCount = 0 }) {
  const [revealed, setRevealed] = useState(true);
  const isVerified = verification.status === 'verified';
  const isPending = verification.status === 'pending';
  const statusColor = isVerified ? GREEN : isPending ? GOLD : 'var(--kp-ter)';

  const shortName = profile.name || 'Usuario';
  const legalName = verification.legalName || 'Maximiliano Andrés López';
  const docType = verification.type === 'business' ? 'CUIT' : 'DNI';
  const docNumber = verification.docId || '38.442.910';
  const nationality = verification.country || 'Argentina';
  const kycId = `KYC-${shortName.slice(0, 3).toUpperCase()}-${docNumber.replace(/\D/g, '').slice(-4) || '0000'}`;
  const mask = (v) => '•'.repeat(Math.min(v.length, 10));

  return (
    <>
      <HexCard pattern={false} style={{ padding:14, marginBottom:16, display:'flex', flexDirection:'column' }}>
        <KycRevealOverlay revealed={revealed} onToggle={() => setRevealed(true)} />
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ COMPONENTE A ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {/* Componente 1: Foto */}
          <div style={{ position:'relative', width:90, height:120, borderRadius:10, flexShrink:0, overflow:'hidden', background: profile.photo ? 'transparent' : 'linear-gradient(160deg, #4a3fae, #2a2350)' }}>
            {profile.photo
              ? <img src={profile.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.35)' }}>{KIcons.user}</span>}
            <span style={{
              position:'absolute', bottom:4, right:4, width:15, height:15, borderRadius:'50%',
              background:'rgba(0,0,0,0.6)', border:`1px solid ${statusColor}`, color:statusColor,
              display:'flex', alignItems:'center', justifyContent:'center', transform:'scale(0.72)',
            }}>{KIcons.check}</span>
          </div>

          {/* Componente 2: Información (Column C, D, E) */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:6 }}>
            {/* C: Nombre + Status */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--kp-font-b)', fontSize:7.5, letterSpacing:'0.05em', color:'rgba(255,255,255,0.45)', textTransform:'uppercase' }}>Nombre completo</div>
                <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:16, color:'#fff', lineHeight:1.1 }}>{shortName}</div>
                <div style={{ fontFamily:'var(--kp-font-b)', fontSize:9.5, color:'rgba(255,255,255,0.5)' }}>{legalName}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:999, flexShrink:0,
                border:`1px solid ${statusColor}40`, background:`${statusColor}1a`, color:statusColor,
                fontFamily:'var(--kp-font-b)', fontSize:8.5, fontWeight:700,
              }}>
                <span style={{ color:'rgba(255,255,255,0.55)', display:'flex', cursor:'pointer' }} onClick={() => setRevealed(v => !v)} title={revealed ? 'Ocultar datos' : 'Mostrar datos'}>
                  {revealed ? KIcons.eye : KIcons.eyeOff}
                </span>
              </div>
            </div>

            {/* D: Nacionalidad | Nacimiento */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              <KycMini icon={KIcons.idGlobe} label="Nacionalidad" value={nationality} />
              <KycMini icon={KIcons.idCal} label="Nacimiento" value="14 Mar 1998" />
            </div>

            {/* E: Lugar nac. | Documento */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <KycMini icon={KIcons.idPin} label="Lugar nac." value={nationality} />
              <KycMini icon={KIcons.idCard} label="Documento" value={revealed ? `${docType} ${docNumber}` : mask(`${docType} ${docNumber}`)} />
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ COMPONENTE B ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, flexShrink:0, marginTop:20 }}>
          <button onClick={onOpenKYC} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
            <span style={{ color:ACCENT, flexShrink:0, transform:'scale(0.85)' }}>{KIcons.idFinger}</span>
            <span style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:6.5, letterSpacing:'0.04em', color:'rgba(255,255,255,0.45)', textTransform:'uppercase' }}>ID identidad</div>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:10, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{revealed ? kycId : mask(kycId)}</div>
            </span>
            <span style={{ color:'rgba(255,255,255,0.4)', flexShrink:0, transform:'scale(0.8)' }}>{KIcons.chevR}</span>
          </button>
          <button onClick={onViewCompanies} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
            <span style={{ color:ACCENT, flexShrink:0, transform:'scale(0.85)' }}>{KIcons.card}</span>
            <span style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:6.5, letterSpacing:'0.04em', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', whiteSpace:'nowrap' }}>Empresas</div>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:10, color:'#fff' }}>{companiesCount}</div>
            </span>
            <span style={{ color:'rgba(255,255,255,0.4)', flexShrink:0, transform:'scale(0.8)' }}>{KIcons.chevR}</span>
          </button>
          <button onClick={onOpenWallets} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
            <span style={{ color:ACCENT, flexShrink:0, transform:'scale(0.85)' }}>{KIcons.wallet2}</span>
            <span style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--kp-font-b)', fontSize:6.5, letterSpacing:'0.04em', color:'rgba(255,255,255,0.45)', textTransform:'uppercase', whiteSpace:'nowrap' }}>Wallets</div>
              <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:10, color:'#fff' }}>{WALLET_SLOTS.length}</div>
            </span>
            <span style={{ color:'rgba(255,255,255,0.4)', flexShrink:0, transform:'scale(0.8)' }}>{KIcons.chevR}</span>
          </button>
        </div>
      </HexCard>

      <div style={{
        display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'11px 14px', borderRadius:16,
        background:'var(--kp-surface)', border:'1px solid var(--kp-border-l)',
      }}>
        <span style={{ color:statusColor, flexShrink:0 }}>{KIcons.shield}</span>
        <span style={{ flex:1, fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>
          {isVerified ? 'Tu identidad está verificada y asegurada en blockchain.' : 'Completá tu verificación para acceder a límites más altos y P2P Fiat.'}
        </span>
        <button onClick={onOpenKYC} style={{
          display:'flex', alignItems:'center', gap:4, padding:'8px 13px', borderRadius:999, border:'none',
          background:'var(--kp-text)', color:'var(--kp-bg)', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
        }}>Ver detalles {KIcons.chevR}</button>
      </div>
    </>
  );
}

function LinkedCompaniesCard({ companies, onRevoke, containerRef }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const visible = showAll ? companies : companies.slice(0, 3);

  return (
    <div ref={containerRef} style={{ marginBottom:16 }}>
      <div style={{ marginBottom:12 }}>
        <h3 style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:16, color:'#fff', margin:0, marginBottom:4 }}>¿Quién está usando tu identidad?</h3>
        <p style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'rgba(255,255,255,0.5)', margin:0 }}>Empresas que han verificado tu identidad a través de Key Pay.</p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {visible.map(c => {
          const isExp = expandedId === c.id;
          return (
            <div key={c.id} style={{ borderRadius:14, background:'var(--kp-surface)', border:'1px solid var(--kp-border-l)', overflow:'hidden' }}>
              <motion.button
                whileHover={{ scale:1.01 }}
                whileTap={{ scale:0.99 }}
                onClick={() => setExpandedId(isExp ? null : c.id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                  background:'none', border:'none', cursor:'pointer', textAlign:'left', color:'inherit',
                }}
              >
                <div style={{
                  width:44, height:44, borderRadius:12, background:c.color, display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:16, color:'#fff', flexShrink:0
                }}>{c.initial}</div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13, color:'#fff', marginBottom:2 }}>{c.name}</div>
                  <div style={{ fontFamily:'var(--kp-font-b)', fontSize:10.5, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>{c.desc}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <span style={{ fontFamily:'var(--kp-font-b)', fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'0.03em', textTransform:'uppercase' }}>Último uso</span>
                    <span style={{ fontFamily:'var(--kp-font-b)', fontSize:10, color:'rgba(255,255,255,0.7)' }}>{c.lastUse}</span>
                  </div>
                </div>

                <div style={{
                  display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:999,
                  background:'rgba(34, 197, 94, 0.1)', border:'1px solid rgba(34, 197, 94, 0.3)', flexShrink:0
                }}>
                  <span style={{ fontFamily:'var(--kp-font-b)', fontSize:9, fontWeight:700, color:'#22c55e', letterSpacing:'0.05em', textTransform:'uppercase' }}>Verificado</span>
                </div>

                <motion.span animate={{ rotate: isExp ? 90 : 0 }} transition={{ duration:0.15 }} style={{ color:'rgba(255,255,255,0.4)', flexShrink:0, display:'flex' }}>{KIcons.chevR}</motion.span>
              </motion.button>

              <AnimatePresence>
                {isExp && (
                  <motion.div
                    initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                    transition={{ duration:0.2 }} style={{ overflow:'hidden' }}
                  >
                    <div style={{ padding:'0 14px 14px' }}>
                      <div style={{ fontFamily:'var(--kp-font-b)', fontSize:9.5, color:'rgba(255,255,255,0.4)', letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:6 }}>Datos compartidos</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                        {c.scopes.map(s => (
                          <span key={s} style={{ padding:'3px 9px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', fontFamily:'var(--kp-font-b)', fontSize:10, color:'rgba(255,255,255,0.7)' }}>{s}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => onRevoke(c.id)}
                        style={{
                          width:'100%', padding:'9px', borderRadius:10, border:'1px solid rgba(255,90,90,0.25)',
                          background:'rgba(255,90,90,0.08)', color:'#ff8a8a', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:12, cursor:'pointer',
                        }}
                      >Revocar acceso</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {companies.length > 3 && (
        <button onClick={() => setShowAll(v => !v)} style={{
          width:'100%', padding:'12px', marginTop:12, borderRadius:12, border:'none', background:'var(--kp-surface)',
          color:'var(--kp-ter)', fontFamily:'var(--kp-font-b)', fontSize:12, fontWeight:700, cursor:'pointer',
        }}>{showAll ? 'Ver menos' : 'Ver todas las aplicaciones'} {KIcons.chevR}</button>
      )}
    </div>
  );
}

function KycScreen({ onBack, profile, verification, onOpenKYC, onOpenWallets }) {
  const [companies, setCompanies] = useState(LINKED_COMPANIES);
  const companiesRef = useRef(null);
  return (
    <div style={{ padding:'20px 20px 24px', display:'flex', flexDirection:'column', flex:1 }}>
      <ScreenHeader title="Mi Identidad" onBack={onBack} />
      <KycIdentityCard
        profile={profile} verification={verification} onOpenKYC={onOpenKYC} onOpenWallets={onOpenWallets}
        companiesCount={companies.length}
        onViewCompanies={() => companiesRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })}
      />
      <LinkedCompaniesCard
        companies={companies}
        containerRef={companiesRef}
        onRevoke={(id) => setCompanies(cs => cs.filter(c => c.id !== id))}
      />
    </div>
  );
}

// The persistent bottom nav — KeyPay's own home, the movimientos hub
// (fondos, inversiones, escrow, beneficios, movimientos), KYC, settings, and
// profile. Leaving KeyPay entirely happens via Config → Cerrar sesión.
function BottomBar({ screen, setScreen, containerRef, profile }) {
  const items = [
    { id:'home', label:'Inicio', icon:KIcons.navHome },
    { id:'movimientos', label:'Movimientos', icon:KIcons.navGrid },
    { id:'kyc', label:'KYC', icon:KIcons.shield },
    { id:'config', label:'Config.', icon:KIcons.navGear },
    { id:'perfil', label:'Perfil', avatar:true },
  ];
  return (
    <div style={{ position:'absolute', left:0, right:0, bottom:0, display:'flex', justifyContent:'center', padding:'0 20px 18px', pointerEvents:'none', zIndex:20 }}>
      <div
        ref={containerRef}
        style={{
          display:'flex', alignItems:'center', gap:4, width:'100%', maxWidth:390,
          padding:8, borderRadius:30, pointerEvents:'auto',
          background:'rgba(22,22,26,0.82)', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
          border:'1px solid rgba(255,255,255,0.08)',
          boxShadow:'0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {items.map(it => {
          const active = screen === it.id;
          return (
            <motion.button
              key={it.id}
              whileTap={{ scale:0.9 }}
              onClick={() => (it.onClick ? it.onClick() : setScreen(it.id))}
              title={it.label}
              style={{
                position:'relative', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:0, padding:'14px 6px', minHeight:56, border:'none', cursor:'pointer', background:'transparent',
              }}
            >
              {active && (
                <motion.div
                  layoutId="kp-navbar-active"
                  transition={{ type:'spring', stiffness:400, damping:32 }}
                  style={{
                    position:'absolute', inset:2, borderRadius:20,
                    background:'linear-gradient(145deg, rgba(124,92,255,0.22), rgba(91,140,255,0.16))',
                    border:'1px solid rgba(140,170,255,0.35)',
                  }}
                />
              )}
              <motion.div
                animate={{ y: active ? -4 : 0 }}
                transition={{ type:'spring', stiffness:420, damping:30 }}
                style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}
              >
                {it.avatar ? (
                  <span style={{
                    position:'relative', width:27, height:27, borderRadius:'50%', overflow:'hidden', flexShrink:0,
                    background: profile?.photo ? 'transparent' : 'linear-gradient(135deg,#7c5cff,#5b8cff)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    border: active ? '1.5px solid #fff' : '1.5px solid rgba(255,255,255,0.25)',
                    boxShadow: active ? '0 0 8px rgba(124,140,255,0.7)' : 'none', transition:'border-color 0.15s',
                  }}>
                    {profile?.photo
                      ? <img src={profile.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:12.5, color:'#fff' }}>{(profile?.name || '?').charAt(0).toUpperCase()}</span>}
                  </span>
                ) : (
                  <span style={{ position:'relative', display:'flex', color: active ? '#fff' : 'var(--kp-ter)', filter: active ? 'drop-shadow(0 0 6px rgba(124,140,255,0.6))' : 'none', transition:'color 0.15s' }}>
                    {it.icon}
                  </span>
                )}
              </motion.div>
              <AnimatePresence>
                {active && (
                  <motion.span
                    initial={{ opacity:0, scale:0, y:-2 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0, y:-2 }}
                    transition={{ duration:0.16 }}
                    style={{
                      position:'absolute', bottom:6, left:'50%', translateX:'-50%', transform:'translateX(-50%)',
                      width:4, height:4, borderRadius:'50%', background:ACCENT,
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

const NOTIFICATIONS = [
  { id:1, text:'Distribución de renta acreditada — Campo Agrícola Pergamino', time:'hace 2h' },
  { id:2, text:'Tu compra de Token FACT quedó pendiente de pago', time:'hace 5h' },
];

function NotificationsDropdown({ onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:4 }} />
      <motion.div
        initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
        onClick={e => e.stopPropagation()}
        style={{ position:'absolute', top:46, right:0, width:280, background:'var(--kp-surface)', border:'1px solid var(--kp-border-l)', borderRadius:16, boxShadow:'var(--kp-shadow)', overflow:'hidden', zIndex:5 }}
      >
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--kp-border-l)', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:13, color:'var(--kp-text)' }}>Notificaciones</div>
        {NOTIFICATIONS.map((n, i) => (
          <div key={n.id} style={{ padding:'12px 14px', borderBottom: i < NOTIFICATIONS.length - 1 ? '1px solid var(--kp-border-l)' : 'none' }}>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'var(--kp-text)', lineHeight:1.4 }}>{n.text}</div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11, color:'var(--kp-ter)', marginTop:3 }}>{n.time}</div>
          </div>
        ))}
      </motion.div>
    </>
  );
}

const MOV_TABS = ['fondos', 'inversiones', 'escrow', 'beneficios', 'movimientos'];

function MovimientosScreen({ onBack, movTab, setMovTab, nav, onOpenWallets }) {
  const [extractoRequested, setExtractoRequested] = useState(false);
  return (
    <div style={{ padding:'20px 20px 24px', display:'flex', flexDirection:'column', flex:1 }}>
      <ScreenHeader title="Movimientos" onBack={onBack} />
      <button
        onClick={() => setExtractoRequested(true)}
        disabled={extractoRequested}
        style={{
          alignSelf:'flex-start', display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderRadius:999, marginBottom:18,
          border:'1px solid var(--kp-border)', background: extractoRequested ? 'var(--kp-surface2)' : 'transparent',
          color: extractoRequested ? GREEN : 'var(--kp-text)', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:12.5,
          cursor: extractoRequested ? 'default' : 'pointer',
        }}
      >{extractoRequested ? <>{KIcons.check} Extracto solicitado</> : 'Pedir extracto'}</button>

      <div style={{ display:'flex', gap:4, marginBottom:18, borderBottom:'1px solid var(--kp-border-l)', overflowX:'auto' }}>
        {MOV_TABS.map(t => (
          <button key={t} onClick={() => setMovTab(t)} style={{
            padding:'9px 11px', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:12, letterSpacing:'-0.01em',
            border:'none', borderBottom: movTab===t ? `2px solid ${ACCENT}` : '2px solid transparent',
            background:'none', color: movTab===t ? ACCENT : 'var(--kp-ter)', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
          }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {movTab === 'fondos' && <FondosTab nav={nav} onOpenWallets={onOpenWallets} />}
      {movTab === 'inversiones' && <InversionesTab nav={nav} />}
      {movTab === 'escrow' && <EscrowTab nav={nav} />}
      {movTab === 'beneficios' && <BeneficiosTab />}
      {movTab === 'movimientos' && <MovimientosListTab nav={nav} />}
    </div>
  );
}

function ConfigScreen({ onBack, onOpenWallets, onOpenKYC, verification, notifOn, setNotifOn, onLogout }) {
  const statusLabel = { none:'No verificado', pending:'Pendiente de revisión', verified:'Verificado' }[verification.status];
  const statusColor = { none:'neutral', pending:'blue', verified:'green' }[verification.status];
  return (
    <div style={{ padding:'20px 20px 24px', display:'flex', flexDirection:'column', flex:1 }}>
      <ScreenHeader title="Configuración" onBack={onBack} />

      <KSection title="Cuenta" style={{ marginBottom:10 }} />
      <KCard style={{ padding:'6px 14px', marginBottom:20 }}>
        <KListRow
          onClick={onOpenKYC}
          thumbNode={<span style={{ color:ACCENT }}>{KIcons.shield}</span>}
          title="Verificación de identidad (KYC/KYB)"
          subtitle="Requerido para límites más altos de envío y P2P Fiat"
          trailing={<KTag label={statusLabel} color={statusColor} />}
        />
        <KListRow
          last
          onClick={onOpenWallets}
          thumbNode={<span style={{ color:'var(--kp-text)' }}>{KIcons.card}</span>}
          title="Wallets conectadas"
          subtitle="Gestioná las wallets vinculadas a KeyPay"
        />
      </KCard>

      <KSection title="Preferencias" style={{ marginBottom:10 }} />
      <KCard style={{ padding:'14px 16px', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontWeight:600, fontSize:13.5, color:'var(--kp-text)' }}>Notificaciones</div>
            <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>Avisos de pagos, distribuciones y P2P</div>
          </div>
          <button onClick={() => setNotifOn(v => !v)} style={{
            width:44, height:26, borderRadius:999, border:'none', cursor:'pointer', padding:2, flexShrink:0,
            background: notifOn ? ACCENT : 'var(--kp-surface2)', display:'flex', justifyContent: notifOn ? 'flex-end' : 'flex-start',
          }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:'#fff' }} />
          </button>
        </div>
      </KCard>

      <button onClick={onLogout} style={{
        padding:'13px', borderRadius:12, border:'1px solid rgba(255,90,90,0.25)', background:'rgba(255,90,90,0.08)',
        color:'#ff8a8a', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5, cursor:'pointer',
      }}>Cerrar sesión</button>
    </div>
  );
}

function PerfilScreen({ onBack, profile, setProfile, verification, onOpenKYC }) {
  const fileRef = useRef(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const statusLabel = { none:'No verificado', pending:'Pendiente de revisión', verified:'Verificado' }[verification.status];
  const statusColor = { none:'neutral', pending:'blue', verified:'green' }[verification.status];

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfile(p => ({ ...p, photo: URL.createObjectURL(file) }));
  };

  return (
    <div style={{ padding:'20px 20px 24px', display:'flex', flexDirection:'column', flex:1 }}>
      <ScreenHeader title="Perfil" onBack={onBack} />

      <div style={{ textAlign:'center', marginBottom:24 }}>
        <button onClick={() => fileRef.current?.click()} style={{ position:'relative', width:84, height:84, margin:'0 auto', border:'none', padding:0, cursor:'pointer', borderRadius:'50%' }}>
          {profile.photo ? (
            <img src={profile.photo} alt="" style={{ width:84, height:84, borderRadius:'50%', objectFit:'cover' }} />
          ) : (
            <div style={{ width:84, height:84, borderRadius:'50%', background:'linear-gradient(135deg,#7c5cff,#5b8cff)' }} />
          )}
          <div style={{ position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:'50%', background:'var(--kp-text)', color:'var(--kp-bg)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--kp-bg)' }}>{KIcons.camera}</div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onPickPhoto} />
      </div>

      <div style={{ marginBottom:14 }}>
        <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)', marginBottom:6 }}>Nombre</div>
        <input
          value={profile.name}
          onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
          style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:11, border:'1.5px solid var(--kp-border)', background:'var(--kp-surface2)', color:'var(--kp-text)', fontFamily:'var(--kp-font-b)', fontSize:14, outline:'none' }}
        />
      </div>
      <button
        onClick={() => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); }}
        style={{ padding:'12px', borderRadius:12, border:'none', background: savedFlash ? GREEN : 'var(--kp-text)', color: savedFlash ? '#08130a' : 'var(--kp-bg)', fontFamily:'var(--kp-font-b)', fontWeight:700, fontSize:13.5, cursor:'pointer', marginBottom:24 }}
      >{savedFlash ? 'Guardado ✓' : 'Guardar cambios'}</button>

      <KSection title="Verificación" style={{ marginBottom:10 }} />
      <KCard style={{ padding:'6px 14px' }}>
        <KListRow
          last
          onClick={onOpenKYC}
          thumbNode={<span style={{ color:ACCENT }}>{KIcons.shield}</span>}
          title={verification.type === 'business' ? 'Empresa (KYB)' : verification.type === 'individual' ? 'Persona (KYC)' : 'Verificación de identidad'}
          subtitle={verification.legalName || 'Todavía no iniciaste la verificación'}
          trailing={<KTag label={statusLabel} color={statusColor} />}
        />
      </KCard>
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
// `onClose` is optional: when supplied (e.g. mounted full-screen over the host
// app) a close control is shown; when omitted, KeyPay just renders inline,
// filling whatever container it's given — the shape needed to reuse it as a
// plain embeddable component elsewhere, or behind a future API-served widget.
function TutorialOverlay({ steps, step, onNext, onSkip }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const el = steps[step]?.ref.current;
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [step, steps]);

  if (!rect) return null;
  const pad = 8;
  const spot = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
  const isLast = step === steps.length - 1;
  const tooltipW = 280;
  const belowTop = spot.top + spot.height + 14;
  const flip = belowTop + 150 > window.innerHeight;
  const left = Math.min(Math.max(spot.left, 16), window.innerWidth - tooltipW - 16);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
      <motion.div
        animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed', borderRadius: 16, border: `2px solid ${ACCENT}`,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)', pointerEvents: 'none',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'fixed',
          ...(flip ? { bottom: window.innerHeight - spot.top + 14 } : { top: belowTop }),
          left, width: tooltipW,
          background: '#151517', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16,
          padding: '16px 18px', zIndex: 2, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontFamily: 'var(--kp-font-h)', fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 6 }}>{steps[step].title}</div>
        <div style={{ fontFamily: 'var(--kp-font-b)', fontSize: 12.5, color: '#b8b8be', lineHeight: 1.5, marginBottom: 14 }}>{steps[step].desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {steps.map((_, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === step ? ACCENT : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSkip} style={{ background: 'none', border: 'none', color: '#8a8a92', fontFamily: 'var(--kp-font-b)', fontSize: 12.5, cursor: 'pointer' }}>Saltar</button>
            <button onClick={onNext} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'var(--kp-font-b)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
              {isLast ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function KeyPay({ nav, onClose, initialModal = null, cartFocusId = null }) {
  const [screen, setScreen] = useState('home'); // home | movimientos | config | perfil
  const [movTab, setMovTab] = useState('fondos');
  const [modal, setModal] = useState(initialModal); // 'send' | 'receive' | 'cart' | 'swap' | 'p2pfiat' | 'wallets' | 'scan' | 'kyc' | null
  // Only the auto-open triggered by an external "Invertir"/buy button should
  // scope the cart to that single item — once the user manually reopens it
  // from KeyPay's own "Checkout" button, they mean "show me everything".
  const [cartFocus, setCartFocus] = useState(cartFocusId);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [scannedContact, setScannedContact] = useState(null);
  const [profile, setProfile] = useState({ name: 'Max', photo: null });
  const [verification, setVerification] = useState({ type: null, status: 'none', legalName: '', docId: '', country: '' });
  const pending = usePendingPayments();
  const total = WALLETS.reduce((s, w) => s + usdValue(w), 0);
  const account = useActiveAccount();
  const rootRef = useRef(null);
  const balanceRef = useRef(null);
  const actionsRef = useRef(null);
  const checkoutRef = useRef(null);
  const bottomBarRef = useRef(null);
  const [tourStep, setTourStep] = useState(-1); // -1 = not running

  // Live guided tour — runs once automatically on first visit (per browser),
  // and can always be re-triggered from the "?" button in the header.
  useEffect(() => {
    if (screen === 'home' && !localStorage.getItem('keypay_tour_seen')) {
      const t = setTimeout(() => setTourStep(0), 500);
      return () => clearTimeout(t);
    }
  }, []);

  const TOUR_STEPS = [
    { ref: balanceRef, title: 'Tu balance total', desc: 'Acá ves el total combinado de todas tus billeteras del ecosistema, siempre actualizado.' },
    { ref: actionsRef, title: 'Send & Request', desc: 'Enviá cripto a otra persona por x402, o generá un link/QR para que te paguen.' },
    { ref: checkoutRef, title: 'Checkout', desc: 'Cuando invertís desde KEYCHAIN (token FACT, tokenizaciones), el pago pendiente aparece acá para completarlo.' },
    { ref: bottomBarRef, title: 'Navegación', desc: 'Volver a KEYCHAIN, ver todos tus Movimientos, Configuración y tu Perfil — siempre a un toque.' },
  ];

  const endTour = () => { setTourStep(-1); localStorage.setItem('keypay_tour_seen', '1'); };
  const nextTourStep = () => setTourStep((s) => (s + 1 < TOUR_STEPS.length ? s + 1 : (endTour(), -1)));

  useEffect(() => {
    if (rootRef.current) {
      Object.entries(KP_VARS).forEach(([k, v]) => rootRef.current.style.setProperty(k, v));
    }
  }, []);

  // First bottom-bar button: back to the main KEYCHAIN app, not another
  // KeyPay screen.
  const goToMainApp = () => (onClose ? onClose() : nav?.('dashboard'));

  const pendingTotal = pending.reduce((s, i) => s + i.qty * i.unit, 0);

  return (
    <div
      ref={rootRef}
      style={{
        width: '100%', height: '100%',
        background: 'var(--kp-bg)',
        backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.10) 1.3px, transparent 1.3px)',
        backgroundSize:'24px 24px',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position:'absolute', top:20, right:0, left:0, display:'flex', justifyContent:'center', pointerEvents:'none', zIndex:20 }}>
        <div style={{ width:'100%', maxWidth:430, display:'flex', justifyContent:'flex-end', padding:'0 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative', pointerEvents:'auto' }}>
            <button onClick={() => { setScreen('home'); setTourStep(0); }} title="Tutorial guiado" style={{ width:36, height:36, borderRadius:'50%', border:'1px solid var(--kp-border)', background:'var(--kp-surface2)', color:'var(--kp-sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{KIcons.help}</button>
            <button
              onClick={() => setModal(screen === 'kyc' ? 'kycscan' : 'scan')}
              title={screen === 'kyc' ? 'Vincular empresa (QR)' : 'Escanear QR'}
              style={{ width:36, height:36, borderRadius:'50%', border:'1px solid var(--kp-border)', background:'var(--kp-surface2)', color:'var(--kp-sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
            >{KIcons.scan}</button>
            <div style={{ position:'relative' }}>
              <button onClick={() => setNotifOpen(v => !v)} title="Notificaciones" style={{ width:36, height:36, borderRadius:'50%', border:'1px solid var(--kp-border)', background:'var(--kp-surface2)', color:'var(--kp-sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
                {KIcons.bell}
                {notifOn && <div style={{ position:'absolute', top:7, right:8, width:7, height:7, borderRadius:'50%', background:GREEN, border:'1.5px solid var(--kp-bg)' }} />}
              </button>
              <AnimatePresence>{notifOpen && <NotificationsDropdown onClose={() => setNotifOpen(false)} />}</AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display:'flex', flexDirection:'column', paddingBottom:100 }}>
        <div style={{ maxWidth: 430, width:'100%', margin: '0 auto', display:'flex', flexDirection:'column', flex:1 }}>

          <AnimatePresence mode="wait">
          {screen === 'home' && (
            <motion.div key="home" initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:16 }} transition={{ duration:0.22 }} style={{ display:'flex', flexDirection:'column', flex:1 }}>
              {/* ── Hero ── */}
              <div style={{ padding:'20px 20px 24px' }}>
                <div style={{ marginBottom:20 }}>
                  <img src="/Logo/keypay.png" alt="Key Pay" style={{ height:30, width:'auto', display:'block' }} />
                </div>

                <HexCard style={{ padding:'20px 20px 22px', marginBottom:16 }}>
                  <div ref={balanceRef} style={{ display:'flex', flexDirection:'column' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:6 }}>
                      <div style={{ fontFamily:'var(--kp-font-b)', fontSize:13.5, color:'rgba(255,255,255,0.55)' }}>Total balance</div>
                      <button onClick={() => setModal('wallets')} title="Wallets" style={{
                        display:'flex', alignItems:'center', gap:6, padding:'6px 10px 6px 6px', flexShrink:0, minWidth:0,
                        borderRadius:999, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', cursor:'pointer',
                      }}>
                        <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#7c5cff,#5b8cff)' }} />
                        <span style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {account?.address ? `${account.address.slice(0,6)}…${account.address.slice(-4)}` : 'Wallet'}
                        </span>
                        <span style={{ color:'rgba(255,255,255,0.5)', display:'flex', flexShrink:0 }}>{KIcons.chevD}</span>
                      </button>
                    </div>
                    <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:800, fontSize:42, color:'#fff', letterSpacing:'-0.03em', marginBottom:28 }}>{fmt(total)}</div>
                  </div>

                  <div ref={actionsRef} style={{ display:'flex', gap:10 }}>
                    <motion.button whileTap={{ scale:0.96 }} whileHover={{ scale:1.03 }} onClick={() => setModal('send')} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:999, border:'none',
                      background:'#fff', color:'#000', fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14, cursor:'pointer',
                    }}>{KIcons.send} Send</motion.button>
                    <motion.button whileTap={{ scale:0.96 }} whileHover={{ scale:1.03 }} onClick={() => setModal('receive')} style={{
                      padding:'11px 20px', borderRadius:999, border:'1px solid rgba(255,255,255,0.25)',
                      background:'transparent', color:'#fff', fontFamily:'var(--kp-font-h)', fontWeight:600, fontSize:14, cursor:'pointer',
                    }}>Request</motion.button>
                  </div>
                </HexCard>

                <motion.button
                  ref={checkoutRef}
                  onClick={() => { setCartFocus(null); setModal('cart'); }}
                  animate={pending.length > 0 ? { boxShadow: ['0 0 0 0 rgba(245,185,66,0.35)', '0 0 0 8px rgba(245,185,66,0)', '0 0 0 0 rgba(245,185,66,0)'] } : {}}
                  transition={pending.length > 0 ? { duration: 2, repeat: Infinity, ease:'easeOut' } : {}}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:20, marginBottom:10,
                    border:'1px solid var(--kp-border)',
                    background: pending.length > 0 ? `linear-gradient(135deg, ${GOLD}14, var(--kp-surface))` : 'var(--kp-surface)',
                    cursor:'pointer', textAlign:'left',
                  }}
                >
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      {pending.length > 0 && (
                        <motion.span
                          animate={{ opacity: [1, 0.35, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                          style={{ width:7, height:7, borderRadius:'50%', background:GOLD, display:'inline-block' }}
                        />
                      )}
                      <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12.5, color:'var(--kp-ter)' }}>Checkout</span>
                    </div>
                    <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:17, color:'var(--kp-text)' }}>{fmt(pendingTotal)}</div>
                  </div>
                  {pending.length > 0 ? (
                    <KTag label={`${pending.length} pendiente${pending.length === 1 ? '' : 's'} · atender`} color="gold" />
                  ) : (
                    <span style={{ fontFamily:'var(--kp-font-b)', fontSize:12, color:'var(--kp-ter)' }}>Sin pendientes</span>
                  )}
                </motion.button>

                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <motion.button whileTap={{ scale:0.98 }} whileHover={{ y:-2 }} onClick={() => setModal('swap')} style={{
                    display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:18, overflow:'hidden', position:'relative',
                    border:`1px solid ${ACCENT}2e`, background:`linear-gradient(120deg, ${ACCENT}1c, var(--kp-surface) 65%)`, cursor:'pointer', textAlign:'left',
                  }}>
                    <IconBadge color={ACCENT} size={42}>{KIcons.swapBig}</IconBadge>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14.5, color:'var(--kp-text)', marginBottom:2 }}>Swap</div>
                      <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>Cambiá cripto al instante</div>
                    </div>
                    <span style={{ color:'var(--kp-ter)', flexShrink:0 }}>{KIcons.chevR}</span>
                  </motion.button>
                  <motion.button whileTap={{ scale:0.98 }} whileHover={{ y:-2 }} onClick={() => setModal('p2pfiat')} style={{
                    display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:18, overflow:'hidden', position:'relative',
                    border:`1px solid ${GOLD}2e`, background:`linear-gradient(120deg, ${GOLD}1c, var(--kp-surface) 65%)`, cursor:'pointer', textAlign:'left',
                  }}>
                    <IconBadge color={GOLD} size={42}>{KIcons.fiatBig}</IconBadge>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--kp-font-h)', fontWeight:700, fontSize:14.5, color:'var(--kp-text)', marginBottom:2 }}>P2P Fiat</div>
                      <div style={{ fontFamily:'var(--kp-font-b)', fontSize:11.5, color:'var(--kp-ter)' }}>Cripto ⇄ pesos, con escrow seguro</div>
                    </div>
                    <span style={{ color:'var(--kp-ter)', flexShrink:0 }}>{KIcons.chevR}</span>
                  </motion.button>
                </div>
              </div>

              {/* ── Sheet: balance breakdown + recent activity ── */}
              <div style={{ flex:1, background:'var(--kp-sheet)', borderRadius:'28px 28px 0 0', padding:'18px 20px 24px', display:'flex', flexDirection:'column' }}>
                <div style={{ width:36, height:4, borderRadius:999, background:'var(--kp-border)', margin:'0 auto 18px' }} />
                <ResumenTab wallets={WALLETS} total={total} nav={nav} onOpenWallets={() => setModal('wallets')} />
              </div>
            </motion.div>
          )}

          {screen === 'movimientos' && (
            <motion.div key="movimientos" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.22 }} style={{ display:'flex', flexDirection:'column', flex:1 }}>
              <MovimientosScreen onBack={() => setScreen('home')} movTab={movTab} setMovTab={setMovTab} nav={nav} onOpenWallets={() => setModal('wallets')} />
            </motion.div>
          )}

          {screen === 'kyc' && (
            <motion.div key="kyc" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.22 }} style={{ display:'flex', flexDirection:'column', flex:1 }}>
              <KycScreen onBack={() => setScreen('home')} profile={profile} verification={verification} onOpenKYC={() => setModal('kyc')} onOpenWallets={() => setModal('wallets')} />
            </motion.div>
          )}

          {screen === 'config' && (
            <motion.div key="config" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.22 }} style={{ display:'flex', flexDirection:'column', flex:1 }}>
              <ConfigScreen
                onBack={() => setScreen('home')}
                onOpenWallets={() => setModal('wallets')}
                onOpenKYC={() => setModal('kyc')}
                verification={verification}
                notifOn={notifOn}
                setNotifOn={setNotifOn}
                onLogout={goToMainApp}
              />
            </motion.div>
          )}

          {screen === 'perfil' && (
            <motion.div key="perfil" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.22 }} style={{ display:'flex', flexDirection:'column', flex:1 }}>
              <PerfilScreen
                onBack={() => setScreen('home')}
                profile={profile}
                setProfile={setProfile}
                verification={verification}
                onOpenKYC={() => setModal('kyc')}
              />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      <BottomBar screen={screen} setScreen={setScreen} containerRef={bottomBarRef} profile={profile} />

      <AnimatePresence>
        {modal === 'send' && <SendCheckout onClose={() => { setModal(null); setScannedContact(null); }} initialContact={scannedContact} />}
        {modal === 'receive' && <ReceiveModal onClose={() => setModal(null)} myName={profile.name} />}
        {modal === 'cart' && <CartCheckout onClose={() => setModal(null)} focusId={cartFocus} />}
        {modal === 'swap' && <SwapModal onClose={() => setModal(null)} />}
        {modal === 'p2pfiat' && <P2PFiatModal onClose={() => setModal(null)} />}
        {modal === 'wallets' && <WalletsModal onClose={() => setModal(null)} />}
        {modal === 'scan' && (
          <ScanQRModal
            onClose={() => setModal(null)}
            onScanned={(contact) => { setScannedContact(contact); setModal('send'); }}
          />
        )}
        {modal === 'kycscan' && <ScanQRModal mode="kyc" onClose={() => setModal(null)} />}
        {modal === 'kyc' && (
          <KYCModal
            verification={verification}
            onSubmit={(v) => setVerification(v)}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tourStep >= 0 && (
          <TutorialOverlay steps={TOUR_STEPS} step={tourStep} onNext={nextTourStep} onSkip={endTour} />
        )}
      </AnimatePresence>
    </div>
  );
}
