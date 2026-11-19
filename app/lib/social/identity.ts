import { hashOf } from '~/lib/people';

// How people without a public profile are drawn in live mode: a generic
// "Inversor" label and an identicon seeded by their user id (stable, no
// personal data). People with a name but no photo get their initial on a
// gradient picked from the same seed, like the demo people.

/** Label for a person whose profile is private. */
export const ANONYMOUS_NAME = 'Inversor';

const GRADIENTS = [
  'linear-gradient(135deg, #f97316, #ec4899)', 'linear-gradient(135deg, #10b981, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)', 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  'linear-gradient(135deg, #84cc16, #0ea5e9)', 'linear-gradient(135deg, #e11d48, #7c3aed)',
];

export const personGradient = (seed: string): string => GRADIENTS[hashOf(seed) % GRADIENTS.length];

/** 5×5 mirrored identicon: which cells are on (row-major) and its hue, from the seed. */
export function identicon(seed: string): { cells: boolean[]; hue: number } {
  const h = hashOf(seed);
  const bits = hashOf(`${seed}:cells`);
  const cells: boolean[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const c = col < 3 ? col : 4 - col; // mirror around the middle column
      cells.push(((bits >>> (row * 3 + c)) & 1) === 1);
    }
  }
  return { cells, hue: h % 360 };
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * A date label from the data ("Mar 2025", "13 Jun 2026", "Mar": Spanish short months)
 * with the month in the active language. `names` = the 12 short month names
 * (`raw('social.months')` of the profile namespace).
 */
export function localMonthLabel(label: string, names: readonly string[]): string {
  return label.replace(/\b(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)\b/, m => names[MONTHS_ES.indexOf(m)] ?? m);
}
