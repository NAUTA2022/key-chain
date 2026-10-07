// Line icons for achievements (used instead of emojis).
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const PATHS = {
  trophy: <><path d="M8 4h8v5a4 4 0 01-8 0V4z" {...P} /><path d="M8 6H5a2 2 0 002 4h1M16 6h3a2 2 0 01-2 4h-1M12 13v4M8.5 20h7M10 17h4" {...P} /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" {...P} /><path d="M9 12l2 2 4-4" {...P} /></>,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" {...P} />,
  compass: <><circle cx="12" cy="12" r="8.5" {...P} /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" {...P} /></>,
  drop: <><path d="M12 3.5s6 6.4 6 10.5a6 6 0 01-12 0c0-4.1 6-10.5 6-10.5z" {...P} /><path d="M9.5 14.5a2.5 2.5 0 002.5 2.5" {...P} /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2.5" {...P} /><path d="M8 3v4M16 3v4M4 10h16M9 14.5l2 2 4-4" {...P} /></>,
  diamond: <><path d="M7 4h10l4 5-9 11L3 9l4-5z" {...P} /><path d="M3 9h18M9.5 4L8 9l4 11 4-11-1.5-5" {...P} /></>,
  rocket: <><path d="M12 3c3.5 2 5 5.5 5 9l-2.5 3h-5L7 12c0-3.5 1.5-7 5-9z" {...P} /><circle cx="12" cy="9.5" r="1.7" {...P} /><path d="M9.5 15L7 18.5l3-.5M14.5 15l2.5 3.5-3-.5M12 18v3" {...P} /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" {...P} /><path d="M8 11V8a4 4 0 018 0v3" {...P} /></>,
};

export default function AchievementIcon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] || PATHS.star}</svg>;
}
