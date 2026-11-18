import type { Route } from './+types/articulo';
import Article from '~/pages/Article';
import NotFound from '~/routes/not-found';
import { ACADEMY_POSTS, type AcademyPost } from '~/data';
import { apiEnabled } from '~/lib/api/client';
import { useNav } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { breadcrumbs, esDateToIso, seo } from '~/lib/seo';

function findPost(slug: string | undefined): AcademyPost | undefined {
  return ACADEMY_POSTS.find(p => p.slug === slug);
}

export const meta: Route.MetaFunction = ({ params }) => {
  const post = findPost(params.slug);
  if (!post) {
    // With the API, posts published after the build only exist there: the article
    // page names the tab once it loads (and shows the 404 itself if it doesn't exist).
    if (apiEnabled) return seo({ title: 'Academia', path: '/academia', noindex: true });
    return seo({ title: 'Artículo no encontrado', path: '/academia', noindex: true });
  }
  const path = `/academia/${post.slug}`;
  return seo({
    title: post.title,
    description: post.excerpt,
    path,
    image: post.img,
    type: 'article',
    publishedTime: esDateToIso(post.date),
    // The article body is still shared placeholder copy for every post, so
    // these pages stay out of the index until each one has its own content.
    noindex: true,
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Academia', path: '/academia' }, { name: post.title, path }])],
  });
};

export default function ArticuloRoute({ params }: Route.ComponentProps) {
  const nav = useNav();
  const { status } = useSession();
  const post = findPost(params.slug);
  // Live mode: the article component fetches the slug and handles its own 404.
  if (status !== 'disabled') return <Article key={params.slug} nav={nav} post={post} slug={params.slug} />;
  if (!post) return <NotFound />;
  return <Article key={post.slug} nav={nav} post={post} />;
}
