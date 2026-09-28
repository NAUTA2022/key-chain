// Shared "pending payment" inbox between the platform and KeyPay.
//
// When a user starts investing in the KYCN token (TokenUtility) or reserves
// a tokenization (PrimaryMarket/ProductDetail/Checkout), that page calls
// addPendingPayment(...) instead of collecting payment itself. The item
// shows up in KeyPay's Checkout, where it actually gets paid via thirdweb's
// CheckoutWidget. This is what "KeyPay is connected to KEYCHAIN" means in
// practice: one inbox, read/written from anywhere in the app.
//
// No backend here — this is an in-memory module singleton with a tiny
// pub-sub so any component can subscribe to changes (see usePendingPayments
// in KeyPay.jsx). It resets on full page reload, same as the rest of this
// app's simulated data.

let payments = [
  { id: 'seed-kycn-ico', name: 'Token KYCN — ICO Pública', qty: 100, unit: 0.085, fee: 0, source: 'Token KYCN', createdAt: Date.now() },
  { id: 'seed-palermo',  name: 'Tokenización — Edificio Corporativo Palermo', qty: 12, unit: 255, fee: 0, source: 'Tokenizaciones', createdAt: Date.now() },
];
const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn(payments));
}

export function getPendingPayments() {
  return payments;
}

// Call this from any investing/purchase flow in the platform to hand the
// payment off to KeyPay instead of collecting it inline. `fee` is a flat
// dollar amount (not a %) so item total = qty*unit + fee always matches
// whatever total the originating page quoted the user before navigating —
// there's no separate fee step anywhere else, so this is the only place
// it's actually added to what gets charged.
export function addPendingPayment({ name, qty = 1, unit, fee = 0, source }) {
  const payment = { id: `p-${Date.now()}-${Math.round(Math.random() * 1e4)}`, name, qty, unit, fee, source, createdAt: Date.now() };
  payments = [...payments, payment];
  notify();
  return payment.id;
}

export function removePendingPayment(id) {
  payments = payments.filter(p => p.id !== id);
  notify();
}

export function subscribePendingPayments(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
