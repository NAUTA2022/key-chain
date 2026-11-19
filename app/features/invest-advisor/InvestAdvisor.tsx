import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AssetCategory, RwaAsset } from '~/data';
import type { NavFn } from '~/lib/navigation';
import { api, apiEnabled } from '~/lib/api/client';
import { useCatalog, type CatalogAsset } from '~/lib/catalog';
import { useSession } from '~/lib/session';
import { useT } from '~/i18n/useT';
import { sourceT, type TFn } from '~/features/market/i18n';

type ChatRole = 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string };
type Phase = 'chat' | 'results';

// The AI advisor runs on the backend (never call a model provider from the
// browser: any key shipped in the bundle is public). Without the API, or if the
// advisor is unavailable, the rule-based advisor below answers instead.
const hasAdvisorBackend = apiEnabled;

async function askClaude(messages: ChatMessage[]): Promise<string | null> {
  if (!apiEnabled) return null;
  const { data } = await api.POST('/v1/advisor/chat', { body: { messages } });
  return data?.text ?? null;
}

// Categories the advisor recognizes, in matching order; the words are `advisor.keywords.<category>`
// (Spanish always, plus the active language). The demo keeps its curated ids per category.
const KEYWORD_CATEGORIES: readonly AssetCategory[] = ['Autos', 'Campos', 'Drones', 'Edificios', 'Inmuebles'];
const DEMO_IDS: Partial<Record<AssetCategory, number[]>> = { Autos: [1, 2], Campos: [3, 4], Drones: [5], Edificios: [6, 8], Inmuebles: [7] };

const keywordsOf = (cat: AssetCategory, t: TFn) =>
  [sourceT(`advisor.keywords.${cat}`), t(`advisor.keywords.${cat}`)].join(',').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);

const topByApy = (list: readonly RwaAsset[]) => [...list].sort((a, b) => b.apy - a.apy).slice(0, 3).map(a => a.id);

// Rule-based fallback when no API key
function smartRecommend(history: ChatMessage[], catalog: readonly RwaAsset[], live: boolean, t: TFn): { text: string; ids: number[] } {
  const text = history.map(m => m.content).join(' ').toLowerCase();
  const budget = parseInt(text.match(/\d+/)?.[0] || '0');
  const affordable = catalog.filter(a => budget === 0 || a.tokenPrice <= Math.max(budget / 5, 50));
  let ids: number[];
  const cat = KEYWORD_CATEGORIES.find(c => keywordsOf(c, t).some(w => text.includes(w)));
  if (live) {
    ids = topByApy(cat ? catalog.filter(a => a.cat === cat) : affordable);
    if (!ids.length) ids = topByApy(catalog);
  } else {
    const curated = cat ? DEMO_IDS[cat] : undefined;
    // recommend highest APY options
    ids = curated ?? topByApy(affordable);
    if (!ids.length) ids = [3, 5, 1];
  }
  const assets = ids.map(id => catalog.find(a => a.id === id)).filter((a): a is RwaAsset => Boolean(a));
  if (!assets.length) {
    return { text: t('advisor.noProjects'), ids: [] };
  }
  return {
    text: `${t('advisor.recIntro')}\n\n${assets.map(a => t('advisor.recItem', { name: a.name, apy: a.apy, price: a.tokenPrice, desc: a.desc.slice(0, 80) })).join('\n\n')}\n\n${t('advisor.recOutro')}`,
    ids,
  };
}

function parseRecommendations(text: string): number[] {
  const match = text.match(/RECOMENDACIONES:\s*\[([^\]]+)\]/);
  if (!match) return [];
  return match[1].split(',').map(s => parseInt(s.trim())).filter(Boolean);
}

type MsgBubbleProps = { msg: ChatMessage };

function MsgBubble({ msg }: MsgBubbleProps) {
  const isAI = msg.role === 'assistant';
  // Clean up the RECOMENDACIONES line for display
  const display = msg.content.replace(/\nRECOMENDACIONES:\s*\[[^\]]+\]/g, '').trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', justifyContent: isAI ? 'flex-start' : 'flex-end', marginBottom: 12 }}
    >
      {isAI && (
        <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(48,120,255,0.18)', border: '1px solid rgba(48,120,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="rgba(80,150,255,0.9)"/><circle cx="12" cy="12" r="10" stroke="rgba(80,150,255,0.6)" strokeWidth="1.5" fill="none"/><path d="M8 12h8M12 8v8" stroke="rgba(80,150,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      )}
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isAI ? 'rgba(48,120,255,0.12)' : 'rgba(255,255,255,0.09)',
        border: `1px solid ${isAI ? 'rgba(48,120,255,0.25)' : 'rgba(255,255,255,0.12)'}`,
        fontFamily: 'var(--font-b)',
        fontSize: 13.5,
        color: 'rgba(255,255,255,0.90)',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
      }}>
        {display}
      </div>
    </motion.div>
  );
}

type RecommendationCardProps = { asset: RwaAsset; nav: NavFn; onClose: () => void };

function RecommendationCard({ asset, nav, onClose }: RecommendationCardProps) {
  const { t } = useT('market');
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'rgba(0,0,0,0.50)',
        backdropFilter: 'blur(2px)',
        border: '1px solid rgba(48,120,255,0.25)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={() => { nav('detalle', asset); onClose(); }}
    >
      <img src={asset.img} alt={asset.name} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>{asset.name}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(80,160,255,0.9)', fontWeight: 700 }}>APY {asset.apy}%</span>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)' }}>{t('advisor.tokenPrice', { price: asset.tokenPrice })}</span>
        </div>
      </div>
    </motion.div>
  );
}

type InvestAdvisorProps = { onClose: () => void; nav: NavFn };

export default function InvestAdvisor({ onClose, nav }: InvestAdvisorProps) {
  const { assets: catalog } = useCatalog();
  const live = useSession().status !== 'disabled';
  const { t, raw } = useT('market');
  // Greeting on mount (in the language active when the chat opens).
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ role: 'assistant', content: t(hasAdvisorBackend ? 'advisor.greetingAi' : 'advisor.greeting') }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recIds, setRecIds] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('chat'); // chat | results
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasKey = hasAdvisorBackend;

  // Focus the input once the modal has animated in.
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      let aiText: string | null = null;

      if (hasKey) {
        aiText = await askClaude(newMessages.map(m => ({ role: m.role, content: m.content })));
      }

      if (aiText) {
        const ids = parseRecommendations(aiText);
        if (ids.length) {
          setRecIds(ids);
          setPhase('results');
        }
        setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
      } else {
        // Fallback: after 3 user messages give recommendations
        if (newMessages.filter(m => m.role === 'user').length >= 2) {
          const { text, ids } = smartRecommend(newMessages, catalog, live, t);
          setMessages(prev => [...prev, { role: 'assistant', content: text }]);
          setRecIds(ids);
          setPhase('results');
        } else {
          const followUps = raw<string[]>('advisor.followUps');
          const q = followUps[newMessages.filter(m => m.role === 'user').length - 1] || t('advisor.anythingElse');
          setMessages(prev => [...prev, { role: 'assistant', content: q }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('advisor.error') }]);
    }
    setLoading(false);
  };

  const recAssets = recIds.map(id => catalog.find(a => a.id === id)).filter((a): a is CatalogAsset => Boolean(a));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          width: '100%', maxWidth: 540,
          background: 'rgba(10,10,12,0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '88vh', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(48,120,255,0.15)', border: '1px solid rgba(48,120,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="rgba(80,150,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.95)' }}>{t('advisor.title')}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(80,150,255,0.8)' }}>{t('advisor.poweredBy')}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ter)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          {messages.map((m, i) => <MsgBubble key={i} msg={m} />)}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(48,120,255,0.18)', border: '1px solid rgba(48,120,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 12h8M12 8v8" stroke="rgba(80,150,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'rgba(48,120,255,0.12)', border: '1px solid rgba(48,120,255,0.25)', borderRadius: '4px 16px 16px 16px' }}>
                {[0,1,2].map(i => (
                  <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(80,150,255,0.8)' }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Recommendations */}
          <AnimatePresence>
            {phase === 'results' && recAssets.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 8 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t('advisor.recommended')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {recAssets.map(a => <RecommendationCard key={a.id} asset={a} nav={nav} onClose={onClose} />)}
                </div>
                <button
                  onClick={() => { nav('primario'); onClose(); }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.95)', color: '#050505',
                    fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5,
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {t('advisor.viewAll')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={t('advisor.placeholder')}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.90)', fontFamily: 'var(--font-b)', fontSize: 13.5,
              outline: 'none',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 40, height: 40, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: input.trim() && !loading ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke={input.trim() && !loading ? '#050505' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
