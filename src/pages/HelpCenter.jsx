import { useState } from 'react';
import { motion } from 'framer-motion';
import { PCard, PSection, Icons } from '../components/ui';

const FAQS = [
  { q: '¿Cómo funciona la tokenización de activos?', a: 'Cada activo físico se divide en tokens ERC-20 en la blockchain de Polygon. Al comprar tokens, adquirís una fracción proporcional del activo y comenzás a recibir rendimientos mensuales en USDC.' },
  { q: '¿Cómo recibo los rendimientos?', a: 'Los rendimientos se distribuyen automáticamente cada mes directamente a tu wallet en USDC. El smart contract del proyecto ejecuta la distribución de forma transparente y sin intermediarios.' },
  { q: '¿Cómo puedo vender mis tokens?', a: 'Podés listar tus tokens en el Mercado Secundario para venderlos a otros inversores. También podés esperar el vencimiento del proyecto para recibir el capital más rendimientos acumulados.' },
  { q: '¿Qué es el proceso KYC?', a: 'El KYC (Know Your Customer) es el proceso de verificación de identidad requerido por regulaciones. Lo realizamos a través de Sumsub con verificación de documento e identidad facial.' },
  { q: '¿Cuál es la inversión mínima?', a: 'La inversión mínima es de 1 token por proyecto. El precio de cada token varía según el activo, comenzando desde $38 en proyectos de drones hasta $400 en grandes inmuebles.' },
  { q: '¿Mis inversiones están aseguradas?', a: 'Cada activo tokenizado cuenta con póliza de seguro independiente y custodia institucional. Los contratos inteligentes son auditados por CertiK antes de cada emisión.' },
  { q: '¿Qué es el token FACT?', a: 'FACT es el token de utilidad de FACTORACT. Otorga descuentos en fees, acceso anticipado a proyectos, participación en gobernanza y staking con APY de 9-14%.' },
  { q: '¿Cómo funciona el swap?', a: 'El swap te permite intercambiar tokens (USDC, MATIC, FACT, ETH) directamente en la plataforma usando liquidez de QuickSwap y Uniswap en Polygon.' },
];

const CATEGORIES = [
  { icon: Icons.primary,    title: 'Cómo invertir',      desc: '5 artículos'  },
  { icon: Icons.wallet,     title: 'Wallet y fondos',    desc: '8 artículos'  },
  { icon: Icons.shield,     title: 'KYC y seguridad',    desc: '4 artículos'  },
  { icon: Icons.token,      title: 'Token FACT',          desc: '6 artículos'  },
  { icon: Icons.swap,       title: 'Swap y DeFi',         desc: '3 artículos'  },
  { icon: Icons.secondary,  title: 'Mercado secundario',  desc: '4 artículos'  },
];

export default function HelpCenter() {
  const [open, setOpen] = useState(null);

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <PSection title="Centro de Ayuda" sub="Encontrá respuestas a las preguntas más frecuentes." />

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
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 18 }}>Preguntas frecuentes</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FAQS.map((faq, i) => (
          <motion.div key={i} layout style={{ borderBottom: '1px solid var(--border-l)' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
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
            {open === i && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ padding: '0 4px 18px', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', lineHeight: 1.65 }}
              >
                {faq.a}
              </motion.div>
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
