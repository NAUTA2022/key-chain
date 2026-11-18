# Plan del backend — KEY CHAIN

Estado: **propuesta para revisión**. No se ha creado ningún archivo del backend.
Carpeta destino: `/Users/sebastianduque/Key Chain/key-chain-api` (repo aparte).
Despliegue: Railway. Login y wallet: thirdweb.

---

## 1. Decisiones de arquitectura

| Decisión | Elección | Por qué |
| --- | --- | --- |
| Framework | **NestJS 12 + Fastify** (TypeScript estricto) | Módulos, inyección de dependencias, guards e interceptores. Fastify duplica el throughput de Express y es el adaptador que Nest recomienda hoy. |
| Base de datos | **PostgreSQL en Railway** | Datos relacionales (activos, órdenes, holdings, KYC). Plugin oficial con backups. |
| ORM | **Prisma 7** | Esquema declarativo, migraciones versionadas, tipos generados. Ya es parte de tu stack. |
| Cache y colas | **Redis en Railway + BullMQ** | Jobs de indexación on-chain, webhooks, emails, rate limit distribuido. |
| Archivos | **Railway Buckets (S3)** | Documentos KYC, fotos de activos, documentos de proyectos. Acceso por URL firmada, nunca público. |
| Auth | **thirdweb Auth (SIWE, EIP-4361)** + JWT en cookie `HttpOnly` | Cualquier wallet (externa, in-app, social, smart) firma un reto; el backend emite sesión. Sin contraseñas. |
| Pagos | **thirdweb x402** (`settlePayment` + `facilitator`) para transferencias de KeyPay; **CheckoutWidget/SwapWidget** siguen en el frontend; **webhooks de thirdweb** para confirmar compras | Es lo que el frontend ya integra. |
| On-chain | **thirdweb SDK v5 + Engine** (server wallet) para emitir/transferir tokens de activos y leer balances | Una sola cuenta de thirdweb para todo. Evitamos nodos propios. |
| IA | **Anthropic SDK** (Claude Haiku 4.5) tras el endpoint del asesor | Clave solo en servidor, rate limit por usuario. |
| Validación | **zod** en bordes (DTOs vía `nestjs-zod`, env vía esquema) | Misma librería que el frontend. |
| Observabilidad | **pino** (JSON) + **OpenTelemetry** exportado a Railway Tracing + `/health` | Railway muestra logs, métricas y trazas sin herramientas externas. |
| Tests | **Vitest** unitarios e integración con Postgres en Docker (`testcontainers`) | Rápido; mismo runner que el front. |
| API | **REST JSON versionada** (`/v1`) con **OpenAPI** generado (`@nestjs/swagger`) y cliente tipado para el frontend | El frontend consume un cliente generado, no `fetch` a mano. |

Descartados: GraphQL (sin necesidad de queries flexibles), microservicios (un solo equipo, un solo dominio), Supabase Auth (el login es por wallet).

---

## 2. Servicios en Railway (un proyecto, entornos `production` y `staging`)

```
key-chain (proyecto Railway)
├─ api          NestJS, HTTP público (api.<dominio>), 1+ réplicas, /health
├─ worker       mismo código, arranca BullMQ workers (sin HTTP público)
├─ indexer      cron cada 5 min: sincroniza eventos on-chain y balances
├─ postgres     plugin Railway, backups automáticos + pg_dump semanal a bucket
├─ redis        plugin Railway
├─ bucket-kyc   Railway Bucket privado (documentos KYC, cifrado en reposo)
└─ bucket-media Railway Bucket (fotos de activos y proyectos)
```

- **Private networking** entre api, worker, Postgres y Redis (sin exponer DB).
- **PR environments** activados: cada PR levanta api+worker contra una DB efímera.
- **Config as code** en `railway.json` (build con Dockerfile, healthcheck `/health`, restart policy).
- **Dominios:** `api.<dominio>` para producción, `api-staging.<dominio>` para staging. El frontend en Vercel apunta con `VITE_API_URL`.
- **Variables** (Railway Variables, nunca en el repo): `DATABASE_URL`, `REDIS_URL`, `THIRDWEB_SECRET_KEY`, `THIRDWEB_CLIENT_ID`, `AUTH_DOMAIN`, `AUTH_ADMIN_PRIVATE_KEY` (firma de JWT), `JWT_TTL`, `SERVER_WALLET_ADDRESS`, `ANTHROPIC_API_KEY`, `KYC_PROVIDER_*`, `S3_*` de cada bucket, `FRONTEND_ORIGIN`, `THIRDWEB_WEBHOOK_SECRET`.

---

## 3. Estructura del repo

```
key-chain-api/
  prisma/schema.prisma, migrations/, seed.ts
  src/
    main.ts                 bootstrap Fastify, helmet, CORS, cookies, OTel
    app.module.ts
    config/                 env.schema.ts (zod), config.module.ts
    common/                 guards (auth, roles, kyc), interceptors (logging), filters (errores RFC 9457), pipes zod, decorators (@CurrentUser)
    infra/                  prisma/, redis/, queue/, storage/ (S3), thirdweb/ (client, auth, engine), telemetry/
    modules/
      auth/                 SIWE: payload, login, logout, me, refresh
      users/                perfil, preferencias, roles
      kyc/                  verificación individual/empresa, documentos, webhook del proveedor
      assets/               catálogo RWA (público), fichas, documentos, feed/actualizaciones
      tokenization/         wizard "tokenizar activo": solicitudes, revisión admin, emisión on-chain
      market/               primario (órdenes de compra) y secundario (listados P2P)
      portfolio/            holdings, balances, distribuciones de rendimientos
      payments/             inbox de pagos pendientes, checkout, x402 transfers, webhooks thirdweb
      wallet/               balances on-chain, actividad (lectura vía thirdweb)
      token/                token de plataforma: rondas, vesting, claims
      notifications/        in-app (+ email después)
      academy/              posts y FAQ (contenido)
      ecosystem/            países, sectores, empresas, proyectos
      advisor/              asesor IA (Anthropic) con rate limit
      admin/                métricas, usuarios, aprobación de activos y KYC, configuración
      products/
        bookey/             propiedades, disponibilidad, reservas, favoritos
        key-go/             lugares, viajes, historial
        key-jobs/           empleos, postulaciones, posts, perfiles
        key-rural/          campos, inversiones, chat con asesores
        escrow-chain/       operaciones de importación/exportación con escrow
        tracker-gps/        activos rastreados, posiciones (ingesta por webhook/MQTT después)
      tenant/               portal del inquilino: contrato, pagos, incidencias
    workers/                procesadores BullMQ (indexer, webhooks, emails, snapshots)
  test/                     unit + e2e (testcontainers)
  Dockerfile, railway.json, .env.example, CLAUDE.md, README.md
```

Cada módulo: `*.controller.ts` (HTTP), `*.service.ts` (casos de uso), `*.repository.ts` (Prisma), `dto/` (zod), `*.spec.ts`. Reglas: controladores sin lógica, servicios sin SQL, errores de dominio tipados, literal unions en vez de enums de TS (los enums de Prisma se mapean a unions).

---

## 4. Modelo de datos (Prisma, resumen)

Identidad y cumplimiento
- `User` (id, walletAddress único, role: `investor | issuer | admin`, email?, name?, avatarUrl?, locale, createdAt)
- `Session` (jti del JWT, userId, expiresAt, revokedAt) para logout real
- `KycVerification` (userId, type `individual | business`, status `none | pending | verified | rejected`, legalName, documentId, country, providerRef, reviewedBy, reviewedAt)
- `KycDocument` (verificationId, bucketKey, kind, uploadedAt)
- `UserPreference` (theme, palette, font, rubro) — hoy en localStorage; opcional sincronizar

Activos y mercado
- `Issuer` (empresa emisora: name, verified, country, logoUrl) ↔ `User` (owner)
- `Asset` (slug, name, category `autos | campos | drones | inmuebles | edificios`, country, location, valuation, tokenPrice, totalTokens, apy, stage `recaudacion | operativo | cerrado`, lifespan, contractAddress, chainId, description, status `draft | review | published | archived`, feedEnabled, issuerId)
- `AssetImage`, `AssetDocument` (bucketKey, title, visibility)
- `AssetUpdate` (feed: text, imageKey, milestone, authorId) y `AssetUpdateLike`
- `AssetPerformance` (serie mensual para gráficos)
- `TokenizationRequest` (wizard: userId, payload JSON validado, status, reviewer notes) → al aprobar crea `Asset`
- `PrimaryOrder` (userId, assetId, qty, unitPrice, fee, total, status `pending | paid | minted | failed`, paymentId, txHash)
- `SecondaryListing` (sellerId, assetId, qty, askPrice, status `active | sold | cancelled`) y `SecondaryTrade`
- `Holding` (userId, assetId, tokens, invested, since) — se recalcula desde on-chain + órdenes
- `YieldDistribution` (assetId, period, totalUsdc, txHash) y `YieldPayout` (userId, amount)

Pagos
- `PendingPayment` (userId, name, qty, unit, fee, source, status `pending | paid | cancelled`, origin JSON: assetId/orderId/bookingId…) — reemplaza el inbox en memoria
- `Payment` (userId, provider `thirdweb_checkout | x402 | p2p`, amount, asset `USDC`, chainId, txHash, status, raw JSON)
- `Transfer` (x402: fromUserId, toAddress, amount, network, settlementRef, status)
- `WebhookEvent` (provider, eventId único, payload, processedAt) — idempotencia

Token de plataforma
- `TokenRound` (name, price, status, alloc, tge, cliff, vesting), `TokenPurchase`, `VestingSchedule`, `VestingClaim`

Contenido y ecosistema
- `AcademyPost` (slug, title, excerpt, body markdown, cat, readMin, publishedAt, authorId, coverKey, status)
- `Faq` (question, answer, order, published)
- `Country`, `Sector`, `Company`, `Project` (+ metadatos regulatorios, enlaces, reviews) — hoy en `ecosystem/data.ts`

Productos
- Bookey: `Property`, `PropertyImage`, `Availability`, `Booking` (status, pay token `USDC | KYCN`, paymentId), `Favorite`
- Key Go: `Place`, `Ride` (phase, pickup/dest, rideType, driverId, cost, paymentId), `Driver`
- Key Jobs: `JobPosting`, `JobApplication`, `CompanyProfile`, `CandidateProfile`, `FeedPost`, `PostReaction`, `PostComment`
- Key Rural: `Field` (kind `agricola | vinedos`), `FieldInvestment`, `Advisor`, `ChatThread`, `ChatMessage`
- Escrow Chain: `TradeListing`, `EscrowDeal` (status `abierto | en_escrow | completado | disputa`, milestones, docs)
- Tracker GPS: `TrackedAsset` (type `autos | drones`, status), `Position` (lat, lng, speed, heading, at) — tabla particionada por tiempo
- Tenant: `Lease`, `RentPayment`, `MaintenanceIssue` (status `pendiente | en_progreso | resuelto`)

Notificaciones y admin
- `Notification` (userId, type `yield | market | kyc | sale | vesting | system`, title, body, readAt, link)
- `PlatformSetting` (clave/valor tipado: fees, RPC, features, banners) — lo que hoy muestra `Config`
- `AuditLog` (actorId, action, entity, before/after) para toda acción de admin

Todas las tablas: `createdAt`, `updatedAt`, soft delete donde aplique, índices por `userId` y `status`.

---

## 5. Autenticación y autorización (thirdweb)

Flujo SIWE (coincide con `ConnectButton` `auth` del frontend):

1. `GET /v1/auth/payload?address=0x…&chainId=137` → `auth.generatePayload` (nonce guardado en Redis, TTL 5 min, un solo uso).
2. Usuario firma en la wallet (externa, in-app con email/Google, o smart wallet).
3. `POST /v1/auth/login { payload, signature }` → `auth.verifyPayload` → upsert `User` por `walletAddress` → `auth.generateJWT` → cookie `kc_session` (`HttpOnly`, `Secure`, `SameSite=None` porque API y front están en dominios distintos, `Domain=.<dominio>`), más registro en `Session`.
4. `GET /v1/auth/me` → `auth.verifyJWT` + sesión no revocada → usuario, rol, estado KYC.
5. `POST /v1/auth/logout` → revoca `Session`, borra cookie.

Guards: `AuthGuard` (JWT válido), `RolesGuard` (`@Roles('admin')`), `KycGuard` (`@RequiresKyc()` para comprar, vender, retirar). El rol `admin` se asigna por seed o por otro admin, nunca desde el cliente. Rate limit en `/auth/*` (10/min por IP). CSRF: cookie + verificación de `Origin` contra `FRONTEND_ORIGIN`.

Cambios mínimos en el frontend al conectar: pasar `auth` a los `ConnectButton`, reemplazar `require-wallet` por "sesión válida" (`/auth/me`), y leer `role` desde la sesión.

---

## 6. API (resumen de endpoints, todos bajo `/v1`)

Público (sin sesión; los usa también el prerender del frontend en build):
- `GET /assets`, `GET /assets/:slug`, `GET /assets/:slug/updates`
- `GET /market/secondary/listings`
- `GET /token` (rondas, tokenomics), `GET /academy/posts`, `GET /academy/posts/:slug`, `GET /faq`
- `GET /ecosystem` (árbol país→sector→empresa→proyecto)
- `GET /products/bookey/properties`, `/products/key-jobs/jobs`, `/products/key-rural/fields`, `/products/escrow-chain/listings`
- `GET /health`, `GET /openapi.json`

Con sesión:
- `GET/PATCH /me`, `GET /me/notifications`, `POST /me/notifications/:id/read`, `GET /me/holdings`, `GET /me/balances`, `GET /me/activity`
- KYC: `POST /kyc/start`, `POST /kyc/documents` (URL firmada de subida), `GET /kyc/status`
- Mercado: `POST /market/primary/orders` (crea `PrimaryOrder` + `PendingPayment`), `POST /market/secondary/listings`, `POST /market/secondary/listings/:id/buy`
- Pagos: `GET /payments/pending`, `DELETE /payments/pending/:id`, `POST /payments/x402/transfer` (402 → firma → settle), `POST /payments/checkout/intent`
- Tokenización: `POST /tokenization/requests`, `GET /tokenization/requests/:id`
- Token: `POST /token/purchases`, `GET /token/vesting`, `POST /token/vesting/claim`
- Asesor: `POST /advisor/chat` (10 mensajes/min por usuario)
- Productos: reservas, viajes, postulaciones, inversiones rurales, escrow, posiciones GPS, incidencias del inquilino
- Feed de activo: `POST /assets/:id/updates` (solo issuer dueño), `POST /assets/:id/updates/:uid/like`

Admin (`@Roles('admin')`):
- `GET /admin/metrics`, `GET /admin/users`, `PATCH /admin/users/:id/role`
- `GET /admin/kyc`, `POST /admin/kyc/:id/approve|reject`
- `GET /admin/tokenization/requests`, `POST …/:id/approve` (emite contrato vía Engine), `POST …/:id/reject`
- `GET/PUT /admin/settings`, `GET /admin/audit`

Webhooks (firma verificada, idempotentes vía `WebhookEvent`):
- `POST /webhooks/thirdweb` (pagos de Checkout, transacciones de Engine)
- `POST /webhooks/kyc` (proveedor KYC)

Convenciones: paginación por cursor, errores RFC 9457 (`application/problem+json`), `Idempotency-Key` en POST que crean dinero/órdenes, versionado por prefijo.

---

## 7. Pagos y on-chain

- **x402 (KeyPay → Enviar):** el endpoint valida `to` (dirección EVM o contacto) y `amount` (zod, mismo esquema que el front), responde 402 con `settlePayment`; al liquidar, Engine transfiere USDC en Base al destinatario desde la server wallet y registra `Transfer`. CORS con preflight para la cabecera `X-PAYMENT`.
- **Compras (CheckoutWidget):** el front crea la orden en el backend, paga con el widget; el webhook de thirdweb confirma y el worker **mintea/transfiere tokens del activo** con Engine, actualiza `Holding` y notifica.
- **Indexer (cron 5 min):** lee transferencias de los contratos de activos y del token de plataforma, concilia `Holding` y `YieldPayout`. Fuente de verdad: la cadena; la DB es cache consultable.
- **Rendimientos:** job mensual que calcula `YieldDistribution` por activo y ejecuta pagos en USDC vía Engine por lotes, con reintentos y auditoría.
- Server wallet gestionada por thirdweb Engine (claves nunca en nuestro código). Límites de gasto y alertas configurados en el dashboard.

---

## 8. Seguridad

- Secretos solo en Railway Variables; `.env.example` sin valores.
- `helmet`, CORS estricto a `FRONTEND_ORIGIN`, cookies `HttpOnly`, JWT con `jti` revocable, TTL 7 días con refresh silencioso.
- Rate limit global (Redis) + específico en auth, advisor, pagos.
- Validación zod en todo input; respuestas tipadas (nunca se devuelve una entidad Prisma cruda).
- Webhooks: verificación de firma HMAC + idempotencia + cola (respuesta 200 inmediata, proceso en worker).
- Subidas: URL firmada directa al bucket, tipos y tamaño limitados, antivirus opcional en worker; documentos KYC nunca con URL pública, acceso por URL firmada de 60 s y registrado en `AuditLog`.
- Admin: toda acción pasa por `AuditLog`; aprobación de tokenización requiere `reason`.
- Dependencias: `npm audit` en CI, Dependabot/Renovate.
- Cumplimiento: retención de documentos KYC configurable, endpoint de exportación/borrado de datos del usuario.

---

## 9. Calidad, CI/CD y operación

- **CI (GitHub Actions):** typecheck, lint, tests unitarios, tests e2e con Postgres/Redis en servicios de CI, `prisma migrate diff` para detectar esquema sin migración, build de Docker.
- **CD:** Railway despliega `main` → production y `develop` → staging; PRs crean entorno efímero. Migraciones corren en el **pre-deploy command** (`prisma migrate deploy`), nunca en el arranque de la app.
- **Healthcheck** `/health` (DB, Redis, thirdweb) y **readiness** separado.
- **Observabilidad:** pino con `requestId`, OTel a Railway Tracing, alertas por error rate (Railway webhooks → Slack/email).
- **Backups:** backups de Railway + `pg_dump` semanal al bucket (cron service). Prueba de restauración trimestral.
- **Seed:** convierte los datos demo actuales del frontend (`app/data`, `ecosystem/data.ts`, fixtures de productos) en `prisma/seed.ts` para que staging arranque con contenido.

---

## 10. Contrato con el frontend

- Se genera `openapi.json` en build; el frontend corre `openapi-typescript` y usa un cliente tipado en `app/lib/api/`.
- Páginas públicas prerenderizadas leen la API en build (`loader`), con fallback a los datos demo si la API no responde (para no romper el build).
- Páginas privadas usan `clientLoader` + sesión por cookie.
- Variable del frontend: `VITE_API_URL` (reemplaza a `VITE_X402_ENDPOINT` y `VITE_ADVISOR_ENDPOINT`).
- El servidor `server/x402-server.mjs` del frontend ya fue retirado: la API lo reemplaza.

---

## 11. Fases de implementación

| Fase | Entrega | Incluye |
| --- | --- | --- |
| 0 | Fundaciones | Repo, Nest+Fastify, Prisma, config zod, Docker, `railway.json`, CI, `/health`, logging, OTel, staging en Railway con Postgres y Redis |
| 1 | Auth y usuarios | SIWE con thirdweb, sesión en cookie, roles, `/me`, preferencias, integración en el frontend (`ConnectButton auth`, guards) |
| 2 | Catálogo y contenido | Assets, issuers, academy, FAQ, ecosistema, seed desde datos demo, OpenAPI + cliente en el front, prerender leyendo la API |
| 3 | Pagos | Pending payments, órdenes primarias, webhooks de thirdweb, x402 transfer, Engine para emisión/transferencia, holdings e indexer |
| 4 | KYC y admin | Proveedor KYC, documentos en bucket, panel admin (usuarios, KYC, aprobación de tokenizaciones, settings, audit) |
| 5 | Mercado secundario, token, rendimientos | Listados P2P, trades, rondas y vesting, distribuciones mensuales, notificaciones |
| 6 | Productos | Bookey, Key Go, Key Jobs, Key Rural, Escrow Chain, Tracker GPS, portal del inquilino (un módulo por iteración, cada uno reemplaza su fixture en el front) |
| 7 | Asesor IA y cierre | Endpoint Anthropic con rate limit, pruebas de carga, hardening de CSP en el front, documentación final |

Cada fase termina con tests verdes, despliegue en staging y el frontend consumiendo el módulo real.

---

## 12. Decisiones que necesito de vos antes de empezar

1. **Proveedor KYC:** la UI menciona Sumsub. ¿Confirmamos Sumsub, u otro (Veriff, Onfido)? Define el módulo `kyc` y el webhook.
2. **Red y contratos:** la plataforma dice Polygon y KeyPay cobra en USDC sobre Base. ¿Los tokens de activos van en Polygon y los pagos en Base, o unificamos? ¿Existen ya contratos o se emiten con thirdweb (ERC-20 por activo)?
3. **thirdweb Engine:** ¿usamos Engine Cloud (gestionado) o lo desplegamos en Railway? Recomiendo Cloud para empezar.
4. **Dominio:** necesito el dominio definitivo para `AUTH_DOMAIN`, cookies y CORS.
5. **Email transaccional:** ¿Resend, Postmark u otro? Sirve para notificaciones y KYC; puede ir en una fase posterior.
6. **Fuente de precios/APY:** ¿los define el emisor al tokenizar, o un admin? Afecta la validación del wizard.
7. **Tracker GPS:** ¿hay dispositivos reales (protocolo) o seguimos con simulación por ahora?
8. **Token de plataforma:** nombre definitivo (FACT o KYCN) y si ya existe contrato.
