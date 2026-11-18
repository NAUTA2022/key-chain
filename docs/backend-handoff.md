# Backend handoff

The backend lives in the sibling repo `key-chain-api` (see `docs/backend-plan.md` for the full plan). This page tracks what the frontend already consumes and what is still demo data.

## Wired to the API (when `VITE_API_URL` is set)

| Feature | Endpoint | Frontend code |
| --- | --- | --- |
| Wallet sign-in (thirdweb SIWE) | `GET /v1/auth/payload`, `POST /v1/auth/login`, `GET /v1/auth/me`, `POST /v1/auth/logout` | `app/lib/session.tsx`, `app/components/ConnectButton.tsx` |
| Private-page guard and admin role | `GET /v1/auth/me` | `app/layouts/require-wallet.tsx`, `require-admin.tsx`, `shell.tsx` |
| AI investment advisor | `POST /v1/advisor/chat` | `app/features/invest-advisor/InvestAdvisor.tsx` |
| KeyPay "Enviar" (x402 USDC) | `POST /v1/payments/transfers` | `app/features/keypay/KeyPay.tsx` |

Without `VITE_API_URL` the frontend runs in standalone demo mode: wallet-only access, rule-based advisor, transfers disabled.

## Available in the API, not yet consumed by the UI

| Feature | Endpoint | Replaces |
| --- | --- | --- |
| Asset catalog and detail | `GET /v1/assets`, `GET /v1/assets/:idOrSlug` | `RWA_ASSETS` in `app/data/index.ts` |
| Asset feed and likes | `GET/POST /v1/assets/:id/updates`, `POST /v1/assets/updates/:id/like` | local state in `ProductDetail.tsx` |
| Secondary market | `GET /v1/market/listings` | `SECONDARY_LISTINGS` |
| Primary orders + KeyPay inbox | `POST /v1/market/orders`, `GET/DELETE /v1/payments/pending` | in-memory `app/lib/keypayInbox.ts` |
| Platform token, academy, FAQ, ecosystem | `GET /v1/token`, `/v1/academy/posts`, `/v1/faq`, `/v1/ecosystem` | `FACT_TOKEN`, `ACADEMY_POSTS`, `FAQS`, `ecosystem/data.ts` |
| Notifications, profile | `GET /v1/me/notifications`, `PATCH /v1/me` | `NOTIFICATIONS` |

The seed in `key-chain-api/prisma/seed.ts` loads exactly the current demo data, so switching a page to the API does not change what it shows.

## Still demo-only (no backend module yet)

Bookey, Key Go, Key Jobs, Key Rural, Escrow Chain, Tracker GPS, tenant portal, KYC, wallet balances and holdings (on-chain indexer). See phases 3–6 of `docs/backend-plan.md`.

## Secrets checklist
- `THIRDWEB_SECRET_KEY`, `THIRDWEB_VAULT_ACCESS_TOKEN`, `X402_SERVER_WALLET`, `AUTH_PRIVATE_KEY`, `ANTHROPIC_API_KEY`: backend only (Railway Variables).
- If `VITE_ANTHROPIC_KEY` was ever set in Vercel, rotate that Anthropic key: it was shipped in the public bundle.
- The thirdweb **client ID** is public by design: restrict its allowed domains in the thirdweb dashboard.
