import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PSection, Icons } from '~/components/ui';
import HelpCenterLive from '~/features/support/HelpCenterLive';
import { useSession } from '~/lib/session';

export type Faq = { q: string; a: string };

// eslint-disable-next-line react-refresh/only-export-components -- FAQS also feeds the FAQPage JSON-LD in app/routes/ayuda.tsx
export const FAQS: Faq[] = [
  { q: "¿Cómo funciona la tokenización de activos?", a: "Cada activo real se representa con un token de seguridad ERC-3643. Al invertir recibes tokens en proporción a tu aporte en USDC y solo las wallets con identidad verificada pueden tenerlos o recibirlos." },
  { q: "¿Cómo recibo los rendimientos?", a: "Cuando un proyecto distribuye dividendos, la plataforma publica el reparto on-chain con una prueba Merkle. Te avisamos y lo cobras en USDC desde Mis pertenencias, directo a tu wallet." },
  { q: "¿Cómo puedo vender mis tokens?", a: "El mercado secundario entre inversores está en desarrollo. Si un activo se liquida, cobras tu capital desde Mis pertenencias al precio de liquidación." },
  { q: "¿Qué es el proceso KYC?", a: "Es la verificación de identidad que exigen las normas de prevención de lavado de dinero. Completas tus datos en Perfil → KYC, el equipo los revisa y, al aprobarlos, registramos tu identidad on-chain para habilitar tus inversiones." },
  { q: "¿Cuál es la inversión mínima?", a: "Un token. El precio de cada token figura en la ficha de cada proyecto, junto con la cantidad disponible." },
  { q: "¿Qué riesgos tiene invertir?", a: "Toda inversión en activos reales puede perder valor y los rendimientos estimados no están garantizados. Revisa los documentos de cada proyecto antes de invertir y diversifica." },
  { q: "¿Qué es el token BRIK?", a: "BRIK es el token de utilidad de Brikme. Su preventa todavía no abrió; los beneficios previstos son descuentos en comisiones, acceso anticipado a proyectos y participación en la gobernanza." },
  { q: "¿Estoy usando dinero real?", a: "No mientras la plataforma esté en su entorno de pruebas: los USDC y POL son de prueba y no tienen valor. Puedes pedir fondos de prueba desde Mis pertenencias." },
];

const CATEGORIES = [
  { icon: Icons.primary,    title: 'Cómo invertir',      desc: '5 artículos'  },
  { icon: Icons.wallet,     title: 'Wallet y fondos',    desc: '8 artículos'  },
  { icon: Icons.shield,     title: 'KYC y seguridad',    desc: '4 artículos'  },
  { icon: Icons.token,      title: 'Token BRIK',          desc: '6 artículos'  },
  { icon: Icons.swap,       title: 'Swap y DeFi',         desc: '3 artículos'  },
  { icon: Icons.secondary,  title: 'Mercado secundario',  desc: '4 artículos'  },
];

export default function HelpCenter() {
  const { status } = useSession();
  // With the API: real FAQ, tickets and assistant. Without it: the original demo page, unchanged.
  return status === 'disabled' ? <HelpCenterDemo /> : <HelpCenterLive />;
}

function HelpCenterDemo() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <PSection title="Centro de Ayuda" sub="Encuentra respuestas a las preguntas más frecuentes." />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', borderRadius: 16, padding: '14px 20px', border: '1.5px solid var(--border)', marginBottom: 32, boxShadow: 'var(--sh-sm)' }}>
        {Icons.search}
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 15, color: 'var(--ter)' }}>Buscar en el centro de ayuda…</span>
      </div>

      {/* Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 36 }}>
        {CATEGORIES.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }}>
            <PCard style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>{c.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.title}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{c.desc}</div>
              </div>
            </PCard>
          </motion.div>
        ))}
      </div>

      {/* FAQs */}
      <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 18 }}>Preguntas frecuentes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FAQS.map((faq, i) => (
          <motion.div key={i} layout style={{ borderBottom: '1px solid var(--border-l)' }}>
            <h3>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              aria-controls={`faq-${i}`}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 15, color: 'var(--text)', flex: 1, paddingRight: 20 }}>{faq.q}</span>
              <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'var(--ter)', flexShrink: 0 }}>
                {Icons.plus}
              </motion.span>
            </button>
            </h3>
            {/* Closed answers stay in the HTML (hidden) so crawlers and answer engines can read them. */}
            {open === i ? (
              <motion.div
                id={`faq-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ padding: '0 4px 18px', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.65 }}
              >
                {faq.a}
              </motion.div>
            ) : (
              <div id={`faq-${i}`} hidden>{faq.a}</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Contact */}
      <PCard style={{ padding: '24px 28px', marginTop: 32, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>¿No encontraste lo que buscabas?</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', marginBottom: 18 }}>Nuestro equipo de soporte responde en menos de 4 horas hábiles.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={{ padding: '12px 24px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text)' }}>Abrir un ticket</button>
          <button style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'var(--accent)', fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--accent-fg)' }}>Chat en vivo</button>
        </div>
      </PCard>
    </div>
  );
}
