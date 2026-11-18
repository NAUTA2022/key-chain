# Modelo de negocio de KEY CHAIN (versión base)

Fecha: 2026-10-09. Estado: borrador para que lo discutan los fundadores. No es asesoría legal ni tributaria.

**Cómo leer este documento**
- **Verificado en código**: lo comprobamos leyendo los contratos y la API de KEY CHAIN.
- **Fuente**: dato externo con su URL al final del documento (sección 13). Todas las fuentes se consultaron el 2026-10-09.
- **[resumen]**: el dato sale solo del resumen de un buscador; no pudimos abrir la página. Hay que confirmarlo antes de usarlo en público.
- **Estimación** o **Recomendación**: es nuestro cálculo o nuestra propuesta, con los supuestos a la vista.

---

## 1. Resumen ejecutivo

**Qué es KEY CHAIN hoy.** Una plataforma que convierte activos reales en tokens de valor. Esos activos son inmuebles, campo, vehículos y contenedores. Corre en un entorno de pruebas (una red privada), no en producción.

**Qué ya funciona:**
- Emisión de tokens con identidad verificada on-chain, bajo el estándar ERC-3643.
- Inversión en USDC.
- Dividendos y liquidación.
- Mercado secundario entre personas (P2P), sin custodia de KEY CHAIN.
- Red social: feed, perfiles de empresa y seguidores.
- Panel de administración.

**Cuatro comisiones ya están escritas en los contratos:**
- **0,5 %** sobre cada inversión primaria.
- **2 %** sobre cada reparto de dividendos.
- **0,5 %** al vendedor en el mercado secundario.
- **Paywall de membresía** para empresas emisoras, con cuatro niveles (NONE, BASIC, PREMIUM, ENTERPRISE). Hoy nadie cobra esa membresía: el admin asigna el nivel a mano.

**Qué recomendamos:**
1. **Que el emisor pague el éxito de la emisión, no el inversionista.** Recomendación: subir la comisión de emisión de 0,5 % a **2–3 %**. El mercado cobra entre 4,9 % y 7,5 % al emisor (Netcapital, Republic, Wefunder, Urbanitae; a2censo en Colombia "hasta 5 %" [resumen]), y el inversionista paga 0 %. Con 0,5 %, KEY CHAIN necesita unos US$ 5 M colocados por mes para cubrir costos; con 2,5 %, cerca de US$ 0,9 M (sección 9).
2. **Membresías para empresas con precio publicado.** Recomendación: Inicial US$ 149/mes, Pro US$ 499/mes y Enterprise / marca blanca desde US$ 2.500/mes. Cada plan corresponde a un nivel que ya existe en el contrato. Referencias: Brickken cobra €299–1.999 al mes, Stobox US$ 499 y Tokeny €3.000–5.000.
3. **Cargo de estructuración por tokenización.** Recomendación: desde US$ 2.500, con lo legal y la valuación pasados al emisor a costo.
4. **Publicidad para empresas, siempre marcada como "Patrocinado".** Formatos: empresa destacada, post patrocinado en el Feed y banners. La marca `featured` y los banners ya existen. Nunca se promocionan rendimientos.
5. **Mercado secundario al 1 % del vendedor** cuando haya liquidez. La referencia es Lofty, que cobra 2,5 %.
6. **Mantener el 2 % sobre dividendos.** RealT y Reental cobran el mismo 2 % sobre rentas.

**El riesgo principal no es el precio, es la licencia.** Ofrecer tokens de activos reales al público y cobrar por su compraventa exige, en casi todos los países objetivo, una figura autorizada. En Colombia es una plataforma de financiación colaborativa vigilada por la SFC o la arenera. En Argentina, un PSAV o fiduciario registrado en la CNV. En Brasil, plataforma CVM 88. En EE. UU., broker-dealer o ATS. Las membresías, la estructuración y la publicidad tienen menos exposición regulatoria y conviene encenderlas primero.

**Sobre "somos los primeros" y "desmonopolizamos".** No lo pudimos verificar. En LatAm no encontramos ninguna plataforma documentada que junte, como KEY CHAIN, tokenización con KYC, mercado primario, dividendos, secundario, red social y subsidiarias. Pero hay muchos competidores de tokenización, y varios ya dicen ser "pioneros" o "primeros" (sección 3.3). Recomendamos el mensaje "la plataforma todo-en-uno", y no "la primera".

---

## 2. Qué es KEY CHAIN hoy (lo que está construido)

### 2.1 Piezas del producto

| Pieza | Estado | Dónde |
| --- | --- | --- |
| Login con wallet (SIWE), onboarding con términos | Funciona en devnet | API `auth`, `users` |
| KYC con identidad on-chain (ONCHAINID) | Funciona; **la revisión la hace un admin a mano**, sin proveedor externo | API `kyc` |
| Empresas: registro, revisión (KYB manual), perfil público, banner, seguidores | Funciona | API `company`, `social` |
| Solicitudes de tokenización → el admin aprueba → se despliega el pool | Funciona | API `tokenization`, contratos `FactorActFactory` |
| Inversión primaria en USDC | Funciona | `PrimaryIssuance`, API `market` |
| Dividendos con prueba Merkle y liquidación con cobro de capital | Funciona | `DividendDistributor`, `LiquidationManager` |
| Mercado secundario P2P sin custodia | Funciona en devnet | `FactorActSecondaryMarket` |
| Feed social: publicaciones, likes, comentarios, perfiles | Funciona | API `social` |
| Asesor IA y asistente de soporte (Anthropic) | Construido; **falta la clave** | API `advisor`, `support` |
| Envío de USDC por x402 (KeyPay) | Funciona; no cobra comisión | API `payments` |
| Token KYCN | **No hay contrato.** La página muestra información que carga el admin | Frontend `features/token` |
| Subsidiarias (Bookey, Key Go, Key Jobs, Key Rural, Escrow Chain, Tracker GPS, KeyPay) | Solo Bookey es pública; el resto son vistas previas con datos demo | Frontend `features/*` |
| Ecosistema y Swap | "Próximamente" | Frontend |

### 2.2 Comisiones tal como están implementadas (verificado en código)

| Comisión | Valor actual | Quién la paga hoy | Tope del contrato | Quién la cambia |
| --- | --- | --- | --- | --- |
| `ISSUANCE_FEE` (FeeManager) | **50 bps = 0,5 %** de cada inversión primaria | Modo on-chain: se descuenta del monto del inversionista y el vault del emisor recibe el 99,5 %, así que en la práctica la paga el **emisor**. Modo pago off-chain (KeyPay): la API la **suma** al total del inversionista (`total = subtotal + 0,5 %`) | 5.000 bps (50 %) | Owner del FeeManager (Timelock) |
| `YIELD_FEE` (FeeManager) | **200 bps = 2 %** de cada reparto de dividendos | El emisor deposita el 100 %, 2 % va a la tesorería y los inversionistas reciben el neto | 5.000 bps | Timelock |
| Tarifas "marca blanca" (FeeManager) | Por emisor: si `isWhiteLabel[emisor]` es verdadero, se usa `customFees[emisor][tipo]`, **y si no se configuró da 0 %** | — | 5.000 bps | Timelock |
| Mercado secundario | **50 bps = 0,5 %** que se descuenta de lo que recibe el vendedor (fijado en el despliegue) | Vendedor | 1.000 bps (10 %) | Admin del contrato |
| Liquidación | Sin comisión | — | — | — |
| Membresía (`FactorActMembership`) | Niveles NONE / BASIC / PREMIUM / ENTERPRISE. El Factory **bloquea** el despliegue con NONE y limita BASIC a **1 pool**. PREMIUM y ENTERPRISE no tienen límite | No hay cobro on-chain: el admin asigna el nivel | — | `ADMIN_ROLE` |
| `displayFeePercent` (API, configuración) | 0,5 %; es solo el valor que se **muestra** al inversionista | — | 0–10 % | Admin |
| Tesorería (`FactorActTreasury`) | Recibe todas las comisiones; solo el Timelock retira | — | — | Timelock |

**Hallazgos que importan para el negocio:**
1. **Hay una inconsistencia en quién paga el 0,5 %.** On-chain lo absorbe el emisor; en el modo de pago off-chain lo paga el inversionista encima del precio. Hay que decidir una sola regla (sección 11).
2. **El contrato no relaciona la comisión con el nivel de membresía.** Un descuento por plan (por ejemplo, Pro paga menos) obliga a marcar al emisor como "marca blanca" y cargarle tarifas a medida, que es justo para lo que existe ese mecanismo. Otra opción es un cambio de contrato. Ojo: si se marca como marca blanca y se olvida cargar las tarifas, ese emisor paga 0 %.
3. **El mercado secundario tiene una sola tarifa para todos.** Un descuento por tener KYCN o por membresía (la vista demo de KeyPay promete "-50 % en comisiones de mercado secundario por holdear KYCN") **no existe en el contrato** y requiere desarrollo.
4. **El asesor IA es gratis para el usuario.** Usa por defecto `claude-haiku-4-5` con un máximo de 1.024 tokens de respuesta.
5. **Cosas de publicidad que ya existen:**
   - Marca `featured` en empresas: el admin la activa y el carrusel ordena primero a las destacadas.
   - Marca `featured` en artículos de la Academia.
   - Hasta **5 banners de plataforma** (texto, enlace y activo/inactivo) en Configuración.
   - Falta: etiqueta "Patrocinado", fechas de inicio y fin, medición de impresiones y clics, y cobro.
6. **Precios en las subsidiarias demo:** Bookey y Key Go muestran una comisión de servicio del **3,5 %**, y Bookey un 8 % de descuento para inversionistas KEY CHAIN. Son cifras de diseño y nunca se validaron.
7. **Token KYCN (datos demo que carga el admin):**
   - Rondas: privada a US$ 0,06 y pública (ICO) a US$ 0,085, marcada "Próximamente".
   - Tokenomics: venta pública 20 %, ecosistema 25 %, tesorería 18 %, equipo 15 %, privada/seed 12 %, liquidez 10 %.
   - Utilidades anunciadas: descuentos en comisiones, acceso anticipado, gobernanza, staking y beneficios en el primario.
   - **Nada de eso existe todavía on-chain.**

---

## 3. Mercado y competencia

### 3.1 Tamaño del mercado

| Indicador | Cifra | Fuente |
| --- | --- | --- |
| Activos reales tokenizados on-chain, sin stablecoins (RWA.xyz, ago-2026) | ~US$ 37 mil millones; ~80 % son bonos del Tesoro de EE. UU. y equivalentes de caja | Stobox citando RWA.xyz [1] |
| Total tokenizado (Token Terminal, 12-sep-2026) | US$ 346,1 mil millones. Stablecoins US$ 298,5 mil millones; resto US$ 47,6 mil millones (Tesoro US$ 15 mil millones, crédito privado US$ 6,4 mil millones, oro US$ 5,1 mil millones) | KuCoin News [2] |
| Proyecciones a 2030 | McKinsey ~US$ 2 billones; Citi US$ 5,5 billones; BCG/ADDX US$ 16,1 billones. Standard Chartered US$ 30,1 billones a 2034 | Stobox [1]; Citi [3, resumen] |
| Brasil | R$ 4 mil millones tokenizados en 2025, sobre todo deuda agro (CPR) y crédito (CCB) | InvestNews [4, resumen] |
| México | ~US$ 400 millones tokenizados. La incertidumbre regulatoria es la principal barrera (49 % en una encuesta de EY) | Expansión [5] |

Lectura: el mercado real de hoy es chico y está dominado por bonos del Tesoro de EE. UU. Las cifras de billones son proyecciones con rangos muy amplios. Inmuebles, agro y vehículos para minoristas en LatAm es un nicho temprano. Hay demanda (Brasil lo demuestra con deuda agro), pero el volumen todavía no está.

### 3.2 Cómo cobran los competidores

| Plataforma | Al emisor | Al inversionista | Secundario | Membresía / SaaS | Fuente |
| --- | --- | --- | --- | --- | --- |
| **Tokeny** (marca blanca ERC-3643, Apex Group) | €3.000/mes (Standard) o €5.000/mes (Advanced); 12 meses mínimo | — | — | Sí | [6] |
| **Brickken** (SaaS, España, activo en LatAm) | Issuer Studio €299 / €499 / €899 / €1.999 al mes. Marca blanca €2.500–5.000/mes. API €2.000/mes + setup | €3,50 por KYC extra | — | Sí | [7] |
| **Stobox** | US$ 499/mes; US$ 1.248 por despliegue; US$ 1.499–6.999 por ventana de captación. "Nunca un % de lo recaudado" | — | 0 % hasta US$ 10 M/año, luego 0,125 %→0,05 % [resumen] | Sí | [8], [9] |
| **Bitbond Token Tool** | US$ 99–299 por token o venta; US$ 5 por operación | — | — | Pago por uso | [10] |
| **Republic** | 6 % en efectivo + 2 % en títulos | 0 % (Form C); otras fuentes citan 2,5 % de cargo administrativo [resumen] | — | US$ 249/año, 0 % de cargo [resumen] | [11, resumen] |
| **Netcapital** | ~4,9 % de lo recaudado | — | — | — | [12] |
| **Wefunder** | 7,5 % + US$ 750 (Reg CF) [resumen] | — | — | — | [13] |
| **tZERO** | Hasta 7 % por compromiso [resumen] | — | 1 % por orden ejecutada [resumen] | — | [14] |
| **RealT** | ~10 % incluido en el precio del token | 2 % de las rentas | 3 % | — | [15] (una sola fuente también reporta liquidación judicial en jul-2026: **sin confirmar**) |
| **Lofty** | — | Depósitos ACH 0,8 % | 2,5 % (excepto listados nuevos) | — | [16] (datos de 2024) |
| **Reental** (España, opera en Colombia, México y Argentina) | 10 % al lanzamiento | 2 % de la renta; 40 % de la ganancia en la venta | — | Token RNT | [17] (datos de 2023), [18] |
| **Urbanitae** | 5–7 % del objetivo, lo paga el promotor | 0 % | No tiene | — | [19] |
| **Centrifuge** | 0 % bajo US$ 10 M; 0,50–1,25 %/año sobre pools de US$ 10–50 M [resumen] | — | — | — | [20] |
| **Ondo** (OUSG) | — | 0,15 %/año de gestión (exonerada hasta 2027) | — | — | [21] |
| **Fundrise** (referencia de inversión) | — | ~1 %/año (0,15 % asesoría + 0,85 % gestión) | — | Pro US$ 10/mes [resumen] | [22] |
| **a2censo** (Colombia, BVC) | "Hasta 5 %" al cierre + cuota mensual + fondo de garantías [resumen] | "No hay comisiones para el inversionista" | — | — | [23] |

**Patrones del mercado:**
- **El emisor paga la emisión** (5–7,5 % en crowdfunding regulado) y el inversionista paga 0 %.
- Los modelos SaaS cobran una cuota fija mensual y, a veces, no cobran porcentaje.
- Sobre rentas, el cobro habitual es 2 %.
- En el secundario, entre 1 % y 3 %.

### 3.3 Competidores en LatAm y la afirmación "somos los primeros"

**Quiénes existen (con fuente):**
- **Brasil:** Mercado Bitcoin (dice que 30 % de su resultado viene de tokenización y que hizo ~350 emisiones), Liqi (~US$ 835 M tokenizados), Vórtx QR Tokenizadora (salió del sandbox de la CVM), Netspaces, PeerBR y BEE4 (mercado de acciones tokenizadas regulado por la CVM). Todos [resumen] [4][24][25].
- **Argentina:** Ripio (bono AL30 tokenizado, stablecoin wARS) [resumen]; VolSmart (primer fideicomiso inmobiliario tokenizado aprobado por la CNV, may-2026) [resumen]; Agrotoken / Justoken [26]; Pala Blockchain y Win Investments [27]; Bricksave.
- **Colombia:**
  - LOKL (inversión inmobiliaria fraccionada).
  - Bricks (tokeniza derechos fiduciarios).
  - Wenia (Bancolombia) y Koibanx.
  - Reental.
  - Todos [resumen] [18][28].
  - El Gobierno anunció en sep-2026 que quiere emitir el primer bono soberano tokenizado [29].
- **Chile y El Salvador:** Reity, Loping, MIO3/TOHKN [resumen].

**Otros que ya dicen ser "pioneros" o "primeros":**
- MIO3: "plataforma pionera de tokenización de activos reales en Latinoamérica".
- TOHKN: "primera plataforma de inversión en Latinoamérica" para democratizar el acceso.
- Vórtx QR: "primeira tokenizadora brasileira".
- BEE4: primer mercado regulado de acciones tokenizadas.
- LOKL: "primer metaverso en LatAm para inversionistas inmobiliarios".
- Mercado Bitcoin: "la mayor plataforma de activos digitales de LatAm".
- En 2021, la emisión de Davivienda en la arenera de la SFC se describió como la primera de su tipo en LatAm [30].

**Evaluación honesta:**
- **"Somos los primeros": no verificable.** Hay tokenizadoras desde por lo menos 2021 en Brasil y Colombia, y varias usan la palabra "primero". Si se dice en público, puede ser publicidad engañosa (la RG 1058 de Argentina prohíbe publicidad "que induzca a error"; la SFC exige información "veraz" [resumen]).
- **"Lo más completo": hay evidencia a favor, pero falta prueba.** No encontramos ninguna plataforma en LatAm documentada con **todo** junto, es decir, tokenización ERC-3643 con identidad on-chain, KYC, primario, dividendos Merkle, liquidación, secundario P2P sin custodia, **red social con perfiles de empresa y seguidores** y **subsidiarias de consumo** (Bookey, Key Go…). Las más cercanas son Mercado Bitcoin, Reental, Ripio y Brickken, y ninguna tiene red social. No encontrar algo no prueba que no exista.
- **"Desmonopolizamos": hay que matizarlo.** El mercado no está monopolizado: está **fragmentado** entre SaaS baratos (Brickken desde €299/mes, Stobox, Bitbond) y plataformas reguladas grandes (Securitize, Mercado Bitcoin). La barrera real es **regulatoria y de costo legal**, no un monopolio técnico. Se sostiene esto: *bajar la barrera de entrada para PyMEs latinoamericanas con una plataforma todo-en-uno, en español, con comisiones bajas y comunidad de inversionistas incluida*.

**Diferenciadores que sí se pueden defender (verificados en código):**
1. **Todo en un solo lugar:** emisión, cumplimiento on-chain, cobro de dividendos, secundario y comunidad.
2. **Secundario sin custodia:** el comprador paga y recibe en la misma transacción y KEY CHAIN nunca toca los fondos. Eso baja el riesgo operativo y el de custodia.
3. **Red social de inversión:** las empresas publican avances y los inversionistas las siguen y comentan. Esto es un canal de adquisición que los SaaS puros no tienen.
4. **Costos de cadena casi nulos:** con el gas de Polygon a precios actuales, una transacción cuesta menos de un centavo de dólar (sección 8).

---

## 4. Clientes y propuesta de valor

| Cliente | Qué le duele | Qué le da KEY CHAIN | Qué está dispuesto a pagar (referencia) |
| --- | --- | --- | --- |
| **Empresas emisoras** (inmobiliarias, agro, flotas, logística) | El crédito bancario es caro y lento. En Brasil, emitir tokenizado toma 30–45 días frente a 3–6 meses por banco [resumen] [24] | Captación fraccionada desde montos bajos, pago automático de dividendos, perfil y comunidad | 5–7,5 % de éxito en crowdfunding; €299–5.000/mes en SaaS |
| **Inversionistas minoristas** | Los activos reales tienen montos mínimos altos y poca liquidez | Tickets pequeños, dividendos en USDC y un secundario para salir | En la industria suelen pagar 0 % de entrada; membresías de US$ 5–10/mes (Robinhood Gold, Fundrise Pro) |
| **Operadores / socios** (marca blanca, fiduciarias, PSAV) | Montar la tecnología cuesta | Protocolo ERC-3643 completo con tarifas a medida (`isWhiteLabel`) | Tokeny €3.000–5.000/mes; Brickken marca blanca €2.500–5.000/mes |
| **Subsidiarias** (Bookey, Key Go, etc.) | Necesitan demanda y activos | Los activos tokenizados (vehículos, inmuebles) generan uso real y renta | Comisiones de marketplace (sección 5.9) |

---

## 5. Fuentes de ingreso

Cada fuente se presenta igual: quién paga, cuándo, el precio propuesto con su referencia, qué existe en el código y qué falta, y las advertencias regulatorias.

### 5.1 Comisión de emisión (mercado primario)
- **Quién paga y cuándo:** el emisor, en cada inversión; el contrato lo descuenta del monto invertido.
- **Hoy:** 0,5 % (50 bps), implementado on-chain.
- **Recomendación: 2,5 % (250 bps) por defecto, 1,5 % para Pro y negociado para Enterprise. El inversionista paga 0 %.**
  - Por qué: el crowdfunding regulado cobra 4,9–7,5 % al emisor (Netcapital [12], Wefunder [13], Republic [11], Urbanitae [19]; a2censo "hasta 5 %" [23, resumen]). Con 0,5 %, el negocio no cubre sus costos (sección 9).
  - Queda por debajo del mercado a propósito: esa es la ventaja de "bajar la barrera".
  - Alternativa estilo Stobox: no cobrar porcentaje y subir el cargo fijo. Funciona mejor con emisores grandes.
- **Qué falta construir:**
  - Cambiar `setDefaultFee(ISSUANCE_FEE, 250)` por el Timelock.
  - Definir cómo se aplica la tarifa por plan (ver hallazgo 2 de la sección 2.2).
  - Quitar el recargo al inversionista en el modo off-chain de la API (`total = subtotal + fee`).
  - Alinear `displayFeePercent`.
- **Advertencia regulatoria:** cobrar por colocar valores al público en Colombia supone operar como plataforma de financiación colaborativa autorizada por la SFC (sociedad anónima de objeto exclusivo, bolsa o sistema de negociación) o estar en la arenera [31][32]. Lo mismo vale, con sus figuras propias, en Argentina, Brasil, México y EE. UU. (sección 10).

### 5.2 Comisión sobre dividendos / rendimientos
- **Quién paga y cuándo:** el emisor, en cada reparto; el contrato envía el 2 % a la tesorería y reparte el neto.
- **Hoy:** 2 % (200 bps), implementado.
- **Recomendación: mantener 2 %.** Coincide con el 2 % sobre rentas de RealT [15] y Reental [17]. Como referencia, Fundrise cobra ~1 %/año sobre el capital [22].
- **Qué falta:** nada técnico. Solo explicarlo con claridad en la ficha del activo.

### 5.3 Comisión del mercado secundario
- **Quién paga:** el vendedor, en cada compra; el contrato lo descuenta de lo que recibe.
- **Hoy:** 0,5 %, implementado (tope 10 %).
- **Recomendación:** dejar 0,5 % en el lanzamiento para atraer liquidez y pasar a **1 %** cuando haya volumen. Referencias: OpenSea 1 % [33], tZERO 1 % [resumen] [14], Lofty 2,5 % [16], RealT 3 % [15].
- **Qué falta:** los descuentos por membresía o por KYCN requieren cambiar el contrato, que hoy tiene una sola tarifa. Antes de producción también faltan el vencimiento de ofertas y la protección del vendedor ante cambios de comisión (plan de producto, sección 4).
- **Advertencia regulatoria (la más fuerte del documento):**
  - Facilitar la reventa de valores y cobrar por cada operación se parece a operar un mercado o ATS sin licencia. Así lo ven EE. UU. [34], Brasil y la UE.
  - En Colombia, el Decreto 2105/2023 permite a las plataformas de financiación colaborativa un "mecanismo de publicidad" para intenciones de compra y venta en el que la plataforma "no tendría responsabilidad" en la negociación [35][36]. **No encontramos si en ese esquema se puede cobrar un porcentaje por operación.** Pregunta obligatoria para el abogado.

### 5.4 Membresías de empresas (ver sección 6)
- **Quién paga y cuándo:** la empresa emisora, cada mes o cada año.
- **Hoy:** el contrato ya exige un nivel para tokenizar (NONE bloquea; BASIC permite 1 pool). No hay cobro, facturación ni pasarela.
- **Falta:** el cobro (en USDC por x402, o en moneda local con una pasarela), la asignación automática del nivel (`setMembershipTier`) al pagar y la baja automática si no paga.
- **Regulatorio:** es un servicio de software; el riesgo es bajo.

### 5.5 Estructuración y alta de la tokenización
- **Quién paga y cuándo:** el emisor, una sola vez, al aprobarse la solicitud.
- **Recomendación: desde US$ 2.500 por activo** (revisión documental, KYB, despliegue, ficha y acompañamiento). Lo legal, la valuación, la auditoría del activo y la fiducia se pasan **a costo** o los contrata el emisor.
- **Referencias:** Stobox cobra US$ 1.248 por despliegue + US$ 1.499–6.999 por ventana de captación + onboarding desde US$ 4.950 [8]. Una ruta con bufete cuesta US$ 50.000–200.000+, y la valuación US$ 5.000–50.000+ [9].
- **Hoy:** el flujo de solicitud y aprobación existe; el cobro no.

### 5.6 Marca blanca / SaaS / API
- **Quién paga:** fiduciarias, PSAV, bancos o desarrolladoras que quieren su propia plataforma.
- **Recomendación: desde US$ 2.500/mes con 12 meses mínimos, + setup.** Referencias: Brickken marca blanca €2.500–5.000/mes, Tokeny €3.000–5.000/mes con 12 meses mínimos [6][7].
- **Hoy:** el contrato ya distingue emisores marca blanca con tarifas propias (`isWhiteLabel`, `customFees`). No hay despliegue multi-cliente ni personalización de marca.
- **Regulatorio:** bajo para KEY CHAIN, porque la licencia la pone el cliente. Conviene que el contrato comercial lo diga.

### 5.7 Publicidad para empresas (ver sección 7)
- **Quién paga:** empresas emisoras, subsidiarias y marcas del ecosistema.
- **Hoy:** existen la marca `featured`, el carrusel ordenado por destacadas, 5 banners de plataforma y artículos destacados.
- **Falta:** etiqueta "Patrocinado", fechas, métricas y cobro.

### 5.8 Membresía de inversionistas (opcional, fase 2)
- **Recomendación: "KEY CHAIN Plus" a US$ 4,99/mes o US$ 49/año.** Incluye 50 % de descuento en la comisión del secundario, reportes fiscales y de portafolio avanzados, alertas y asesor IA sin límite.
- **Referencias:**
  - Robinhood Gold: US$ 5/mes [37].
  - Crypto.com Level Up: desde US$ 4,99/mes [38].
  - Fundrise Pro: US$ 10/mes [resumen].
  - StartEngine Venture Club: US$ 275/año [39].
  - Republic: US$ 249/año [resumen].
- **No incluir "acceso anticipado pagado" a ofertas.** Dar ventaja de acceso a un valor a quien paga puede chocar con la igualdad de trato a inversionistas. Que lo revise el abogado.
- **Falta construir todo:** el cobro y el descuento en el contrato.

### 5.9 Comisiones de las subsidiarias

| Subsidiaria | Hoy | Recomendación | Referencia |
| --- | --- | --- | --- |
| Bookey (estadías) | 3,5 % al huésped (demo) | 3 % al anfitrión + 10–12 % al huésped, o 14–15 % solo al anfitrión | Airbnb: 3 % anfitrión + 14,1–16,5 % huésped, o 15,5 % solo anfitrión [40] |
| Key Go (movilidad) | 3,5 % (demo) | 10–15 % del viaje (sigue siendo atractivo para el conductor) | Uber X 25 %, DiDi 18–22 % en Colombia [41] |
| Escrow Chain | Sin precio | 1–2 % según monto | Escrow.com: de 2,6 % (hasta US$ 5.000) a 0,7 % (más de US$ 10 M) [42] |
| Key Jobs | Sin precio | COP 99.000–149.000 por aviso; 2 gratis | Computrabajo COP 115.950–168.200 + IVA [43] |
| Tracker GPS | Sin precio | COP 35.000–50.000 por vehículo al mes | Colombia COP 20.000–60.000/mes [resumen]; Samsara desde US$ 27 [resumen] [44] |
| Key Rural | — | Igual que la tokenización (5.1–5.5) | — |
| KeyPay | x402 sin comisión | Envíos P2P gratis. Recargas: margen de 0,5–1 % sobre el proveedor de on-ramp | Facilitador x402 de thirdweb 0,3 % [45]; Ramp 1,4–5,45 % [46] |

Todas son **estimaciones**. Cada subsidiaria es un negocio con su propia regulación (transporte, turismo, empleo, pagos). Mover dinero de terceros en KeyPay puede requerir licencia de pagos o PSAV.

### 5.10 Token KYCN
- **Hoy:** no hay contrato; solo información.
- **Utilidad posible:** descuento en comisiones. Binance da 25 % por pagar con BNB [47] y KuCoin 20 % con KCS [resumen]. La demo de KeyPay promete -50 %.
- **Recomendación: no lanzar la preventa hasta tener una opinión legal en cada país.**
  - En la UE, un token utilitario cae en MiCA Título II (white paper y reglas de marketing).
  - En Argentina requiere un PSAV categoría 5 [48].
  - En EE. UU. y Colombia hay que analizar si es un valor.
  - Si se lanza, que la utilidad sea de **uso** (descuentos y gobernanza de listados) y nunca participación en ingresos de la plataforma. Eso lo acercaría a un valor.

### 5.11 Datos y analítica
- **Idea:** reportes agregados y anónimos de demanda por sector y país para emisores Pro y Enterprise.
- **Regulatorio:** Ley 1581 de datos personales en Colombia, que tampoco se exime en la arenera [32]. Es una prioridad baja.

### 5.12 Interés sobre saldos flotantes
- **No aplica y no lo recomendamos.** La arquitectura es **sin custodia**: el USDC del inversionista está en su wallet y el capital levantado va al vault del emisor, así que KEY CHAIN no tiene saldo de clientes que rentar.
- MiCA prohíbe pagar interés sobre e-money tokens [49], y la GENIUS Act de EE. UU. lo prohíbe a los emisores de stablecoins [50].

---

## 6. Membresías

### 6.1 Empresas (vinculadas a `FactorActMembership`)

| Plan (UI) | Nivel on-chain | Precio recomendado | Incluye | Comisión de emisión | Referencia |
| --- | --- | --- | --- | --- | --- |
| **Perfil gratuito** | NONE | US$ 0 | Perfil de empresa, feed, seguidores, solicitar una tokenización (no se puede desplegar) | — | LinkedIn Company Page gratis |
| **Inicial** | BASIC | **US$ 149/mes** o US$ 1.490/año | **1 tokenización activa** (límite del contrato), hasta 200 KYC de inversionistas al año, panel de inversionistas, publicaciones en el feed | 2,5 % | Brickken Core €299/mes con tope de €250.000 y 50 KYC [7]; Stobox US$ 499 [8] |
| **Pro** | PREMIUM | **US$ 499/mes** o US$ 4.990/año | Tokenizaciones ilimitadas, 1.000 KYC al año, analítica, revisión prioritaria, **1 semana de "Empresa destacada" por trimestre** (marcada como patrocinada) | 1,5 % | Brickken Professional €899 [7]; LinkedIn Premium Company Page US$ 99,99/mes [51] |
| **Enterprise / marca blanca** | ENTERPRISE | **Desde US$ 2.500/mes**, 12 meses | Todo lo de Pro, tarifas a medida (`customFees`), marca propia, API, soporte dedicado | Negociada | Brickken marca blanca €2.500 [7]; Tokeny €3.000 [6] |

**Por qué estos precios (estimación):**
- Están por debajo de Brickken y Stobox, que son los SaaS europeos con precio público, porque el poder de compra de las PyMEs latinoamericanas es menor. Ese es un supuesto que hay que validar con 10–15 entrevistas a emisores.
- El costo de KYC por inversionista es bajo (US$ 0,33–1,85, sección 8), así que incluir 200–1.000 KYC al año cuesta como máximo US$ 370–1.850 por empresa al año.

**Qué falta:**
- Cobro recurrente y asignación automática del nivel.
- Que el contrato o la API apliquen la comisión según el plan.
- Contadores de KYC por empresa.

### 6.2 Inversionistas
Ver 5.8: "KEY CHAIN Plus" opcional, **después** de tener liquidez en el secundario. Al principio el inversionista no debería pagar nada para entrar.

---

## 7. Publicidad para empresas

### 7.1 Formatos

| Formato | Dónde | Modelo de precio | Precio de lanzamiento (estimación) | ¿Existe? |
| --- | --- | --- | --- | --- |
| **Empresa destacada** | Carrusel "Perfiles destacados" | Tarifa fija semanal | US$ 75/semana o US$ 250/mes | Sí: marca `featured` (admin) y orden en el carrusel. Faltan fechas, etiqueta y cobro |
| **Publicación patrocinada** | Feed social | Fija al inicio y CPM cuando haya tráfico | US$ 49 por 7 días; luego CPM US$ 8–12 | No (el feed existe, la promoción no) |
| **Banner de plataforma** | Barra superior (hasta 5) | Tarifa fija semanal | US$ 150–300/semana | Sí: banners en Configuración. Faltan fechas, etiqueta y métricas |
| **Tokenización destacada** | Lista de Tokenizaciones | Incluida en Pro; no se vende suelta al inicio | — | No |
| **Patrocinio de contenido** | Academia (artículos destacados) | Fijo por artículo | US$ 200–500 | Sí, existe la marca `featured` en artículos |

**Por qué estos precios (estimación con referencias):**
- El CPM de Meta en Colombia es ~US$ 3,20 [52]. En finanzas a nivel global es US$ 18–22 [53]. LinkedIn cobra US$ 30–55 de CPM [resumen].
- La audiencia de KEY CHAIN es de nicho y con intención de invertir. Por eso un CPM de US$ 8–12 está entre Meta Colombia y el promedio de finanzas.
- Mientras el tráfico sea bajo, un CPM rinde poco dinero, así que conviene empezar con **tarifas fijas**.
- Como referencia local de "destacar un aviso": Metrocuadrado cobra COP 54.400 por un aviso de 90 días [54].
- La red cripto Bitmedia tiene pujas mínimas de US$ 0,30 de CPM [55].

### 7.2 Reglas para no chocar con la regulación de publicidad de inversiones
1. **Todo lo pagado lleva la etiqueta "Patrocinado"** y dice quién paga. En EE. UU., la Sección 17(b) exige revelar la compensación de quien promociona un valor [resumen]. En la UE (ECSP art. 27), las comunicaciones deben ser "claramente identificables" [resumen].
2. **Nunca se prometen ni destacan rendimientos** en el anuncio. Solo el nombre, el sector y un enlace a la ficha con los documentos de la oferta. La SFC exige información "simétrica, clara, veraz, completa y oportuna" [resumen]. La CNV prohíbe publicidad "que induzca a error" [48].
3. **No se promocionan ofertas abiertas en la UE.** El ECSP prohíbe comunicaciones que "apunten desproporcionadamente" a proyectos en curso [resumen]. En LatAm, que el abogado valide caso por caso, porque la SFC tiene un régimen de autorización previa para ciertas campañas [resumen].
4. **Solo pueden anunciar empresas verificadas** (KYB aprobado, `status = verified`).
5. **El orden orgánico de Tokenizaciones no se vende.** Lo pagado va en un espacio separado y marcado.

### 7.3 Qué construir
- Campos `sponsoredFrom`, `sponsoredUntil` y `sponsorLabel` en empresas, posts y banners.
- Etiqueta visible con las primitivas `P*` existentes, sin cambiar el diseño.
- Conteo de impresiones y clics.
- Panel de autoservicio para la empresa (fase 2).
- Cobro (x402 o pasarela).

---

## 8. Costos: lo que paga KEY CHAIN

### 8.1 Proveedores con precio público (verificado el 2026-10-09)

| Concepto | Precio público | Uso en KEY CHAIN | Costo mensual estimado (lanzamiento) | Tipo |
| --- | --- | --- | --- | --- |
| Railway | Pro US$ 20/mes con US$ 20 de uso incluido. CPU US$ 20/vCPU-mes, RAM US$ 10/GB-mes, volumen US$ 0,15/GB-mes, egreso US$ 0,05/GB, bucket US$ 0,015/GB-mes [56] | api, worker, web, Postgres, Redis, bucket. **La devnet desaparece en mainnet** | **US$ 60–150** (supuesto: api 0,5 vCPU/1 GB, worker 0,25/0,5, web 0,1/0,25, Postgres 0,5/1 GB + 10 GB, Redis 0,1/0,25 → ~US$ 63) | Fijo + uso |
| thirdweb | Growth US$ 99/mes. Server wallets: 1.000 solicitudes incluidas, luego US$ 1 por 1.000. Patrocinio de gas: 1.000 tx incluidas, luego US$ 1 por 1.000 + 2,5 % sobre el gas. Wallets in-app: 1.000 gratis, luego US$ 0,015 por MAU. x402: 0,3 % [57] | Login SIWE, server wallet, gas patrocinado (decisión 5 del plan) | **US$ 99–150** | Fijo + uso |
| Alchemy | Gratis hasta 30 M CU/mes; luego US$ 0,525 por millón de CU. Patrocinio de gas +8 % [58] | Lecturas de cadena, indexador | **US$ 0–50** | Uso |
| Gas Polygon | 276 gwei y POL a US$ 0,10 → transferencia ERC-20 ≈ US$ 0,002; operación de 500.000 gas ≈ US$ 0,014 [59][60] | Alta de identidad, inversión, dividendos, secundario | **< US$ 50** (ver 8.2) | Variable |
| KYC | Didit: 500 KYC/mes gratis, luego US$ 0,33 por KYC + US$ 0,20 de AML; KYB desde US$ 2–9 [61]. Sumsub: US$ 1,35–1,85 con mínimo de US$ 149–299/mes [62]. Veriff: US$ 0,80–1,89 con mínimo de US$ 49–209/mes [63] | Hoy el KYC es manual. **Para producción se necesita un proveedor** | **US$ 0–300** | Variable (con mínimo) |
| Resend (email) | Gratis hasta 3.000/mes; Pro US$ 20/mes por 50.000 [64] | Verificación de email y notificaciones | **US$ 0–20** | Fijo |
| Anthropic (asesor IA) | Haiku 4.5: US$ 1 por millón de tokens de entrada y US$ 5 por millón de salida [65] | Asesor y soporte | **US$ 10–100** (supuesto: ~US$ 0,007 por consulta de 3.000 tokens de entrada y 800 de salida → 10.000 consultas ≈ US$ 70) | Variable |
| On/off-ramp | Ramp 1,4–5,45 % [46]; MoonPay 1–4,5 % [resumen]; Transak Colombia 0,99–5,5 % [resumen] | Lo paga el usuario en la recarga. KEY CHAIN puede sumar su margen | US$ 0 para KEY CHAIN | — |
| Custodia institucional (si algún día se custodia) | Fireblocks desde US$ 999/mes [66, fuente de terceros]; BitGo ~5 bps/mes [resumen] | **No se necesita hoy** (modelo sin custodia) | US$ 0 | — |

**Infraestructura total en el lanzamiento: ~US$ 300–800/mes (estimación).** La tecnología no es el costo que define el negocio.

### 8.2 Costo variable por inversionista (estimación)

| Paso | Gas aprox. (supuesto) | US$ a 276 gwei y POL US$ 0,10 |
| --- | --- | --- |
| Alta de identidad on-chain (identidad + claims + registro) | ~1.000.000 | ~US$ 0,03 |
| Aprobación de USDC + inversión | ~46.000 + ~300.000 | ~US$ 0,01 |
| Cobro de un dividendo (prueba Merkle) | ~100.000 | ~US$ 0,003 |
| KYC (Didit, KYC + AML) | — | US$ 0,53 (gratis dentro de 500/mes) |
| KYC (Sumsub Compliance) | — | US$ 1,85 |
| **Total por inversionista nuevo** | | **~US$ 0,57–1,90** |

Si el gas sube a 1.000 gwei, todo se multiplica por ~3,6 y sigue en centavos. El cálculo del gas es nuestro, a partir del precio publicado en Polygonscan.

### 8.3 Costos fijos no tecnológicos

| Concepto | Rango | Base |
| --- | --- | --- |
| Auditoría de contratos (~10 contratos ERC-3643 + mercado) | **US$ 40.000–100.000** + re-auditoría de US$ 5.000–20.000 | Sherlock: DeFi de complejidad media US$ 40.000–100.000 [67]; QuillAudits: firmas de primer nivel US$ 30.000–200.000 [68]. **Estimación**: el rango aplicado a KEY CHAIN es nuestro |
| Constitución de SAS en Colombia | ~COP 350.000–800.000 + 0,7 % del capital suscrito | [resumen] [69] |
| Licencia o sandbox + asesoría legal | **No encontramos tarifas públicas en Colombia.** Supuesto de trabajo: US$ 30.000–120.000 el primer año | Supuesto que hay que reemplazar por cotizaciones de 2–3 firmas |
| Fiducia o SPV por activo | No hay tarifa pública: en Colombia la comisión fiduciaria se negocia [resumen]. SPV fuera del país US$ 110–4.000 [9] | Lo paga el emisor (recomendación) |
| Patrimonio mínimo PSAV en Argentina | US$ 35.000–150.000 según la categoría (la mitad si el volumen es menor a US$ 2,5 M) | [48] |
| Capital mínimo de plataforma CVM 88 en Brasil | R$ 200.000 | [resumen] [70] |
| Equipo | **Supuesto, no investigado:** base de 6 personas × US$ 3.500/mes = US$ 21.000/mes | Lo deben reemplazar los fundadores con la nómina real |
| Marketing | **Supuesto:** US$ 1.000–10.000/mes | — |

---

## 9. Unit economics y escenarios

### 9.1 Cuánto deja cada US$ 1 M colocado (primer año)

Supuestos (estimación):
- Rendimiento distribuido del 10 % anual.
- Rotación en el secundario del 10 % del capital al año.
- Ticket promedio de US$ 1.000 (1.000 inversionistas).
- Proyectos de US$ 500.000.

| Concepto | Comisiones actuales | Comisiones recomendadas |
| --- | --- | --- |
| Emisión | 0,5 % → US$ 5.000 | 2,5 % → US$ 25.000 |
| Estructuración (2 proyectos × US$ 2.500) | US$ 0 | US$ 5.000 |
| Dividendos (2 % de US$ 100.000) | US$ 2.000 | US$ 2.000 |
| Secundario (US$ 100.000 de volumen) | 0,5 % → US$ 500 | 1 % → US$ 1.000 |
| **Ingreso** | **US$ 7.500** | **US$ 33.000** |
| Costo variable (KYC + gas, 1.000 inversionistas) | −US$ 570 a −1.900 | −US$ 570 a −1.900 |
| **Margen de contribución** | **~US$ 5.600–6.900** | **~US$ 31.100–32.400** |

### 9.2 Escenarios del primer año en mainnet (estimación)

| Supuesto | Conservador | Base | Optimista |
| --- | --- | --- | --- |
| Capital colocado en el año | US$ 1 M (4 × US$ 250.000) | US$ 5 M (10 × US$ 500.000) | US$ 20 M (25 × US$ 800.000) |
| Empresas pagando (promedio de meses) | 4 Inicial × 6 meses | 8 Inicial + 4 Pro × 6 meses | 15 Inicial + 10 Pro × 8 meses + 1 Enterprise × 6 meses |
| Publicidad, promedio mensual | US$ 300 | US$ 1.500 | US$ 5.000 |
| Rotación del secundario | 5 % | 10 % | 15 % |
| Equipo (supuesto) | 4 × US$ 3.000 | 6 × US$ 3.500 | 10 × US$ 4.000 |

| Ingresos (US$) | Conservador | Base | Optimista |
| --- | --- | --- | --- |
| Emisión 2,5 % | 25.000 | 125.000 | 500.000 |
| Estructuración | 10.000 | 25.000 | 62.500 |
| Dividendos 2 % (medio año promedio de reparto) | 1.000 | 5.000 | 20.000 |
| Secundario 1 % | 500 | 5.000 | 30.000 |
| Membresías | 3.576 | 19.128 | 72.800 |
| Publicidad | 3.600 | 18.000 | 60.000 |
| **Total ingresos** | **43.676** | **197.128** | **745.300** |

| Costos (US$) | Conservador | Base | Optimista |
| --- | --- | --- | --- |
| Infraestructura y proveedores | 6.000 | 9.600 | 24.000 |
| KYC + gas | 580 | 2.900 | 11.600 |
| Auditoría (una vez) | 40.000 | 60.000 | 100.000 |
| Legal y regulatorio (supuesto) | 30.000 | 60.000 | 120.000 |
| Equipo (supuesto) | 144.000 | 252.000 | 480.000 |
| Marketing (supuesto) | 12.000 | 36.000 | 120.000 |
| **Total costos** | **232.580** | **420.500** | **855.600** |
| **Resultado año 1** | **−188.904** | **−223.372** | **−110.300** |

### 9.3 Punto de equilibrio (estimación)
- **Costo fijo mensual recurrente del escenario base:** equipo US$ 21.000 + legal US$ 5.000 + marketing US$ 3.000 + infraestructura US$ 800 ≈ **US$ 29.800/mes**, sin contar la auditoría.
- Las membresías y la publicidad del escenario base aportan ~US$ 3.100/mes. Faltan ~US$ 26.700/mes.
- **Con las comisiones recomendadas** (~US$ 30.000 por cada US$ 1 M colocado, entre emisión y estructuración): hace falta colocar **~US$ 0,9 M por mes (~US$ 11 M al año)**.
- **Con las comisiones actuales** (~US$ 5.000 por cada US$ 1 M, más los dividendos que se acumulan despacio): hace falta colocar **~US$ 5 M por mes (~US$ 60 M al año)**. Eso equivale al ~15 % de todo lo tokenizado en México hasta hoy (~US$ 400 M según Expansión [5]).
- **Solo con membresías:** harían falta ~60 empresas en Pro.

**Conclusión:** con 0,5 % de emisión el modelo depende de un volumen poco realista. Con 2–3 % pagado por el emisor, más membresía y estructuración, el equilibrio queda en un rango alcanzable. Igual sigue sujeto a tener la figura legal para colocar.

---

## 10. Riesgos y requisitos regulatorios

| País | Regla clave | Qué implica para cobrar | Fuente |
| --- | --- | --- | --- |
| **Colombia** | La financiación colaborativa (Decreto 1357/2018, compilado en el 2555/2010) solo la operan bolsas, sistemas de negociación o sociedades anónimas de objeto exclusivo vigiladas por la SFC. Topes: 10.000 SMMLV con aportantes calificados y 3.000 sin ellos. El inversionista no calificado pone como máximo el 20 % de su patrimonio o ingreso. El Decreto 034/2025 limita al no calificado al 10 % de un proyecto. Hay una sola plataforma de este tipo operando. El Decreto 2105/2023 agrega el "mecanismo de publicidad" secundario. La arenera (Decreto 1234/2020) permite probar actividades vigiladas, pero no exime de datos personales, cambios ni impuestos. La ley de PSAV **no está confirmada como aprobada** | Para cobrar emisión y secundario en Colombia hay que ser o aliarse con una plataforma autorizada, o entrar a la arenera. Las membresías, el SaaS y la publicidad son lo menos expuesto | [31][32][35][36][71][72] |
| **Argentina** | Régimen de tokenización CNV (RG 1069/2025 y siguientes; sandbox; consulta RG 1137/2026 para extenderlo a 2027). Solo cubre valores autorizados (fideicomisos, fondos cerrados, deuda y luego acciones). Los registra un PSAV o fiduciario registrado. RG 1058: registro PSAV, patrimonio mínimo, segregación de fondos y prohibición de publicidad engañosa | El activo debe estar dentro de un vehículo autorizado por la CNV. KEY CHAIN como proveedor tecnológico de un PSAV es el camino más corto | [48][73][74] |
| **México** | Ley Fintech: instituciones de financiamiento colectivo (IFC) autorizadas. Banxico (Circular 4/2019) no deja a las fintech ofrecer activos virtuales a clientes | **Un modelo en USDC está prácticamente bloqueado** para entidades reguladas. México no es un buen primer mercado | [75][76][5] |
| **Brasil** | CVM Resolución 88: crowdfunding con plataformas registradas y topes por emisor e inversionista; nueva regla en consulta (topes de R$ 25–50 M). La Ley 14.478 deja los valores tokenizados bajo la CVM. Resoluciones BCB 519–521: PSAV autorizadas desde feb-2026 | Para colocar se necesita plataforma CVM 88 o una alianza. Hay competencia fuerte y establecida | [70][77][78] |
| **UE / España** | MiCA excluye los instrumentos financieros (los security tokens van por MiFID). Régimen piloto DLT con topes. ECSP: €5 M por proyecto y reglas de marketing. Ley 6/2023 en España | Un token utilitario KYCN cae en MiCA Título II. No se puede pagar interés sobre e-money tokens. Promocionar ofertas abiertas es riesgoso | [49][79][80] |
| **EE. UU.** | Un valor tokenizado sigue siendo un valor (declaración de la SEC, ene-2026). La compraventa va por exchange o ATS con broker-dealer. Exenciones: Reg D, CF y A+. La "Innovation Exemption" (sep-2026) solo cubre acciones listadas | **No abrir a residentes de EE. UU.** sin estructura propia. Bloquearlos por país (ya existe `CountryRestrictionModule`) | [34][81][82] |

**Otros riesgos:**
- **Tecnológico:** los contratos no tienen auditoría externa. La revisión de seguridad del secundario fue interna (plan de producto, sección 4).
- **Concentración:** el 80 % del mercado RWA son bonos del Tesoro. La demanda minorista de inmuebles, agro y vehículos en LatAm no está probada.
- **Reputacional:** si un emisor no paga, la plataforma queda expuesta, aunque no custodie. Hace falta due diligence del emisor (KYB, valuación y garantías).
- **Marca:** la UI todavía mezcla FACT, FACTORACT y KYCN. Los contratos se llaman "FactorAct".

---

## 11. Decisiones que tienen que tomar los fundadores

| # | Decisión | Recomendación |
| --- | --- | --- |
| 1 | ¿Quién paga la comisión de emisión, el emisor o el inversionista? Hoy depende del modo de pago | El emisor. El inversionista paga 0 % |
| 2 | Nivel de la comisión de emisión | 2,5 % Inicial, 1,5 % Pro, negociada Enterprise |
| 3 | ¿Cómo se ligan las comisiones al plan? (marca blanca con tarifas propias o cambio de contrato) | Cambio de contrato con revisión de seguridad. Mientras tanto, usar `customFees` con cuidado |
| 4 | Precios de membresía y si se cobran en USDC o en moneda local | Los de la sección 6. USDC por x402 primero y pasarela local después |
| 5 | Primer país y figura legal (aliado autorizado, arenera SFC o PSAV argentino) | Colombia con un aliado autorizado o la arenera, o Argentina vía PSAV. Elegir después de cotizar con 2–3 firmas |
| 6 | Proveedor de KYC/KYB | Didit para empezar (500 gratis al mes y KYB publicado). Sumsub si un aliado regulado lo exige |
| 7 | ¿Se vende la promoción de tokenizaciones abiertas o solo de empresas? | Solo empresas y contenido al principio. Las tokenizaciones destacadas, incluidas en Pro y con validación legal |
| 8 | Token KYCN: ¿preventa, cuándo y dónde? | Postergar hasta tener opinión legal. Utilidad solo de uso |
| 9 | Comisiones de las subsidiarias (hoy 3,5 % en la demo) | Ver 5.9. Key Go al 3,5 % no es sostenible frente al 18–25 % del mercado |
| 10 | Mensaje público: "primeros" o "todo-en-uno" | "Todo-en-uno". No usar "primeros" sin prueba |
| 11 | Presupuesto de auditoría antes de mainnet | Sí, US$ 40.000–100.000, antes de recibir dinero real |
| 12 | ¿Se abre a residentes de EE. UU. y la UE? | No en la fase 1 |

---

## 12. Roadmap de monetización

| Orden | Qué se enciende | Por qué primero | Trabajo técnico |
| --- | --- | --- | --- |
| 1 | **Membresías de empresas** + **estructuración** | Riesgo regulatorio bajo, ingreso recurrente y el contrato ya tiene el paywall | Cobro, asignación automática del nivel, facturación |
| 2 | **Publicidad de empresas y banners** (marcados como patrocinados) | Ya existe el 70 % (featured y banners) | Etiqueta, fechas, métricas, cobro |
| 3 | **Comisión de emisión 2,5 %** (pagada por el emisor) | Es el ingreso principal, pero exige la figura legal del paso 5 de la sección 11 | Timelock `setDefaultFee`; quitar el recargo off-chain; alinear `displayFeePercent` |
| 4 | **Dividendos 2 %** | Ya está activo; se cobra cuando haya activos que rindan | Ninguno |
| 5 | **Secundario 0,5 % → 1 %** | Depende de la liquidez y de la validación legal del secundario | Vencimiento de ofertas, protección del vendedor y descuentos (cambio de contrato) |
| 6 | **Marca blanca / API** | Requiere un producto multi-cliente | Despliegue por cliente, personalización de marca |
| 7 | **Subsidiarias** (Bookey primero) | Cada una es un negocio con su propia regulación | Pagos reales y comisiones de la sección 5.9 |
| 8 | **KEY CHAIN Plus** (inversionistas) | Tiene sentido cuando haya secundario activo | Suscripción y descuento en el contrato |
| 9 | **Token KYCN** | Solo con opinión legal | Contrato, preventa, utilidades |

---
## 13. Fuentes

Todas se consultaron el **2026-10-09**. "[resumen]" significa que el dato salió de un resumen de buscador y la página no se pudo abrir. Hay que confirmarlo antes de citarlo en público.

**Código de KEY CHAIN (verificado leyendo los repos)**
- `key-chain-blockchain/keychain-blockchain/src/fees/FactorActFeeManager.sol`, `fees/FactorActTreasury.sol`, `membership/FactorActMembership.sol`, `core/FactorActFactory.sol`, `issuance/PrimaryIssuance.sol`, `issuance/DividendDistributor.sol`, `market/FactorActSecondaryMarket.sol`
- `key-chain-api/src/modules/market/market.service.ts` (`PRIMARY_FEE_RATE`), `settings/settings.module.ts` (`displayFeePercent`, banners), `social/companies.service.ts` (`featured`), `advisor/advisor.module.ts`, `config/env.ts`, `scripts/localnet.ts` (`SECONDARY_MARKET_FEE_BPS = 50`), `prisma/seed-data/demo.json` (KYCN)
- `key-chain/docs/plan-producto.md`, `key-chain/app/features/{bookey,key-go,keypay}`

**Mercado y competencia**
1. Stobox, tamaño del mercado RWA (cita RWA.xyz, McKinsey, Citi, BCG, StanChart): https://www.stobox.io/blog/rwa-market-size-2030-trillion-projections
2. Token Terminal vía KuCoin News: https://www.kucoin.com/news/flash/tokenized-assets-reach-346b-across-47-asset-types
3. Citi US$ 5,5 billones [resumen]: https://www.bankingexchange.com/news-feed/item/10633-tokenization-of-real-world-assets-will-hit-5-5-trillion-by-2030-citi-says?Itemid=620
4. Brasil R$ 4 mil millones [resumen]: https://investnews.com.br/investimentos/do-agro-as-financas-tokenizacao-atinge-r-4-bilhoes-no-brasil/amp/
5. México US$ 400 millones: https://expansion.mx/mercados/2026/03/02/mexico-registra-400-mdd-en-tokenizacion-institucionalizacion
6. Tokeny: https://tokeny.com/pricing
7. Brickken: https://www.brickken.com/plans
8. Stobox: https://www.stobox.io/pricing
9. Stobox Tokenization Cost Index: https://www.stobox.io/reports/tokenization-cost-index
10. Bitbond Token Tool: https://tokentool.bitbond.com/pricing
11. Republic, costos al emisor [resumen]: https://republic.com/learn/issuers/costs ; Form C: https://www.sec.gov/Archives/edgar/data/1794805/000179480523000007/noteformc.pdf
12. Netcapital: https://faq.netcapital.com/what-is-the-4.9-portal-fee
13. Wefunder: https://help.wefunder.com/article/f49b78d1-wefunder-fees-for-private-rounds (rondas privadas). El 7,5 % de Reg CF es [resumen]
14. tZERO [resumen]: https://us.fitgap.com/products/058672/tzero
15. RealT: https://www.vitepromo.com/en/finance-crypto/code-promo-realt
16. Lofty: https://sparkrental.com/?p=24891
17. Reental (2023): https://www.xataka.com/empresas-y-economia/invertir-pisos-solo-100-euros-tokenizacion-ultima-idea-para-entrar-arriesgado-mercado-inmobiliario
18. Reental en Colombia: https://www.valoraanalitik.com/?p=404693
19. Urbanitae: https://www.finect.com/usuario/eduardogarcia/articulos/urbanitae-analisis-y-opiniones-de-la-plataforma-de-inversion-inmobiliaria
20. Centrifuge [resumen]: https://us.fitgap.com/products/015084/centrifuge
21. Ondo OUSG: https://docs.ondo.finance/qualified-access-products/ousg/fees-and-taxes
22. Fundrise: https://fundrise.com/education/everything-youve-ever-wanted-to-know-about-fundrises-fees
23. a2censo: https://www.portafolio.co/economia/finanzas/la-version-moderna-de-las-colectas-de-dinero-o-vacas-538616 (sin comisión al inversionista). El "hasta 5 %" es [resumen]
24. Mercado Bitcoin [resumen]: https://www.infomoney.com.br/onde-investir/30-do-nosso-resultado-vem-de-tokenizacao-de-ativos-diz-cfo-do-mercado-bitcoin/
25. Liqi [resumen]: https://trademap.com.br/noticias/news-8284295 ; Vórtx QR [resumen]: https://blocktrends.com.br/vortx-e-qr-capital-lancam-primeira-tokenizadora-brasileira/ ; BEE4 [resumen]: https://www.bloomberglinea.com.br/2023/05/23/bolsa-de-acoes-tokenizadas-quer-ser-complemento-a-b3-e-atrai-empresas-menores/
26. Justoken: https://ecosistemastartup.com/?p=44505
27. Argentina, jugadores: https://www.forbesargentina.com/negocios/avanza-negocio-tokenizar-activos-argentina-real-estate-agro-sectores-mas-oportunidades-n70513 ; VolSmart [resumen]: https://lexlatin.com/noticias/tokenizacion-fideicomiso-financiero-residencial-argentina
28. Colombia, jugadores [resumen]: https://lanotaeconomica.com.co/movidas-empresarial/la-tokenizacion-esta-transformando-las-finanzas-colombianas/ ; LOKL: https://forbes.co/2023/03/10/30-promesas-2023/lokl-democratizando-la-inversion-inmobiliaria/
29. Bono soberano tokenizado de Colombia: https://www.bloomberglinea.com/latinoamerica/colombia/credito-publico-planea-que-colombia-lance-su-primer-bono-publico-tokenizado-de-que-se-trata/
30. Piloto Davivienda en la arenera: https://www.valoraanalitik.com/colombia-piloto-emision-bonos-blockchain-contratos-inteligentes/

**Regulación**
31. Decreto 1357/2018, crowdfunding: https://www.portafolio.co/economia/este-es-el-decreto-que-regula-el-crowdfunding-en-el-pais-519676
32. SFC, laArenera: https://www.superfinanciera.gov.co/publicaciones/10114254/innovasfc/laarenera/sandbox-regulatorio-10114254/
33. OpenSea, comisión del 1 %: https://docs.opensea.io/changelog/opensea-fee-update
34. Declaración de la SEC sobre valores tokenizados: https://www.aoshearman.com/en/insights/ao-shearman-on-fintech-and-digital-assets/sec-staff-statement-on-tokenized-securities-new-plumbing-same-rules
35. Decreto 2105/2023 (borrador): https://www.hklaw.com/en/insights/publications/2023/08/mhcp-propone-cambios-a-la-financiacion-colaborativa-en-colombia
36. Crowdfunding 2.0: https://forbes.co/economia-y-finanzas/crowdfunding-2-0-conozca-las-nuevas-reglas-de-juego-para-las-finanzas-colaborativas
48. CNV RG 1058 (PSAV): https://beccarvarela.com/novedades/resolucion-general-cnv-n1058-regulacion-de-proveedores-de-servicios-de-activos-virtuales-psav/
49. MiCA art. 50 (prohibición de interés): https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-50-prohibition-granting-interest
50. GENIUS Act / OCC: https://www.paulhastings.com/insights/crypto-policy-tracker/occ-proposed-rule-under-the-genius-act-six-key-takeaways
70. CVM 88 [resumen]: https://www.machadomeyer.com.br/en/recent-publications/publications/capital-markets/cvm-resolution-88-and-developments-in-investment-crowdfunding ; índice: https://conteudo.cvm.gov.br/legislacao/resolucoes/resol088.html
71. Decreto 034/2025: https://www.asuntoslegales.com.co/analisis/sebastian-morales-4047240/crowdfunding-en-colombia-avances-regulatorios-y-retos-futuros-4047254
72. Decreto 1235/2020: https://www.garrigues.com/es_ES/noticia/modifican-normas-mercado-valores-colombia-fin-incentivar-oferta-demanda ; proyecto de ley PSAV: https://www.asuntoslegales.com.co/analisis/felipe-trias-visbal-3718765/regulacion-de-los-activos-virtuales-una-necesidad-imperiosa-4116258
73. CNV RG 1069/2025: https://www.marval.com/Publicacion/nuevo-regimen-de-tokenizacion-de-valores-negociables-17235?lang=en
74. CNV RG 1137/2026 (consulta): https://www.estudio-ofarrell.com/la-cnv-somete-a-consulta-publica-modificaciones-al-regimen-de-tokenizacion-y-prorroga-del-sandbox-regulatorio/
75. Límites de la CNBV (borrador 2018): https://expansion.mx/emprendedores/2018/08/13/cuales-son-los-limites-de-recursos-para-el-crowdfunding-segun-la-cnbv
76. Banxico, Circular 4/2019: https://www.forbes.com.mx/banxico-da-primer-paso-en-disposiciones-para-regular-fintech-y-criptomonedas/
77. CVM, nueva regla de crowdfunding: https://www.infomoney.com.br/onde-investir/cvm-propoe-novas-regras-para-crowdfunding-que-beneficiam-tokens-de-renda-fixa/
78. BCB, resoluciones 519–521: https://lefosse.com/noticias/alerta/banco-central-regulamenta-o-uso-de-ativos-virtuais-e-o-funcionamento-das-prestadoras-de-servicos-de-ativos-virtuais/
79. MiCA art. 2: https://www.springlex.eu/en/packages/mica/mica-regulation/article-2/
80. Régimen piloto DLT: https://www.amf-france.org/en/news-publications/depth/pilot-regime
81. SEC Innovation Exemption: https://www.cov.com/en/news-and-insights/insights/2026/09/will-my-company-be-forced-to-tokenize-its-stock-now-what-public-companies-should-know-about-the-secs-innovation-exemption
82. SEC, ofertas exentas: https://www.sec.gov/resources-small-businesses/exempt-offerings
- Publicidad: Sección 17(b) de la SEC [resumen] https://www.sec.gov/litigation/litreleases/lr17552.htm ; ECSP art. 27 [resumen] https://www.legislation.gov.uk/eur/2020/1503/chapter/V/data.html ; SFC, publicidad [resumen] https://www.ambitojuridico.com/sites/default/files/BancoMedios/Archivos/cartacirc-031-19%28superfinanciera%29.pdf

**Membresías, publicidad y subsidiarias**
37. Robinhood Gold: https://robinhood.com/us/en/gold/
38. Crypto.com Level Up: https://crypto.com/ca/company-news/revamped-levelup
39. StartEngine (Sacra): https://sacra.com/research/startengine
40. Airbnb, comisiones de servicio: https://www.airbnb.com/help/article/1857
41. DiDi y Uber en Colombia: https://cuantomecuesta.com/co/didi-conductor/
42. Escrow.com: https://www.escrow.com/fee-calculator
43. Computrabajo: https://www.betterteam.com/co/computrabajo
44. GPS en Colombia [resumen]: c3carecarcenter.com ; Samsara [resumen]: costbench.com
45. thirdweb x402: https://thirdweb.com/pricing
46. Ramp Network: https://rampnetwork.com/pricing-policy
47. Binance, descuento BNB: https://www.binance.com/en/fee/schedule
51. LinkedIn Premium Company Page: https://premium.linkedin.com/small-business/company-page
52. CPM de Meta en Colombia: https://www.superads.ai/facebook-ads-costs/cpm-cost-per-mille/colombia
53. Benchmarks de Meta Ads 2026: https://contentstudio.io/blog/meta-ads-benchmarks
54. Metrocuadrado, paquetes: https://www.metrocuadrado.com/noticias/actualidad/nuevos-paquetes-de-publicacion-en-metrocuadrado-4729
55. Bitmedia: https://bitmedia.io/faq

**Costos**
56. Railway: https://railway.com/pricing ; https://docs.railway.com/reference/pricing/plans
57. thirdweb: https://thirdweb.com/pricing
58. Alchemy: https://www.alchemy.com/pricing
59. Gas de Polygon: https://polygonscan.com/gastracker
60. Precio de POL: https://www.coingecko.com/en/coins/polygon-ecosystem-token
61. Didit: https://didit.me/pricing
62. Sumsub: https://sumsub.com/pricing/
63. Veriff: https://www.veriff.com/pricing
64. Resend: https://resend.com/pricing
65. Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
66. Fireblocks (rastreador de terceros): https://pricingsaas.com/companies/fireblocks
67. Sherlock, precios de auditoría 2026: https://sherlock.xyz/post/smart-contract-audit-pricing-a-market-reference-for-2026
68. QuillAudits 2026: https://www.quillaudits.com/blog/smart-contract/smart-contract-audit-cost-2026
69. SAS en Colombia [resumen]: https://dian.com.co/como-constituir-sas-colombia-2026/
- Persona: https://help.withpersona.com/articles/6oZbzp7jb7AWGClF5vpY3K.md (Essential US$ 250/mes, 500 servicios)

### Lo que no pudimos verificar
- "Somos los primeros" y "somos los más completos": no hay evidencia suficiente (ver 3.3).
- Si en Colombia una plataforma puede cobrar un porcentaje por operación en el "mecanismo de publicidad" secundario del Decreto 2105/2023.
- Los montos máximos del Decreto 1235/2020 y si la ley colombiana de PSAV ya se aprobó.
- Tarifas de fiducia o SPV pequeñas en Colombia y honorarios de opiniones legales de tokenización.
- Las comisiones de los competidores latinoamericanos (LOKL, Bricks, Mercado Bitcoin, Liqi, Ripio, VolSmart): ninguno las publica.
- La tarifa oficial de a2censo; las de Republic, Wefunder, tZERO y Centrifuge vienen solo de resúmenes.
- La liquidación judicial de RealT (una sola fuente).
- Precios de Truora, MetaMap, Onfido, Koywe y del PSE de Transak.
- Tarifas de "ofertas promocionadas" en plataformas de inversión: no encontramos ninguna publicada.
- Las cifras de equipo, marketing, legal y la disposición a pagar de los emisores latinoamericanos son **supuestos** que hay que validar.
