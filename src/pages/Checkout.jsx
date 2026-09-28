import { PCard, PBtn, PTag, PDiv } from '../components/ui';
import { fmtUSD2 } from '../data';
import { addPendingPayment } from '../lib/keypayInbox';

// Payment itself always happens in KeyPay's own Checkout (thirdweb's
// CheckoutWidget) — this page is just an order review before handing the
// charge off as a pending payment. It used to also have its own fake
// "Método de pago" and "Firmar transacción" steps, which made no sense
// once the actual payment step is KeyPay's — removed in favor of a single
// review screen that goes straight there.
export default function Checkout({ nav, data }) {
  const { asset: a, qty } = data || {};

  if (!a) return <div style={{ padding: 40 }}><button onClick={() => nav('primario')}>← Volver</button></div>;

  const subtotal = qty * a.tokenPrice;
  const fee = subtotal * 0.005;
  const total = subtotal + fee;

  const handleContinue = () => {
    const id = addPendingPayment({ name: `Tokenización — ${a.name}`, qty, unit: a.tokenPrice, fee, source: 'Tokenizaciones' });
    nav('keypay', { screen: 'cart', focusId: id });
  };

  return (
    <div style={{ padding: '40px 32px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20 }}>Revisión de orden</div>
      <PCard style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <img src={a.img} alt="" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{a.name}</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', marginTop: 4 }}>{qty} tokens · {a.apy}% APY · Polygon</div>
            <PTag label={a.stage} color="green" style={{ marginTop: 6 }} />
          </div>
        </div>
        <PDiv style={{ marginBottom: 16 }} />
        {[['Subtotal', fmtUSD2(subtotal)], ['Fee de plataforma (0.5%)', fmtUSD2(fee)], ['Total', fmtUSD2(total)]].map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border-l)' : 'none' }}>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: i === 2 ? 14 : 13, color: 'var(--sec)', fontWeight: i === 2 ? 600 : 400 }}>{k}</span>
            <span style={{ fontFamily: 'var(--font-h)', fontWeight: i === 2 ? 800 : 600, fontSize: i === 2 ? 16 : 13.5, color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </PCard>
      <PBtn variant="accent" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 16 }} onClick={handleContinue}>
        Continuar a Key Pay · {fmtUSD2(total)}
      </PBtn>
    </div>
  );
}
