import { RWA_ASSETS } from '~/data';
import { issuerNameOf } from '~/lib/projectFeed';

/** A person as the demo data draws them: initial on a gradient circle. */
export type DemoUser = { name: string; initial: string; gradient: string };

// The signed-in user (demo data until there's a real account) and the
// company they run, if any — the issuer of the project flagged `isMine`.
// Demo mode only: live screens take the viewer from the session.
export const ME: DemoUser = {
  name: 'Maximiliano Rodríguez',
  initial: 'M',
  gradient: 'linear-gradient(135deg, #8247E5, #3b82f6)',
};

const mine = RWA_ASSETS.find(a => a.isMine);
export const MY_COMPANY: string | null = mine ? issuerNameOf(mine) : null;
