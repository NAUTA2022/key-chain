# KEY CHAIN — Frontend

Plataforma de tokenización de activos reales (RWA) en Polygon. Este repo es **solo el frontend**; el backend (pagos x402, asesor IA, auth/roles, datos reales) se construye aparte (ver `docs/backend-handoff.md`).

## Regla #1: el diseño no se toca
El diseño visual es definitivo. La referencia es la rama `nautita/fervent-mendel-9z64bv` de github.com/NAUTA2022/key-chain (portada a `app/` el 2026-10-08), no `master`. Ningún cambio puede alterar lo que se ve:
- No cambiar valores de `style`, `className`, colores, tipografías, tamaños, espaciados, animaciones ni el orden visual.
- Sí se permite: etiquetas semánticas equivalentes (`div`→`h1`/`nav`/`article`, `button`→`a` con estilos reseteados), atributos (`alt`, `aria-*`, `width`/`height`), metadatos, rutas, tipos y lógica.
- Todo cambio de UI se verifica con capturas antes/después (ver "Verificación visual").

## Regla #2: secciones apagadas (ocultas, no borradas)
Feed, Token KYCN, Ecosistema y Subsidiarias (Bookey, Key Go, Key Jobs, Key Rural, Escrow Chain, Tracker GPS) están **apagadas** para las demos: el código sigue completo en el repo, pero no se ven ni se pueden abrir. Decisión del dueño (2026-10-16): no eliminar ni comentar nada, solo ocultar.
- Fuente única: `app/lib/hiddenSections.ts` (`HIDDEN_SECTIONS` y las URLs de cada sección).
- Menú (barra lateral, drawer y barra móvil): el filtro `useMenuFilter()` de `app/lib/demoMenu.ts` quita las entradas ocultas.
- Rutas: `app/layouts/section-gate.tsx` envuelve esas rutas en `app/routes.ts` y redirige a `/tokenizaciones`. También salen del prerender, del sitemap y de `llms.txt`.
- Para reactivar una sección: quitarla de `HIDDEN_SECTIONS`. No hace falta tocar nada más. KeyPay (`/keypay`) sigue activo porque es el medio de pago.
- Todo lo nuevo que se agregue al menú o a las rutas de esas secciones debe respetar esta regla (usar `useMenuFilter` y envolver la ruta con el gate).
- Además, la wallet `0x57ec…4c59` (cuenta de demo) ve un menú reducido: sin Panel Admin, Configuración ni Tokenizar activo (`app/lib/demoMenu.ts`).

## Stack
- React 19 + **React Router 8 en modo framework** (`app/routes.ts`), Vite 8, TypeScript 6 estricto.
- `ssr: false` + **prerender** en build: las páginas públicas salen como HTML real; las privadas se sirven con `__spa-fallback.html` (ver `vercel.json`).
- Estilos: CSS global (`app/styles/global.css`) + estilos inline. **No hay Tailwind.**
- Web3: thirdweb v5 (`app/lib/thirdweb.ts`). Animación: framer-motion 12, React Bits (`app/components/reactbits`, con gsap y ogl). Mapas: Leaflet (cargado en chunks diferidos).
- Validación: zod (`app/lib/validation.ts`).
- Gestor de paquetes: **npm** (hay `package-lock.json`). Node ≥ 22.22.

## Comandos
```bash
npm run dev         # servidor de desarrollo (http://localhost:5173)
npm run typecheck   # typegen de rutas + tsc
npm run lint        # eslint (typescript-eslint strict)
npm run build       # build + prerender + 404.html
npm run check       # typecheck + lint + build
```

## Estructura
```
app/
  root.tsx            <html>, <head>, providers, ErrorBoundary
  routes.ts           mapa de rutas (URL ↔ módulo)
  routes/             módulos de ruta: meta/SEO + render de la página
  layouts/            wallet (thirdweb provider; el landing queda fuera), keychain (prefs + cursor),
                      shell (sidebar/topbar), guards (require-wallet / require-admin)
  pages/              páginas de la plataforma (dentro del shell)
  features/<producto> bookey, key-go, key-jobs, key-rural, escrow-chain, tracker-gps, keypay, ecosystem, landing
  components/         ui (primitivas P*), layout (Sidebar/Topbar/MobileNavBar), StatusPage
  features/           además: onboarding, notifications, search, banners, profile (kit de UI compartido), support, market,
                      tokenization, token, academy, admin (consola completa), wallet, portfolio, asset
  lib/                api (cliente tipado), session (atada a la wallet), catalog (activos API ↔ RwaAsset), onchain (red,
                      hooks de portafolio/KYC, invertir y cobrar), countries, navigation, preferences, seo, site, structured-data, validation, thirdweb, keypayInbox, sound
  data/               datos demo tipados (se reemplazan por el backend)
  hooks/              useMobile/useViewport*, useHydrated
public/               estáticos (imágenes WebP, modelos .glb, íconos, manifest)
```

## Convenciones
- TypeScript estricto, **nunca `any`**; literal unions en vez de enums; `import type` para tipos.
- Navegación: `useNav()` → `nav('detalle', asset)`. Las claves y URLs viven en `app/lib/navigation.ts`. Nunca estado en memoria para "páginas".
- Enlaces internos rastreables: `<a href>`/`<Link>` con `preventDefault` + `navigate` cuando hace falta conservar estilos.
- SEO por ruta con `seo({...})` de `app/lib/seo.ts` (title, description, canonical, OG, Twitter, JSON-LD). Páginas privadas: `noindex: true`.
- Nueva página pública ⇒ agregarla en `app/routes.ts`, en `prerender()` de `react-router.config.ts` y en `app/lib/public-routes.ts` (sitemap/llms.txt).
- Código que toque `window`/`document`/`localStorage` va en efectos o con `useSyncExternalStore` (el prerender corre en Node). Librerías que tocan `window` al importarse (Leaflet) se cargan con `lazy()`.
- `VITE_*` se incrusta en el bundle público: **nunca secretos**. Claves de APIs (Anthropic, thirdweb secret) solo en el backend.
- Marca: **La 33** (rebrand 2026-11-19, empresa B2B de tokenización en Panamá). `SITE_NAME = 'La 33'`; naranja `#F3B200` (claro `#FFCC40`) es el color principal (botones, títulos, `--accent` vía la paleta `la33`, por defecto), rojo `#FF2D2D` el secundario; fondo negro `#000000` y tema oscuro por defecto (preferencias en `la33_prefs`; la clave vieja `kc_prefs` se ignora a propósito para que nadie arranque en el claro viejo). Logos en `public/la33/` (y reemplazados `logo-dark/light.png`, `icono/iconow.png`, `3d.png`, `3ds.webp`, favicons, `og-image.jpg`). Los tickers de token (KYCN/FACT) y los identificadores internos (`issuer: 'keychain'`, rutas, demás claves de storage) no se renombraron.
- Comentarios y commits en inglés; explicaciones al usuario en español.

## Verificación visual
Antes de dar por cerrado un cambio de UI: build, servir `build/client` y comparar capturas de escritorio (1440×900) y móvil (390×844) de todas las rutas contra la línea base. Diferencias aceptadas solo por animaciones en curso o datos.

## Variables de entorno
Ver `.env.example`. `VITE_SITE_URL` (dominio canónico), `VITE_THIRDWEB_CLIENT_ID`, `VITE_API_URL` (API de `key-chain-api`), `VITE_CHAIN_ID` (red de la plataforma: 202610 KEY CHAIN Devnet, 80002 Amoy, 137 Polygon, 31337 anvil local) y `VITE_CHAIN_RPC_URL` (RPC de la devnet o de la cadena local). Sin `VITE_API_URL` el frontend corre en modo demo, solo con wallet, y su aspecto debe quedar idéntico (regresión visual).

## On-chain
- Toda lógica on-chain del cliente está en `app/lib/onchain.ts`: la API fija precios y ejecuta; la wallet del usuario solo aprueba USDC exacto al Vault y cobra (dividendos con prueba Merkle, capital tras liquidación).
- Las pantallas con datos reales usan `useSession().status !== 'disabled'` para elegir entre API y datos demo; los componentes en vivo reutilizan las primitivas `P*` y los mismos estilos.
- Prueba E2E en navegador: anvil + `npm run chain:localnet` en la API + frontend con `VITE_API_URL`, `VITE_CHAIN_ID=31337` y `VITE_CHAIN_RPC_URL`.

## Modo live vs demo
- Live (`VITE_API_URL` definido, `useSession().status !== 'disabled'`): todo sale de la API; nunca mostrar cifras inventadas (estados de carga/vacío en su lugar). Las secciones sin producto real muestran `ComingSoon` (hoy: Ecosistema y Swap).
- Mercado secundario en vivo: `app/features/market/` (contrato FactorActSecondaryMarket; la wallet aprueba y opera directo con el contrato y luego avisa a la API con `/v1/market/secondary/sync`). Reusa `ListingCard` y `FilterBar` de `pages/SecondaryMarket.tsx`, así demo y vivo se ven igual.
- Demo (sin API): el diseño original intacto; la regresión visual de escritorio debe dar 0 diferencias salvo cambios pedidos.
- Prerender: el catálogo y los contenidos públicos usan la copia del build mientras la API responde, así el HTML para buscadores conserva el contenido.
- Descargas/subidas con credenciales: solo a rutas `/v1/...` de la API (nunca a URLs externas).
- Subsidiarias: solo Bookey es pública; el resto son vistas previas para admins (`routes.ts`).

## Backend
La API vive en el repo hermano `key-chain-api` (NestJS + Prisma + Postgres + Redis en Railway). El cliente tipado está en `app/lib/api/` y se regenera con `npm run api:types` (lee `/openapi.json` de la API). La sesión (thirdweb SIWE → cookie HttpOnly) está en `app/lib/session.tsx`; todos los `ConnectButton` se importan desde `app/components/ConnectButton.tsx` para heredar el login.
