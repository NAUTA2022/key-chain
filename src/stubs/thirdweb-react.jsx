import { createElement, useState, useCallback } from 'react';
export function ThirdwebProvider({ children }) { return children; }
export function ConnectButton() {
  return createElement('button', {
    style: { padding: '11px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
      background: 'linear-gradient(135deg,#7c5cff,#5b8cff)', color: '#fff', fontWeight: 700, fontSize: 14 },
    onClick: () => alert('Wallet preview only. Use npm run dev for real wallet.'),
  }, 'Conectar Wallet');
}
export function useActiveAccount() { return undefined; }
export function useActiveWallet() { return undefined; }
export function useWalletBalance() { return { data: undefined, isLoading: false }; }
export function useConnect() { return { connect: () => {}, isConnecting: false }; }
export function useDisconnect() { return { disconnect: () => {} }; }

// Preview-only stand-in for thirdweb's x402 hook (real implementation lives in
// the `thirdweb` package at node_modules/thirdweb/src/react/*/hooks/x402 and
// is aliased away here only for this sandbox build — see vite.config.js).
// It follows the real hook's contract exactly (same params, same
// { fetchWithPayment, isPending, error, data } shape) so callers work
// unmodified once this alias is removed for a real deployment.
//
// Because useActiveAccount() above always returns undefined in this preview,
// there is never a connected wallet to sign the x402 payment header with —
// so a 402 response surfaces as a real "wallet required" error instead of a
// faked success, exactly like the real hook does when no wallet is connected.
export function useFetchWithPayment(_client, options = {}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchWithPayment = useCallback(async (url, init) => {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      if (res.status === 402) {
        throw new Error('Pago x402 requerido: conectá una wallet real (npm run dev) para autorizarlo.');
      }
      if (!res.ok) {
        throw new Error(`x402 request failed: HTTP ${res.status}`);
      }
      const parsed = options.parseAs === 'text' ? await res.text() : await res.json();
      setData(parsed);
      return parsed;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  }, [options.parseAs]);

  return { fetchWithPayment, isPending, error, data };
}

// Preview-only stand-in for thirdweb's <CheckoutWidget /> (real component:
// node_modules/thirdweb/src/react/web/ui/Bridge/CheckoutWidget.tsx). Same
// prop contract (client, chain, amount, seller, tokenAddress, name,
// description, image, buttonLabel, onSuccess/onError/onCancel) so the caller
// is unmodified once this alias is removed for a real deployment. Renders
// the same fields the real widget's initial "DirectPayment" screen shows —
// product image/name/description, price — and gates the actual pay action
// behind a connected wallet, same as everywhere else in this preview.
export function CheckoutWidget({
  amount, seller, tokenAddress, name, description, image,
  buttonLabel, style, onSuccess, onCancel,
}) {
  const account = useActiveAccount();
  const [status, setStatus] = useState('idle'); // idle | success

  const handlePay = () => {
    if (!account) {
      alert('Wallet preview only. Use npm run dev for real wallet.');
      onCancel?.(undefined);
      return;
    }
    setStatus('success');
    onSuccess?.({ quote: { amount, seller, tokenAddress }, statuses: [] });
  };

  return createElement('div', {
    style: {
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, background: '#000',
      padding: 20, display: 'flex', flexDirection: 'column', gap: 14, ...style,
    },
  },
    image && createElement('img', { src: image, alt: name || '', style: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 12 } }),
    createElement('div', { style: { color: '#fff', fontWeight: 700, fontSize: 16 } }, name || 'Payment'),
    description && createElement('div', { style: { color: '#8a8a92', fontSize: 13 } }, description),
    createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' } },
      createElement('span', { style: { color: '#8a8a92', fontSize: 13 } }, 'Total'),
      createElement('span', { style: { color: '#fff', fontWeight: 800, fontSize: 20 } }, `${amount} USDC`),
    ),
    createElement('button', {
      onClick: handlePay,
      disabled: status === 'success',
      style: {
        width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: status === 'success' ? '#2a2a2a' : '#fff', color: status === 'success' ? '#8a8a92' : '#000',
        fontWeight: 700, fontSize: 14,
      },
    }, status === 'success' ? 'Pagado ✓' : (buttonLabel || `Pay ${amount} USDC`)),
  );
}

// Preview-only stand-in for thirdweb's <SwapWidget /> (real component:
// node_modules/thirdweb/src/react/web/ui/Bridge/swap-widget/SwapWidget.tsx).
// Same prop contract (client, prefill: { sellToken, buyToken }) so the
// caller is unmodified once this alias is removed for a real deployment.
// Renders the same two-sided "you pay / you receive" swap card the real
// widget opens on, with a static illustrative rate (no live quote source
// in this preview), gated behind a connected wallet like everything else.
export function SwapWidget({ prefill, style, onSuccess }) {
  const account = useActiveAccount();
  const [sellAmount, setSellAmount] = useState(prefill?.sellToken?.amount || '100');
  const [status, setStatus] = useState('idle'); // idle | success
  const RATE = 0.085; // USDC -> KYCN illustrative rate

  const sellNum = Number(sellAmount) || 0;
  const buyNum = sellNum / RATE;

  const handleSwap = () => {
    if (!account) {
      alert('Wallet preview only. Use npm run dev for real wallet.');
      return;
    }
    setStatus('success');
    onSuccess?.({ sellAmount: sellNum, buyAmount: buyNum });
  };

  const field = (label, value, onChange, symbol) => createElement('div', {
    style: { padding: '14px 16px', borderRadius: 14, background: '#141416', border: '1px solid rgba(255,255,255,0.08)' },
  },
    createElement('div', { style: { color: '#6f6f7a', fontSize: 11, marginBottom: 6 } }, label),
    createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      onChange
        ? createElement('input', {
            value, onChange: (e) => onChange(e.target.value), type: 'number',
            style: { background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 22, fontWeight: 700, width: '60%' },
          })
        : createElement('span', { style: { color: '#fff', fontSize: 22, fontWeight: 700 } }, value.toFixed(2)),
      createElement('span', { style: { color: '#fff', fontWeight: 600, fontSize: 13, background: '#232328', padding: '5px 10px', borderRadius: 999 } }, symbol),
    ),
  );

  return createElement('div', {
    style: { border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, background: '#000', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, ...style },
  },
    field('Pagás', sellAmount, setSellAmount, 'USDC'),
    createElement('div', { style: { display: 'flex', justifyContent: 'center', margin: '-4px 0' } },
      createElement('div', { style: { width: 30, height: 30, borderRadius: '50%', background: '#141416', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8a92', fontSize: 14 } }, '↓'),
    ),
    field('Recibís', buyNum, null, 'KYCN'),
    createElement('div', { style: { color: '#6f6f7a', fontSize: 11.5, padding: '2px 2px' } }, `1 USDC ≈ ${(1 / RATE).toFixed(2)} KYCN · fee 0.3%`),
    createElement('button', {
      onClick: handleSwap,
      disabled: status === 'success' || sellNum <= 0,
      style: {
        width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: status === 'success' ? '#2a2a2a' : '#c6ff5e', color: '#0a0a0a',
        fontWeight: 700, fontSize: 14,
      },
    }, status === 'success' ? 'Swap completado ✓' : `Swap · ${sellNum || 0} USDC`),
  );
}
