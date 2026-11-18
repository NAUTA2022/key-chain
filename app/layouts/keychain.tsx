import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useApplyPreferences } from '~/lib/preferences';

/**
 * Wraps every Keychain page (landing, login and the app shell): applies the
 * user's theme/palette/font and feeds the cursor position to the CSS glow
 * effects (`--cx` / `--cy`), batched to one write per animation frame.
 */
export default function KeychainLayout() {
  const { pathname } = useLocation();
  useApplyPreferences(pathname);

  useEffect(() => {
    let frame = 0;
    let x = 0;
    let y = 0;
    const flush = () => {
      frame = 0;
      const root = document.documentElement.style;
      root.setProperty('--cx', `${x}px`);
      root.setProperty('--cy', `${y}px`);
    };
    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <Outlet />;
}
