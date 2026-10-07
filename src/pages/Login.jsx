import { ConnectButton } from 'thirdweb/react';
import { polygon } from 'thirdweb/chains';
import { motion } from 'framer-motion';
import { client } from '../lib/client';

// KEYCHAIN's login gate: connecting a wallet is the single way into the
// platform (KYC, investments, deposits and withdrawals hang from it). Dark,
// like the landing it comes from.
const BENEFITS = [
  {
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>,
    title: 'Una sola verificación',
    desc: 'Hacés el KYC una vez y quedás habilitado para invertir, comprar en el mercado secundario y participar de la ICO.',
  },
  {
    icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></svg>,
    title: 'Tu saldo y tus inversiones',
    desc: 'Depositá y retirá cripto, pagá tus inversiones y cobrá rentas en USDC desde un mismo lugar.',
  },
];

const C = { bg: '#07080c', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', text: 'rgba(255,255,255,0.94)', sec: 'rgba(255,255,255,0.58)', ter: 'rgba(255,255,255,0.38)' };

export default function Login({ onSuccess, onBack }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: C.bg, overflowY: 'auto',
      backgroundImage: 'radial-gradient(ellipse at 50% -10%, rgba(60,110,255,0.22), transparent 55%), radial-gradient(circle, rgba(255,255,255,0.05) 1.2px, transparent 1.2px)',
      backgroundSize: '100% 100%, 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <button onClick={onBack}
        style={{ position: 'absolute', top: 22, left: 22, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.sec, fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Volver
      </button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ width: '100%', maxWidth: 420, borderRadius: 28, padding: '36px 28px 28px', background: 'rgba(12,14,22,0.78)', border: `1px solid ${C.border}`,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 26 }}>
          <img src="/3ds.png" alt="" style={{ width: 84, height: 84, objectFit: 'contain', marginBottom: 10, filter: 'drop-shadow(0 0 24px rgba(40,100,255,0.55))' }} />
          <img src="/logo-dark.png" alt="KEYCHAIN" style={{ height: 22, width: 'auto', marginBottom: 18 }} />
          <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em', color: C.text, margin: '0 0 8px' }}>Entrá a KEYCHAIN</h1>
          <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: C.sec, lineHeight: 1.5, margin: 0, maxWidth: 320 }}>Conectá tu wallet para invertir en activos reales tokenizados.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(127,178,255,0.12)', color: '#9cc3ff' }}>{b.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 3 }}>{b.title}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: C.sec, lineHeight: 1.45 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <ConnectButton
          client={client}
          chain={polygon}
          theme="dark"
          onConnect={onSuccess}
          connectButton={{
            label: 'Conectar wallet y entrar',
            style: { width: '100%', height: 52, fontSize: 15, fontFamily: 'var(--font-b)', fontWeight: 700, borderRadius: 14, cursor: 'pointer', background: '#fff', color: '#07080c', border: 'none', boxShadow: '0 10px 30px rgba(127,178,255,0.25)' },
          }}
          connectModal={{ title: 'Entrar a KEYCHAIN', titleIcon: '/icono.png' }}
        />

        <p style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: C.ter, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
          Al conectar tu wallet aceptás verificar tu identidad (KYC) para operar en KEYCHAIN.
        </p>
      </motion.div>
    </div>
  );
}
