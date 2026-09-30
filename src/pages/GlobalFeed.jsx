import { useState } from 'react';
import { motion } from 'framer-motion';
import ProfileCard, { ProfileStory } from '../components/ProfileCard';
import FeedBrowser from '../components/FeedBrowser';
import { useDragScroll } from '../hooks/useDragScroll';
import { useMobile } from '../hooks/useMobile';
import { useGlobalMilestones, useFollowing, featuredProfiles } from '../lib/projectFeed';

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

export default function GlobalFeed({ nav }) {
  const items = useGlobalMilestones();
  const [profiles] = useState(featuredProfiles);
  const [followed, toggleFollow] = useFollowing();
  const isMobile = useMobile();
  const openProfile = (name) => nav('empresa', name);

  // Featured-profiles rail: cards on desktop and tablet, story circles on
  // mobile.
  const railDrag = useDragScroll(); // mouse drag; touch keeps native swipe
  // Which edges still have cards hidden past them, so the fade only shows
  // where there's more to scroll to.
  const [railEdges, setRailEdges] = useState({ left: false, right: true });
  const onRailScroll = (e) => {
    const el = e.currentTarget;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    if (left !== railEdges.left || right !== railEdges.right) setRailEdges({ left, right });
  };
  const railMask = `linear-gradient(to right, ${railEdges.left ? 'transparent' : '#000'} 0, #000 ${RAIL_FADE}px, #000 calc(100% - ${RAIL_FADE}px), ${railEdges.right ? 'transparent' : '#000'} 100%)`;
  const rail = (
    <div className="no-scrollbar" onScroll={onRailScroll} {...railDrag}
      style={{ display: 'flex', gap: isMobile ? 12 : 14, overflowX: 'auto', scrollSnapType: 'x mandatory', maskImage: railMask, WebkitMaskImage: railMask, cursor: 'grab' }}>
      {profiles.map(p => (isMobile
        ? <ProfileStory key={p.name} profile={p} onOpen={() => openProfile(p.name)} />
        : <ProfileCard key={p.name} profile={p}
            following={followed.includes(p.name)}
            onFollow={() => toggleFollow(p.name)}
            onOpen={() => openProfile(p.name)} />
      ))}
    </div>
  );

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 12 }}>
        Perfiles destacados
      </motion.div>
      <div style={{ marginBottom: RAIL_GAP }}>{rail}</div>
      <FeedBrowser items={items} nav={nav} authors={profiles.map(p => p.name)} showFollowing />
    </div>
  );
}
