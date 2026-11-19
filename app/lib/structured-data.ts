import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '~/lib/site';

type JsonLd = Record<string, unknown>;

/** Serializes JSON-LD for an inline <script>, escaping `<` so content can never close the tag. */
export function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon-512.png'),
    description: DEFAULT_DESCRIPTION,
    slogan: 'Real World Tokenization',
    email: 'hello@brikme.com',
    sameAs: ['https://www.brikme.com'],
    founder: { '@type': 'Person', name: 'Andrés Ortiz', jobTitle: 'CEO & Founder' },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Zlafa Building, Al Garhoud Office M02, Business Bay Bridge',
      addressLocality: 'Dubái',
      addressCountry: 'AE',
    },
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'es',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

/** Each standalone product the company runs, described as a web application. */
export function productAppJsonLd(input: { name: string; path: string; description: string; category: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.name,
    url: absoluteUrl(input.path),
    description: input.description,
    applicationCategory: input.category,
    operatingSystem: 'Web',
    inLanguage: 'es',
    provider: { '@id': `${SITE_URL}/#organization` },
  };
}
