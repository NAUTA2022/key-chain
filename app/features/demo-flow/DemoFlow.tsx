import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PBtn, PInput, PTag, Icons } from '~/components/ui';
import { CopyField } from '~/features/payments/PayKit';
import { useMobile } from '~/hooks/useMobile';
import { useNarration, voiceClip } from './voice';
import VoiceInvite from './VoiceInvite';
import { DEMO_IMAGES, cancelRun, loadProfit, progress, retryRun, startRun, useDemoFlow, type DemoFlowState, type DemoRun, type Progress } from './api';
import FlowDiagram, { type FlowSource } from './FlowDiagram';
import AdminPayouts from './AdminPayouts';
import BlockchainLog from './BlockchainLog';
import { CoachCard, HitoReceipt, StepPanel } from './Guide';
import { guideContent } from './guide-content';
import WalletPointer from './WalletPointer';
import { actualGuideStep, HITOS, type GuideStep, type Hito, type HitoId } from './guide-data';
import { useChainInfo } from '~/features/wallet/chain';
import { useSession } from '~/lib/session';


const usd = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Crossfading photo band of the project (Ken Burns drift unless reduced motion). */
function Gallery({ height }: { height: number }) {
  const still = useReducedMotion() ?? false;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % DEMO_IMAGES.length), 5200);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0b0b0d' }}>
      <AnimatePresence initial={false}>
        <motion.img key={i} src={DEMO_IMAGES[i]} alt="" aria-hidden width={1600} height={900}
          initial={{ opacity: 0, scale: still ? 1 : 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.1, ease: [0.16, 1, 0.3, 1] }, scale: { duration: 6.5, ease: 'linear' } }}
          style={{ position: 'absolute', inset: 0, width: '100%', height, objectFit: 'cover' }} />
      </AnimatePresence>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,6,8,0.86) 0%, rgba(6,6,8,0.55) 45%, rgba(6,6,8,0.05) 100%)' }} />
      <div style={{ position: 'absolute', right: 16, bottom: 14, display: 'flex', gap: 6 }}>
        {DEMO_IMAGES.map((src, n) => (
          <button key={src} type="button" onClick={() => setI(n)} aria-label={`Foto ${n + 1}`} aria-current={n === i ? 'true' : undefined}
            style={{ width: n === i ? 22 : 7, height: 7, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: n === i ? '#fff' : 'rgba(255,255,255,0.45)' }} />
        ))}
      </div>
    </div>
  );
}

type StageKey = 'pay' | 'invest' | 'company' | 'split' | 'ledger';

function currentStage(run: DemoRun | null): StageKey {
  switch (run?.status) {
    case 'investing': return 'invest';
    case 'invested': return 'company';
    case 'distributing': return 'split';
    case 'completed': return 'ledger';
    case 'failed': return run.steps.filter(x => x.key.startsWith('invest:')).length === 5 ? 'split' : 'invest';
    default: return 'pay';
  }
}

function Line({ done, live, children }: { done: boolean; live: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-b)', fontSize: 13, color: done ? 'var(--text)' : 'var(--sec)', fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden style={{ width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center', flex: '0 0 18px', background: done ? 'var(--pos)' : 'transparent', color: '#fff', border: done ? 'none' : '1.5px solid var(--border)', animation: live && !done ? 'df-pulse 1.2s ease-in-out infinite' : undefined }}>
        {done && Icons.check}
      </span>
      {children}
    </div>
  );
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((Date.parse(until) - now) / 1000));
  return <>{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</>;
}

type Act = { busy: boolean; run: (fn: () => Promise<{ ok: boolean; message?: string }>) => void; error: string | null };

const NETWORK_LABEL: Record<string, string> = { TRX: 'TRON (TRC20)', BSC: 'BNB Smart Chain (BEP20)' };
const ADDRESS_HINT: Record<string, { re: RegExp; placeholder: string }> = {
  TRX: { re: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, placeholder: 'T…' },
  BSC: { re: /^0x[0-9a-fA-F]{40}$/, placeholder: '0x…' },
};
type Method = 'binance_pay' | 'crypto' | 'free';
/** Payment option chosen before the run exists (lifted so the diagram can show it). */
type Pick = { method: Method | null; network: string; setMethod: (m: Method) => void; setNetwork: (n: string) => void; tokens: number; setTokens: (n: number) => void };

const NETWORK_SHORT: Record<string, string> = { TRX: 'TRON', BSC: 'BSC' };

/** The diagram's source node for a payment method. */
function flowSource(method: Method | null, network: string | null): FlowSource {
  if (!method) return { title: 'Tu recarga', sub: 'Binance, wallet o gratis' };
  if (method === 'binance_pay') return { title: 'Binance Pay', sub: 'Pagás en USDT', accent: '#F0B90B' };
  if (method === 'crypto') return { title: `USDT · ${NETWORK_SHORT[network ?? ''] ?? network ?? 'red'}`, sub: 'Desde tu wallet', accent: '#3ddc97' };
  return { title: 'Recarga de prueba', sub: 'Sin dinero real', accent: '#9fb7d3' };
}

function Option({ selected, onSelect, title, sub }: { selected: boolean; onSelect: () => void; title: string; sub: string }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      style={{ textAlign: 'left', width: '100%', padding: '11px 13px', borderRadius: 12, cursor: 'pointer', background: selected ? 'var(--surface2)' : 'transparent', border: `1.5px solid ${selected ? 'var(--text)' : 'var(--border)'}`, transition: 'border-color .2s, background .2s' }}>
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)', marginTop: 2, lineHeight: 1.45 }}>{sub}</div>
    </button>
  );
}

function PayStage({ s, run, act, pick }: { s: DemoFlowState; run: DemoRun | null; act: Act; pick: Pick }) {
  const { method, network, setMethod, setNetwork, tokens, setTokens } = pick;
  const price = s.priceUsdt * tokens / 5;
  const back = s.payoutUsdt * tokens / 5;
  const [refund, setRefund] = useState('');

  if (run?.status === 'awaiting_payment' && run.amountUsdt !== null) {
    const amount = run.amountUsdt.toFixed(2);
    const waiting = (
      <Line done={false} live>
        Esperando tu pago…{run.expiresAt && <> vence en <strong style={{ color: 'var(--text)', marginLeft: 4 }}><Countdown until={run.expiresAt} /></strong></>}
      </Line>
    );
    const change = (
      <div style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <PBtn variant="ghost" small disabled={act.busy} onClick={() => act.run(() => cancelRun(run.id))} style={{ justifySelf: 'start' }}>
          ← Elegir otro método de pago
        </PBtn>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>Si ya enviaste el pago, esperá: si llega, la demo sigue sola.</span>
      </div>
    );
    if (run.method === 'crypto' && run.depositAddress) {
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          <ol style={{ margin: 0, paddingLeft: 18, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.6 }}>
            <li>Desde cualquier exchange o wallet, retirá/enviá <strong style={{ color: 'var(--text)' }}>USDT</strong>.</li>
            <li>Red: <strong style={{ color: 'var(--text)' }}>{NETWORK_LABEL[run.network ?? ''] ?? run.network}</strong>. Otra red o moneda se pierde.</li>
            <li>Monto que tiene que llegar: <strong style={{ color: 'var(--text)' }}>exactamente {amount} USDT</strong> (si tu exchange cobra comisión, sumala aparte).</li>
          </ol>
          <CopyField label="Dirección de depósito" value={run.depositAddress} />
          <CopyField label="Monto exacto (USDT)" value={amount} />
          {waiting}
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>La red tarda unos minutos en confirmar el depósito.</div>
          {change}
        </div>
      );
    }
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <ol style={{ margin: 0, paddingLeft: 18, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.6 }}>
          <li>Abrí Binance y entrá a <strong style={{ color: 'var(--text)' }}>Pay → Enviar</strong>.</li>
          <li>Elegí <strong style={{ color: 'var(--text)' }}>Pay ID</strong> y pegá el de abajo.</li>
          <li>Enviá <strong style={{ color: 'var(--text)' }}>exactamente {amount} USDT</strong>: los centavos identifican tu pago.</li>
        </ol>
        {s.payId && <CopyField label="Pay ID" value={s.payId} />}
        <CopyField label="Monto exacto (USDT)" value={amount} />
        {waiting}
        {change}
      </div>
    );
  }

  const hint = ADDRESS_HINT[network];
  const refundOk = method !== 'crypto' || Boolean(hint?.re.test(refund.trim()));
  const start = () => method && act.run(() => startRun(
    method === 'crypto' ? { method, tokens, network: network === 'BSC' ? 'BSC' : 'TRX', refundAddress: refund.trim() } : { method, tokens },
  ));
  const again = run?.status === 'completed';
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>¿Cuántas partes querés comprar?</span>
        <div role="radiogroup" aria-label="Partes a comprar" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" role="radio" aria-checked={tokens === n} onClick={() => setTokens(n)}
              style={{ padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-h)', fontSize: 15, fontWeight: 800, border: `1.5px solid ${tokens === n ? 'var(--text)' : 'var(--border)'}`, background: tokens === n ? 'var(--text)' : 'transparent', color: tokens === n ? 'var(--bg)' : 'var(--text)' }}>
              {n}
            </button>
          ))}
        </div>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>
          {tokens} {tokens === 1 ? 'parte' : 'partes'} = {usd(price)} USD · {tokens * 20}% de la casa · te toca {tokens * 20}% de cada ganancia
        </span>
      </div>
      {run?.status === 'expired' && !run.steps.some(x => x.key === 'cancelled') && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>El pago anterior venció sin confirmarse. Podés generar uno nuevo.</div>}
      {s.methods.binancePay && <Option selected={method === 'binance_pay'} onSelect={() => setMethod('binance_pay')} title="Binance Pay" sub={`Desde la app de Binance, sin comisión. Pagás unos ${usd(price)} USDT y te devolvemos ${usd(back)}.`} />}
      {s.methods.crypto && <Option selected={method === 'crypto'} onSelect={() => setMethod('crypto')} title="USDT desde tu wallet o exchange" sub="Por red TRON o BNB Smart Chain, desde MetaMask, Trust Wallet, otro exchange o cualquier wallet. Te devolvemos a tu dirección." />}
      <Option selected={method === 'free'} onSelect={() => setMethod('free')} title="Ver la demo gratis" sub="Todo el recorrido con dinero de prueba. Sin pago ni devolución." />
      {method === 'crypto' && (
        <div style={{ display: 'grid', gap: 8, padding: '4px 2px' }}>
          <div role="radiogroup" aria-label="Red" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.networks.map(n => (
              <button key={n} type="button" role="radio" aria-checked={network === n} onClick={() => setNetwork(n)}
                style={{ padding: '6px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, border: `1px solid ${network === n ? 'var(--text)' : 'var(--border)'}`, background: network === n ? 'var(--text)' : 'transparent', color: network === n ? 'var(--bg)' : 'var(--text)' }}>
                {NETWORK_LABEL[n] ?? n}
              </button>
            ))}
          </div>
          <PInput ariaLabel="Tu dirección para la devolución" placeholder={`Tu dirección ${hint?.placeholder ?? ''} para la devolución`} value={refund} onChange={e => setRefund(e.target.value)} maxLength={64} autoComplete="off" />
          {refund.trim() !== '' && !refundOk && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' }}>Esa dirección no es de la red {NETWORK_LABEL[network] ?? network}.</div>}
        </div>
      )}
      <PBtn variant="accent" disabled={act.busy || !s.available || !method || !refundOk} onClick={start}
        style={{ width: '100%', justifyContent: 'center', marginTop: 2, ...(method === 'binance_pay' ? { background: '#F0B90B', color: '#1a1406' } : {}) }}>
        {act.busy ? 'Preparando…' : !method ? 'Elegí una opción' : method === 'free' ? (again ? 'Ver la demo otra vez' : 'Ver la demo gratis') : method === 'crypto' ? 'Generar dirección de pago' : 'Recargar con Binance'}
      </PBtn>
    </div>
  );
}

function Ledger({ s, run, p, hito }: { s: DemoFlowState; run: DemoRun | null; p: Progress; hito: Hito }) {
  const mine = run?.tokens ?? 5;
  const paid = run !== null && run.status !== 'awaiting_payment' && run.status !== 'expired';
  const real = run?.simulated ? 'Simulado' : 'Dinero real';
  // 'swap' rows turn money into tokens: shown, but not counted as income or expense.
  const rows: Array<{ label: string; where: string; amount: number; kind: 'in' | 'out' | 'swap'; show: boolean }> = [
    { label: run?.method === 'crypto' ? 'Depósito de USDT' : run?.simulated ? 'Recarga de prueba' : 'Pago con Binance Pay', where: real, amount: run?.amountUsdt ?? mine, kind: 'out', show: paid },
    { label: `Inversión: ${mine} × 1 USD`, where: 'On-chain · tu recarga pasa a partes', amount: Math.min(p.invested, mine), kind: 'swap', show: p.invested > 0 },
    { label: `Ganancia: ${hito.title.toLowerCase()} (${mine} × 1 USD)`, where: 'On-chain · llega a tu wallet', amount: p.swept, kind: 'in', show: p.swept > 0 },
    { label: run?.method === 'crypto' ? 'Devolución a tu wallet' : 'Devolución a tu Binance', where: p.payout ? 'Dinero real' : 'Dinero real · pendiente de envío', amount: p.payout?.amount ?? s.payoutUsdt * mine / 5, kind: p.payout ? 'in' : 'swap', show: !run?.simulated && p.swept === mine },
  ];
  const visible = rows.filter(r => r.show);
  const ins = visible.filter(r => r.kind === 'in').reduce((a, r) => a + r.amount, 0);
  const outs = visible.filter(r => r.kind === 'out').reduce((a, r) => a + r.amount, 0);
  if (!visible.length) return <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>Tus movimientos aparecen acá a medida que avanza la demo.</div>;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {([['Ingresos', ins, 'var(--pos)'], ['Egresos', outs, 'var(--neg)']] as const).map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--sec)' }}>{l}</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: c, fontVariantNumeric: 'tabular-nums' }}>{usd(v)} USD</div>
          </div>
        ))}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-b)', fontSize: 13 }}>
        <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Ingresos y egresos de la demo</caption>
        <tbody>
          {visible.map(r => (
            <tr key={r.label} style={{ borderTop: '1px solid var(--border-l)' }}>
              <td style={{ padding: '9px 0', color: 'var(--text)' }}>{r.label}<div style={{ fontSize: 11.5, color: 'var(--ter)' }}>{r.where}</div></td>
              <td style={{ padding: '9px 0', textAlign: 'right', fontWeight: 700, color: r.kind === 'in' ? 'var(--pos)' : r.kind === 'out' ? 'var(--neg)' : 'var(--sec)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {r.kind === 'in' ? '+' : r.kind === 'out' ? '−' : ''}{usd(r.amount)}{r.kind === 'swap' && r.label.startsWith('Inversión') && ` → ${Math.min(p.invested, mine)} partes`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/** What to do once the demo ended: see the result in the portfolio or start over. */
function DoneActions({ onRestart }: { onRestart: () => void }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <PBtn variant="accent" onClick={() => void navigate('/pertenencias')}>Ver mis pertenencias</PBtn>
      <PBtn variant="secondary" onClick={onRestart}>Reiniciar la demo</PBtn>
    </div>
  );
}

/** Right-side sheet over the map (movements, blockchain), so the page never scrolls. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <motion.aside aria-label={title} initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'absolute', top: 10, right: 10, bottom: 10, width: 'min(420px, calc(100% - 20px))', background: 'linear-gradient(var(--surface), var(--surface)), var(--bg)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--sh-lg)', display: 'flex', flexDirection: 'column', zIndex: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 6px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ border: 'none', background: 'var(--surface2)', color: 'var(--text)', width: 30, height: 30, borderRadius: 999, cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>
      <div style={{ padding: '6px 16px 16px', overflowY: 'auto', minHeight: 0 }}>{children}</div>
    </motion.aside>
  );
}

const RESTART_KEY = 'kc.demo-flow.restart';
type SheetKey = 'ledger' | 'chain';

export default function DemoFlow() {
  const mobile = useMobile();
  const flow = useDemoFlow();
  const isAdmin = useSession().user?.role === 'admin';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setMethod] = useState<Method | null>(null);
  const [network, setNetwork] = useState('TRX');
  const [tokens, setTokens] = useState(5);
  const [hitoId, setHitoId] = useState<HitoId>('rent');
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const hito = HITOS.find(h => h.id === hitoId) ?? HITOS[0] ?? { id: 'rent', title: 'Alquiler del mes', story: '', lines: [] };
  // Guide: null = follow the run (e.g. after a reload); a number = the step the user moved to.
  const [guideStep, setGuideStep] = useState<GuideStep | null>(null);
  const chain = useChainInfo().data;
  // "Reiniciar" survives a reload in this tab (per-viewer convenience; storage may be blocked). Private
  // page, rendered only in the browser, so reading storage in the initializer is safe.
  const [restartFor, setRestartFor] = useState<string | null>(() => {
    try { return typeof window === 'undefined' ? null : sessionStorage.getItem(RESTART_KEY); } catch { return null; }
  });
  const s = flow.data;
  const last = s?.run ?? null;
  // "Reiniciar": the finished run stays in the history; the page goes back to choosing a payment.
  const run = last?.status === 'completed' && restartFor === last.id ? null : last;
  const restart = () => {
    if (last) {
      setRestartFor(last.id);
      try { sessionStorage.setItem(RESTART_KEY, last.id); } catch { /* storage unavailable */ }
    }
    setMethod(null);
    setGuideStep(0);
    setSheet(null);
  };
  const p = progress(run);
  const stage = currentStage(run);
  const real = Boolean(s && (s.methods.binancePay || s.methods.crypto));
  // Nothing preselected when real payments exist: the page stays neutral until the user picks.
  const method: Method | null = chosen && (chosen === 'free' || real) ? chosen : real ? null : 'free';
  const pick: Pick = { method, network, setMethod, setNetwork, tokens, setTokens };
  // While choosing, the diagram follows the selection; once paid (or paying), it shows the run's method.
  const choosing = stage === 'pay' && run?.status !== 'awaiting_payment';
  const source = choosing || !run ? flowSource(method, network) : flowSource(run.method, run.network);
  const shownMethod: Method | null = choosing || !run ? method : run.method;
  const mine = run && run.status !== 'expired' ? run.tokens : tokens;

  const actual = actualGuideStep(run, p);
  // The guide never runs ahead of the real flow; before any run it opens with the story (0).
  const shown: GuideStep = guideStep === null ? (run ? actual : 0) : guideStep === 0 && !run ? 0 : (Math.min(Math.max(guideStep, 1), actual) as GuideStep);
  const ready = actual > shown;
  const focus = shown === 0 || shown === 6 ? 'all' as const : shown;
  const content = guideContent({ step: shown, ready, run, p, hito, mine });
  const voice = useNarration(voiceClip(shown, ready, run?.status === 'awaiting_payment', hitoId, Boolean(run && !run.simulated)));

  const act: Act = {
    busy,
    error,
    run: fn => {
      setBusy(true);
      setError(null);
      // Acting pins the guide where the user is, so it walks the next steps instead of jumping to the end.
      setGuideStep(g => g ?? shown);
      void fn().then(r => {
        setBusy(false);
        if (!r.ok) setError(r.message ?? 'No se pudo completar la acción.');
        flow.reload();
      });
    },
  };

  // Moments that need the user get a card over the map; the rest is a small card pinned to the step.
  const failed = run?.status === 'failed';
  const panelKind: 'intro' | 'pay' | 'profit' | 'failed' | 'summary' | null =
    failed ? 'failed'
    : shown === 0 ? 'intro'
    : shown === 1 && !ready ? 'pay'
    : shown === 3 && !ready && run?.status === 'invested' ? 'profit'
    : shown === 6 ? 'summary'
    : null;

  const ctl = { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700 } as const;
  const on = { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' } as const;
  const controls = (
    <>
      {voice.available && (
        <button type="button" onClick={voice.toggle} aria-pressed={voice.on} style={{ ...ctl, ...(voice.on ? on : {}) }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />{voice.on && <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}</svg>
            {voice.on ? (voice.speaking ? 'Narrando…' : 'Voz activada') : 'Escuchar'}
          </span>
        </button>
      )}
      <button type="button" aria-pressed={sheet === 'ledger'} onClick={() => setSheet(v => (v === 'ledger' ? null : 'ledger'))} style={{ ...ctl, ...(sheet === 'ledger' ? on : {}) }}>Movimientos</button>
      <button type="button" aria-pressed={sheet === 'chain'} onClick={() => setSheet(v => (v === 'chain' ? null : 'chain'))} style={{ ...ctl, ...(sheet === 'chain' ? on : {}) }}>Blockchain</button>
    </>
  );

  const panelBody = s && (() => {
    switch (panelKind) {
      case 'intro': return <PBtn variant="accent" onClick={() => setGuideStep(1)} style={{ width: '100%', justifyContent: 'center' }}>Empezar</PBtn>;
      case 'pay': return <PayStage s={s} run={run} act={act} pick={pick} />;
      case 'profit': return (
        <div style={{ display: 'grid', gap: 10 }}>
          <div role="radiogroup" aria-label="Qué generó la ganancia" style={{ display: 'grid', gap: 8 }}>
            {HITOS.map(h => <Option key={h.id} selected={hito.id === h.id} onSelect={() => setHitoId(h.id)} title={h.title} sub={h.story} />)}
          </div>
          <HitoReceipt hito={hito} />
          <PBtn variant="accent" disabled={act.busy || !run} onClick={() => run && act.run(() => loadProfit(run.id))} style={{ width: '100%', justifyContent: 'center' }}>
            {act.busy ? 'Repartiendo…' : 'Repartir la ganancia'}
          </PBtn>
        </div>
      );
      case 'failed': return (
        <div role="alert" style={{ display: 'grid', gap: 10, fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--neg)' }}>
          La red no confirmó un paso de la demo. Tu pago está registrado: reintentá y seguimos desde donde quedó.
          {run && <PBtn variant="accent" disabled={busy} onClick={() => act.run(() => retryRun(run.id))}>{busy ? 'Reintentando…' : 'Reintentar'}</PBtn>}
        </div>
      );
      case 'summary': return (
        <div style={{ display: 'grid', gap: 14 }}>
          <Ledger s={s} run={run} p={p} hito={hito} />
          <DoneActions onRestart={restart} />
        </div>
      );
      default: return null;
    }
  })();

  const stageH = mobile ? 'calc(100dvh - 56px - 150px)' : 'calc(100dvh - 56px - 96px)';
  return (
    <div className="g-page" style={{ padding: mobile ? '10px 10px 24px' : '14px 20px 20px', maxWidth: 1480, margin: '0 auto' }}>
      <style>{'@keyframes df-pulse{0%,100%{box-shadow:0 0 0 0 rgba(120,120,130,.45)}50%{box-shadow:0 0 0 5px rgba(120,120,130,0)}}'}</style>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <img src={DEMO_IMAGES[0]} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: mobile ? 19 : 22, letterSpacing: '-0.02em', color: 'var(--text)' }}>Villa Mirador</h1>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>Casa de alquiler en 5 partes de 1 USD · seguí el dinero paso a paso</div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <PTag label="Proyecto destacado" color="dark" />
          <PTag label={run && run.status !== 'expired' && run.status !== 'completed' ? (run.simulated ? 'Demo gratis' : 'Demo con dinero real') : real ? 'Gratis o con dinero real' : 'Demo gratis'} color="green" />
        </div>
      </header>

      <div style={{ position: 'relative', height: stageH, minHeight: 460, background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 22, padding: 6, boxShadow: 'var(--sh-md)', overflow: 'hidden' }}>
        {!s ? (
          <div role="status" style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-b)', color: 'var(--sec)' }}>{flow.failed ? 'No pudimos cargar la demo. Recargá la página.' : 'Cargando la demo…'}</div>
        ) : (
          <>
            <FlowDiagram fill mobile={mobile} status={choosing ? null : (run?.status ?? null)} p={choosing ? progress(null) : p} wallets={s.wallets} image={DEMO_IMAGES[0] ?? ''}
              simulated={shownMethod === 'free'} source={source} payoutUsdt={s.payoutUsdt} focus={focus} controls={controls} mine={mine}
              anchor={panelKind ? undefined : <CoachCard content={content} step={shown} ready={ready} onGo={setGuideStep} />} />
            <AnimatePresence>
              {panelKind && (
                <motion.div key="dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'absolute', inset: 0, top: 48, background: 'rgba(8,8,12,.38)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: mobile ? 'flex-end' : 'center', justifyContent: 'center', padding: mobile ? 8 : 20, zIndex: 2 }}>
                  <div style={{ width: '100%', maxWidth: panelKind === 'summary' ? 520 : 460, maxHeight: '100%', display: 'flex' }}>
                    <StepPanel content={content} media={panelKind === 'intro' ? <div style={{ position: 'relative', height: 150, flex: '0 0 150px' }}><Gallery height={150} /></div> : undefined}>
                      {panelBody}
                      {error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--neg)' }}>{error}</div>}
                      {!s.available && <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>La demo no está disponible en esta red.</div>}
                    </StepPanel>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {sheet === 'ledger' && <Sheet title="Tus ingresos y egresos" onClose={() => setSheet(null)}><Ledger s={s} run={run} p={p} hito={hito} /></Sheet>}
            {sheet === 'chain' && <Sheet title="Blockchain" onClose={() => setSheet(null)}><BlockchainLog run={run} rpcUrl={chain?.rpcUrl ?? null} networkName={chain?.name ?? 'La 33 Devnet'} /></Sheet>}
          </>
        )}
      </div>

      {(shown === 5 || shown === 6) && run && p.swept > 0 && <WalletPointer label={`Tu saldo subió +${p.swept} USD`} />}
      {voice.ask && <VoiceInvite onChoose={v => { voice.choose(v); if (v && run?.status === 'completed') restart(); }} />}
      {isAdmin && <div style={{ marginTop: 20 }}><AdminPayouts /></div>}
    </div>
  );
}
