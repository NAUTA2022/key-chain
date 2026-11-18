import { useState, type UIEvent } from 'react';
import { motion } from 'framer-motion';
import ProfileCard, { ProfileStory } from '~/components/social/ProfileCard';
import FeedBrowser from '~/components/social/FeedBrowser';
import { useDragScroll } from '~/hooks/useDragScroll';
import { useMobile } from '~/hooks/useMobile';
import { useFollowToggle, useSocialQuery, useSocialSource } from '~/lib/social/source';
import type { NavFn } from '~/lib/navigation';
import GuideButton from '~/features/guide/GuideButton';
import { useGuide } from '~/features/guide/context';
import type { CompanyProfile, FeedScope } from '~/lib/social/types';

// Global Feed — the first thing investors see: featured issuer profiles on
// top (cards on desktop and tablet, Instagram-stories circles on mobile;
// either opens the company profile), then the posts browser (search,
// filters, magnet toolbar) with only the milestone ("hito") posts of every
// live project, newest first. Regular posts stay inside each project's own
// Feed tab and on the company profile.
// Width of the soft fade on the profiles rail edges. It's a mask, so the
// cards fade into whatever is behind them — works in light and dark themes.
const RAIL_FADE = 72;
const RAIL_GAP = 20; // space between the profiles rail and the toolbar
const GLOBAL: FeedScope = { kind: 'global' };

export default function GlobalFeed({ nav }: { nav: NavFn }) {
  const guide = useGuide();
  // Demo: the design's in-memory data. Live: the API source (empty states until it's connected).
  const source = useSocialSource();
  const featured = useSocialQuery(source, 'featured-companies', s => s.featuredCompanies(), src => src.listFeaturedCompanies());
  const profiles: CompanyProfile[] = featured.data ?? [];
  const follow = useFollowToggle(source);
  const isMobile = useMobile();
  const openProfile = (p: CompanyProfile) => nav('empresa', p.slug);

  // Featured-profiles rail: cards on desktop and tablet, story circles on
  // mobile.
  const railDrag = useDragScroll(); // mouse drag; touch keeps native swipe
  // Which edges still have cards hidden past them, so the fade only shows
  // where there's more to scroll to.
  const [railEdges, setRailEdges] = useState({ left: false, right: true });
  const onRailScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    if (left !== railEdges.left || right !== railEdges.right) setRailEdges({ left, right });
  };
  const railMask = `linear-gradient(to right, ${railEdges.left ? 'transparent' : '#000'} 0, #000 ${RAIL_FADE}px, #000 calc(100% - ${RAIL_FADE}px), ${railEdges.right ? 'transparent' : '#000'} 100%)`;
  const rail = (
    <div className="no-scrollbar" onScroll={onRailScroll} {...railDrag}
      style={{ display: 'flex', gap: isMobile ? 12 : 14, overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', maskImage: railMask, WebkitMaskImage: railMask, cursor: 'grab' }}>
      {profiles.map(p => {
        const state = follow.stateOf(p.slug, { following: p.isFollowing, followers: p.followers });
        return isMobile
          ? <ProfileStory key={p.slug} profile={p} onOpen={() => openProfile(p)} />
          : <ProfileCard key={p.slug} profile={{ ...p, followers: state.followers }}
              following={state.following}
              onFollow={() => follow.toggle(p.slug, { kind: 'company', slug: p.slug }, { following: p.isFollowing, followers: p.followers })}
              onOpen={() => openProfile(p)} />;
      })}
    </div>
  );

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      {guide.enabled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <GuideButton tour="feed" style={{ marginLeft: 0 }} />
        </div>
      )}
      {profiles.length > 0 && (
        <>
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ margin: '0 0 12px', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
            Perfiles destacados
          </motion.h2>
          <div data-guide="feed-profiles" style={{ marginBottom: RAIL_GAP }}>{rail}</div>
        </>
      )}
      <FeedBrowser source={source} scope={GLOBAL} nav={nav} authors={profiles.map(p => ({ slug: p.slug, name: p.name }))} showFollowing />
    </div>
  );
}
