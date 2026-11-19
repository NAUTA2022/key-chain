# BRIKME — Frontend

**Brikme — Real World Tokenization.** Marketplace DeFi de activos del mundo real (RWA): inversión fraccionada desde $200 USD en real estate, energía, minería, agricultura, transporte y activos de lujo, y tokenización de activos para desarrolladores (B2B). Sede en Dubái, registrada y licenciada ante VARA.

Esta rama (`Brikme`) adapta la plataforma KEY CHAIN a la identidad de Brikme: logo, colores y tipografía del manual de marca, y textos de la presentación del proyecto.

## Requisitos
- Node.js 22.22 o superior
- npm

## Puesta en marcha
```bash
npm ci
cp .env.example .env.local   # completar valores
npm run dev                  # http://localhost:5173
```

## Scripts
| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run typecheck` | Genera tipos de rutas y corre `tsc` |
| `npm run lint` | ESLint con reglas estrictas de TypeScript |
| `npm run build` | Build de producción + prerender de páginas públicas |
| `npm run preview` | Sirve el build localmente |
| `npm run check` | Typecheck, lint y build en un paso |

## Arquitectura
- **React Router 8 (modo framework)** sobre Vite 8, TypeScript estricto.
- **Prerender estático**: cada página pública (inicio, tokenizaciones, fichas de activos, mercado secundario, token, ecosistema, academia, ayuda y productos) se genera como HTML con su título, descripción, canonical, Open Graph y datos estructurados. Las áreas privadas se resuelven en el cliente.
- **SEO/GEO**: `robots.txt`, `sitemap.xml` y `llms.txt` se generan en el build a partir de las rutas reales.
- **Seguridad**: cabeceras HTTP en `vercel.json` y `Caddyfile` (idénticas); ningún secreto en el bundle; validación de transferencias con zod.
- **On-chain (ERC-3643)**: con `VITE_API_URL` definido, KYC (Perfil), inversión en USDC (ficha del activo), posiciones, cobro de dividendos y de capital (Pertenencias) y operaciones de admin (KYC, tokenizar, dividendos, liquidar) usan la API y la wallet del usuario (`app/lib/onchain.ts`). Sin API, todo sigue en modo demo.

Detalles para colaboradores y agentes: [`CLAUDE.md`](CLAUDE.md). Auditoría y pendientes: [`docs/`](docs/).

## Despliegue
- **Railway** (servicio `web`): `Dockerfile` construye el SPA y lo sirve con Caddy (`Caddyfile` replica las reescrituras y cabeceras de `vercel.json`). Las `VITE_*` se definen como variables del servicio (Railway las pasa como build args).
- **Vercel** (alternativa): `vercel.json`; `npm run build` publica `build/client`.

Variables públicas: `VITE_SITE_URL`, `VITE_API_URL`, `VITE_THIRDWEB_CLIENT_ID`, `VITE_CHAIN_ID` (80002 Amoy, 137 Polygon, 31337 local) y `VITE_CHAIN_RPC_URL` (solo para la cadena local).
