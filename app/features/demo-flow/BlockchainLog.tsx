import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '~/i18n/useT';
import type { DemoRun } from './api';

/** Step of each recorded transaction kind; its plain-language name is `demo.chain.<kind>`. */
const KIND_STEP: Record<string, number> = { fund: 1, approve: 2, invest: 2, deposit: 3, claim: 4, sweep: 5 };

function describe(key: string, t: (key: string, vars?: Record<string, string | number>) => string): { step: number; text: string } | null {
  const [kind, idx] = key.split(':');
  const step = Object.hasOwn(KIND_STEP, kind) ? KIND_STEP[kind] : undefined;
  return step === undefined ? null : { step, text: t(`demo.chain.${kind}`, { w: `W${Number(idx) + 1}` }) };
}

type Receipt = { blockNumber: number; status: 'ok' | 'failed'; from: string; to: string | null; gasUsed: number };

/** Reads the transaction receipt straight from the network: the proof does not depend on our API. */
async function fetchReceipt(rpcUrl: string, hash: string): Promise<Receipt | null> {
  const res = await fetch(rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [hash] }) });
  const json = (await res.json()) as { result?: { blockNumber: string; status: string; from: string; to: string | null; gasUsed: string } | null };
  const r = json.result;
  return r ? { blockNumber: parseInt(r.blockNumber, 16), status: r.status === '0x1' ? 'ok' : 'failed', from: r.from, to: r.to, gasUsed: parseInt(r.gasUsed, 16) } : null;
}

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

/**
 * "La blockchain lo registra todo": every movement of the run as a block in a chain, newest last.
 * Opening a block reads its receipt from the network itself (block number, status, from/to).
 */
export default function BlockchainLog({ run, rpcUrl, networkName }: { run: DemoRun | null; rpcUrl: string | null; networkName: string }) {
  const { t, locale } = useT('market');
  const txs = (run?.steps ?? []).flatMap(s => {
    const d = describe(s.key, t);
    return d && s.txHash?.startsWith('0x') ? [{ ...d, key: s.key, hash: s.txHash }] : [];
  });
  const [open, setOpen] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ hash: string; data: Receipt | null; error: boolean } | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  // New blocks slide in at the end of the chain: keep it scrolled to the newest.
  useEffect(() => {
    const el = rail.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, [txs.length]);

  const toggle = (hash: string) => {
    if (open === hash) { setOpen(null); return; }
    setOpen(hash);
    if (!rpcUrl || receipt?.hash === hash) return;
    setReceipt({ hash, data: null, error: false });
    fetchReceipt(rpcUrl, hash).then(data => setReceipt({ hash, data, error: data === null }), () => setReceipt({ hash, data: null, error: true }));
  };
  const selected = txs.find(tx => tx.hash === open);

  return (
    <section aria-labelledby="df-chain" style={{ display: 'grid', gap: 12 }}>
      <div>
        <h2 id="df-chain" style={{ margin: '0 0 4px', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' }}>{t('demo.chain.title')}</h2>
        <p style={{ margin: 0, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.55, maxWidth: '70ch' }}>
          {t('demo.chain.intro', { network: networkName })}
        </p>
      </div>
      {txs.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '14px 0' }}>{t('demo.chain.empty')}</div>
      ) : (
        <div ref={rail} style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '4px 2px 10px', scrollbarWidth: 'thin' }}>
          <AnimatePresence initial={false}>
            {txs.map((tx, i) => (
              <motion.div key={tx.key} layout initial={{ opacity: 0, x: 24, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                {i > 0 && <span aria-hidden style={{ width: 18, height: 2, background: 'var(--border)', flex: '0 0 18px' }} />}
                <button type="button" onClick={() => toggle(tx.hash)} aria-expanded={open === tx.hash}
                  style={{ textAlign: 'left', width: 150, padding: '10px 11px', borderRadius: 12, cursor: 'pointer', background: open === tx.hash ? 'var(--surface2)' : 'var(--surface)', border: `1px solid ${open === tx.hash ? 'var(--text)' : 'var(--border)'}`, boxShadow: 'var(--sh-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('demo.chain.step', { n: tx.step })}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700, color: 'var(--pos)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {t('demo.chain.confirmed')}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.25, minHeight: 32 }}>{tx.text}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{short(tx.hash)}</div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {selected && (
        <div role="region" aria-label={t('demo.chain.proof')} style={{ background: 'var(--surface2)', borderRadius: 14, padding: '12px 14px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', display: 'grid', gap: 6 }}>
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>{selected.text}</div>
          {!rpcUrl ? <span>{t('demo.chain.noRpc')}</span>
            : receipt?.hash !== selected.hash || (!receipt.data && !receipt.error) ? <span>{t('demo.chain.reading')}</span>
              : receipt.error || !receipt.data ? <span>{t('demo.chain.readFailed')}</span>
                : (
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content minmax(0,1fr)', gap: '4px 14px', fontVariantNumeric: 'tabular-nums' }}>
                    <dt>{t('demo.chain.block')}</dt><dd style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>#{receipt.data.blockNumber.toLocaleString(locale)}</dd>
                    <dt>{t('demo.chain.status')}</dt><dd style={{ margin: 0, color: receipt.data.status === 'ok' ? 'var(--pos)' : 'var(--neg)', fontWeight: 700 }}>{receipt.data.status === 'ok' ? t('demo.chain.statusOk') : t('demo.chain.statusFailed')}</dd>
                    <dt>{t('demo.chain.from')}</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{receipt.data.from}</dd>
                    <dt>{t('demo.chain.to')}</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{receipt.data.to ?? '—'}</dd>
                    <dt>{t('demo.chain.tx')}</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{selected.hash}</dd>
                  </dl>
                )}
        </div>
      )}
    </section>
  );
}
