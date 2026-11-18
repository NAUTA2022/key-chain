import { DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl } from '~/lib/site';

const SECTIONS: ReadonlyArray<{ title: string; links: ReadonlyArray<[string, string, string]> }> = [
  {
    title: 'Plataforma',
    links: [
      ['Inicio', '/', 'Qué es la plataforma y cómo empezar a invertir en 4 pasos.'],
      ['Tokenizaciones', '/tokenizaciones', 'Catálogo de activos reales tokenizados con valuación, precio por token y rendimiento.'],
      ['Mercado secundario', '/mercado-secundario', 'Compra y venta P2P de tokens entre inversores.'],
      ['Token de la plataforma', '/token', 'Utilidad, rondas de venta, vesting y tokenomics.'],
    ],
  },
  {
    title: 'Aprender',
    links: [
      ['Academia', '/academia', 'Guías sobre tokenización de activos reales (RWA), inversión y DeFi.'],
      ['Centro de ayuda', '/ayuda', 'Preguntas frecuentes: rendimientos, KYC, inversión mínima, seguros y venta de tokens.'],
    ],
  },
  {
    title: 'Productos del ecosistema',
    links: [
      ['Bookey', '/bookey', 'Reservas de propiedades tokenizadas.'],
    ],
  },
];

export function loader() {
  const reviewed = new Date().toISOString().slice(0, 10);
  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${DEFAULT_DESCRIPTION}`,
    '',
    `Idioma: español. Última revisión: ${reviewed}.`,
    '',
    ...SECTIONS.flatMap(s => [`## ${s.title}`, '', ...s.links.map(([name, path, desc]) => `- [${name}](${absoluteUrl(path)}): ${desc}`), '']),
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
