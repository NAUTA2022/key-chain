import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MARK_H, MARK_HOLES, MARK_OUTER, MARK_W, type Pt } from './mark';
import { useInView } from './useInView';

/*
 * Interactive 3D for the Brikme landing (three.js + React Three Fiber).
 * Loaded lazily and only after hydration, so the prerendered page keeps the
 * SVG mark and the 3D chunk never blocks first paint.
 *
 * - Logo3D: the real Brikme mark (from mark.ts) extruded in 3D. Drag to turn
 *   it. Flat solid brand colours (no reflections), frontal rest pose.
 * - TokenBlock3D: one asset as a block of 64 cubes that splits into tokens
 *   on hover / tap (tokenization made literal). Drag to turn it.
 */

type Input = {
  rx: number; ry: number; vx: number; vy: number;
  px: number; py: number;
  dragging: boolean; lastX: number; lastY: number;
  hover: boolean; active: boolean;
};

const newInput = (): Input => ({ rx: 0, ry: 0, vx: 0, vy: 0, px: 0, py: 0, dragging: false, lastX: 0, lastY: 0, hover: false, active: false });

/** Pointer handling on the wrapper: drag turns the object (with inertia), hover lights it. */
function usePointerRig() {
  const input = useRef<Input>(newInput());
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const i = input.current;
    const r = e.currentTarget.getBoundingClientRect();
    i.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    i.py = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (i.dragging) {
      const dx = e.clientX - i.lastX, dy = e.clientY - i.lastY;
      i.ry += dx * 0.01; i.rx += dy * 0.008;
      i.vy = dx * 0.01; i.vx = dy * 0.008;
      i.lastX = e.clientX; i.lastY = e.clientY;
    }
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const i = input.current;
    i.dragging = true; i.active = !i.active; i.lastX = e.clientX; i.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    input.current.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onPointerEnter = () => { input.current.hover = true; };
  const onPointerLeave = () => { const i = input.current; i.hover = false; i.dragging = false; i.px = 0; i.py = 0; };
  return { input, handlers: { onPointerMove, onPointerDown, onPointerUp, onPointerEnter, onPointerLeave, onPointerCancel: onPointerUp } };
}

/** Applies drag + inertia + idle drift to a group every frame. */
function steer(g: THREE.Group, i: Input, t: number, dt: number, base: { x: number; y: number }, idle = 1) {
  if (!i.dragging) {
    i.ry += i.vy; i.rx += i.vx; i.vy *= 0.93; i.vx *= 0.93;
    // Ease back to the rest pose once released.
    i.ry *= 0.985; i.rx *= 0.97;
  }
  i.rx = THREE.MathUtils.clamp(i.rx, -0.9, 0.9);
  const ty = base.y + i.ry + Math.sin(t * 0.35) * 0.22 * idle + i.px * 0.18;
  const tx = base.x + i.rx - i.py * 0.08;
  g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty, 5, dt);
  g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tx, 5, dt);
}

/* ── Logo3D ───────────────────────────────────────────────────────── */

function markGeometry(depth: number): THREE.ExtrudeGeometry {
  const v = ([x, y]: Pt) => new THREE.Vector2(x - MARK_W / 2, MARK_H / 2 - y);
  const shape = new THREE.Shape(MARK_OUTER.map(v));
  for (const h of MARK_HOLES) shape.holes.push(new THREE.Path(h.map(v)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.45, bevelSegments: 3 });
  g.center();
  return g;
}

function MarkScene({ input, tone }: { input: RefObject<Input>; tone: 'light' | 'dark' }) {
  const geo = useMemo(() => markGeometry(13), []);
  const group = useRef<THREE.Group>(null);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const i = input.current;
    const t = state.clock.elapsedTime;
    steer(g, i, t, dt, { x: 0, y: 0 }, 0.6);
    g.position.y = Math.sin(t * 0.8) * 2.2;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, i.hover ? 1.04 : 1, 6, dt));
  });

  // Solid, unlit colours (no shine): front/back faces in brand orange, extruded sides darker.
  return (
    <group ref={group}>
      <mesh geometry={geo}>
        <meshBasicMaterial attach="material-0" color="#F0900F" toneMapped={false} />
        <meshBasicMaterial attach="material-1" color={tone === 'dark' ? '#a85f06' : '#c4720a'} toneMapped={false} />
      </mesh>
    </group>
  );
}

type Logo3DProps = { tone?: 'light' | 'dark'; className?: string; onReady?: () => void; label?: string };

export function Logo3D({ tone = 'light', className, onReady, label = 'Logo de Brikme en 3D: arrastra para girarlo' }: Logo3DProps) {
  const { input, handlers } = usePointerRig();
  const { ref: viewRef, seen, visible } = useInView<HTMLDivElement>();
  return (
    <div ref={viewRef} className={className} role="img" aria-label={label} style={{ touchAction: 'pan-y', cursor: 'grab' }} {...handlers}>
      {seen && (
        <Canvas dpr={[1, 2]} flat frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 0, 175], fov: 36, near: 1, far: 1000 }}
          gl={{ antialias: true, alpha: true }} onCreated={() => onReady?.()}>
          <MarkScene input={input} tone={tone} />
        </Canvas>
      )}
    </div>
  );
}

/* ── TokenBlock3D ─────────────────────────────────────────────────── */

const N = 4;
const COUNT = N * N * N;
const STEP = 10;
// Deterministic "sold" tokens: a few brand-blue and orange cubes in the block.
const TINT = (k: number): 'blue' | 'orange' | 'paper' => (k * 37 % 11 === 0 ? 'orange' : k * 53 % 7 === 0 ? 'blue' : 'paper');
const COLORS = { paper: new THREE.Color('#f4f5f9'), blue: new THREE.Color('#1913B3'), orange: new THREE.Color('#F0900F') };

function BlockScene({ input, autoSplit }: { input: RefObject<Input>; autoSplit: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const split = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const base = useMemo(() => {
    const out: THREE.Vector3[] = [];
    const o = ((N - 1) * STEP) / 2;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) out.push(new THREE.Vector3(x * STEP - o, y * STEP - o, z * STEP - o));
    return out;
  }, []);
  const spin = useMemo(() => base.map((_, k) => new THREE.Euler(((k * 13) % 7 - 3) * 0.12, ((k * 29) % 9 - 4) * 0.1, ((k * 7) % 5 - 2) * 0.12)), [base]);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(N * STEP + 2, N * STEP + 2, N * STEP + 2)), []);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let k = 0; k < COUNT; k++) m.setColorAt(k, COLORS[TINT(k)]);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useEffect(() => () => edges.dispose(), [edges]);

  useFrame((state, dt) => {
    const m = mesh.current, g = group.current;
    if (!m || !g) return;
    const i = input.current;
    const t = state.clock.elapsedTime;
    steer(g, i, t, dt, { x: 0.52, y: -0.72 + t * 0.12 }, 0.6);
    // Split into tokens on hover / tap; otherwise breathe slightly.
    const target = i.hover || i.active || autoSplit ? 1 : 0.06 + Math.sin(t * 1.2) * 0.04;
    split.current = THREE.MathUtils.damp(split.current, target, 3.2, dt);
    const s = split.current;
    for (let k = 0; k < COUNT; k++) {
      const p = base[k];
      dummy.position.set(p.x * (1 + s * 0.85), p.y * (1 + s * 0.85), p.z * (1 + s * 0.85));
      dummy.rotation.set(spin[k].x * s, spin[k].y * s, spin[k].z * s);
      dummy.scale.setScalar(1 - s * 0.18);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[60, 120, 80]} intensity={2.1} />
      <directionalLight position={[-80, 30, -60]} intensity={0.7} color="#ffd7a8" />
      <group ref={group}>
        <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]}>
          <boxGeometry args={[STEP - 1.2, STEP - 1.2, STEP - 1.2]} />
          <meshLambertMaterial />
        </instancedMesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#0d0b33" transparent opacity={0.22} />
        </lineSegments>
      </group>
    </>
  );
}

type TokenBlock3DProps = { className?: string; autoSplit?: boolean; label?: string };

export function TokenBlock3D({ className, autoSplit = false, label = 'Un activo dividido en tokens: pasa el cursor o toca para fraccionarlo' }: TokenBlock3DProps) {
  const { input, handlers } = usePointerRig();
  const { ref: viewRef, seen, visible } = useInView<HTMLDivElement>();
  return (
    <div ref={viewRef} className={className} role="img" aria-label={label} style={{ touchAction: 'pan-y', cursor: 'grab' }} {...handlers}>
      {seen && (
        <Canvas dpr={[1, 2]} frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 0, 150], fov: 38, near: 1, far: 1000 }}
          gl={{ antialias: true, alpha: true }}>
          <BlockScene input={input} autoSplit={autoSplit} />
        </Canvas>
      )}
    </div>
  );
}
