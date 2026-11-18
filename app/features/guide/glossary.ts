// Plain-language glossary for people new to blockchain. Shown in the Help Center ("Glosario")
// and reused by the guided tours. Spanish copy for Colombia/LatAm, neutral and friendly.

export type GlossaryEntry = {
  /** Stable id (used for anchors: #glosario-<id>). */
  id: string;
  term: string;
  /** Other names the user may see in the app. */
  aka?: string;
  definition: string;
};

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: 'blockchain',
    term: 'Blockchain',
    definition:
      'Un registro público y compartido que nadie puede borrar ni modificar a escondidas. Ahí queda anotado quién tiene cada token y cada movimiento, para que cualquiera lo pueda verificar.',
  },
  {
    id: 'wallet',
    term: 'Wallet',
    aka: 'Billetera',
    definition:
      'Es tu cuenta y tu billetera a la vez: con ella entrás a KEY CHAIN (sin contraseña) y en ella guardás tus USDC y tus tokens. Solo vos podés autorizar movimientos desde tu wallet.',
  },
  {
    id: 'direccion',
    term: 'Dirección de wallet',
    definition:
      'El "número de cuenta" de tu wallet: un código que empieza con 0x. Compartila para recibir fondos; nunca compartas tu frase secreta ni tu clave privada.',
  },
  {
    id: 'firma',
    term: 'Firma',
    definition:
      'Es la forma de decir "sí, autorizo esto" desde tu wallet. Una firma para entrar no cuesta nada; una firma que mueve dinero se convierte en una transacción.',
  },
  {
    id: 'usdc',
    term: 'USDC',
    aka: 'Dólar digital',
    definition:
      'Un dólar digital: cada USDC vale 1 dólar estadounidense y está respaldado 1 a 1. Es la moneda con la que invertís y con la que recibís dividendos en KEY CHAIN.',
  },
  {
    id: 'token',
    term: 'Token',
    definition:
      'Una unidad digital que representa una parte de un activo real (por ejemplo, una fracción de un inmueble o de una cosecha). Tener tokens te da derecho a la parte proporcional de sus rendimientos.',
  },
  {
    id: 'tokenizacion',
    term: 'Tokenización',
    definition:
      'Dividir un activo real en muchos tokens para que varias personas puedan invertir en él con montos pequeños. La propiedad de cada token queda registrada en la blockchain.',
  },
  {
    id: 'contrato',
    term: 'Contrato inteligente',
    aka: 'Smart contract',
    definition:
      'Un programa que vive en la blockchain y cumple reglas automáticamente, sin intermediarios: por ejemplo, entregar tus tokens cuando pagás o repartir dividendos entre los inversores.',
  },
  {
    id: 'red',
    term: 'Red',
    aka: 'Red de pruebas',
    definition:
      'La blockchain donde se registran las operaciones. En una red de pruebas el dinero es ficticio: sirve para practicar sin riesgo y no tiene valor real.',
  },
  {
    id: 'gas',
    term: 'Gas',
    aka: 'Comisión de red',
    definition:
      'Una pequeña comisión que cobra la red por registrar una transacción. No la cobra KEY CHAIN; tu wallet te muestra el monto antes de confirmar.',
  },
  {
    id: 'kyc',
    term: 'KYC / KYB',
    aka: 'Verificación de identidad',
    definition:
      'KYC ("conocé a tu cliente") es verificar quién sos; KYB es lo mismo para empresas. La ley lo exige para invertir en activos reales y protege a todos de fraudes.',
  },
  {
    id: 'identidad',
    term: 'Identidad on-chain',
    definition:
      'Un sello en la blockchain que dice "esta wallet está verificada", sin publicar tus datos personales. Es lo que permite que tu wallet reciba tokens de activos regulados.',
  },
  {
    id: 'pool',
    term: 'Pool',
    definition:
      'El fondo de cada proyecto: reúne el dinero de los inversores, entrega los tokens y luego reparte los rendimientos y el capital.',
  },
  {
    id: 'apy',
    term: 'APY',
    aka: 'Rendimiento anual estimado',
    definition:
      'Cuánto podría rendir tu inversión en un año, en porcentaje. Es una estimación del proyecto, no una promesa: el resultado real puede ser mayor o menor.',
  },
  {
    id: 'dividendo',
    term: 'Dividendo',
    definition:
      'La parte de las ganancias del activo que te corresponde según tus tokens. Se paga en USDC y lo cobrás desde Mis Pertenencias.',
  },
  {
    id: 'liquidacion',
    term: 'Liquidación',
    definition:
      'El cierre de un proyecto: el activo se vende o termina su plazo y el capital se reparte entre los inversores según sus tokens.',
  },
  {
    id: 'primario',
    term: 'Mercado primario',
    definition: 'Donde comprás tokens directamente al proyecto cuando sale a financiarse (Tokenizaciones).',
  },
  {
    id: 'secundario',
    term: 'Mercado secundario',
    definition:
      'Donde los inversores compran y venden tokens entre sí, después de la emisión. El precio lo pone quien vende.',
  },
  {
    id: 'faucet',
    term: 'Faucet',
    aka: 'Fondos de prueba',
    definition: 'Un grifo de dinero ficticio para practicar en la red de pruebas. Nunca existe en la red real.',
  },
] as const;
