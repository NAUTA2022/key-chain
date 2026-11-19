import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * The "evolution of property" cubes (Web 1 · Web 2 · Web 3) as interactive 3D.
 * Flat, unlit brand colours in true isometric view (no shine).
 *  - Solid cubes: grab, lift, release → they fall back and bounce slightly.
 *  - Glass cube: built from 4×4×4 inner cubes that separate while the cursor
 *    moves over it, and settle back together when it leaves.
 */

export type EvoTone = 'concrete' | 'sand' | 'glass';

const FACES: Record<Exclude<EvoTone, 'glass'>, { top: string; left: string; right: string }> = {
  concrete: { top: '#eceef1', left: '#c3c7cf', right: '#9da2ad' },
  sand: { top: '#f6e7c8', left: '#dfc28d', right: '#c4a267' },
};

// True isometric: tilt the scene towards the camera, then turn it 45°.
const ISO_X = Math.atan(1 / Math.SQRT2);
const ISO_Y = Math.PI / 4;
const ZOOM = 100; // px per world unit (orthographic)
// Vertical half-extent of an isometric cube of edge 1 (vertex to centre).
const ISO_HALF_H = Math.sqrt(3) / 2 * 0.943;

type Drag = {
  /** World y of the resting centre: the cube sits on the canvas floor. */
  floor: number; ready: boolean;
  active: boolean; startPointerY: number; startPointerX: number; startY: number;
  y: number; x: number; vy: number; vx: number; hover: boolean; speed: number; lastX: number; lastY: number;
};
const newDrag = (): Drag => ({ floor: 0, ready: false, active: false, startPointerY: 0, startPointerX: 0, startY: 0, y: 0, x: 0, vy: 0, vx: 0, hover: false, speed: 0, lastX: 0, lastY: 0 });

/* Physics steps live outside the components: they mutate the shared pointer state. */

/** Gravity + soft floor with low restitution: a slight bounce, then rest. */
/** Keeps the floor in sync with the canvas height (cube base 12px above the bottom edge). */
function placeFloor(d: Drag, viewH: number, size: number): void {
  d.floor = -viewH / 2 / ZOOM + size * ISO_HALF_H + 0.12;
  if (!d.ready) { d.y = d.floor; d.ready = true; }
}

function stepFall(d: Drag, dt: number): void {
  if (d.active) return;
  d.vy -= 26 * dt;
  d.y += d.vy * dt;
  if (d.y <= d.floor) {
    d.y = d.floor;
    d.vy = Math.abs(d.vy) > 1.2 ? -d.vy * 0.32 : 0;
  }
  d.x = THREE.MathUtils.damp(d.x, 0, 6, dt);
  d.vx = THREE.MathUtils.damp(d.vx, 0, 6, dt);
}

/** Cursor speed decays when the pointer stops. */
function stepSpeed(d: Drag, dt: number): void {
  d.speed = THREE.MathUtils.damp(d.speed, 0, 3, dt);
}

/* ── Solid cube: drag up, drop, bounce ───────────────────────────── */

function SolidScene({ drag, size, tone }: { drag: RefObject<Drag>; size: number; tone: Exclude<EvoTone, 'glass'> }) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => {
    const f = FACES[tone];
    const m = (c: string) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z. In this view +y is the top, -x the left, +z the right.
    return [m(f.right), m(f.left), m(f.top), m(f.right), m(f.right), m(f.left)];
  }, [tone]);
  useEffect(() => () => mats.forEach(x => x.dispose()), [mats]);

  useFrame((state, rawDt) => {
    const d = drag.current, g = root.current, s = spin.current;
    if (!g || !s) return;
    const dt = Math.min(rawDt, 1 / 30);
    placeFloor(d, state.size.height, size);
    stepFall(d, dt);
    g.position.set(d.x, d.y, 0);
    // Tilt with the motion while it flies, settle square when it lands.
    const air = THREE.MathUtils.clamp((d.y - d.floor) / 2.5, 0, 1);
    s.rotation.z = THREE.MathUtils.damp(s.rotation.z, THREE.MathUtils.clamp(-d.vx * 0.06, -0.5, 0.5) * (0.4 + air), 8, dt);
    s.rotation.x = THREE.MathUtils.damp(s.rotation.x, THREE.MathUtils.clamp(d.vy * 0.025, -0.35, 0.35) * air, 8, dt);
    // Idle breathing so it reads as alive.
    s.position.y = d.active ? 0 : Math.sin(state.clock.elapsedTime * 1.6) * 0.015;
    if (shadow.current) {
      const k = 1 - air * 0.55;
      shadow.current.position.y = d.floor - size * ISO_HALF_H - 0.02;
      shadow.current.scale.set(k, k * 0.32, 1);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.14 * k;
    }
  });

  return (
    <>
      {/* Contact shadow on the floor (solid, fades with height). */}
      <mesh ref={shadow} position={[0, -9, -2]} scale={[1, 0.3, 1]}>
        <circleGeometry args={[size * 0.78, 40]} />
        <meshBasicMaterial color="#0d0b33" transparent opacity={0.14} toneMapped={false} />
      </mesh>
      <group ref={root}>
        <group ref={spin}>
          <group rotation={[ISO_X, ISO_Y, 0]}>
            <mesh material={mats}>
              <boxGeometry args={[size, size, size]} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}

/* ── Glass cube: inner cubes separate under the cursor ───────────── */

const GN = 4;
function GlassScene({ drag, size }: { drag: RefObject<Drag>; size: number }) {
  const group = useRef<THREE.Group>(null);
  const cells = useRef<(THREE.Group | null)[]>([]);
  const explode = useRef(0);
  const step = size / GN;
  const base = useMemo(() => {
    const out: [number, number, number][] = [];
    const o = ((GN - 1) * step) / 2;
    for (let x = 0; x < GN; x++) for (let y = 0; y < GN; y++) for (let z = 0; z < GN; z++) out.push([x * step - o, y * step - o, z * step - o]);
    return out;
  }, [step]);
  const box = useMemo(() => new THREE.BoxGeometry(step * 0.96, step * 0.96, step * 0.96), [step]);
  const edges = useMemo(() => new THREE.EdgesGeometry(box), [box]);
  const outer = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), [size]);
  // Solid pale-turquoise faces (top / left / right shades) hide the back edges, like the 2D glass cube.
  const faceMat = useMemo(() => {
    const m = (c: string) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    return [m('#c2ecf2'), m('#d8f4f7'), m('#eafafc'), m('#c2ecf2'), m('#c2ecf2'), m('#d8f4f7')];
  }, []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#F0900F', transparent: true, opacity: 0.85, toneMapped: false }), []);
  const outerMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#F0900F', transparent: true, opacity: 0.9, toneMapped: false }), []);
  useEffect(() => () => { box.dispose(); edges.dispose(); outer.dispose(); faceMat.forEach(m => m.dispose()); lineMat.dispose(); outerMat.dispose(); }, [box, edges, outer, faceMat, lineMat, outerMat]);

  useFrame((state, rawDt) => {
    const d = drag.current;
    const dt = Math.min(rawDt, 1 / 30);
    placeFloor(d, state.size.height, size);
    stepSpeed(d, dt);
    // Hovering opens it a little; moving the cursor opens it more.
    const target = d.hover ? Math.min(1, 0.35 + d.speed * 0.012) : 0;
    explode.current = THREE.MathUtils.damp(explode.current, target, d.hover ? 5 : 3, dt);
    const e = explode.current;
    const t = state.clock.elapsedTime;
    cells.current.forEach((c, k) => {
      if (!c) return;
      const [x, y, z] = base[k];
      const wob = Math.sin(t * 2 + k) * 0.04 * e;
      c.position.set(x * (1 + e * 0.9) + wob, y * (1 + e * 0.9) + wob, z * (1 + e * 0.9));
      c.rotation.set(e * ((k * 7) % 5 - 2) * 0.1, e * ((k * 3) % 5 - 2) * 0.1, 0);
    });
    if (group.current) group.current.position.y = d.floor + Math.sin(t * 1.4) * 0.03;
  });

  return (
    <group ref={group}>
      <group rotation={[ISO_X, ISO_Y, 0]}>
        {base.map((_, k) => (
          <group key={k} ref={el => { cells.current[k] = el; }}>
            <mesh geometry={box} material={faceMat} />
            <lineSegments geometry={edges} material={lineMat} />
          </group>
        ))}
        <lineSegments geometry={outer} material={outerMat} />
      </group>
    </group>
  );
}

/* ── Wrapper ─────────────────────────────────────────────────────── */

type EvoCube3DProps = { tone: EvoTone; size: number; className?: string };

export function EvoCube3D({ tone, size, className }: EvoCube3DProps) {
  const drag = useRef<Drag>(newDrag());
  const solid = tone !== 'glass';

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!solid) return;
    const d = drag.current;
    d.active = true; d.startPointerY = e.clientY; d.startPointerX = e.clientX; d.startY = d.y; d.vy = 0; d.vx = 0;
    d.lastX = e.clientX; d.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const dx = e.clientX - d.lastX, dy = e.clientY - d.lastY;
    d.speed = Math.min(160, d.speed + Math.hypot(dx, dy));
    d.lastX = e.clientX; d.lastY = e.clientY;
    if (!solid || !d.active) return;
    const ny = Math.max(d.floor, d.startY + (d.startPointerY - e.clientY) / ZOOM);
    const nx = THREE.MathUtils.clamp((e.clientX - d.startPointerX) / ZOOM, -0.9, 0.9);
    d.vy = (ny - d.y) * 60; d.vx = (nx - d.x) * 60;
    d.y = ny; d.x = nx;
  };
  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    d.vy = Math.min(d.vy, 8); // let it fly a touch, then gravity wins
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className={className} role="img"
      aria-label={solid ? 'Cubo en 3D: arrástralo hacia arriba y suéltalo' : 'Cubo de vidrio en 3D: pasa el cursor para separar sus bloques'}
      style={{ touchAction: solid ? 'none' : 'pan-y', cursor: solid ? 'grab' : 'crosshair' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end}
      onPointerEnter={() => { drag.current.hover = true; }} onPointerLeave={() => { drag.current.hover = false; }}>
      <Canvas flat orthographic dpr={[1, 2]} camera={{ zoom: ZOOM, position: [0, 0, 20], near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true }}>
        {solid ? <SolidScene drag={drag} size={size} tone={tone} /> : <GlassScene drag={drag} size={size} />}
      </Canvas>
    </div>
  );
}
