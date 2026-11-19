import { motion } from 'framer-motion';
import { MARK_H, MARK_PATH, MARK_RINGS, MARK_W } from './mark';

/**
 * Isometric geometry shared by the Brikme landing: the brand cube (line mark)
 * and solid cubes used as "building blocks" in the data sections.
 * Unit system: a regular hexagon of radius 1 centred on (0, 0).
 */
type Pt = readonly [number, number];

const A = Math.cos(Math.PI / 6); // half-width of the hexagon (≈ 0.866)

const toPath = (poly: readonly Pt[]): string =>
  `M ${poly.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(' L ')} Z`;

type BrikmeMarkProps = {
  size: number;
  /** Draw the contour in, then fill it (hero / intro); otherwise render static. */
  draw?: boolean;
  delay?: number;
  /** Fill colour of the mark (brand orange by default; white on dark or coloured grounds). */
  stroke?: string;
  className?: string;
};

/** The real Brikme mark (vectorised from the logo): outline draws in, then the strip fills. */
export function BrikmeMark({ size, draw = false, delay = 0, stroke = '#F0900F', className }: BrikmeMarkProps) {
  const h = (size * MARK_H) / MARK_W;
  return (
    <svg className={className} width={size} height={h} viewBox={`-1 -1 ${MARK_W + 2} ${MARK_H + 2}`} aria-hidden="true" style={{ overflow: 'visible' }}>
      {draw && MARK_RINGS.map((d, i) => (
        <motion.path key={i} d={d} fill="none" stroke={stroke} strokeWidth={0.6} strokeLinejoin="miter"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { delay: delay + i * 0.18, duration: 1.4, ease: [0.65, 0, 0.35, 1] }, opacity: { delay: delay + i * 0.18, duration: 0.2 } }} />
      ))}
      <motion.path d={MARK_PATH} fill={stroke} fillRule="evenodd"
        initial={draw ? { opacity: 0 } : false} animate={draw ? { opacity: 1 } : undefined}
        transition={{ delay: delay + 1.2, duration: 0.7 }} />
    </svg>
  );
}

export type CubeTone = 'concrete' | 'sand' | 'steel' | 'navy' | 'teal' | 'glass' | 'orange';

const TONES: Record<Exclude<CubeTone, 'glass'>, readonly [top: string, left: string, right: string]> = {
  concrete: ['#eceef1', '#c3c7cf', '#9da2ad'],
  sand:     ['#f6e7c8', '#dfc28d', '#c4a267'],
  steel:    ['#dfe4ec', '#9aa4b6', '#737d91'],
  navy:     ['#3d38d6', '#1913B3', '#0f0b7a'],
  teal:     ['#ffc77a', '#F0900F', '#c26f04'], // accent tone: isotype orange (no turquoise)
  orange:   ['#ffc477', '#F0900F', '#c9720a'],
};

const CUBE_TOP: readonly Pt[] = [[0, -1], [A, -0.5], [0, 0], [-A, -0.5]];
const CUBE_LEFT: readonly Pt[] = [[-A, -0.5], [0, 0], [0, 1], [-A, 0.5]];
const CUBE_RIGHT: readonly Pt[] = [[A, -0.5], [A, 0.5], [0, 1], [0, 0]];

type SolidCubeProps = { size: number; tone: CubeTone; className?: string };

/** A solid isometric cube; `size` is its rendered width in px. */
export function SolidCube({ size, tone, className }: SolidCubeProps) {
  const h = (size * 2) / (2 * A);
  if (tone === 'glass') {
    // Wireframe across each face, like the deck's "derivatives" glass cube.
    const lerp = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const seg = (p: Pt, q: Pt): string => `M ${p[0].toFixed(3)} ${p[1].toFixed(3)} L ${q[0].toFixed(3)} ${q[1].toFixed(3)}`;
    const grid: string[] = [];
    for (const [p0, p1, p2, p3] of [CUBE_TOP, CUBE_LEFT, CUBE_RIGHT]) {
      for (let k = 1; k < 5; k++) {
        const t = k / 5;
        grid.push(seg(lerp(p0, p1, t), lerp(p3, p2, t)), seg(lerp(p0, p3, t), lerp(p1, p2, t)));
      }
    }
    return (
      <svg className={className} width={size} height={h} viewBox={`${-A - 0.02} -1.02 ${2 * A + 0.04} 2.04`} aria-hidden="true">
        <path d={toPath(CUBE_TOP)} fill="rgba(240,144,15,0.10)" />
        <path d={toPath(CUBE_LEFT)} fill="rgba(240,144,15,0.16)" />
        <path d={toPath(CUBE_RIGHT)} fill="rgba(240,144,15,0.24)" />
        <path d={grid.join(' ')} fill="none" stroke="rgba(240,144,15,0.55)" strokeWidth={0.008} />
        {[CUBE_TOP, CUBE_LEFT, CUBE_RIGHT].map((f, i) => (
          <path key={i} d={toPath(f)} fill="none" stroke="#F0900F" strokeWidth={0.014} strokeLinejoin="miter" />
        ))}
      </svg>
    );
  }
  const [top, left, right] = TONES[tone];
  return (
    <svg className={className} width={size} height={h} viewBox={`${-A - 0.02} -1.02 ${2 * A + 0.04} 2.04`} aria-hidden="true">
      <path d={toPath(CUBE_TOP)} fill={top} />
      <path d={toPath(CUBE_LEFT)} fill={left} />
      <path d={toPath(CUBE_RIGHT)} fill={right} />
      <path d={`M 0 0 L 0 1 M 0 0 L ${-A} -0.5 M 0 0 L ${A} -0.5`} stroke="rgba(255,255,255,0.35)" strokeWidth={0.01} fill="none" />
    </svg>
  );
}
