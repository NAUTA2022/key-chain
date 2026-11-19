// Shared "pending payment" inbox between the platform and KeyPay.
//
// When a user starts investing in the BRIK token (TokenUtility) or reserves
// a tokenization (PrimaryMarket/ProductDetail/Checkout), that page calls
// addPendingPayment(...) instead of collecting payment itself. The item
// shows up in KeyPay's Checkout, where it actually gets paid via thirdweb's
// CheckoutWidget. This is what "KeyPay is connected to Brikme" means in
// practice: one inbox, read/written from anywhere in the app.
//
// No backend here — this is an in-memory module singleton with a tiny
// pub-sub so any component can subscribe to changes (see usePendingPayments
// in KeyPay). It resets on full page reload, same as the rest of this
// app's simulated data.

export type PendingPayment = {
  id: string;
  name: string;
  qty: number;
  unit: number;
  fee: number;
  source: string;
  createdAt: number;
};

type Listener = (payments: PendingPayment[]) => void;

let payments: PendingPayment[] = [
  { id: 'seed-kycn-ico', name: 'Token BRIK — ICO Pública', qty: 100, unit: 0.085, fee: 0, source: 'Token BRIK', createdAt: Date.now() },
  { id: 'seed-palermo',  name: 'Tokenización — Edificio Corporativo Palermo', qty: 12, unit: 255, fee: 0, source: 'Tokenizaciones', createdAt: Date.now() },
];
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach(fn => fn(payments));
}

export function getPendingPayments(): PendingPayment[] {
  return payments;
}

// Call this from any investing/purchase flow in the platform to hand the
// payment off to KeyPay instead of collecting it inline. `fee` is a flat
// dollar amount (not a %) so item total = qty*unit + fee always matches
// whatever total the originating page quoted the user before navigating —
// there's no separate fee step anywhere else, so this is the only place
// it's actually added to what gets charged.
export function addPendingPayment({ name, qty = 1, unit, fee = 0, source }: { name: string; qty?: number; unit: number; fee?: number; source: string }): string {
  const payment: PendingPayment = { id: `p-${Date.now()}-${Math.round(Math.random() * 1e4)}`, name, qty, unit, fee, source, createdAt: Date.now() };
  payments = [...payments, payment];
  notify();
  return payment.id;
}

export function removePendingPayment(id: string): void {
  payments = payments.filter(p => p.id !== id);
  notify();
}

export function subscribePendingPayments(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
