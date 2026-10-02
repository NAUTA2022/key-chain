import { RWA_ASSETS, MY_HOLDINGS, SECONDARY_LISTINGS } from '../data';
import { ME } from './me';
import { featuredProfiles, profileByName, ownerCompanyOf } from './projectFeed';

// Users of the platform: me, company owners (see projectFeed's owners) and
// common investors (e.g. the sellers in the secondary market), who have no
// company — their profile only shows their investments. Demo data until
// there's a real user backend.

const GRADIENTS = [
  'linear-gradient(135deg, #f97316, #ec4899)', 'linear-gradient(135deg, #10b981, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)', 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  'linear-gradient(135deg, #84cc16, #0ea5e9)', 'linear-gradient(135deg, #e11d48, #7c3aed)',
];
export const hashOf = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function personByName(name) {
  const listing = SECONDARY_LISTINGS.find(l => l.seller === name);
  return {
    name,
    initial: name.slice(0, 1).toUpperCase(),
    handle: name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''),
    gradient: GRADIENTS[hashOf(name) % GRADIENTS.length],
    bio: 'Inversor en activos reales tokenizados.',
    rep: listing?.sellerRep ?? 4.7,
    company: ownerCompanyOf(name),
  };
}

// ─── Social graph (followers / following) ─────────────────────────────────────
const EXTRA_PEOPLE = ['Julián Paz', 'Romina Díaz', 'Pablo Ortiz', 'Valeria Sosa', 'Nicolás Vera', 'Florencia Ruiz', 'Gonzalo Ibáñez',
  'Agustina Molina', 'Federico Luna', 'Micaela Torres', 'Santiago Rey', 'Camila Acosta', 'Tomás Herrera', 'Lucía Cabrera', 'Emiliano Ríos',
  'Paula Medina', 'Matías Castro', 'Daniela Vega', 'Bruno Navarro', 'Julieta Romero'];
const peoplePool = () => [...new Set([
  ...SECONDARY_LISTINGS.map(l => l.seller),
  ...featuredProfiles().map(p => p.owner.name),
  ...EXTRA_PEOPLE,
])];
const companyPool = () => featuredProfiles().map(p => p.name);

// Deterministic sample of `n` items from `list`, seeded by `seed`, without `skip`.
function sample(list, n, seed, skip = []) {
  const pool = list.filter(x => !skip.includes(x));
  const out = [];
  for (let i = 0; out.length < Math.min(n, pool.length); i++) {
    const x = pool[(hashOf(`${seed}-${i}`)) % pool.length];
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

const LIST_MAX = 30;

// Followers of a company: its real count plus a sample of who they are
// (me first when I follow it).
export function companyFollowers(name, iFollow) {
  const profile = profileByName(name);
  const count = (profile?.followers || 0) + (iFollow ? 1 : 0);
  const list = sample(peoplePool(), LIST_MAX, `cf-${name}`);
  return { count, people: iFollow ? [ME.name, ...list.slice(0, LIST_MAX - 1)] : list };
}

// Followers and following of a person. For me, "following" is what I
// actually follow in this session.
export function personSocial(name, { iFollow = false, myPeople = [], myCompanies = [] } = {}) {
  const isMe = name === ME.name;
  const h = hashOf(name);
  if (isMe) {
    const followers = sample(peoplePool(), 24, 'me-f', [ME.name]);
    return {
      followersCount: 128, followers,
      followingCount: myPeople.length + myCompanies.length, followingPeople: myPeople, followingCompanies: myCompanies,
    };
  }
  const base = 30 + (h % 900);
  const followers = sample(peoplePool(), Math.min(LIST_MAX, base), `pf-${name}`, [name]);
  const fp = sample(peoplePool(), 4 + (h % 9), `pg-${name}`, [name, ME.name]);
  const fc = sample(companyPool(), 2 + (h % 4), `pc-${name}`);
  return {
    followersCount: base + (iFollow ? 1 : 0), followers: iFollow ? [ME.name, ...followers] : followers,
    followingCount: fp.length + fc.length, followingPeople: fp, followingCompanies: fc,
  };
}

const INVESTABLE = RWA_ASSETS.filter(a => a.cat !== 'QA');

// A person's portfolio: { asset, tokens, invested, current, yieldEarned, since }.
export function holdingsOf(person) {
  if (!person || person === ME || person.name === ME.name) {
    return MY_HOLDINGS.map(h => ({ ...h, asset: RWA_ASSETS.find(a => a.id === h.assetId) })).filter(h => h.asset);
  }
  const h = hashOf(person.name);
  const n = 2 + (h % 4);
  const SINCE = ['Ene 2025', 'Abr 2025', 'Jul 2025', 'Oct 2025', 'Ene 2026', 'Mar 2026'];
  const out = [];
  for (let i = 0; out.length < n && i < INVESTABLE.length; i++) {
    const a = INVESTABLE[(h + i * 7) % INVESTABLE.length];
    if (out.some(x => x.asset.id === a.id)) continue;
    const tokens = 10 + ((h >> (i + 2)) % 140);
    const invested = Math.round(tokens * a.tokenPrice);
    const growth = 1 + (((h >> i) % 18) - 3) / 100;
    out.push({
      assetId: a.id, asset: a, tokens, invested,
      current: Math.round(invested * growth),
      yieldEarned: a.stage === 'Operativo' ? Math.round(invested * a.apy / 100 * 0.6) : 0,
      since: SINCE[(h + i) % SINCE.length],
    });
  }
  return out;
}

export function portfolioStats(holdings) {
  const invested = holdings.reduce((s, h) => s + h.invested, 0);
  const current = holdings.reduce((s, h) => s + h.current, 0);
  const yieldEarned = holdings.reduce((s, h) => s + h.yieldEarned, 0);
  const ret = invested ? ((current + yieldEarned - invested) / invested) * 100 : 0;
  return { invested, current, yieldEarned, ret, count: holdings.length };
}
