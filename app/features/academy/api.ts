import { useSession } from '~/lib/session';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { mediaUrl } from '~/lib/catalog';
import type { AcademyPost } from '~/data';
import { call, fmtDate, paragraphs, useApi } from '~/features/profile/api';

// Live Academy data (/v1/academy/*): typed reads, the read-progress write and the
// mapping from API posts to the card shape the Academy pages already render.

export type ApiPost = paths['/v1/academy/posts']['get']['responses'][200]['content']['application/json'][number];
export type ApiPostDetail = paths['/v1/academy/posts/{slug}']['get']['responses'][200]['content']['application/json'];

/** Published posts (public). */
export function useAcademyPosts() {
  return useApi('academy:posts', () => call(api.GET('/v1/academy/posts')));
}

/** One published post with its body (public). A 404 comes back as a problem with status 404. */
export function useAcademyPost(slug: string) {
  return useApi(`academy:post:${slug}`, () => call(api.GET('/v1/academy/posts/{slug}', { params: { path: { slug } } })));
}

/** Slugs the signed-in user already read; idle (null data) for guests. */
export function useAcademyReads() {
  const { status, user } = useSession();
  const key = status === 'authenticated' && user ? `${user.id}:academy:reads` : null;
  return useApi(key, () => call(api.GET('/v1/me/academy-reads')));
}

/** Marks a post as read for the signed-in user (idempotent). */
export function markRead(slug: string) {
  return call(api.POST('/v1/academy/posts/{slug}/read', { params: { path: { slug } } }));
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

/** "02 Jun 2026", the same format as the static posts. UTC, since it is a publication date. */
export function fmtPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fmtDate(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** API post → the card shape used by the Academy and Article views. */
export function toAcademyPost(p: ApiPost): AcademyPost {
  return {
    id: p.id,
    cat: p.category,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    img: mediaUrl(p.coverUrl),
    read: `${p.readMinutes} min`,
    date: fmtPostDate(p.publishedAt),
    featured: p.featured,
  };
}

/** Filter chips: "Todos" plus each category in order of first appearance. */
export function categoriesOf(posts: readonly AcademyPost[]): string[] {
  return ['Todos', ...new Set(posts.map(p => p.cat))];
}

export type BodyBlock = { kind: 'h2' | 'p'; text: string };

/**
 * Plain-text body → blocks. Paragraphs are separated by blank lines; a paragraph whose
 * first line starts with "## " becomes a heading (the rest of it, if any, a paragraph).
 * Everything stays plain text: it is rendered as React text, never as HTML.
 */
export function bodyBlocks(body: string | null | undefined): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const para of paragraphs(body)) {
    if (!para.startsWith('## ')) {
      blocks.push({ kind: 'p', text: para });
      continue;
    }
    const [first, ...rest] = para.split(/\r?\n/);
    const heading = first.slice(3).trim();
    const tail = rest.join('\n').trim();
    if (heading) blocks.push({ kind: 'h2', text: heading });
    if (tail) blocks.push({ kind: 'p', text: tail });
  }
  return blocks;
}
