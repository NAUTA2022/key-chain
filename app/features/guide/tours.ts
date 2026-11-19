import type { paths } from '~/lib/api/schema';

// Guided tours (coach marks) per section. Each step points at an element marked with
// `data-guide="<name>"`; when none is on screen the step is skipped, unless it is a
// concept step (`fallback: 'center'`), which is then shown as a centered card / bottom sheet.
// Copy lives in the `help` dictionaries under `tours.<tourId>`: title, summary, where and
// steps.<stepId>.title / .body (see tourKey / stepKey). 1–3 short sentences per step.

/** Tour ids known to the API (`preferences.guidesSeen`). */
export type GuideId = NonNullable<
  NonNullable<paths['/v1/me']['patch']['requestBody']>['content']['application/json']['preferences']
>['guidesSeen'] extends ReadonlyArray<infer T> | undefined
  ? T
  : never;

export type GuidePlacement = 'auto' | 'bottom' | 'top' | 'right' | 'left';

export type GuideStep = {
  /** Step id: its copy is `help:tours.<tourId>.steps.<id>.title` / `.body`. */
  id: string;
  /** `data-guide` names; the first one visible on screen wins. None = concept step. */
  target?: readonly string[];
  /** What to do when no target is on screen: skip the step (default) or show it unanchored. */
  fallback?: 'skip' | 'center';
  placement?: GuidePlacement;
  /** Extra condition (e.g. only on the test network). */
  when?: () => boolean;
};

export type Tour = {
  /** Also the dictionary key: `help:tours.<id>.title` (name in the Help Center list) and `.summary` (one line for that list). */
  id: GuideId;
  /** Page where the tour lives (replay from the Help Center navigates here). */
  path: string;
  /** Tours tied to a specific item (a project, a company, a purchase) can't be opened from a list: the Help Center explains where they show up (`help:tours.<id>.where`). */
  where?: true;
  steps: readonly GuideStep[];
};

/** Dictionary key (`help` namespace) of a tour field. */
export const tourKey = (id: GuideId, field: 'title' | 'summary' | 'where') => `tours.${id}.${field}`;

/** Dictionary key (`help` namespace) of a step field. */
export const stepKey = (tour: GuideId, step: GuideStep, field: 'title' | 'body') => `tours.${tour}.steps.${step.id}.${field}`;

const isTestNetwork = () => Number(import.meta.env.VITE_CHAIN_ID ?? 0) !== 137;

const WELCOME: Tour = {
  id: 'welcome',
  path: '/panel',
  steps: [
    { id: 'intro' },
    {
      id: 'wallet',
      target: ['topbar-wallet', 'mnav-pertenencias'],
      fallback: 'center',
    },
    { id: 'usdc' },
    {
      id: 'kyc',
      target: ['nav-perfil', 'mnav-perfil'],
      fallback: 'center',
    },
    {
      id: 'holdings',
      target: ['nav-pertenencias', 'mnav-pertenencias'],
      fallback: 'center',
    },
    {
      id: 'help',
      target: ['nav-ayuda'],
      fallback: 'center',
    },
  ],
};

const FEED: Tour = {
  id: 'feed',
  path: '/feed',
  steps: [
    {
      id: 'news',
      target: ['feed-post'],
      fallback: 'center',
    },
    {
      id: 'follow',
      target: ['feed-profiles'],
    },
    {
      id: 'comment',
      target: ['feed-comment'],
    },
    {
      id: 'filter',
      target: ['feed-filters', 'feed-filters-mobile', 'feed-search'],
    },
    {
      id: 'project',
      target: ['feed-project-link'],
    },
  ],
};

const TOKENIZATIONS: Tour = {
  id: 'tokenizations',
  path: '/tokenizaciones',
  steps: [
    { id: 'what' },
    {
      id: 'card',
      target: ['asset-card'],
    },
    {
      id: 'apy',
      target: ['asset-apy'],
    },
    {
      id: 'funded',
      target: ['asset-funded'],
    },
    {
      id: 'filter',
      target: ['market-filters'],
    },
  ],
};

const PROJECT: Tour = {
  id: 'project',
  path: '/tokenizaciones',
  where: true,
  steps: [
    {
      id: 'intro',
      target: ['project-title'],
      fallback: 'center',
    },
    {
      id: 'price',
      target: ['project-price'],
    },
    {
      id: 'apy',
      target: ['project-apy'],
    },
    {
      id: 'funded',
      target: ['project-funded'],
    },
    {
      id: 'docs',
      target: ['project-tabs'],
    },
    {
      id: 'invest',
      target: ['project-invest'],
      fallback: 'center',
    },
    { id: 'risks' },
  ],
};

const CHECKOUT: Tour = {
  id: 'checkout',
  path: '/tokenizaciones',
  where: true,
  steps: [
    {
      id: 'review',
      target: ['checkout-summary'],
      fallback: 'center',
    },
    { id: 'signatures' },
    { id: 'gas' },
    {
      id: 'after',
      target: ['checkout-pay', 'checkout-summary'],
      fallback: 'center',
    },
  ],
};

const SECONDARY: Tour = {
  id: 'secondary',
  path: '/mercado-secundario',
  steps: [
    {
      id: 'intro',
      target: ['secondary-title'],
      fallback: 'center',
    },
    {
      id: 'price',
      target: ['listing-card'],
    },
    {
      id: 'buy',
      target: ['listing-buy'],
    },
    {
      id: 'sell',
      target: ['secondary-sell'],
      fallback: 'center',
    },
    {
      id: 'withdraw',
      target: ['listing-withdraw'],
      fallback: 'center',
    },
  ],
};

const HOLDINGS: Tour = {
  id: 'holdings',
  path: '/pertenencias',
  steps: [
    {
      id: 'balance',
      target: ['holdings-balance'],
      fallback: 'center',
    },
    {
      id: 'deposit',
      target: ['holdings-deposit'],
    },
    {
      id: 'testFunds',
      target: ['holdings-deposit'],
      when: isTestNetwork,
    },
    {
      id: 'withdraw',
      target: ['holdings-withdraw'],
    },
    {
      id: 'dividends',
      target: ['holdings-dividends', 'holdings-tabs'],
      fallback: 'center',
    },
    {
      id: 'capital',
      target: ['holdings-capital'],
      fallback: 'center',
    },
    {
      id: 'movements',
      target: ['holdings-movements'],
    },
  ],
};

const TOKEN: Tour = {
  id: 'token',
  path: '/token',
  steps: [
    {
      id: 'intro',
      target: ['token-title'],
      fallback: 'center',
    },
    {
      id: 'sale',
      target: ['token-sale'],
    },
    {
      id: 'utilities',
      target: ['token-utilities'],
    },
    {
      id: 'buy',
      target: ['token-buy'],
    },
    {
      id: 'position',
      target: ['token-position'],
    },
  ],
};

const PROFILE: Tour = {
  id: 'profile',
  path: '/perfil',
  steps: [
    {
      id: 'intro',
      target: ['profile-tabs'],
      fallback: 'center',
    },
    {
      id: 'kyc',
      target: ['profile-kyc', 'profile-account-tab'],
      fallback: 'center',
    },
    { id: 'privacy' },
    {
      id: 'company',
      target: ['profile-company-tab'],
    },
  ],
};

const TOKENIZE: Tour = {
  id: 'tokenize',
  path: '/tokenizar',
  steps: [
    {
      id: 'intro',
      target: ['tokenize-title'],
      fallback: 'center',
    },
    {
      id: 'steps',
      target: ['tokenize-steps'],
    },
    {
      id: 'status',
      target: ['tokenize-tabs'],
    },
    { id: 'after' },
  ],
};

const COMPANIES: Tour = {
  id: 'companies',
  path: '/feed',
  where: true,
  steps: [
    {
      id: 'intro',
      target: ['company-title'],
      fallback: 'center',
    },
    {
      id: 'verified',
      target: ['company-verified'],
    },
    {
      id: 'follow',
      target: ['company-follow'],
    },
    {
      id: 'tabs',
      target: ['company-tabs'],
    },
    { id: 'own' },
  ],
};

export const TOURS: Readonly<Record<GuideId, Tour>> = {
  welcome: WELCOME,
  feed: FEED,
  tokenizations: TOKENIZATIONS,
  project: PROJECT,
  checkout: CHECKOUT,
  secondary: SECONDARY,
  holdings: HOLDINGS,
  token: TOKEN,
  profile: PROFILE,
  tokenize: TOKENIZE,
  companies: COMPANIES,
};

/** Query parameter that replays a tour on arrival (`/feed?guia=feed`). */
export const GUIDE_PARAM = 'guia';

export const TOUR_IDS = Object.keys(TOURS) as GuideId[];

export function isGuideId(v: unknown): v is GuideId {
  return typeof v === 'string' && Object.hasOwn(TOURS, v);
}

/** Section tour for a pathname (auto-shown on the first visit). */
export function tourForPath(pathname: string): GuideId | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/panel') return 'welcome';
  if (p === '/feed') return 'feed';
  if (p === '/tokenizaciones') return 'tokenizations';
  if (p.startsWith('/tokenizaciones/')) return 'project';
  if (p === '/checkout') return 'checkout';
  if (p === '/mercado-secundario') return 'secondary';
  if (p === '/pertenencias') return 'holdings';
  if (p === '/token') return 'token';
  if (p === '/perfil') return 'profile';
  if (p === '/tokenizar') return 'tokenize';
  if (p.startsWith('/empresas/')) return 'companies';
  return null;
}
