// x402 settlement server for KeyPay's "Enviar" transfer.
//
// This is the server-side half of the flow the client (src/pages/KeyPay.jsx)
// calls via fetchWithPayment. It follows thirdweb's own Next.js example
// pattern (settlePayment + facilitator from "thirdweb/x402") but as a plain
// Node http server, matching this project's existing static-server.mjs style
// instead of pulling in a framework dependency.
//
// Requires real secrets — nothing here will settle a payment without them:
//   THIRDWEB_SECRET_KEY     thirdweb dashboard → project secret key
//   KEYPAY_SERVER_WALLET    the 0x address that receives settled transfers
//
// Run with: npm run dev:x402
import http from 'http';
import { createThirdwebClient } from 'thirdweb';
import { defineChain } from 'thirdweb/chains';
import { settlePayment, facilitator } from 'thirdweb/x402';

const PORT = process.env.X402_PORT ? Number(process.env.X402_PORT) : 8787;
const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
const SERVER_WALLET = process.env.KEYPAY_SERVER_WALLET;

// USDC on Base — the asset KeyPay's client quotes transfer amounts in.
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;
const USDC_DECIMALS = 6;

const client = SECRET_KEY ? createThirdwebClient({ secretKey: SECRET_KEY }) : null;
const thirdwebFacilitator = client && SERVER_WALLET
  ? facilitator({ client, serverWalletAddress: SERVER_WALLET, waitUntil: 'simulated' })
  : null;

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method !== 'POST' || url.pathname !== '/x402/keypay/transfer') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  if (!thirdwebFacilitator) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Server misconfigured: set THIRDWEB_SECRET_KEY and KEYPAY_SERVER_WALLET (see .env.example).',
    }));
    return;
  }

  const to = url.searchParams.get('to') || '';
  const amount = Number(url.searchParams.get('amount')) || 0;
  const paymentData = req.headers['x-payment'] || null;

  try {
    const result = await settlePayment({
      resourceUrl: `http://localhost:${PORT}${url.pathname}`,
      method: 'POST',
      paymentData,
      payTo: SERVER_WALLET,
      network: defineChain(BASE_CHAIN_ID),
      price: {
        amount: String(Math.round(amount * 10 ** USDC_DECIMALS)),
        asset: { address: BASE_USDC },
      },
      facilitator: thirdwebFacilitator,
    });

    if (result.status === 200) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'settled', to, amount, asset: 'USDC', network: 'base', protocol: 'x402' }));
    } else {
      res.writeHead(result.status, { 'Content-Type': 'application/json', ...result.responseHeaders });
      res.end(JSON.stringify(result.responseBody));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}).listen(PORT, () => console.log(`x402 KeyPay transfer server ready on http://localhost:${PORT}/`));
