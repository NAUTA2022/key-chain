import { appChain } from '~/lib/onchain';
import type { ReactNode } from 'react';
import { polygon } from 'thirdweb/chains';
import { motion } from 'framer-motion';
import { ConnectEmbed, darkTheme } from 'thirdweb/react';
import { useSession } from '~/lib/session';
import { client } from '~/lib/thirdweb';

// KEYCHAIN's login gate: connecting a wallet is the single way into the
// platform (KYC, investments, deposits and withdrawals hang from it). Dark,
// like the landing it comes from. With the backend enabled, the shared
// embedded sign-in also signs the SIWE message and opens the server session.
type Benefit = { icon: ReactNode; title: string; desc: string };

const BENEFITS: Benefit[] = [
  {
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>,
    title: 'Una sola verificación',
    desc: 'Hacés el KYC una vez y quedás habilitado para invertir, comprar en el mercado secundario y participar de la ICO.',
  },
  {
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></svg>,
    title: 'Tu saldo y tus inversiones',
    desc: 'Depositá y retirá cripto, pagá tus inversiones y cobrá rentas en USDC desde un mismo lugar.',
  },
];

const C = { bg: '#07080c', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.94)', sec: 'rgba(255,255,255,0.58)', ter: 'rgba(255,255,255,0.38)' } as const;

export type LoginProps = {
  /** Wallet connected (demo mode) — the route decides where to go next. */
  onSuccess: () => void;
  onBack: () => void;
};

// thirdweb's own sign-in UI, embedded in KEYCHAIN's page: same wallet options (email, social, external
// wallets) and SIWE, restyled to the login card instead of opening thirdweb's modal.
const LOGIN_THEME = darkTheme({
  colors: {
    modalBg: 'transparent', borderColor: 'rgba(255,255,255,0.10)', separatorLine: 'rgba(255,255,255,0.08)',
    primaryText: C.text, secondaryText: C.sec, accentText: '#9cc3ff',
    primaryButtonBg: '#ffffff', primaryButtonText: '#07080c',
    secondaryButtonBg: 'rgba(255,255,255,0.06)', secondaryButtonHoverBg: 'rgba(255,255,255,0.10)', secondaryButtonText: C.text,
    connectedButtonBg: 'rgba(255,255,255,0.06)', connectedButtonBgHover: 'rgba(255,255,255,0.10)',
    inputAutofillBg: 'rgba(255,255,255,0.06)', tooltipBg: '#0c0e16', tooltipText: C.text, selectedTextBg: 'rgba(127,178,255,0.25)', selectedTextColor: C.text,
  },
  fontFamily: 'var(--font-b)',
});

export default function Login({ onSuccess, onBack }: LoginProps) {
  const { connectAuth } = useSession();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: C.bg, overflowY: 'auto',
      backgroundImage: 'radial-gradient(ellipse at 50% -10%, rgba(60,110,255,0.22), transparent 55%), radial-gradient(circle, rgba(255,255,255,0.05) 1.2px, transparent 1.2px)',
      backgroundSize: '100% 100%, 24px 24px', display: 'flex', justifyContent: 'center', padding: '64px 16px 24px',
    }}>
      <button type="button" onClick={onBack}
        style={{ position: 'absolute', top: 22, left: 22, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.sec, fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Volver
      </button>

      <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="kc-login-card" style={{ width: '100%', maxWidth: 880, margin: 'auto', borderRadius: 28, padding: '32px 32px 28px', background: 'rgba(12,14,22,0.78)', border: `1px solid ${C.border}`,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <div className="kc-login-grid">
        <div className="kc-login-intro">
        <div className="kc-login-head" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
          <img src="/3ds.webp" alt="" width={84} height={84} style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 8, filter: 'drop-shadow(0 0 24px rgba(40,100,255,0.55))' }} />
          <img src="/logo-dark.png" alt="KEY CHAIN" style={{ height: 22, width: 'auto', marginBottom: 14 }} />
          <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', color: C.text, margin: '0 0 8px' }}>Entrá a KEYCHAIN</h1>
          <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: C.sec, lineHeight: 1.5, margin: 0, maxWidth: 320 }}>Conectá tu wallet para invertir en activos reales tokenizados.</p>
        </div>

        <ul className="kc-login-benefits" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 0, listStyle: 'none', padding: 0, marginTop: 0 }}>
          {BENEFITS.map(b => (
            <li key={b.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(127,178,255,0.12)', color: '#9cc3ff' }}>{b.icon}</div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: C.text, margin: '0 0 3px' }}>{b.title}</h2>
                <p style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: C.sec, lineHeight: 1.45, margin: 0 }}>{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        </div>

        <div className="kc-login-form">
        <ConnectEmbed
          client={client}
          chain={appChain ?? polygon}
          theme={LOGIN_THEME}
          auth={connectAuth}
          modalSize="compact"
          locale="es_ES"
          showThirdwebBranding={false}
          onConnect={onSuccess}
          style={{ width: '100%', maxWidth: '100%', border: 'none', background: 'transparent', boxShadow: 'none', borderRadius: 0, height: 'auto', minHeight: 0 }}
        />

        <p style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: C.ter, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
          Al conectar tu wallet aceptás verificar tu identidad (KYC) para operar en KEYCHAIN.
        </p>
        </div>
        </div>
      </motion.main>
    </div>
  );
}
