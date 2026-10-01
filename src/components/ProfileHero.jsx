import { motion } from 'framer-motion';

// The personal-profile cover: dark aurora gradient with soft animated blobs,
// a dot grid and two diagonal highlights. Fills its (relative) parent — it's
// the cover of the profile card, like a company's cover photo.
export function AuroraCover() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* Base gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(125deg, #0a0e1a 0%, #0d1535 30%, #141060 55%, #1a0a2e 80%, #0a1628 100%)',
        }} />

        {/* Noise texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* Large aurora blobs */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.75, 0.55] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: -80, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(130,71,229,0.55) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          style={{ position: 'absolute', bottom: -60, left: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.50) 0%, transparent 70%)', filter: 'blur(45px)' }}
        />
        <motion.div
          animate={{ x: [-10, 10, -10], opacity: [0.25, 0.40, 0.25] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{ position: 'absolute', top: 30, left: '38%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,200,246,0.35) 0%, transparent 70%)', filter: 'blur(35px)' }}
        />

        {/* Dot grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Diagonal highlight line */}
        <div style={{
          position: 'absolute', top: 0, left: '25%', width: 1, height: '160%',
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)',
          transform: 'rotate(-20deg)', transformOrigin: 'top center',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '60%', width: 1, height: '160%',
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.05), transparent)',
          transform: 'rotate(-20deg)', transformOrigin: 'top center',
        }} />

        {/* Bottom fade to page bg */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.25))',
        }} />
    </div>
  );
}
