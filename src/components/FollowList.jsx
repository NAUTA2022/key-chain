import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CompanyAvatar } from './ui';
import { useFollowing, useFollowingPeople, fmtCount } from '../lib/projectFeed';
import { personByName } from '../lib/people';
import { ME } from '../lib/me';

// Seguir / Siguiendo pill. `kind` = 'person' | 'company'.
export function FollowButton({ kind, name, small }) {
  const [companies, toggleCompany] = useFollowing();
  const [people, togglePerson] = useFollowingPeople();
  if (kind === 'person' && name === ME.name) return null;
  const on = kind === 'company' ? companies.includes(name) : people.includes(name);
  const toggle = kind === 'company' ? toggleCompany : togglePerson;
  return (
    <button onClick={e => { e.stopPropagation(); toggle(name); }}
      style={{
        height: small ? 30 : 36, padding: small ? '0 14px' : '0 22px', borderRadius: 999, cursor: 'pointer', flexShrink: 0,
        fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: small ? 12 : 13,
        border: on ? '1px solid var(--border-l)' : '1px solid var(--text)',
        background: on ? 'transparent' : 'var(--text)', color: on ? 'var(--text)' : 'var(--bg)',
      }}>
      {on ? 'Siguiendo' : 'Seguir'}
    </button>
  );
}

// "N Seguidores · M Seguidos" — each opens the list.
export function SocialCounts({ followers, following, onOpen, style }) {
  const item = (n, label, tab) => (
    <button onClick={() => onOpen(tab)}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--ter)' }}>
      <b style={{ color: 'var(--text)' }}>{fmtCount(n)}</b> {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', ...style }}>
      {item(followers, 'Seguidores', 'followers')}
      {following != null && item(following, 'Seguidos', 'following')}
    </div>
  );
}

// Modal with one or more tabs of people / companies. Rows open the profile
// and carry their own Seguir button. `tabs`: [{ id, label, items: [{ kind, name }], more }].
export default function FollowListModal({ title, tabs, initialTab, onClose, nav }) {
  const [tab, setTab] = useState(initialTab || tabs[0].id);
  const current = tabs.find(t => t.id === tab) || tabs[0];
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = (it) => {
    onClose();
    if (it.kind === 'company') nav('empresa', it.name);
    else if (it.name === ME.name) nav('perfil');
    else nav('usuario', it.name);
  };

  return createPortal(
    <div onClick={onClose} role="presentation"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div onClick={e => e.stopPropagation()} role="dialog" aria-label={title}
        initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}
        style={{ width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px 0' }}>
          <div style={{ flex: 1, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--surface2)', color: 'var(--sec)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '10px 18px 0', borderBottom: '1px solid var(--border-l)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--text)' : 'var(--ter)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--text)' : 'transparent'}`, marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', padding: '6px 18px 14px' }}>
          {current.items.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>Nadie por acá todavía.</div>
          )}
          {current.items.map(it => {
            const person = it.kind === 'person' ? (it.name === ME.name ? { ...ME, handle: 'vos' } : personByName(it.name)) : null;
            return (
              <div key={`${it.kind}-${it.name}`} onClick={() => open(it)} role="button"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-l)', cursor: 'pointer' }}>
                {it.kind === 'company'
                  ? <CompanyAvatar company={it.name} size={40} />
                  : <div style={{ width: 40, height: 40, borderRadius: '50%', background: person.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{person.initial}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name === ME.name ? `${ME.name} (vos)` : it.name}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{it.kind === 'company' ? 'Empresa' : person.company ? `Dueño de ${person.company}` : `@${person.handle}`}</div>
                </div>
                <FollowButton kind={it.kind} name={it.name} small />
              </div>
            );
          })}
          {current.more > 0 && (
            <div style={{ padding: '12px 0 0', textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>y {fmtCount(current.more)} más</div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
