import { useState } from 'react';
import { motion } from 'framer-motion';
import { PayModal, TokenNetworkPicker, QRCode, CopyField, Notice, PrimaryBtn, GhostBtn, ProgressSteps, SuccessMark, KV } from './PayKit';
import { T, Ico } from './payTheme';
import { TOKENS, NETWORKS, DEPOSIT_ADDRESS, tokenBySym, useWallet, credit, fmtToken, fakeTxHash, shortAddr } from '../../lib/wallet';

// Crypto deposit into the KEYCHAIN balance: pick token + network, get the
// personal deposit address (QR + copy) and track the deposit until it's
// credited. Steps: pick → address → tracking → done.
export default function CryptoDeposit({ open, onClose, defaultSym = 'USDC', onDone }) {
  const [step, setStep] = useState('pick');
  const [sym, setSym] = useState(defaultSym);
  const [net, setNet] = useState('polygon');
  const [amount, setAmount] = useState(null);
  const [hash, setHash] = useState('');
  const { balances } = useWallet();
  const token = tokenBySym(sym);
  const network = NETWORKS[net];

  const close = () => { onClose?.(); setTimeout(() => { setStep('pick'); setAmount(null); }, 300); };
  const startTracking = () => {
    // Demo: simulate an incoming transfer of a typical size for the token.
    setAmount(sym === 'ETH' ? 0.25 : sym === 'POL' ? 500 : 1000);
    setHash(fakeTxHash());
    setStep('tracking');
  };
  const finish = () => {
    credit(sym, amount, `Depósito ${sym} · ${network.name}`, { net, hash });
    setStep('done');
    onDone?.(sym, amount);
  };

  const titles = { pick: 'Depositar cripto', address: `Depositar ${sym}`, tracking: 'Recibiendo depósito', done: 'Depósito acreditado' };
  const footer = {
    pick: <PrimaryBtn onClick={() => setStep('address')}>Continuar</PrimaryBtn>,
    address: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryBtn onClick={startTracking}>Ya envié los fondos</PrimaryBtn>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>También lo detectamos solo, aunque cierres esta ventana.</div>
      </div>
    ),
    tracking: null,
    done: <PrimaryBtn onClick={close}>Listo</PrimaryBtn>,
  }[step];

  return (
    <PayModal open={open} onClose={close} title={titles[step]} onBack={step === 'address' ? () => setStep('pick') : undefined} footer={footer}>
      {step === 'pick' && (
        <>
          <p style={{ ...T.body, margin: '0 0 18px' }}>Elegí qué moneda vas a enviar y por qué red. Te damos tu dirección personal de depósito.</p>
          <TokenNetworkPicker tokens={TOKENS} sym={sym} setSym={setSym} net={net} setNet={setNet} balances={balances} />
        </>
      )}

      {step === 'address' && (
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 16px' }}>
            <QRCode value={DEPOSIT_ADDRESS} logo={token.icon} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[[token.icon, token.sym], [network.icon, network.name]].map(([src, l]) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 6px', borderRadius: 999, background: 'var(--surface2)', border: '1px solid var(--border-l)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                <img src={src} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />{l}
              </span>
            ))}
          </div>
          <CopyField label="Tu dirección de depósito" value={DEPOSIT_ADDRESS} />
          <div style={{ marginTop: 14 }}>
            <KV k="Depósito mínimo" v={fmtToken(token.min, sym)} />
            <KV k="Tiempo estimado" v={network.eta} />
            <KV k="Confirmaciones" v={network.confirmations} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Notice>Enviá solo <b>{sym}</b> por la red <b>{network.name}</b>. Si usás otra moneda o red, los fondos pueden perderse.</Notice>
          </div>
        </motion.div>
      )}

      {step === 'tracking' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'var(--text)', letterSpacing: '-0.03em' }}>{fmtToken(amount, sym)}</div>
            <div style={{ ...T.body, fontSize: 12.5 }}>desde {shortAddr('0x9b2C51aE07D6f4E1c8A3b5D29e0F7c41aB6d3E58')} · {network.name}</div>
          </div>
          <ProgressSteps onDone={finish} steps={[
            { label: 'Transacción detectada', sub: `Hash ${shortAddr(hash)}`, ms: 1100 },
            { label: `Confirmando en ${network.name}`, sub: `${network.confirmations} confirmaciones`, ms: 1800 },
            { label: 'Verificación de origen', sub: 'Chequeo AML automático', ms: 1000 },
            { label: 'Acreditando en tu saldo', ms: 800 },
          ]} />
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <SuccessMark />
          <div style={{ ...T.title, fontSize: 24 }}>+{fmtToken(amount, sym)}</div>
          <div style={{ ...T.body, marginBottom: 16 }}>Ya está disponible en tu saldo KEYCHAIN.</div>
          <div style={{ textAlign: 'left', padding: '6px 14px', borderRadius: 14, background: 'var(--surface2)' }}>
            <KV k="Red" v={network.name} />
            <KV k="Hash" v={shortAddr(hash)} mono />
            <KV k={`Saldo ${sym}`} v={fmtToken(balances[sym] || 0, sym)} strong />
          </div>
          <div style={{ marginTop: 10 }}>
            <GhostBtn onClick={() => { setStep('pick'); setAmount(null); }}>{Ico.down} Hacer otro depósito</GhostBtn>
          </div>
        </div>
      )}
    </PayModal>
  );
}
