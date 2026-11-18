import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DemoRun } from './api';

/** Plain-language name of each recorded transaction. */
function describe(key: string): { step: number; text: string } | null {
  const [kind, idx] = key.split(':');
  const w = `W${Number(idx) + 1}`;
  switch (kind) {
    case 'fund': return { step: 1, text: `${w} recibió 1 USD` };
    case 'approve': return { step: 2, text: `${w} autorizó la compra` };
    case 'invest': return { step: 2, text: `${w} compró 1 parte` };
    case 'deposit': return { step: 3, text: 'La empresa depositó la ganancia' };
    case 'claim': return { step: 4, text: `${w} cobró 1 USD` };
    case 'sweep': return { step: 5, text: `${w} te envió 1 USD` };
    default: return null;
  }
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
  const txs = (run?.steps ?? []).flatMap(s => {
    const d = describe(s.key);
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
  const selected = txs.find(t => t.hash === open);

  return (
    <section aria-labelledby="df-chain" style={{ display: 'grid', gap: 12 }}>
      <div>
        <h2 id="df-chain" style={{ margin: '0 0 4px', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' }}>La blockchain lo registra todo</h2>
        <p style={{ margin: 0, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.55, maxWidth: '70ch' }}>
          Cada movimiento es una transacción que queda guardada en un bloque, encadenado al anterior. Nadie la puede borrar ni cambiar. Tocá un bloque para ver la prueba leída directo de la red ({networkName}).
        </p>
      </div>
      {txs.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '14px 0' }}>Los bloques aparecen acá apenas empieza la demo.</div>
      ) : (
        <div ref={rail} style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '4px 2px 10px', scrollbarWidth: 'thin' }}>
          <AnimatePresence initial={false}>
            {txs.map((t, i) => (
              <motion.div key={t.key} layout initial={{ opacity: 0, x: 24, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                {i > 0 && <span aria-hidden style={{ width: 18, height: 2, background: 'var(--border)', flex: '0 0 18px' }} />}
                <button type="button" onClick={() => toggle(t.hash)} aria-expanded={open === t.hash}
                  style={{ textAlign: 'left', width: 150, padding: '10px 11px', borderRadius: 12, cursor: 'pointer', background: open === t.hash ? 'var(--surface2)' : 'var(--surface)', border: `1px solid ${open === t.hash ? 'var(--text)' : 'var(--border)'}`, boxShadow: 'var(--sh-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Paso {t.step}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700, color: 'var(--pos)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Confirmada
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.25, minHeight: 32 }}>{t.text}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{short(t.hash)}</div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {selected && (
        <div role="region" aria-label="Prueba de la transacción" style={{ background: 'var(--surface2)', borderRadius: 14, padding: '12px 14px', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', display: 'grid', gap: 6 }}>
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>{selected.text}</div>
          {!rpcUrl ? <span>No hay acceso a la red para leer la prueba.</span>
            : receipt?.hash !== selected.hash || (!receipt.data && !receipt.error) ? <span>Leyendo la prueba de la red…</span>
              : receipt.error || !receipt.data ? <span>No se pudo leer la transacción de la red. Probá de nuevo.</span>
                : (
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content minmax(0,1fr)', gap: '4px 14px', fontVariantNumeric: 'tabular-nums' }}>
                    <dt>Bloque</dt><dd style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>#{receipt.data.blockNumber.toLocaleString('es-AR')}</dd>
                    <dt>Estado</dt><dd style={{ margin: 0, color: receipt.data.status === 'ok' ? 'var(--pos)' : 'var(--neg)', fontWeight: 700 }}>{receipt.data.status === 'ok' ? 'Confirmada por la red' : 'Rechazada'}</dd>
                    <dt>Desde</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{receipt.data.from}</dd>
                    <dt>Hacia (contrato)</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{receipt.data.to ?? '—'}</dd>
                    <dt>Transacción</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{selected.hash}</dd>
                  </dl>
                )}
        </div>
      )}
    </section>
  );
}
