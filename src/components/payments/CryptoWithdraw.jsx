import { useState } from 'react';
import { motion } from 'framer-motion';
import { PayModal, TokenNetworkPicker, Notice, PrimaryBtn, ProgressSteps, SuccessMark, KV, CopyField } from './PayKit';
import { T, Ico, explorerUrl } from './payTheme';
import { TOKENS, NETWORKS, tokenBySym, useWallet, debit, fmtToken, isAddress, shortAddr, fakeTxHash } from '../../lib/wallet';

// Crypto withdrawal from the KEYCHAIN balance: token + network, destination
// address and amount, review with fees, 2FA code, processing and receipt.
export default function CryptoWithdraw({ open, onClose, defaultSym = 'USDC' }) {
  const [step, setStep] = useState('form');
  const [sym, setSym] = useState(defaultSym);
  const [net, setNet] = useState('polygon');
  const [addr, setAddr] = useState('');
  const [amt, setAmt] = useState('');
  const [code, setCode] = useState('');
  const [hash, setHash] = useState('');
  const { balances } = useWallet();
  const token = tokenBySym(sym);
  const network = NETWORKS[net];

  const bal = balances[sym] || 0;
  const feeTok = network.fee / token.price;             // network fee in the token
  const amount = parseFloat(String(amt).replace(',', '.')) || 0;
  const receive = Math.max(0, amount - feeTok);
  const addrOk = isAddress(addr);
  const errors = [
    addr && !addrOk && 'La dirección no es válida (0x + 40 caracteres).',
    amount > bal && 'No tenés saldo suficiente.',
    amount > 0 && amount < token.min && `El mínimo es ${fmtToken(token.min, sym)}.`,
  ].filter(Boolean);
  const canReview = addrOk && amount > 0 && !errors.length;

  const reset = () => { setStep('form'); setAddr(''); setAmt(''); setCode(''); };
  const close = () => { onClose?.(); setTimeout(reset, 300); };
  const confirm = () => { setHash(fakeTxHash()); setStep('processing'); };
  const finish = () => {
    debit(sym, amount, `Retiro ${sym} · ${network.name} a ${shortAddr(addr)}`, { net, hash });
    setStep('done');
  };

  const field = { width: '100%', boxSizing: 'border-box', height: 48, padding: '0 14px', borderRadius: 14, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 14, outline: 'none' };
  const titles = { form: 'Retirar cripto', review: 'Revisá el retiro', processing: 'Enviando retiro', done: 'Retiro enviado' };
  const footer = {
    form: <PrimaryBtn disabled={!canReview} onClick={() => setStep('review')}>Revisar retiro</PrimaryBtn>,
    review: <PrimaryBtn disabled={code.length !== 6} onClick={confirm}>{Ico.up} Confirmar retiro</PrimaryBtn>,
    processing: null,
    done: <PrimaryBtn onClick={close}>Listo</PrimaryBtn>,
  }[step];

  return (
    <PayModal open={open} onClose={close} title={titles[step]} onBack={step === 'review' ? () => setStep('form') : undefined} footer={footer}>
      {step === 'form' && (
        <>
          <TokenNetworkPicker tokens={TOKENS} sym={sym} setSym={setSym} net={net} setNet={setNet} balances={balances} showBalance />

          <label style={{ ...T.label, marginTop: 18 }} htmlFor="wd-addr">Dirección de destino</label>
          <input id="wd-addr" value={addr} onChange={e => setAddr(e.target.value.trim())} placeholder="0x…" spellCheck={false} autoComplete="off"
            style={{ ...field, ...T.mono, fontSize: 13, borderColor: addr && !addrOk ? 'var(--neg)' : 'var(--border-l)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16 }}>
            <label style={T.label} htmlFor="wd-amt">Monto</label>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>Disponible: <b style={{ color: 'var(--text)' }}>{fmtToken(bal, sym)}</b></span>
          </div>
          <div style={{ position: 'relative' }}>
            <input id="wd-amt" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0.00"
              style={{ ...field, paddingRight: 112, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, borderColor: amount > bal ? 'var(--neg)' : 'var(--border-l)' }} />
            <span style={{ position: 'absolute', right: 8, top: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 700, color: 'var(--ter)' }}>{sym}</span>
              <button type="button" onClick={() => setAmt(String(+bal.toFixed(token.decimals)))}
                style={{ height: 34, padding: '0 10px', borderRadius: 10, border: 'none', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>MÁX</button>
            </span>
          </div>

          {errors.length > 0 && <div style={{ marginTop: 8, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>{errors[0]}</div>}

          <div style={{ marginTop: 14, padding: '4px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k="Comisión de red" v={`${fmtToken(feeTok, sym)}`} />
            <KV k="Recibís" v={fmtToken(receive, sym)} strong />
          </div>
        </>
      )}

      {step === 'review' && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ textAlign: 'center', margin: '4px 0 16px' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 30, color: 'var(--text)', letterSpacing: '-0.03em' }}>{fmtToken(receive, sym)}</div>
            <div style={{ ...T.body, fontSize: 12.5 }}>llegan a destino en {network.eta}</div>
          </div>
          <div style={{ padding: '4px 14px', borderRadius: 14, background: 'var(--surface2)', marginBottom: 14 }}>
            <KV k="Moneda" v={`${token.name} (${sym})`} />
            <KV k="Red" v={network.name} />
            <KV k="Destino" v={shortAddr(addr)} mono />
            <KV k="Monto" v={fmtToken(amount, sym)} />
            <KV k="Comisión de red" v={fmtToken(feeTok, sym)} />
          </div>
          <Notice>Revisá la dirección y la red. Los retiros on-chain no se pueden revertir.</Notice>
          <label style={{ ...T.label, marginTop: 16 }} htmlFor="wd-2fa">Código de verificación (2FA)</label>
          <input id="wd-2fa" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••"
            style={{ ...field, textAlign: 'center', letterSpacing: '0.5em', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20 }} />
          <div style={{ marginTop: 6, fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Ingresá el código de 6 dígitos de tu app autenticadora.</div>
        </motion.div>
      )}

      {step === 'processing' && (
        <ProgressSteps onDone={finish} steps={[
          { label: 'Verificando código 2FA', ms: 800 },
          { label: 'Chequeo de seguridad', sub: 'Dirección y límites diarios', ms: 1000 },
          { label: `Firmando y enviando en ${network.name}`, sub: `Hash ${shortAddr(hash)}`, ms: 1400 },
          { label: 'Esperando confirmación', ms: 1200 },
        ]} />
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div style={{ ...T.title, fontSize: 24 }}>{fmtToken(receive, sym)}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>enviados a {shortAddr(addr)} por {network.name}.</div>
          <div style={{ textAlign: 'left' }}>
            <CopyField label="Hash de la transacción" value={hash} />
          </div>
          <a href={explorerUrl(net, hash)} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Ver en el explorador {Ico.chev}
          </a>
        </div>
      )}
    </PayModal>
  );
}
