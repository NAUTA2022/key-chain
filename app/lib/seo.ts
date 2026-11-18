import type { MetaDescriptor } from 'react-router';
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_LOCALE, SITE_NAME, absoluteUrl } from '~/lib/site';

type SeoInput = {
  title: string;
  description?: string;
  path: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: ReadonlyArray<Record<string, unknown>>;
  publishedTime?: string;
};

/** Builds a complete, consistent set of meta tags for a route's `meta` export. */
export function seo({ title, description = DEFAULT_DESCRIPTION, path, image = DEFAULT_OG_IMAGE, type = 'website', noindex = false, jsonLd = [], publishedTime }: SeoInput): MetaDescriptor[] {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = absoluteUrl(path);
  const img = absoluteUrl(image);
  const tags: MetaDescriptor[] = [
    { title: fullTitle },
    { name: 'description', content: description },
    { name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: SITE_LOCALE },
    { property: 'og:type', content: type === 'product' ? 'website' : type },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: img },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: img },
  ];
  // Canonical only for indexable pages.
  if (!noindex) tags.push({ tagName: 'link', rel: 'canonical', href: url });
  if (publishedTime) tags.push({ property: 'article:published_time', content: publishedTime });
  for (const data of jsonLd) tags.push({ 'script:ld+json': data });
  return tags;
}

/** Spanish short dates used in the data ("02 Jun 2026") to ISO 8601. */
const MONTHS: Record<string, string> = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' };
export function esDateToIso(d: string): string | undefined {
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(d.trim());
  if (!m) return undefined;
  const month = MONTHS[m[2].toLowerCase()];
  return month ? `${m[3]}-${month}-${m[1].padStart(2, '0')}` : undefined;
}

export function breadcrumbs(items: ReadonlyArray<{ name: string; path: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
