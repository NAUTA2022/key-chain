/**
 * The Brikme mark, vectorised from the client's original logo (marching
 * squares + RDP over the logo's alpha mask). It is NOT a geometric cube: each
 * face is a single strip that folds into its own inner panel, an impossible
 * figure with slightly skewed angles. Keep these coordinates as the source of
 * truth for every SVG/3D rendering of the mark.
 *
 * Units: viewBox 0 0 87.14 100 (y grows downwards, SVG convention).
 */
export type Pt = readonly [number, number];

export const MARK_W = 87.14;
export const MARK_H = 100;

/** Outer contour of the whole mark (one connected strip). */
export const MARK_OUTER: readonly Pt[] = [
  [87.13, 23.62], [87.14, 76.36], [44.03, 52.18], [6.91, 74.16], [44.7, 96.05], [73.77, 79.28], [66.33, 75.14],
  [44.53, 87.9], [20.67, 74.0], [45.03, 59.22], [80.63, 79.28], [44.86, 100.0], [0.1, 74.32], [41.76, 49.39],
  [41.56, 5.74], [3.54, 27.75], [3.57, 61.21], [10.48, 56.98], [10.53, 32.21], [35.45, 17.55], [35.65, 45.59],
  [0.1, 67.34], [0.0, 25.93], [45.1, 0.0], [45.55, 49.06], [83.51, 70.5], [83.51, 25.44], [53.78, 7.76],
  [53.84, 17.34], [76.76, 30.89], [76.73, 59.63], [72.94, 57.82], [50.64, 45.08], [50.24, 1.98],
];

/** The three inner panels (holes): right face, left face, floor. */
export const MARK_HOLES: readonly (readonly Pt[])[] = [
  [[73.1, 53.91], [54.03, 42.94], [54.06, 21.47], [73.15, 32.7]],
  [[31.98, 23.52], [32.05, 43.93], [14.14, 54.55], [14.11, 34.02]],
  [[62.88, 73.17], [44.53, 83.94], [27.26, 73.83], [45.19, 63.16]],
];

const ring = (p: readonly Pt[]): string => `M${p.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;

/** Even-odd path of the full mark. */
export const MARK_PATH = [MARK_OUTER, ...MARK_HOLES].map(ring).join(' ');
/** Each contour as its own path (used to draw the outline in). */
export const MARK_RINGS: readonly string[] = [MARK_OUTER, ...MARK_HOLES].map(ring);
