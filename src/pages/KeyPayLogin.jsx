import { ConnectButton } from 'thirdweb/react';
import { polygon } from 'thirdweb/chains';
import { motion } from 'framer-motion';
import { client } from '../lib/client';
import { KP_VARS } from './KeyPay';

// The single, centralized login gate for the whole platform — themed as
// Key Pay (not generic KEYCHAIN chrome) since connecting a wallet here is
// what unlocks Key Pay's own KYC + wallet/investment layer for every other
// part of the app. There is no other way into the platform: every CTA on
// the landing page routes here instead of bypassing straight to the app.
const BENEFITS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8.5 12l2.5 2.5L15.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    title: 'KYC global',
    desc: 'Verificá tu identidad una sola vez y quedá habilitado en toda la plataforma: proyectos, ICO, P2P Fiat y más.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h18" stroke="currentColor" strokeWidth="1.6"/><circle cx="16.5" cy="14.5" r="1.4" fill="currentColor"/></svg>
    ),
    title: 'Gestión de inversiones global',
    desc: 'Tus activos tokenizados, tu wallet y tus movimientos, centralizados en un solo lugar.',
  },
];

export default function KeyPayLogin({ onSuccess, onBack }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: KP_VARS['--kp-bg'],
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1.3px, transparent 1.3px)',
      backgroundSize: '24px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflowY: 'auto',
    }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer', color: KP_VARS['--kp-ter'],
          fontFamily: KP_VARS['--kp-font-b'], fontSize: 13.5, fontWeight: 600,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Volver
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{
          width: '100%', maxWidth: 420, borderRadius: 28, padding: '40px 32px',
          background: KP_VARS['--kp-surface'], border: `1px solid ${KP_VARS['--kp-border']}`,
          boxShadow: KP_VARS['--kp-shadow'],
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
          <img src="/Logo/keypay.png" alt="Key Pay" style={{ height: 34, width: 'auto', marginBottom: 24 }} />
          <h1 style={{
            fontFamily: KP_VARS['--kp-font-h'], fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em',
            color: KP_VARS['--kp-text'], margin: '0 0 8px',
          }}>Iniciá sesión con Key Pay</h1>
          <p style={{ fontFamily: KP_VARS['--kp-font-b'], fontSize: 13.5, color: KP_VARS['--kp-sec'], lineHeight: 1.5, margin: 0, maxWidth: 320 }}>
            Un solo inicio de sesión, centralizado, para todo KEYCHAIN.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 16,
              background: KP_VARS['--kp-surface2'], border: `1px solid ${KP_VARS['--kp-border-l']}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${KP_VARS['--kp-accent']}22`, color: KP_VARS['--kp-accent'],
              }}>{b.icon}</div>
              <div>
                <div style={{ fontFamily: KP_VARS['--kp-font-h'], fontWeight: 700, fontSize: 14, color: KP_VARS['--kp-text'], marginBottom: 3 }}>{b.title}</div>
                <div style={{ fontFamily: KP_VARS['--kp-font-b'], fontSize: 12.5, color: KP_VARS['--kp-sec'], lineHeight: 1.45 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="keypay-login-connect" style={{ width: '100%' }}>
          <ConnectButton
            client={client}
            chain={polygon}
            onConnect={onSuccess}
            connectButton={{
              label: 'Conectar wallet y entrar',
              style: {
                width: '100%', padding: '14px 20px', fontSize: 14.5,
                fontFamily: KP_VARS['--kp-font-b'], fontWeight: 700, borderRadius: 14,
                cursor: 'pointer', background: KP_VARS['--kp-accent'], color: KP_VARS['--kp-accent-fg'],
                border: 'none', boxShadow: '0 8px 24px rgba(108,99,255,0.35)',
              },
            }}
            connectModal={{ title: 'Conectar a Key Pay', titleIcon: '/Logo/keypay.png' }}
          />
        </div>

        <p style={{ fontFamily: KP_VARS['--kp-font-b'], fontSize: 11, color: KP_VARS['--kp-ter'], textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          Al conectar tu wallet aceptás verificar tu identidad (KYC) para operar en KEYCHAIN.
        </p>
      </motion.div>
    </div>
  );
}
