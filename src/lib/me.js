import { RWA_ASSETS } from '../data';
import { issuerNameOf } from './projectFeed';

// The signed-in user (demo data until there's a real account) and the
// company they run, if any — the issuer of the project flagged `isMine`.
export const ME = {
  name: 'Maximiliano Rodríguez',
  initial: 'M',
  gradient: 'linear-gradient(135deg, #8247E5, #3b82f6)',
};

const mine = RWA_ASSETS.find(a => a.isMine);
export const MY_COMPANY = mine ? issuerNameOf(mine) : null;
