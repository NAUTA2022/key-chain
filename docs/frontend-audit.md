# Auditoría y mejora del frontend — 2026-10-07

Alcance: solo frontend. El diseño visual no se modificó; se verificó con 50 capturas (25 pantallas en escritorio 1440×900 y móvil 390×844) comparadas píxel a píxel contra el sitio original.

## Resumen ejecutivo

| Área | Antes | Después |
| --- | --- | --- |
| Arquitectura | SPA Vite + React en JS; navegación interna en estado (sin URLs) | React Router 8 modo framework, URLs reales, prerender de más de 70 páginas públicas |
| Lenguaje | JavaScript | TypeScript estricto, sin `any`, 0 errores de tipos |
| SEO técnico | Solo `<title>KEY CHAIN</title>` | Título, descripción, canonical, Open Graph, Twitter y JSON-LD por página |
| Rastreo | Sin robots, sitemap ni manifest | `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest`, 404 real |
| Seguridad | Clave de IA en el navegador, admin por email, sin cabeceras | Sin secretos en el bundle, admin bloqueado hasta backend, cabeceras HTTP |
| Peso de `public/` | 41 MB | 25 MB |

### Lighthouse móvil, landing (mismo servidor local, throttling simulado)

| Métrica | Antes | Después |
| --- | --- | --- |
| Performance | 53 | 61 |
| Accesibilidad | 88 | 100 |
| SEO | 83 | 100 |
| First Contentful Paint | 18,6 s | 5,7 s |
| Largest Contentful Paint | 30,4 s | 7,6 s |
| Peso total | 5.774 KiB | 1.026 KiB |

Con throttling real de DevTools el landing pinta en 2,1 s. Las páginas del shell (academia, tokenizaciones) quedan en Performance 55 y SEO 100: cargan ~2,4 MB de la librería de wallets thirdweb (ver "Pendiente").

## Qué se hizo

### Arquitectura y limpieza
- Migración a React Router 8 (modo framework) con prerender estático; Vite 8; React 19.3.
- Todo el código a TypeScript estricto; ESLint con `typescript-eslint` strict.
- Navegación con URLs reales (`/tokenizaciones/3`, `/academia/<slug>`, `/ayuda`, `/panel`…). Botón atrás, deep links y compartir funcionan.
- Rutas privadas protegidas por wallet conectada; páginas públicas indexables sin login.
- Eliminados: 5 copias `* 2.*`, stubs de thirdweb, builds paralelos (Parcel, esbuild), servidor estático con path traversal, Tailwind (instalado pero sin uso), `App.css` sin uso, assets duplicados y sin uso, fixtures de QA (ids 51–57, filtro "Estado QA", banner para desarrolladores), alertas "Wallet preview only".

### Rendimiento
- División de código por ruta; el landing ya no carga la librería de wallets.
- Leaflet (mapas) y su CSS se cargan solo al mostrar un mapa.
- Música del ecosistema (11 MB) solo se descarga al reproducir.
- Fotos a WebP (5,7 MB → 3,1 MB); logos e íconos redimensionados (de ~500 KB a ~11 KB cada uno); hero del landing a WebP con `fetchpriority="high"` y preload.
- Fuentes desde `<head>` con `preconnect` (antes `@import` encadenado en CSS).
- Cursor: escrituras de CSS agrupadas a una por frame; eliminado el sonido de viento que intentaba decodificar un archivo vacío en cada movimiento del mouse.

### SEO, AEO y GEO
- Metadatos completos por ruta (`app/lib/seo.ts`), canonical absoluto, `og:locale es_AR`.
- JSON-LD: `Organization` y `WebSite` global; `FAQPage` en `/ayuda` con las 8 preguntas reales; `BreadcrumbList` en todas las páginas internas; `WebApplication` por producto.
- `robots.txt` que permite explícitamente a GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended y otros, y excluye áreas privadas.
- `sitemap.xml` generado desde las rutas reales; `llms.txt` con índice de la plataforma.
- HTML semántico sin cambio visual: un `<h1>` por página, `<nav>`, `<article>`, FAQ con encabezados y respuestas presentes en el HTML, enlaces `<a href>` rastreables en sidebar, barra móvil y landing, `alt` descriptivos, `aria-label` en botones de ícono.

### Seguridad
- La llamada directa a la API de Anthropic desde el navegador se reemplazó por un endpoint de backend (`POST /v1/advisor/chat` de la API). **Si `VITE_ANTHROPIC_KEY` estuvo configurada en Vercel, hay que rotar esa clave.**
- Eliminado el acceso admin por email hardcodeado (el email estaba en el bundle público).
- Transferencias de KeyPay validadas con zod (dirección EVM, monto positivo y acotado); sin endpoint por defecto a `localhost`.
- Cabeceras en `vercel.json`: HSTS, `X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP y una CSP en modo report-only para ajustar antes de forzarla.
- `.gitignore` cubre todas las variantes `.env.*`; `.env.example` documenta las variables.
- `npm audit fix` aplicado. Quedan 29 avisos transitivos de thirdweb (5 altos en `ws`, `js-yaml` y `@hey-api/*`), sin parche publicado por thirdweb y fuera del código que corre en el navegador.

### Errores corregidos que salieron a la luz
- Landing: las tarjetas de activos mostraban `$undefined` y `undefined%`.
- "Cerrar sesión" en Key Jobs y Key Go, y "Cambiar cuenta" en Key Rural, lanzaban un error.
- Cerrar sesión desde el menú móvil no hacía nada.
- Tracker GPS: la vista de drones podía romperse y su leyenda mostraba estados de autos.
- Ecosistema: el pinch-zoom no funcionaba.
- Key Go: el historial guardaba la distancia como si fuera el costo.
- Dashboard: el artículo marcado como leído no aparecía tachado.
- Pertenencias: el botón Swap dejaba la pantalla vacía (ahora abre Swap).

## Pendiente

### Requiere acción manual (no es código)
- **Vercel:** definir `VITE_SITE_URL` con el dominio definitivo (si no, se usa el dominio de producción de Vercel), `VITE_THIRDWEB_CLIENT_ID`, y luego los endpoints del backend.
- **thirdweb dashboard:** restringir los dominios permitidos del client ID.
- **Search Console y Bing Webmaster:** verificar el dominio y enviar `/sitemap.xml`.
- **Rich Results Test** sobre `/ayuda` y una ficha de activo; **PageSpeed Insights** sobre producción.
- **CSP:** revisar la consola en producción unas semanas y pasar la política de report-only a forzada.
- Si hay Cloudflare delante: desactivar "Managed robots.txt" en AI Crawl Control o el `robots.txt` propio quedará anulado.

### Bloqueado por decisión o contenido del cliente
- **Marca:** conviven KEY CHAIN, KEYCHAIN, FACTORACT, token FACT y token KYCN. Los metadatos usan "KEY CHAIN"; la UI no se tocó.
- **Artículos de Academia:** los 6 comparten el mismo cuerpo de texto. Están en `noindex` y fuera del sitemap hasta tener contenido propio; luego se puede agregar `Article` schema con autor real.
- **Cifras del landing** ($28.4M, 148 proyectos, 12.840 inversores) y activos de ejemplo: si no son reales, no deberían publicarse; no se agregó ningún schema con esos datos.
- **Páginas legales** (Términos, Privacidad, Contacto) y contacto de seguridad para `security.txt`.
- **Licencia del modelo 3D** (`nucleo.glb` proviene de Sketchfab): confirmar atribución.
- **Contraste de color** en textos terciarios y tamaño de los puntos del carrusel: Lighthouse los marca, pero cambiarlos es una decisión de diseño.

### Para la etapa de backend
Ver `docs/backend-handoff.md`: endpoints x402 y asesor IA, sesión SIWE y roles, reemplazo de los datos demo. Una sesión de servidor permitiría además cargar la librería de wallets solo al conectar, que es hoy el principal costo de rendimiento de las páginas del shell.

## Validación post-deploy
```bash
curl -sI https://<dominio>/ | grep -iE "strict-transport|x-frame|content-security|referrer|permissions"
curl -s https://<dominio>/robots.txt | head
curl -s https://<dominio>/sitemap.xml | head
curl -s -o /dev/null -w "%{http_code}\n" https://<dominio>/no-existe   # debe ser 404
curl -s https://<dominio>/ayuda | grep -c 'FAQPage'                      # debe ser 1
```
