# BRIKME — Frontend (rama `Brikme`)

Marketplace de tokenización de activos reales (RWA) de **Brikme — Real World Tokenization** (sede en Dubái, registrada y licenciada ante VARA). Esta rama es un fork de marca del frontend KEY CHAIN: misma plataforma, identidad Brikme. Este repo es **solo el frontend**; el backend se construye aparte (ver `docs/backend-handoff.md`).

## Regla #1: identidad Brikme
Fuentes de marca: *Manual de marca Brikme* (jul. 2025) y la presentación *Brikme_Tokenizacion_2026*. Todo lo visible respeta:
- **Colores** (tokens `--bk-*` en `app/styles/global.css`): primario `#F0900F` (naranja del isotipo, decisión del cliente 2026-11-19: el turquesa `#1EC6D9` del manual ya no se usa en la interfaz), acento del tema claro para texto pequeño `#A85A00`, fondo `#1913B3` (azul), énfasis `#F01BDB` (magenta) y `#6905C1` (violeta). La paleta de la app es `brikme` (`data-palette`), por defecto en `app/lib/preferences.tsx` y `app/root.tsx`. Fondo del tema oscuro de la plataforma: azul grisáceo oscuro `#11161e` (paneles `#171d27`; el índigo `#070620` se veía chillón, decisión del cliente 2026-11-19). Las bandas oscuras del landing siguen en `#07062a`.
- **Tipografía**: Raleway (títulos y texto; `font-variant-numeric: lining-nums` global para cifras). Preset de fuente `brikme` por defecto.
- **Sin turquesa en toda la plataforma** (decisión del cliente, 2026-11-19): el naranja del isotipo `#F0900F` es el color principal (acento `--accent` de la paleta `brikme` en ambos temas, botones de thirdweb y login) y en el landing (botones principales, acentos, puntos del carrusel, loader, escenas 3D). Sobre fondos claros el acento es el azul de marca `#1913B3` y el naranja; en las secciones `.bk-dark` y el hero `--teal` vale naranja. No volver a usar `#1EC6D9` en el landing. Los botones no persiguen el puntero (sin efecto Magnet).
- **Logo**: ícono cubo naranja + wordmark + eslogan "Real World Tokenization" (geometría exacta del ícono en `app/features/landing/brikme/mark.ts`). Sobre claros: wordmark azul tinta (`/logo-light.png`, `/brikme-logo-ink.png`); sobre oscuros: ícono naranja con wordmark blanco (`/logo-on-dark.png`, el del menú sobre el hero) o todo blanco (`/logo-dark.png`); el wordmark turquesa (`/logo-color.png`) ya no se usa en el landing.
- **3D del landing**: three.js + React Three Fiber (carrusel del hero con los modelos del cliente en `public/models/hq/` (originales empaquetados con meshopt, sin simplificar) y `public/models/bg/` (versiones livianas para el fondo); los exports crudos de ~60 MB están en `models-src/` (ignorado por git, no se despliega)) y física con cannon-es. Todo se carga perezosamente tras la hidratación.
- **Geometría**: esquinas rectas en toda la plataforma (regla global en `global.css`); sin gradientes ni fondos de puntos.
- **Voz**: español neutro latinoamericano con **tú** (no voseo). Nombre en prosa "Brikme"; en metadatos, insignias y wordmark "BRIKME".
- **Mensajes clave** (presentación): "la nueva era de la inversión tokenizada", participación desde $200 USD, liquidez global 24/7, sin fronteras, smart contracts; sectores: Real Estate, Minería, Agricultura, Energía, Transporte y Activos de lujo; modelo B2B (originación, setup fee) + B2C (distribución, success fee). Contacto: hello@brikme.com · Zlafa Building, Al Garhoud Office M02, Business Bay Bridge, Dubái.
- Valores internos que **no** se renombran (contrato con el backend): el emisor `'keychain'` de la API, claves de rutas como `/keypay`, nombres de contratos (`FactorActSecondaryMarket`) e identificadores de código.
- Verificar cambios de UI con capturas de escritorio (1440×900) y móvil (390×844).

## Regla #2: secciones apagadas (ocultas, no borradas)
Feed, Token BRIK, Ecosistema y Subsidiarias (Bookey, Key Go, Key Jobs, Key Rural, Escrow Chain, Tracker GPS) están **apagadas** para las demos: el código sigue completo en el repo, pero no se ven ni se pueden abrir. Decisión del dueño (2026-10-16): no eliminar ni comentar nada, solo ocultar.
- Fuente única: `app/lib/hiddenSections.ts` (`HIDDEN_SECTIONS` y las URLs de cada sección).
- Menú (barra lateral, drawer y barra móvil): el filtro `useMenuFilter()` de `app/lib/demoMenu.ts` quita las entradas ocultas.
- Rutas: `app/layouts/section-gate.tsx` envuelve esas rutas en `app/routes.ts` y redirige a `/tokenizaciones`. También salen del prerender, del sitemap y de `llms.txt`.
- Para reactivar una sección: quitarla de `HIDDEN_SECTIONS`. No hace falta tocar nada más. Brikme Pay (ruta `/keypay`) sigue activo porque es el medio de pago.
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
- Marca: el nombre en metadatos es `BRIKME` (`SITE_NAME` en `app/lib/site.ts`). El token de plataforma se muestra como BRIK (provisorio, sección oculta): confirmar con el cliente antes de activarla.
- Comentarios y commits en inglés; explicaciones al usuario en español.

## Verificación visual
Antes de dar por cerrado un cambio de UI: build, servir `build/client` y revisar capturas de escritorio (1440×900) y móvil (390×844) de las rutas afectadas contra la identidad Brikme (Regla #1).

## Variables de entorno
Ver `.env.example`. `VITE_SITE_URL` (dominio canónico), `VITE_THIRDWEB_CLIENT_ID`, `VITE_API_URL` (API de `key-chain-api`), `VITE_CHAIN_ID` (red de la plataforma: 202610 KEY CHAIN Devnet, 80002 Amoy, 137 Polygon, 31337 anvil local) y `VITE_CHAIN_RPC_URL` (RPC de la devnet o de la cadena local). Sin `VITE_API_URL` el frontend corre en modo demo, solo con wallet.

## On-chain
- Toda lógica on-chain del cliente está en `app/lib/onchain.ts`: la API fija precios y ejecuta; la wallet del usuario solo aprueba USDC exacto al Vault y cobra (dividendos con prueba Merkle, capital tras liquidación).
- Las pantallas con datos reales usan `useSession().status !== 'disabled'` para elegir entre API y datos demo; los componentes en vivo reutilizan las primitivas `P*` y los mismos estilos.
- Prueba E2E en navegador: anvil + `npm run chain:localnet` en la API + frontend con `VITE_API_URL`, `VITE_CHAIN_ID=31337` y `VITE_CHAIN_RPC_URL`.

## Modo live vs demo
- Live (`VITE_API_URL` definido, `useSession().status !== 'disabled'`): todo sale de la API; nunca mostrar cifras inventadas (estados de carga/vacío en su lugar). Las secciones sin producto real muestran `ComingSoon` (hoy: Ecosistema y Swap).
- Mercado secundario en vivo: `app/features/market/` (contrato FactorActSecondaryMarket; la wallet aprueba y opera directo con el contrato y luego avisa a la API con `/v1/market/secondary/sync`). Reusa `ListingCard` y `FilterBar` de `pages/SecondaryMarket.tsx`, así demo y vivo se ven igual.
- Demo (sin API): datos de ejemplo de `app/data/` (catálogo heredado de KEY CHAIN, pendiente de reemplazar por proyectos de Brikme).
- Prerender: el catálogo y los contenidos públicos usan la copia del build mientras la API responde, así el HTML para buscadores conserva el contenido.
- Descargas/subidas con credenciales: solo a rutas `/v1/...` de la API (nunca a URLs externas).
- Subsidiarias: solo Bookey es pública; el resto son vistas previas para admins (`routes.ts`).

## Backend
La API vive en el repo hermano `key-chain-api` (NestJS + Prisma + Postgres + Redis en Railway). El cliente tipado está en `app/lib/api/` y se regenera con `npm run api:types` (lee `/openapi.json` de la API). La sesión (thirdweb SIWE → cookie HttpOnly) está en `app/lib/session.tsx`; todos los `ConnectButton` se importan desde `app/components/ConnectButton.tsx` para heredar el login.
