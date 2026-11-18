import { indexablePaths } from '~/lib/public-routes';
import { absoluteUrl } from '~/lib/site';

export function loader() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = indexablePaths()
    .map(p => `  <url>\n    <loc>${absoluteUrl(p)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
