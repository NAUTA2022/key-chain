import { motion } from 'framer-motion';
import { PTag } from './ui';
import IdentityAvatar from './IdentityAvatar';

// The personal-profile header (aurora banner, round photo overlapping it,
// name + tags, subtitle), shared by my own Perfil and by the profile of any
// company's owner so every user profile looks the same.
// `user` = { name, initial, gradient }; `company` adds its hexagon as the
// photo's badge (tap → `onSwap`); `switchSlot` sits on the banner's top right
// and `action` at the end of the name row.
export default function ProfileHero({ user, company, onSwap, switchSlot, tags = [], subtitle, action }) {
  return (
    <>
      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden', borderRadius: '0 0 32px 32px' }}>
        {switchSlot && (
          <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 2 }}>{switchSlot}</div>
        )}
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

      {/* ── Avatar + name ───────────────────────────────────────── */}
      <div style={{ padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: -44, flexWrap: 'wrap' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            {/* Big round photo; the company's hexagon as a badge (tap to switch) */}
            <IdentityAvatar mode="personal" company={company} size={84} ring="var(--bg)" user={user} onSwap={onSwap} />
          </motion.div>

          <div style={{ flex: 1, paddingBottom: 4, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 26, color: 'var(--text)', letterSpacing: '-0.03em' }}>{user.name}</div>
              {tags.map(([label, color]) => <PTag key={label} label={label} color={color} />)}
            </div>
            {subtitle && (
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 4 }}>{subtitle}</div>
            )}
          </div>
          {action}
        </div>
      </div>
    </>
  );
}
