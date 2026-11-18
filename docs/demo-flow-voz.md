# Voz de la demo Villa Mirador — guion para ElevenLabs

13 clips cortos, uno por momento de la guía. La página elige el clip según el paso en el que estás y lo reproduce cuando el usuario activa **«Escuchar explicación»** en la barra del mapa.

## Configuración en ElevenLabs

- **Modelo:** Eleven Multilingual v2 (respeta las pausas `<break time="…" />`).
- **Voz:** cálida, cercana, español latinoamericano. Por ejemplo, una voz de narrador o tutorial. Usá la misma voz en todos los clips.
- **Ajustes:** Stability 50 %, Similarity 75 %, Style 15 %, Speaker boost activado, Speed 0.95.
- **Formato de salida:** MP3 44.1 kHz, 128 kbps.
- **Nombre de cada archivo:** exactamente el del título del clip (por ejemplo `00-intro.mp3`).
- **Dónde van:** `key-chain/public/audio/demo-flow/`. Cuando estén los 13, el botón aparece solo.

Los números están escritos en letras a propósito («cinco dólares», no «5 USD»), para que la voz los lea bien.

---

### 00-intro.mp3
Se escucha en la pantalla «Así funciona invertir en una propiedad».

```
Hola. Te voy a mostrar cómo funciona invertir en una propiedad con blockchain. <break time="0.6s" />
Esta es Villa Mirador, una casa de alquiler dividida en cinco partes de un dólar cada una. <break time="0.5s" />
Quien tiene una parte, cobra una quinta parte de todo lo que gane la casa. <break time="0.6s" />
Vos elegís cuántas partes comprar, y seguís el dinero en el mapa. Tocá «Empezar».
```

### 01-elegir.mp3
Paso 1, antes de elegir cómo pagar.

```
Paso uno: ponés el dinero. <break time="0.5s" />
Primero elegí cuántas partes querés comprar: de una a cinco. Cada parte cuesta un dólar. <break time="0.5s" />
Después elegí cómo pagar: con Binance, con USDT desde cualquier wallet, o gratis, con dinero de prueba.
```

### 01-esperando.mp3
Paso 1, mientras se espera un pago real.

```
Perfecto. Ahora enviá el pago con los datos del panel: el monto tiene que ser exacto, porque los centavos identifican tu pago. <break time="0.5s" />
Apenas llegue, la demo sigue sola. Si te equivocaste de método, podés volver y elegir otro.
```

### 01-listo.mp3
Paso 1, cuando el dinero ya llegó.

```
¡Listo! Tu dinero llegó a la plataforma. <break time="0.5s" />
Mirá el mapa: sale de la izquierda y va hacia tus wallets, las que dicen «Tuya». Tocá «Siguiente».
```

### 02-compra.mp3
Paso 2, se compran las cinco partes.

```
Paso dos: se compran las cinco partes de la casa. <break time="0.5s" />
Con tu dinero se compran tus partes. Si no compraste las cinco, otros inversionistas compran el resto. <break time="0.5s" />
Cada compra queda registrada en la blockchain: la podés ver en el botón «Blockchain», bloque por bloque.
```

### 03-elegir.mp3
Paso 3, antes de cargar la ganancia.

```
Paso tres: la casa genera ganancia. <break time="0.5s" />
Imaginá que pasó un mes. ¿Qué pasó en la villa? <break time="0.4s" />
Elegí un ejemplo en el panel: un alquiler, un evento o un hito de obra. Después tocá «Repartir la ganancia». <break time="0.4s" />
En esta demo, vos hacés de empresa dueña del proyecto.
```

### 03-rent.mp3
Paso 3, si eligió «Alquiler del mes».

```
La villa se alquiló tres noches este mes. Cobró cinco dólares de alquiler, sin gastos. <break time="0.5s" />
La empresa pone esos cinco dólares de ganancia en el contrato, para repartirlos entre los dueños.
```

### 03-event.mp3
Paso 3, si eligió «Evento en la villa».

```
La villa se alquiló para un evento privado. Cobró siete dólares, y gastó dos en limpieza y personal. <break time="0.5s" />
Quedan cinco dólares de ganancia, y la empresa los pone en el contrato para repartirlos entre los dueños.
```

### 03-milestone.mp3
Paso 3, si eligió «Hito de obra cumplido».

```
Se terminó la piscina: un hito de la obra. Por cumplirlo, el proyecto paga un bono de cinco dólares a sus dueños. <break time="0.5s" />
La empresa pone esos cinco dólares en el contrato, para repartirlos.
```

### 04-reparto.mp3
Paso 4, el contrato reparte.

```
Paso cuatro: el contrato reparte solo. <break time="0.5s" />
La ganancia se divide entre las cinco partes: cinco dólares, dividido cinco partes, es un dólar por parte. <break time="0.5s" />
Cada dueño cobra según lo que tiene. Nadie hace cuentas a mano, y nadie se puede quedar con lo de otro.
```

### 05-cuenta.mp3
Paso 5, todo llega a tu cuenta.

```
Paso cinco: tu ganancia llega a tu wallet. <break time="0.5s" />
Tus partes te envían lo que cobraron, y los otros inversionistas se quedan con lo suyo. <break time="0.4s" />
Mirá arriba, donde está tu wallet: tu saldo subió.
```

### 06-resumen.mp3
Resumen de una demo gratis.

```
Repasemos. <break time="0.4s" />
Compraste partes de la casa con tu dinero. <break time="0.5s" />
La casa ganó cinco dólares, y a cada parte le tocó un dólar: por eso cobraste un dólar por cada parte que tenías. <break time="0.4s" />
Si tuvieras las cinco partes, te tocaría todo. <break time="0.6s" />
Así funciona invertir en una propiedad tokenizada: cada parte cobra lo suyo, y todo queda registrado en la blockchain.
```

### 06-resumen-real.mp3
Resumen de una demo pagada con dinero real (agrega la devolución).

```
Repasemos. <break time="0.4s" />
Compraste partes de la casa con tu dinero. <break time="0.5s" />
La casa ganó cinco dólares, y a cada parte le tocó un dólar: por eso cobraste un dólar por cada parte que tenías. <break time="0.4s" />
Si tuvieras las cinco partes, te tocaría todo. <break time="0.6s" />
Y como pagaste con dinero real, te devolvemos lo que pusiste, en USDT. Gracias por probar la demo.
```
