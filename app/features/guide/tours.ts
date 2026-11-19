import type { paths } from '~/lib/api/schema';

// Guided tours (coach marks) per section. Each step points at an element marked with
// `data-guide="<name>"`; when none is on screen the step is skipped, unless it is a
// concept step (`fallback: 'center'`), which is then shown as a centered card / bottom sheet.
// Copy: Spanish for Colombia/LatAm, "vos" forms like the rest of the app, 1–3 short sentences.

/** Tour ids known to the API (`preferences.guidesSeen`). */
export type GuideId = NonNullable<
  NonNullable<paths['/v1/me']['patch']['requestBody']>['content']['application/json']['preferences']
>['guidesSeen'] extends ReadonlyArray<infer T> | undefined
  ? T
  : never;

export type GuidePlacement = 'auto' | 'bottom' | 'top' | 'right' | 'left';

export type GuideStep = {
  /** `data-guide` names; the first one visible on screen wins. None = concept step. */
  target?: readonly string[];
  title: string;
  body: string;
  /** What to do when no target is on screen: skip the step (default) or show it unanchored. */
  fallback?: 'skip' | 'center';
  placement?: GuidePlacement;
  /** Extra condition (e.g. only on the test network). */
  when?: () => boolean;
};

export type Tour = {
  id: GuideId;
  /** Name shown in the Help Center list. */
  title: string;
  /** One line for the Help Center list. */
  summary: string;
  /** Page where the tour lives (replay from the Help Center navigates here). */
  path: string;
  /** Tours tied to a specific item (a project, a company, a purchase) can't be opened from a list: the Help Center explains where they show up. */
  where?: string;
  steps: readonly GuideStep[];
};

const isTestNetwork = () => Number(import.meta.env.VITE_CHAIN_ID ?? 0) !== 137;

const WELCOME: Tour = {
  id: 'welcome',
  title: 'Bienvenida a Brikme',
  summary: 'Qué es Brikme, tu wallet, el USDC, el KYC y dónde ver tus inversiones.',
  path: '/panel',
  steps: [
    {
      title: 'Te damos la bienvenida a Brikme',
      body: 'Aquí puedes invertir en activos reales —inmuebles, campos, energía— comprando pequeñas partes llamadas tokens. En un minuto te mostramos lo básico.',
    },
    {
      target: ['topbar-wallet', 'mnav-pertenencias'],
      fallback: 'center',
      title: 'Tu wallet: tu cuenta y tu billetera',
      body: 'Con tu wallet entras a Brikme sin contraseña y ahí guardas tu dinero y tus tokens. Nadie más puede moverlos: cada operación la autorizas tú con una firma.',
    },
    {
      title: 'USDC, el dólar digital',
      body: 'Inviertes y cobras en USDC: cada USDC vale 1 dólar estadounidense, 1 a 1. Lo depositas en tu wallet desde Mis Pertenencias.',
    },
    {
      target: ['nav-perfil', 'mnav-perfil'],
      fallback: 'center',
      title: 'Verifica tu identidad (KYC)',
      body: 'Antes de invertir te pedimos verificar quién eres. Lo exige la ley para activos reales y protege a todos de fraudes. Lo haces una sola vez desde tu Perfil.',
    },
    {
      target: ['nav-pertenencias', 'mnav-pertenencias'],
      fallback: 'center',
      title: 'Dónde ver tus inversiones',
      body: 'En Mis Pertenencias ves tu saldo, tus tokens, los dividendos por cobrar y todos tus movimientos.',
    },
    {
      target: ['nav-ayuda'],
      fallback: 'center',
      title: 'Ayuda cuando la necesites',
      body: 'Cada sección tiene un botón «¿Cómo funciona?» para repasar su guía. En el Centro de Ayuda tienes todas las guías y un glosario con las palabras nuevas.',
    },
  ],
};

const FEED: Tour = {
  id: 'feed',
  title: 'Feed',
  summary: 'Novedades de las empresas, hitos, seguir, comentar y filtrar.',
  path: '/feed',
  steps: [
    {
      target: ['feed-post'],
      fallback: 'center',
      title: 'Novedades de las empresas',
      body: 'Aquí ves lo que publican las empresas detrás de cada proyecto: avances, resultados y anuncios. Las marcadas como «Hito» son avances importantes.',
    },
    {
      target: ['feed-profiles'],
      title: 'Sigue a las empresas',
      body: 'Toca «Seguir» en una empresa para no perderte sus novedades ni sus próximos proyectos.',
    },
    {
      target: ['feed-comment'],
      title: 'Comenta y pregunta',
      body: 'Puedes dar me gusta y comentar. Es una buena forma de preguntarle a la empresa sobre su proyecto antes de invertir.',
    },
    {
      target: ['feed-filters', 'feed-filters-mobile', 'feed-search'],
      title: 'Filtra lo que te interesa',
      body: 'Busca por empresa o proyecto y filtra por tipo de publicación para ver solo lo que te importa.',
    },
    {
      target: ['feed-project-link'],
      title: 'Del post al proyecto',
      body: 'Con «Ver proyecto» vas a la ficha completa para revisar los números y, si quieres, invertir.',
    },
  ],
};

const TOKENIZATIONS: Tour = {
  id: 'tokenizations',
  title: 'Tokenizaciones',
  summary: 'Qué es tokenizar, qué es un token, APY estimado y % financiado.',
  path: '/tokenizaciones',
  steps: [
    {
      title: '¿Qué es tokenizar un activo?',
      body: 'Es dividir un activo real (un edificio, un campo, una planta solar) en muchas partes digitales llamadas tokens. Así puedes invertir con poco dinero y tu parte queda registrada en la blockchain.',
    },
    {
      target: ['asset-card'],
      title: 'Cada tarjeta es un proyecto',
      body: 'Un token representa una parte del activo y te da derecho a su parte de los rendimientos. Toca la tarjeta para ver la ficha completa.',
    },
    {
      target: ['asset-apy'],
      title: 'APY estimado',
      body: 'Es el rendimiento anual estimado: cuánto podría ganar tu inversión en un año. Es una proyección, no una garantía.',
    },
    {
      target: ['asset-funded'],
      title: '% financiado',
      body: 'Muestra cuánto de la emisión ya compraron otros inversores. Cuando llega al 100 %, la venta inicial se cierra.',
    },
    {
      target: ['market-filters'],
      title: 'Filtra y compara',
      body: 'Filtra por tipo de activo o rendimiento para encontrar proyectos que se ajusten a ti.',
    },
  ],
};

const PROJECT: Tour = {
  id: 'project',
  title: 'Ficha de proyecto',
  summary: 'Precio por token, rendimiento estimado, documentos, cómo invertir y riesgos.',
  path: '/tokenizaciones',
  where: 'Se muestra al abrir un proyecto.',
  steps: [
    {
      target: ['project-title'],
      fallback: 'center',
      title: 'La ficha del proyecto',
      body: 'Aquí está todo lo que necesitas para decidir: qué activo es, quién lo gestiona, cuánto podría rendir y sus documentos.',
    },
    {
      target: ['project-price'],
      title: 'Precio por token',
      body: 'Es lo que cuesta cada parte del activo, en USDC (1 USDC = 1 dólar). Puedes empezar con un solo token.',
    },
    {
      target: ['project-apy'],
      title: 'Rendimiento estimado (APY)',
      body: 'Es una estimación de cuánto podría rendir en un año. No está garantizado: depende de cómo le vaya al activo.',
    },
    {
      target: ['project-funded'],
      title: 'Avance de la financiación',
      body: 'El porcentaje de tokens ya vendidos. Al llegar al 100 % solo se pueden comprar en el mercado secundario.',
    },
    {
      target: ['project-tabs'],
      title: 'Documentos y novedades',
      body: 'En estas pestañas están la estructura del token, los documentos legales y las novedades de la empresa. Leelos antes de invertir.',
    },
    {
      target: ['project-invest'],
      fallback: 'center',
      title: 'Cómo invertir',
      body: 'Elige cuántos tokens quieres, toca Invertir y confirma en tu wallet. Necesitas tu identidad verificada y USDC en tu saldo.',
    },
    {
      title: 'Ten en cuenta los riesgos',
      body: 'Toda inversión tiene riesgo: el activo puede rendir menos de lo estimado y vender tus tokens puede tomar tiempo. Invierte solo lo que puedas mantener.',
    },
  ],
};

const CHECKOUT: Tour = {
  id: 'checkout',
  title: 'Checkout',
  summary: 'Por qué la wallet pide dos firmas, qué es el gas y qué pasa después.',
  path: '/tokenizaciones',
  where: 'Se muestra al invertir en un proyecto.',
  steps: [
    {
      target: ['checkout-summary'],
      fallback: 'center',
      title: 'Revisa tu compra',
      body: 'Aquí ves cuántos tokens compras, el precio y el total en USDC antes de pagar.',
    },
    {
      title: 'Tu wallet te va a pedir dos firmas',
      body: 'Primero autorizas el monto exacto de USDC de esta compra, ni un centavo más. Después confirmas la operación.',
    },
    {
      title: '¿Qué es el gas?',
      body: 'Cada operación en la blockchain paga una pequeña comisión de red, llamada gas. No la cobra Brikme: tu wallet te muestra el monto antes de confirmar.',
    },
    {
      target: ['checkout-pay', 'checkout-summary'],
      fallback: 'center',
      title: '¿Y después?',
      body: 'Cuando la red confirma, los tokens llegan a tu wallet y los ves en Mis Pertenencias, desde donde también cobras tus dividendos.',
    },
  ],
};

const SECONDARY: Tour = {
  id: 'secondary',
  title: 'Mercado secundario',
  summary: 'Comprar y vender entre inversores, descuento o prima, comisión y ofertas.',
  path: '/mercado-secundario',
  steps: [
    {
      target: ['secondary-title'],
      fallback: 'center',
      title: 'Compra y venta entre inversores',
      body: 'Aquí los inversores se compran y venden tokens entre sí, después de la emisión. Cada operación se hace directo entre wallets.',
    },
    {
      target: ['listing-card'],
      title: 'Precio pedido vs. precio real',
      body: 'Cada oferta muestra el precio que pide quien vende y el valor de referencia del token. Si pide menos es un descuento; si pide más, una prima.',
    },
    {
      target: ['listing-buy'],
      title: 'Comprar',
      body: 'Tu wallet aprueba el USDC exacto y confirma la compra. Los tokens pasan directo a tu wallet.',
    },
    {
      target: ['secondary-sell'],
      fallback: 'center',
      title: 'Vender tus tokens',
      body: 'Publica una venta eligiendo cantidad y precio. Al venderse se descuenta la comisión del vendedor, que ves antes de confirmar.',
    },
    {
      target: ['listing-withdraw'],
      fallback: 'center',
      title: 'Tus tokens siguen en tu wallet',
      body: 'Publicar una venta no saca los tokens de tu wallet: solo se mueven cuando alguien compra. Puedes retirar tu oferta cuando quieras.',
    },
  ],
};

const HOLDINGS: Tour = {
  id: 'holdings',
  title: 'Mis Pertenencias',
  summary: 'Saldo USDC, depositar, retirar, dividendos, capital y movimientos.',
  path: '/pertenencias',
  steps: [
    {
      target: ['holdings-balance'],
      fallback: 'center',
      title: 'Tu saldo en USDC',
      body: 'Es el dinero disponible en tu wallet para invertir, en dólares digitales (1 USDC = 1 dólar).',
    },
    {
      target: ['holdings-deposit'],
      title: 'Depositar',
      body: 'Te mostramos la dirección de tu wallet y la red. Envía USDC solo por esa red: si usas otra, los fondos se pueden perder.',
    },
    {
      target: ['holdings-deposit'],
      when: isTestNetwork,
      title: 'Fondos de prueba',
      body: 'Estamos en una red de pruebas: dentro de Depositar encuentras «Fondos de prueba» para practicar con dinero ficticio. En la red real no existe.',
    },
    {
      target: ['holdings-withdraw'],
      title: 'Retirar',
      body: 'Envía tus USDC a otra wallet o a un exchange. Revisa bien la dirección: en blockchain las transferencias no se pueden revertir.',
    },
    {
      target: ['holdings-dividends', 'holdings-tabs'],
      fallback: 'center',
      title: 'Dividendos',
      body: 'Cuando un proyecto reparte ganancias te toca una parte según tus tokens. Aparece como «por cobrar» y lo cobras en USDC desde tus inversiones.',
    },
    {
      target: ['holdings-capital'],
      fallback: 'center',
      title: 'Capital tras la liquidación',
      body: 'Cuando un proyecto termina y se liquida, recuperas tu parte del capital con «Cobrar capital».',
    },
    {
      target: ['holdings-movements'],
      title: 'Movimientos',
      body: 'Tu historial: depósitos, inversiones, dividendos y retiros, cada uno con su registro en la blockchain.',
    },
  ],
};

const TOKEN: Tour = {
  id: 'token',
  title: 'Token BRIK',
  summary: 'Qué es el token de la plataforma, sus rondas y utilidades.',
  path: '/token',
  steps: [
    {
      target: ['token-title'],
      fallback: 'center',
      title: 'BRIK, el token de la plataforma',
      body: 'BRIK es un token de utilidad: no representa un activo real, sino beneficios dentro de Brikme.',
    },
    {
      target: ['token-sale'],
      title: 'Rondas de venta',
      body: 'Se vende por rondas, cada una con su precio y su cupo. La barra muestra cuánto se vendió de la ronda actual.',
    },
    {
      target: ['token-utilities'],
      title: '¿Para qué sirve?',
      body: 'Aquí están sus utilidades dentro de la plataforma. Leelas antes de comprar: su valor puede subir o bajar.',
    },
    {
      target: ['token-buy'],
      title: 'Comprar BRIK',
      body: 'Cuando la venta esté abierta vas a poder comprar desde aquí con USDC, confirmando en tu wallet.',
    },
    {
      target: ['token-position'],
      title: 'Tu posición',
      body: 'Aquí ves cuántos BRIK tienes en tu wallet.',
    },
  ],
};

const PROFILE: Tour = {
  id: 'profile',
  title: 'Perfil',
  summary: 'Verificación de identidad (KYC), identidad on-chain, privacidad y tu empresa.',
  path: '/perfil',
  steps: [
    {
      target: ['profile-tabs'],
      fallback: 'center',
      title: 'Tu perfil',
      body: 'Desde aquí manejas tu cuenta: datos, verificación de identidad, documentos, privacidad y tu empresa.',
    },
    {
      target: ['profile-kyc', 'profile-account-tab'],
      fallback: 'center',
      title: 'Verificación de identidad (KYC)',
      body: 'Completa tus datos una sola vez en «Cuenta y seguridad». Al aprobarse, tu wallet recibe una identidad on-chain: un sello que dice «verificada» sin publicar tus datos.',
    },
    {
      title: 'Tu privacidad',
      body: 'Tus datos personales nunca se publican en la blockchain. En Privacidad eliges si otros inversores ven tu nombre, tu foto o en qué proyectos invertiste (nunca los montos).',
    },
    {
      target: ['profile-company-tab'],
      title: 'Tu empresa',
      body: 'Si quieres tokenizar un activo, registra tu empresa aquí. La verificamos (KYB) antes de que pueda publicar proyectos.',
    },
  ],
};

const TOKENIZE: Tour = {
  id: 'tokenize',
  title: 'Tokenizar activo',
  summary: 'Cómo pedir la tokenización de un activo y en qué estado está tu solicitud.',
  path: '/tokenizar',
  steps: [
    {
      target: ['tokenize-title'],
      fallback: 'center',
      title: 'Tokeniza tu activo',
      body: 'Si tu empresa tiene un activo que genera ingresos, puedes financiarlo vendiendo tokens a inversores. Todo empieza con una solicitud.',
    },
    {
      target: ['tokenize-steps'],
      title: 'Una solicitud por pasos',
      body: 'Tipo de activo, información, estructura del token, contacto y revisión. Suma documentos que respalden el activo: aceleran la revisión.',
    },
    {
      target: ['tokenize-tabs'],
      title: 'Sigue el estado',
      body: 'En «Mis solicitudes» ves en qué va cada una: enviada, en revisión, aprobada o rechazada. Si falta algo, te avisamos.',
    },
    {
      title: 'Después de la aprobación',
      body: 'Nuestro equipo estructura el token junto contigo y publica el proyecto en Tokenizaciones para que los inversores puedan comprar.',
    },
  ],
};

const COMPANIES: Tour = {
  id: 'companies',
  title: 'Empresas',
  summary: 'Perfiles de empresa, verificación, seguir y cómo registrar la tuya.',
  path: '/feed',
  where: 'Se muestra al abrir el perfil de una empresa.',
  steps: [
    {
      target: ['company-title'],
      fallback: 'center',
      title: 'Perfil de empresa',
      body: 'Cada empresa publica aquí sus proyectos y avances. Revisa quién está detrás antes de invertir.',
    },
    {
      target: ['company-verified'],
      title: 'Empresa verificada',
      body: 'Este sello indica que Brikme revisó sus documentos legales (KYB, la verificación de empresas).',
    },
    {
      target: ['company-follow'],
      title: 'Síguela',
      body: 'Al seguir una empresa ves sus novedades en tu feed y te enteras de sus nuevos proyectos.',
    },
    {
      target: ['company-tabs'],
      title: 'Proyectos, hitos y reseñas',
      body: 'Recorre las pestañas para ver sus proyectos, los hitos que fue cumpliendo y lo que opinan otros inversores.',
    },
    {
      title: '¿Tienes una empresa?',
      body: 'Regístrala desde tu Perfil, en «Registrar mi empresa». Una vez verificada, puedes solicitar tokenizar un activo.',
    },
  ],
};

export const TOURS: Readonly<Record<GuideId, Tour>> = {
  welcome: WELCOME,
  feed: FEED,
  tokenizations: TOKENIZATIONS,
  project: PROJECT,
  checkout: CHECKOUT,
  secondary: SECONDARY,
  holdings: HOLDINGS,
  token: TOKEN,
  profile: PROFILE,
  tokenize: TOKENIZE,
  companies: COMPANIES,
};

/** Query parameter that replays a tour on arrival (`/feed?guia=feed`). */
export const GUIDE_PARAM = 'guia';

export const TOUR_IDS = Object.keys(TOURS) as GuideId[];

export function isGuideId(v: unknown): v is GuideId {
  return typeof v === 'string' && Object.hasOwn(TOURS, v);
}

/** Section tour for a pathname (auto-shown on the first visit). */
export function tourForPath(pathname: string): GuideId | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/panel') return 'welcome';
  if (p === '/feed') return 'feed';
  if (p === '/tokenizaciones') return 'tokenizations';
  if (p.startsWith('/tokenizaciones/')) return 'project';
  if (p === '/checkout') return 'checkout';
  if (p === '/mercado-secundario') return 'secondary';
  if (p === '/pertenencias') return 'holdings';
  if (p === '/token') return 'token';
  if (p === '/perfil') return 'profile';
  if (p === '/tokenizar') return 'tokenize';
  if (p.startsWith('/empresas/')) return 'companies';
  return null;
}
