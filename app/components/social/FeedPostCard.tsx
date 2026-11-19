import { useState } from 'react';
import { SquareMedia, PostComments } from '~/components/social/feed';
import { CompanyLogo } from '~/components/social/IdentityAvatar';
import { Icons } from '~/components/ui';
import { projectCode } from '~/lib/projectFeed';
import { localMonthLabel } from '~/lib/social/identity';
import type { NavFn } from '~/lib/navigation';
import type { CompanyRef, FeedPost, PostComment, SocialAsset, SocialSource } from '~/lib/social/types';
import { useT } from '~/i18n/useT';

type FeedPostCardProps = {
  post: FeedPost;
  asset: SocialAsset;
  company: CompanyRef;
  nav: NavFn;
  /** Where likes and comments go; null renders the post read-only. */
  source: SocialSource | null;
};

// One post as shown in the global Feed and on a company profile, laid out
// like Instagram: company header (hexagon + name open its profile; the
// project name opens the project),
// square media, likes/comments/"Ver proyecto", then the caption.
export default function FeedPostCard({ post, asset, company, nav, source }: FeedPostCardProps) {
  const { t, raw } = useT('profile');
  const { t: tc } = useT('common');
  const [open, setOpen] = useState(false);
  // Optimistic like until the source answers (in-memory sources re-render with the new post right away).
  const [likeOverride, setLikeOverride] = useState<{ liked: boolean; likes: number } | null>(null);
  // Sources that don't ship comments with the post load them when opened.
  const [loaded, setLoaded] = useState<PostComment[] | null>(null);
  const [added, setAdded] = useState<PostComment[]>([]);
  // Live moderation: the company owner or an admin may delete the post; authors (and admins) their comments.
  const [removed, setRemoved] = useState<{ post: boolean; comments: string[] }>({ post: false, comments: [] });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const media = post.media;
  const issuer = company.name;
  const liked = likeOverride?.liked ?? post.likedByMe;
  const likes = likeOverride?.likes ?? post.likes;
  const comments = (post.comments ?? [...(loaded ?? []), ...added]).filter(c => !removed.comments.includes(c.id));
  const commentCount = post.comments ? post.comments.length : post.commentCount + added.length - removed.comments.length;

  const toggleLike = () => {
    if (!source) return;
    setLikeOverride({ liked: !liked, likes: likes + (liked ? -1 : 1) });
    source.toggleLike(post.id).then(
      r => setLikeOverride(source.snapshot ? null : r),
      () => setLikeOverride(null),
    );
  };
  const toggleComments = () => {
    setOpen(o => !o);
    if (!open && source && !post.comments && loaded === null) {
      source.listComments(post.id).then(setLoaded, () => setLoaded([]));
    }
  };
  const addComment = (text: string) => {
    if (!source) return;
    source.addComment(post.id, text).then(c => { if (!post.comments) setAdded(a => [...a, c]); }, () => undefined);
  };
  const deletePost = () => {
    if (!source?.deletePost || !window.confirm(t('social.post.confirmDeletePost'))) return;
    setDeleteError(null);
    source.deletePost(post.id).then(
      () => setRemoved(r => ({ ...r, post: true })),
      (e: unknown) => setDeleteError(e instanceof Error ? e.message : t('social.post.deletePostError')),
    );
  };
  const deleteComment = (c: PostComment) => {
    if (!source?.deleteComment || !window.confirm(t('social.post.confirmDeleteComment'))) return;
    source.deleteComment(c.id).then(
      () => setRemoved(r => ({ ...r, comments: [...r.comments, c.id] })),
      (e: unknown) => setDeleteError(e instanceof Error ? e.message : t('social.post.deleteCommentError')),
    );
  };
  const openCompany = () => nav('empresa', company.slug);
  const openProject = () => nav('detalle', asset);

  const linkStyle = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' } as const;

  if (removed.post) return null;

  return (
    <article style={{ background: 'var(--surface)', border: '1.5px solid var(--border-l)', borderRadius: 16, padding: '16px 18px' }}>
      <div data-guide="feed-post" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {/* Posts are always the company's: its hexagon + name lead, the
            project is the secondary line. */}
        <button onClick={openCompany} aria-label={t('social.avatar.viewProfileOf', { name: issuer })} style={{ ...linkStyle, display: 'flex', flexShrink: 0 }}>
          <CompanyLogo company={issuer} logoUrl={company.logoUrl} size={38} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={openCompany}
            style={{ ...linkStyle, textAlign: 'left', maxWidth: '100%', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {issuer}
          </button>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <ProjectCode asset={asset} onClick={openProject} />{' '}
            <button onClick={openProject} style={{ ...linkStyle, fontWeight: 600, color: 'var(--sec)' }}>{asset.name}</button>
            {' · '}{tc(`categories.${asset.cat}`)} · <time dateTime={post.createdAt || undefined}>{localMonthLabel(post.date, raw<string[]>('social.months'))}</time>
          </div>
        </div>
        {post.milestone && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 10.5, flexShrink: 0 }}>
            {t('social.post.milestone')}
          </span>
        )}
        {post.canManage && source?.deletePost && (
          <button onClick={deletePost} aria-label={t('social.post.deletePost')} title={t('social.post.deletePost')}
            style={{ ...linkStyle, flexShrink: 0, color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600 }}>
            {t('social.post.delete')}
          </button>
        )}
      </div>
      {deleteError && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)', marginBottom: 8 }}>{deleteError}</div>}

      <SquareMedia media={media} />

      <div data-guide="feed-comment" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '4px 0 8px' }}>
        <button onClick={toggleLike} aria-pressed={liked} aria-label={t(liked ? 'social.post.unlike' : 'social.post.like', { count: likes })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: liked ? 'var(--neg)' : 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, padding: 0 }}>
          {liked ? '♥' : '♡'} {likes}
        </button>
        <button onClick={toggleComments} aria-expanded={open}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: open ? 'var(--text)' : 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, padding: 0 }}>
          {Icons.comment} {commentCount ? t(commentCount === 1 ? 'social.post.commentsOne' : 'social.post.commentsOther', { count: commentCount }) : t('social.post.comment')}
        </button>
        <button onClick={() => nav('detalle', { ...asset, focusPostId: post.id })} data-guide="feed-project-link"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, padding: 0 }}>
          {t('social.post.viewProject')}
        </button>
      </div>
      {post.text && (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>
          <b style={{ fontWeight: 700 }}>{issuer}</b> {post.text}
        </div>
      )}
      {open && (
        <PostComments comments={comments} onAdd={addComment} issuerName={issuer} isOwner={!!asset.isMine}
          onDelete={source?.deleteComment ? deleteComment : undefined}
          onAuthor={c => (c.authorId && c.authorId === source?.viewer?.id ? nav('perfil') : nav('usuario', c.authorId))} />
      )}
    </article>
  );
}

type ProjectCodeProps = {
  asset: Pick<SocialAsset, 'cat' | 'id' | 'name'>;
  onClick?: () => void;
  /** Sits on a photo (white on translucent). */
  overlay?: boolean;
};

// Project identifier chip ("EDF-021"); used on posts, reviews and analytics.
export function ProjectCode({ asset, onClick, overlay }: ProjectCodeProps) {
  const style = {
    display: 'inline-block', padding: '1px 6px', borderRadius: 6, flexShrink: 0,
    border: overlay ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--border-l)', background: overlay ? 'rgba(255,255,255,0.14)' : 'var(--surface2)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', color: overlay ? '#fff' : 'var(--sec)',
    cursor: onClick ? 'pointer' : 'default', verticalAlign: 'middle', lineHeight: 1.5,
  } as const;
  return onClick
    ? <button onClick={onClick} title={asset.name} style={style}>{projectCode(asset)}</button>
    : <span title={asset.name} style={style}>{projectCode(asset)}</span>;
}
