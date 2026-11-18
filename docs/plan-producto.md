# Plan de producto: KEY CHAIN completa y conectada

Fecha: 2026-10-08. Estado: **implementado en el entorno de pruebas (devnet)** el 2026-10-08. Ver el detalle de lo entregado y lo pendiente al final.

Producción (Railway, proyecto `key-chain`) se usa como **espacio de pruebas** sobre Polygon Amoy. Al terminar se borra y se despliega limpio.

Reglas que aplican a todo el plan:
- El diseño original no cambia. Todo elemento nuevo (formularios, tooltips, modales) se arma con las primitivas `P*` existentes y se valida con capturas antes/después en 1440×900 y 390×844.
- Nada de datos inventados en modo conectado. Si un dato no existe todavía, la pantalla lo dice ("Próximamente" o vacío explícito), no muestra cifras demo.
- Seguridad: validación zod en los bordes, permisos en el servidor, secretos solo en Railway, revisión de seguridad al cierre de cada fase.
- Cada fase termina con: typecheck, lint, tests (unit, e2e, on-chain), E2E en navegador y despliegue a Railway.

---

## 1. Diagnóstico (lo que encontré)

### Lo que ya funciona de verdad
Login con wallet (SIWE), KYC con identidad on-chain, tokenización de un activo, inversión en USDC, dividendos con prueba Merkle, liquidación y cobro de capital, y las acciones de admin para KYC y pools. Todo probado contra cadena.

### Lo que sigue estático o roto, por sección

| Sección | Problema principal |
| --- | --- |
| Inicio | "Hola, Max" y "13 de junio de 2026" escritos en el código. "+8.4% este mes", "desde Mar 2025", índice de diversificación 7.4 y la curva del portafolio son inventados. La cuenta regresiva apunta al 1 jul 2026 (ya pasó, por eso 00:00). Academia y roadmap son fijos. |
| Primer ingreso | No existe onboarding. Nadie te pide nombre, email, país ni aceptar términos. |
| Tokenizaciones | Lista, filtros y fichas salen de datos demo del frontend (`RWA_ASSETS`), no de la API. Feed, Actualizaciones, Documentos, Tokenomics y sellos de confianza son fijos. El enlace al explorador va a Polygon mainnet con un contrato falso. Checkout y el asistente "Tokenizar" no guardan nada. |
| Notificaciones | La campana muestra notificaciones demo. La API tiene endpoints, pero **ningún evento crea notificaciones** y el frontend no los llama. |
| Buscador superior | Es un dibujo, no un campo de texto. |
| Token KYCN | La página dice "FACT" y el menú "KYCN". Precio, rondas, tokenomics, "Mi vesting" y "Mi posición" son fijos. "Comprar" no compra. No hay ayuda contextual. |
| Mis pertenencias | La pestaña Wallet lee **Polygon mainnet** aunque la plataforma corre en Amoy (por eso todo da 0). "Balance total" es un texto fijo. Depositar y Retirar no hacen nada; Swap es una pantalla falsa. El gráfico usa 11 puntos inventados y cae a 0. |
| Ecosistema | Panel "Gestionar Ecosistema" visible para todos; botones que no llevan a ningún lado. |
| Subsidiarias | Muestra 6 productos. No existe ningún producto llamado "Bookpay": el más cercano es **Bookey** (reservas). |
| Perfil | "Editar perfil", avatar, actividad, nivel, logros, referidos, Documentos, Seguridad, Impuestos y Privacidad son fijos o solo cambian estado local. La API ya permite editar nombre, email y avatar, pero el frontend no la usa. |
| Centro de ayuda | Preguntas fijas y desactualizadas (Sumsub, CertiK, MATIC). La búsqueda es un dibujo. "Abrir un ticket" y "Chat en vivo" no hacen nada. No hay tickets en el backend. |
| Configuración | Todo es estado local y **la ve cualquier usuario** (no exige admin). |
| Desconectar wallet | La sesión vive en una cookie independiente de la wallet. Si desconectás desde la extensión, cambiás de cuenta o falla la reconexión, seguís adentro. |
| Responsive | Ninguna página usa la detección de móvil. Hay grillas fijas de 3 y 4 columnas en Inicio, Pertenencias, Perfil, Admin, ficha de activo, Token y Ayuda. Las tablas de admin no hacen scroll horizontal. |
| Mercado secundario | Datos fijos. Bug: "Comprar" cobra el precio de un solo token. No hay endpoints para publicar ni comprar. |
| Admin | Solo KYC y acciones de pool son reales. TVL, inversores, ingresos, usuarios, academia y revenue son fijos. Faltan endpoints de usuarios, métricas y auditoría. |
| KeyPay (dentro de KEY CHAIN) | Saldos, contactos y transacciones fijos. El checkout paga en Base a una dirección `0x…dead`. Solo el envío x402 es real. |

### La red de pruebas
- Tu wallet `0x41761DedB45b981AF60a8bc87311503702070604` tiene **0 POL y ningún token**, tanto en Amoy como en Polygon mainnet (verificado con Alchemy).
- "0 MATIC" en la barra es el nombre que thirdweb usa para el gas de Amoy.
- El protocolo que hoy está en Amoy depende de la clave `0x0a94…526d`, que no tenemos. Sin ella no se puede operar en producción.
- La USDC de Circle en Amoy solo se obtiene por faucet con captcha, así que no se puede repartir a usuarios de prueba.

### KeyPay (repo `/Users/sebastianduque/Keypay`)
Es una capa de login, wallet propia y KYC para todo el ecosistema (React + Vite, servidor Node sin framework, SQLite, contratos de smart wallet). Hoy funcionan cuentas, sesiones, dirección de wallet, saldos y un flujo tipo OAuth para apps externas. Enviar, pagar, invertir, swap, KYC e historial están en "Próximamente". No tiene recargas (on-ramp) ni retiros a banco. Sus contratos no están desplegados en ninguna red. Tiene hallazgos de seguridad abiertos (sin PKCE, SSRF en webhooks, tokens en localStorage, sal determinística).

Conclusión: por ahora seguimos con thirdweb en KEY CHAIN y dejamos preparada la integración con KeyPay para cuando tenga pagos y relayer.

---

## 2. Plan de trabajo

### Fase 0: Red de pruebas propia y saldo para probar
Objetivo: poder probar todo con tu wallet, sin depender de claves ajenas.
1. Generar tres claves nuevas del backend (despliegue, operación y firma de KYC) y guardarlas solo en Railway, sin mostrarlas.
2. Fondear la wallet de despliegue con POL de faucet. **Lo hacés vos** (los faucets piden captcha): te paso la dirección. Estimación del subagente: unos 2 POL para el despliegue y 5–10 POL de margen operativo. Es una estimación, la confirmo midiendo.
3. Redesplegar el protocolo completo en Amoy con el script oficial y un Timelock corto (60–300 s), más un **USDC de prueba** con faucet.
4. Hacer que la configuración de Amoy se lea de una variable (hoy está escrita en el código).
5. Faucet de pruebas en la app (solo testnet, desactivado en mainnet, con límite por usuario y día): USDC de prueba y una gota de POL para el gas de la aprobación.
6. Tu wallet como admin (`ADMIN_WALLETS`).
7. Enlaces al explorador de Amoy en toda la app.

### Fase 1: Sesión e identidad
1. Cerrar sesión automáticamente al desconectar la wallet, al cambiar de cuenta o si la reconexión falla. Las rutas privadas exigen sesión **y** wallet conectada con la misma dirección.
2. **Onboarding obligatorio** en el primer ingreso: nombre, email, país, aceptación de términos y privacidad. Backend: nuevos campos en el usuario, `/auth/me` ampliado y registro de la versión de términos aceptada.
3. Avatar con subida real a un bucket de Railway (tipos y tamaño validados).
4. Configuración solo para admin. Rol `issuer` respetado en las guardas.

### Fase 2: Capa de datos única
1. Reemplazar los datos demo por la API en todas las páginas conectadas. Las páginas públicas siguen prerenderizadas para SEO, pero leyendo la API en el build.
2. Quitar todo dato inventado en modo conectado (nombre, fechas, porcentajes, curvas).
3. Nuevos endpoints: historial del portafolio (instantánea diaria por usuario, la calcula el worker), próxima distribución por activo (fecha programada por el admin) y actividad del usuario.
4. Corregir los esquemas de respuesta que faltan (`/assets/{id}/updates`, `/ecosystem`) y regenerar el cliente tipado.

### Fase 3: Secciones
- **Inicio:** saludo con tu nombre, KPIs reales con variación calculada contra el historial, gráfico real, distribución con cuenta regresiva real, inversiones reales, Academia con artículos reales y "leídos" guardados. El roadmap y el airdrop pasan a "Próximamente" hasta tener reglas reales.
- **Tokenizaciones:** lista y filtros desde la API. Ficha con Feed y Actualizaciones reales (publica el emisor, likes reales), Documentos con archivos en el bucket (descarga firmada), Tokenomics desde el contrato (token, vault, tasa, fee) y enlace correcto al explorador.
- **Notificaciones:** el backend las crea en cada evento (KYC aprobado o rechazado, inversión confirmada, dividendo disponible, liquidación, ticket respondido). Campana con conteo real, marcar leída o todas, y click que lleva al lugar correcto. Actualización periódica.
- **Buscador superior:** búsqueda real de activos y artículos.
- **Token KYCN:** nombre unificado, datos desde la API (editables por el admin) y ayudas "?" con una primitiva nueva de tooltip accesible: precio, holders, recaudado, rondas, TGE, cliff, vesting, tokenomics y utilidad. Tu posición real según la decisión 2 de la sección 3.
- **Mis pertenencias:** saldos de la red de la plataforma (USDC y POL de Amoy) con balance total real.
  - Depositar: tu dirección con QR y el faucet en testnet; la recarga real llega en la fase 6.
  - Retirar: envío de USDC a otra dirección, con confirmación.
  - Swap: "Próximamente".
  - Gráfico desde el historial; "Vender" según la decisión 4.
- **Ecosistema:** "Próximamente", sin el panel de gestión público.
- **Subsidiarias:** solo Bookey. Las demás se quitan del menú, de las rutas, del sitemap, del prerender y de `llms.txt`.
- **Perfil:**
  - Editar perfil (nombre, email, avatar) y actividad real.
  - Nivel calculado con reglas claras, o se oculta si no hay reglas.
  - Documentos: tus documentos KYC.
  - Seguridad: sesiones activas con opción de cerrarlas (el 2FA por SMS no aplica con login por wallet).
  - Impuestos: resumen anual de inversiones y dividendos en CSV y PDF.
  - Privacidad: exportar tus datos y pedir el cierre de cuenta.
  - Referidos: "Próximamente".
- **Centro de ayuda:** preguntas desde la API (editables por el admin), búsqueda real, categorías que filtran y tickets de soporte (crear, ver estado y respuestas). "Chat en vivo" pasa a ser un asistente con IA que responde con la FAQ y deriva a ticket.

### Fase 4: Responsive
Pasada completa en todas las páginas y en el admin: grillas que colapsan, tablas con scroll, formularios en una columna. Validación con capturas en 390×844 y 768×1024 además de escritorio.

### Fase 5: Panel admin completo
Respuesta a tu primera pregunta: **hay panel admin, pero incompleto.** Hoy solo gestiona KYC y las operaciones on-chain de cada activo. Lo completamos con:
- Métricas reales: TVL desde la cadena, inversores, ingresos por fees y transacciones.
- Usuarios: búsqueda, ver perfil y KYC, cambiar rol, bloquear y cerrar sesiones.
- Activos: crear y editar ficha, documentos, programar distribuciones, pausar.
- Solicitudes de tokenización: el asistente "Tokenizar" guarda la solicitud y el admin la aprueba, lo que despliega el pool.
- Contenido: academia, FAQ, token KYCN y notificaciones a todos.
- Tickets de soporte, visor de auditoría, transacciones on-chain y configuración guardada en el backend.

### Fase 6: Dinero real (después de dejar la app funcional)
Respuesta a tu segunda pregunta: **recargar desde Colombia y otros países** requiere un proveedor de on-ramp (y off-ramp para retirar). KeyPay hoy no tiene ninguno. Haría una investigación comparando proveedores por:
- país y moneda (COP y otras);
- medios locales (PSE, Nequi, tarjetas);
- costos, requisitos regulatorios y KYC;
- integración con thirdweb o con KeyPay.

La decisión la tomamos con esa comparación en la mano. No afirmo hoy qué proveedor cubre qué país sin verificarlo.

Esta fase también cubre la integración con KeyPay (login con KeyPay y pagos), cuando KeyPay tenga esos módulos y sus hallazgos de seguridad cerrados.

### Fase 7: Cierre
- Escaneo completo de Claude Security sobre los tres repos (con tu confirmación de costo) y corrección de hallazgos.
- Suite E2E de navegador en una carpeta aparte (el frontend queda limpio, como pediste).
- Regresión visual completa.
- Borrado del entorno de pruebas y despliegue limpio.

---

## 3. Decisiones que necesito de vos

| # | Decisión | Mi recomendación |
| --- | --- | --- |
| 1 | "Bookpay" en Subsidiarias: ¿es **Bookey** (reservas)? | Asumo Bookey. |
| 2 | Token KYCN: no existe contrato. ¿Lo creamos en testnet (ERC-20 con preventa en USDC) o mostramos solo información administrada? | Solo información administrada en esta etapa; el contrato del token es otra fase con su propio diseño legal. |
| 3 | Onboarding: ¿verificamos el email con un código? Requiere un proveedor de correo (por ejemplo Resend) y su clave. | Sí, con verificación. |
| 4 | Mercado secundario y "Vender": no hay contrato de mercado secundario. | ~~"Próximamente"~~ Decisión del usuario: debe funcionar. Implementado con un contrato propio (ver sección 4). |
| 5 | Gas de los usuarios de prueba: ¿gota de POL desde el backend o gas patrocinado con thirdweb (requiere su clave secreta)? | Gota de POL en testnet; gas patrocinado para producción real. |
| 6 | Perfil, pestaña Seguridad: ¿reemplazamos el 2FA por "Sesiones activas"? | Sí. |
| 7 | Marca del token: la UI mezcla FACT, KYCN y FACTORACT. ¿Unificamos todo como **KYCN** y la plataforma como KEY CHAIN? | Sí, KYCN y KEY CHAIN. |

Con las respuestas a 1–7 y el POL en la wallet de despliegue arranco por la Fase 0. Las fases 1 a 4 pueden avanzar en paralelo una vez que la Fase 0 esté lista.

---

## 4. Estado al 2026-10-08

Implementado y probado (backend: 20 unit, 107 e2e, 36 on-chain; navegador: flujo completo 20/20):
- Fase 0: red de pruebas propia (servicio `devnet` en Railway), protocolo desplegado con claves propias, faucet de USDC y gas, tu wallet como admin.
- Fase 1: sesión atada a la wallet, onboarding obligatorio con términos, avatar, Configuración solo admin.
- Fase 2–3: todas las secciones conectadas (Inicio, Tokenizaciones, ficha, Pertenencias, Token KYCN con ayudas, Perfil completo, Centro de ayuda con tickets y asistente, Academia, Tokenizar), notificaciones por eventos, búsqueda, Ecosistema y Swap/Mercado secundario en "Próximamente", Subsidiarias solo Bookey.
- Fase 4: responsive en todas las páginas tocadas.
- Fase 5: panel admin completo.
- Mercado secundario real (P2P): contrato `FactorActSecondaryMarket` no custodial (el vendedor autoriza sus tokens y publica; el comprador paga en USDC y recibe los tokens en la misma transacción; el token ERC-3643 exige wallet verificada; comisión 0,5 % al vendedor). Publicar, comprar, retirar, "Vender" desde Mis Pertenencias, notificaciones y costo promedio en el portafolio. Solo tokens enteros (sin ofertas de polvo); antes de aprobar USDC el navegador relee la oferta y el token de pago en el contrato. Revisión de seguridad independiente: sin vías de robo ni de compra sin pago; los hallazgos menores quedaron corregidos. Pruebas: 20 de contrato, 47 on-chain en la API (10 del mercado), 13/13 en navegador. Desplegado en la devnet: `0x2a4e23de070d7c8af0fdbc0b57b429ac296e89b5`.
- Menú admin: conserva Inicio, Mis Pertenencias y Ecosistema además de Panel Admin y Configuración; el rol se recuerda para que el menú no parpadee al recargar.

Pendiente: verificación de email (falta la clave de Resend), asistente IA (falta la clave de Anthropic), swap (requiere contrato), recargas reales e integración con KeyPay (fase 6).

Antes de producción real (mercado secundario): vencimiento de ofertas, protección del vendedor ante cambios de comisión y confirmaciones del indexador en Polygon (ya configuradas en 10 bloques para 137/80002).
