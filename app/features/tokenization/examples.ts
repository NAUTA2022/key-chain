import type { Category } from './schema';

// Placeholders, hints and help texts that follow the asset type chosen in the wizard,
// so a car never shows building examples. Amounts are consistent within each type:
// price × tokens = valuation. Shared by the live wizard and the demo (pages/Wizard.tsx).

/** Live categories, the demo-only "bodega" type and a neutral set when nothing is chosen yet. */
export type ExampleKey = Category | 'bodega' | 'generic';

export type AssetExamples = {
  /** Noun used inside sentences: "el vehículo", "el campo"… */
  noun: string;
  name: string;
  location: string;
  locationHint: string;
  lifespan: string;
  description: string;
  descriptionHint: string;
  valuation: string;
  tokenPrice: string;
  totalTokens: string;
  expectedApy: string;
  /** Where the yield comes from, used in the APY help: "por el alquiler del vehículo". */
  yieldSource: string;
  /** Demo token symbol. */
  symbol: string;
};

export const EXAMPLES: Record<ExampleKey, AssetExamples> = {
  autos: {
    noun: 'el vehículo',
    name: 'Ej: Porsche 911 Carrera S 2022',
    location: 'Ej: Palermo, Buenos Aires',
    locationHint: 'Ciudad donde se guarda u opera el vehículo.',
    lifespan: 'Ej: 3 años',
    description: 'Ej: Porsche 911 Carrera S 2022, 18.000 km, único dueño, service oficial al día. Se alquila para eventos y producciones con ingresos de US$ 1.200 por mes...',
    descriptionHint: 'Marca, modelo, año, kilometraje, estado, titularidad y cómo genera ingresos (alquiler, eventos, flota).',
    valuation: '120.000',
    tokenPrice: '50',
    totalTokens: '2.400',
    expectedApy: '9',
    yieldSource: 'por el alquiler o la explotación del vehículo',
    symbol: 'KYCN-AUTO1',
  },
  campos: {
    noun: 'el campo',
    name: 'Ej: Campo La Esperanza – 450 ha',
    location: 'Ej: Pergamino, Buenos Aires',
    locationHint: 'Partido o departamento y provincia.',
    lifespan: 'Ej: 4 campañas',
    description: 'Ej: 450 hectáreas agrícolas con aptitud soja-maíz, rinde promedio de 38 qq/ha, arrendado a un productor local con contrato vigente hasta 2028...',
    descriptionHint: 'Hectáreas, aptitud del suelo, cultivos, rindes, arrendamientos o contratos y situación dominial.',
    valuation: '3.200.000',
    tokenPrice: '100',
    totalTokens: '32.000',
    expectedApy: '7,5',
    yieldSource: 'por el arrendamiento o la venta de la cosecha',
    symbol: 'KYCN-CAMPO1',
  },
  drones: {
    noun: 'el equipo',
    name: 'Ej: Flota de 5 drones DJI Agras T50',
    location: 'Ej: Venado Tuerto, Santa Fe',
    locationHint: 'Ciudad base desde donde opera el equipo.',
    lifespan: 'Ej: 36 meses',
    description: 'Ej: Flota de 5 drones de pulverización con 2 años de uso, contratos de servicio con 12 productores de la zona y 1.800 hectáreas tratadas por campaña...',
    descriptionHint: 'Equipos, antigüedad, horas de uso, servicios que presta, contratos vigentes y mantenimiento.',
    valuation: '85.000',
    tokenPrice: '25',
    totalTokens: '3.400',
    expectedApy: '14',
    yieldSource: 'por los servicios que presta el equipo',
    symbol: 'KYCN-DRONE1',
  },
  inmuebles: {
    noun: 'el inmueble',
    name: 'Ej: Departamento 3 ambientes en Nueva Córdoba',
    location: 'Ej: Córdoba Capital, Córdoba',
    locationHint: 'Barrio, ciudad y provincia o región.',
    lifespan: 'Ej: 5 años',
    description: 'Ej: Departamento de 75 m² a estrenar, 3 ambientes con balcón, alquilado a US$ 900 por mes con contrato de 2 años y expensas al día...',
    descriptionHint: 'Superficie, ambientes, estado, alquiler actual o esperado, ocupación y situación legal.',
    valuation: '180.000',
    tokenPrice: '50',
    totalTokens: '3.600',
    expectedApy: '6',
    yieldSource: 'por el alquiler del inmueble',
    symbol: 'KYCN-INMU1',
  },
  edificios: {
    noun: 'el edificio',
    name: 'Ej: Edificio Libertador 2450',
    location: 'Ej: Rosario, Santa Fe',
    locationHint: 'Ciudad y provincia o región.',
    lifespan: 'Ej: 10 años',
    description: 'Ej: Edificio de 24 unidades con 95 % de ocupación, renta mensual de US$ 14.000, cocheras y locales en planta baja, administración profesional...',
    descriptionHint: 'Unidades, superficie, ocupación, renta actual, estado del edificio y situación legal.',
    valuation: '1.500.000',
    tokenPrice: '100',
    totalTokens: '15.000',
    expectedApy: '8,5',
    yieldSource: 'por los alquileres de las unidades',
    symbol: 'KYCN-EDIF1',
  },
  bodega: {
    noun: 'la bodega',
    name: 'Ej: Finca Los Álamos – 40 ha de Malbec',
    location: 'Ej: Luján de Cuyo, Mendoza',
    locationHint: 'Departamento y provincia.',
    lifespan: 'Ej: 6 años',
    description: 'Ej: 40 hectáreas de viñedo Malbec con bodega propia, producción de 200.000 botellas por año y exportación a 5 países...',
    descriptionHint: 'Hectáreas, varietales, producción, mercados y situación legal.',
    valuation: '2.000.000',
    tokenPrice: '100',
    totalTokens: '20.000',
    expectedApy: '9',
    yieldSource: 'por la venta de la producción',
    symbol: 'KYCN-BODEGA1',
  },
  otro: {
    noun: 'el activo',
    name: 'Ej: Velero Beneteau First 40',
    location: 'Ej: San Isidro, Buenos Aires',
    locationHint: 'Ciudad y provincia o región donde está el activo.',
    lifespan: 'Ej: 5 años',
    description: 'Ej: Qué es el activo, en qué estado está, quién es el titular, cómo genera ingresos y cuánto generó en el último año...',
    descriptionHint: 'Qué es, estado, titularidad, cómo genera ingresos y lo que ayude a evaluarlo.',
    valuation: '250.000',
    tokenPrice: '50',
    totalTokens: '5.000',
    expectedApy: '8',
    yieldSource: 'por lo que genere el activo',
    symbol: 'KYCN-ACTIVO1',
  },
  generic: {
    noun: 'el activo',
    name: 'Ej: Nombre con el que se va a publicar el activo',
    location: 'Ej: Ciudad, provincia',
    locationHint: 'Ciudad y provincia o región.',
    lifespan: 'Ej: 5 años',
    description: 'Descripción detallada del activo, su potencial y características clave...',
    descriptionHint: 'Estado del activo, ingresos que genera, situación legal y lo que ayude a evaluarlo.',
    valuation: '250.000',
    tokenPrice: '50',
    totalTokens: '5.000',
    expectedApy: '8',
    yieldSource: 'por alquileres, producción o servicios',
    symbol: 'KYCN-ACTIVO1',
  },
};

export function examplesFor(key: ExampleKey | '' | null): AssetExamples {
  return EXAMPLES[key || 'generic'];
}

/** Help bubbles of the tokenomics step, worded for the chosen type. */
export function tokenomicsHelp(ex: AssetExamples) {
  return {
    valuation: {
      label: '¿Qué es la valuación?',
      text: `Cuánto vale ${ex.noun} en el mercado, en dólares, idealmente respaldado por una tasación independiente. Es la referencia para fijar el precio y la cantidad de tokens.`,
    },
    tokenPrice: {
      label: '¿Qué es el precio por token?',
      text: 'Lo que paga un inversor por cada token, en dólares. Un precio más bajo permite inversiones más chicas.',
    },
    totalTokens: {
      label: '¿Qué es la cantidad de tokens?',
      text: `Cuántos tokens se emiten en total. Precio por token × cantidad = capitalización de la emisión (por ejemplo ${ex.tokenPrice} × ${ex.totalTokens} = ${ex.valuation}).`,
    },
    expectedApy: {
      label: '¿Qué es el rendimiento anual?',
      text: `Rendimiento anual estimado para los inversores (APY), ${ex.yieldSource}. Es una proyección, no una garantía.`,
    },
  } as const;
}
