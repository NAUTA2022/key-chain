import { PRIVATE_PATHS } from '~/lib/public-routes';
import { absoluteUrl } from '~/lib/site';

// Search and AI answer engines are explicitly welcome on public pages.
const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended',
  'CCBot', 'Amazonbot', 'Meta-ExternalAgent', 'DuckAssistBot', 'MistralAI-User',
];

export function loader() {
  const disallow = PRIVATE_PATHS.map(p => `Disallow: ${p}`).join('\n');
  const groups = ['*', ...AI_AGENTS].map(agent => `User-agent: ${agent}\nAllow: /\n${disallow}`).join('\n\n');
  const body = `${groups}\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
