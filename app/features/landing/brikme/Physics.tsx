import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { useInView } from './useInView';

/*
 * Physics playground (cannon-es + three.js) for the Brikme landing cubes.
 * Isometric orthographic view, gravity, collisions between every cube, a
 * floor and invisible walls at the edges of the view. Grab any cube (or any
 * piece of a "cluster" cube made of tokens), lift it, throw it: it falls,
 * bounces and stacks. Simulation runs only while the canvas is on screen.
 */

export type Tone = 'concrete' | 'sand' | 'steel' | 'navy' | 'blue' | 'orange' | 'ink' | 'teal';

const COLORS: Record<Tone, string> = {
  concrete: '#d9dce2', sand: '#e6cc96', steel: '#a9b1c0', navy: '#2b28c9', blue: '#1913B3', orange: '#F0900F', ink: '#1b1a45', teal: '#F0900F',
};

export type PhysCube = {
  /** Edge length in "units" (scaled to the canvas, see `unit`). */
  size: number;
  tone: Tone;
  /** Horizontal slot on screen, as a fraction of the canvas width (-0.5…0.5). */
  slot: number;
  /** Split the cube into n×n×n token cubes (each its own body). */
  split?: number;
  /** Outline every piece (token grid look). */
  edges?: boolean;
};

type PlaygroundProps = {
  cubes: readonly PhysCube[];
  /** Pixels per world unit at which `size` is drawn. Omit to fit `fitUnits` into a slot. */
  zoom?: number;
  /** Largest cube edge, in units, that must fit inside one slot (market scale). */
  fitUnits?: number;
  slots?: number;
  dark?: boolean;
  className?: string;
  label?: string;
};

const ISO_DIR = new THREE.Vector3(1, 1, 1).normalize();
// Screen-horizontal axis of the isometric view, on the floor plane.
const SCREEN_X = new THREE.Vector3(1, 0, -1).normalize();

type Piece = { body: CANNON.Body; size: number; tone: Tone; edges: boolean };

/** True isometric camera aimed slightly above the floor. */
function aimIso(camera: THREE.OrthographicCamera, zoom: number, viewH: number) {
  camera.position.copy(ISO_DIR.clone().multiplyScalar(40));
  camera.lookAt(0, Math.min(viewH / zoom, 6) * 0.22, 0);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
}

/**
 * Largest zoom (px per unit) at which every cube stays inside the canvas and clear of its
 * neighbours. In the isometric view a cube of edge e is e·√2 wide on screen.
 */
function fitZoom(cubes: readonly PhysCube[], viewW: number): number {
  const room = 1.12; // breathing space around each cube
  const sorted = [...cubes].sort((a, b) => a.slot - b.slot);
  return sorted.reduce((z, c, i) => {
    const half = (c.size * Math.SQRT2) / 2 * room;
    let next = Math.min(z, ((0.5 - Math.abs(c.slot)) * viewW) / half);
    const n = sorted[i + 1] as PhysCube | undefined;
    if (n) next = Math.min(next, ((n.slot - c.slot) * viewW) / (((c.size + n.size) * Math.SQRT2) / 2 * room));
    return next;
  }, Infinity);
}

function setupShadows(gl: THREE.WebGLRenderer) {
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
}

function buildWorld(cubes: readonly PhysCube[], viewW: number, viewH: number, zoom: number, unit: number) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
  world.allowSleep = true;
  (world.solver as CANNON.GSSolver).iterations = 12;
  const mat = new CANNON.Material('cube');
  world.addContactMaterial(new CANNON.ContactMaterial(mat, mat, { friction: 0.42, restitution: 0.22 }));
  world.defaultContactMaterial.friction = 0.42;
  world.defaultContactMaterial.restitution = 0.22;

  // Floor + four walls that frame the visible floor area.
  const half = (viewW / 2 / zoom) / Math.SQRT2;
  const floor = new CANNON.Body({ mass: 0, material: mat, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  const walls: [CANNON.Vec3, number, number][] = [
    [new CANNON.Vec3(half, 0, 0), 0, -Math.PI / 2], [new CANNON.Vec3(-half, 0, 0), 0, Math.PI / 2],
    [new CANNON.Vec3(0, 0, half), Math.PI, 0], [new CANNON.Vec3(0, 0, -half), 0, 0],
  ];
  for (const [p, rx, ry] of walls) {
    const w = new CANNON.Body({ mass: 0, material: mat, shape: new CANNON.Plane() });
    w.position.copy(p);
    w.quaternion.setFromEuler(rx, ry, 0);
    world.addBody(w);
  }

  const pieces: Piece[] = [];
  cubes.forEach((c, ci) => {
    const edge = c.size * unit;
    const along = c.slot * (viewW / zoom);
    const cx = SCREEN_X.x * along, cz = SCREEN_X.z * along;
    const n = c.split ?? 1;
    const s = edge / n;
    // Solid cubes drop in; token cubes start assembled on the floor and asleep,
    // so they only come apart when grabbed or hit.
    const drop = n > 1 ? 0 : 1.2 + ci * 0.6 + Math.min(viewH / zoom, 6) * 0.35;
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
      const body = new CANNON.Body({ mass: Math.max(0.2, s * s * s), material: mat, shape: new CANNON.Box(new CANNON.Vec3(s / 2 * 0.995, s / 2 * 0.995, s / 2 * 0.995)) });
      const o = (n - 1) / 2;
      body.position.set(cx + (x - o) * s, drop + edge / 2 + (y - o) * s, cz + (z - o) * s);
      body.sleepSpeedLimit = 0.08;
      body.linearDamping = 0.02;
      body.angularDamping = 0.06;
      world.addBody(body);
      if (n > 1) body.sleep();
      pieces.push({ body, size: s, tone: c.tone, edges: c.edges ?? n > 1 });
    }
  });
  return { world, pieces, half };
}

function Scene({ cubes, zoom: zoomProp, fitUnits, slots = 5, dark, running }: PlaygroundProps & { running: boolean }) {
  const { size, camera, gl } = useThree();
  // Fixed-size cubes shrink on narrow canvases (phones) so all of them fit side by side.
  const zoom = fitUnits ? zoomProp ?? 100 : Math.min(zoomProp ?? 100, fitZoom(cubes, size.width || 1));
  // Units → world: either 1:1, or fitted so `fitUnits` fills ~85% of a slot.
  const unit = fitUnits ? ((size.width / slots) * 0.62) / (Math.SQRT2 * fitUnits * zoom) : 1;
  const ready = size.width > 0 && size.height > 0;
  const sim = useMemo(() => (ready ? buildWorld(cubes, size.width, size.height, zoom, unit) : null), [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const edgeGeo = useMemo(() => new THREE.EdgesGeometry(box), [box]);
  const mats = useMemo(() => {
    const out = {} as Record<Tone, THREE.MeshLambertMaterial>;
    (Object.keys(COLORS) as Tone[]).forEach(t => { out[t] = new THREE.MeshLambertMaterial({ color: COLORS[t] }); });
    return out;
  }, []);
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({ color: dark ? '#ffd199' : '#ffffff', transparent: true, opacity: 0.85 }), [dark]);
  useEffect(() => () => { box.dispose(); edgeGeo.dispose(); Object.values(mats).forEach(m => m.dispose()); edgeMat.dispose(); }, [box, edgeGeo, mats, edgeMat]);

  useEffect(() => { aimIso(camera as THREE.OrthographicCamera, zoom, size.height); }, [camera, zoom, size.height]);

  // ── drag (point-to-point constraint towards the cursor) ──
  const drag = useRef<{ constraint: CANNON.PointToPointConstraint | null; joint: CANNON.Body | null; plane: THREE.Plane }>({ constraint: null, joint: null, plane: new THREE.Plane() });
  const ray = useMemo(() => new THREE.Raycaster(), []);
  useEffect(() => {
    if (!sim) return undefined;
    const el = gl.domElement;
    const ndc = new THREE.Vector2();
    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const onDown = (e: PointerEvent) => {
      toNdc(e);
      const hits = ray.intersectObjects(meshes.current.filter((m): m is THREE.Mesh => m !== null), false);
      if (!hits.length) return;
      const k = meshes.current.indexOf(hits[0].object as THREE.Mesh);
      const piece = sim.pieces[k];
      if (!piece) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const p = hits[0].point;
      const d = drag.current;
      d.plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), p);
      const joint = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: 0, collisionFilterMask: 0 });
      joint.position.set(p.x, p.y, p.z);
      sim.world.addBody(joint);
      const local = piece.body.pointToLocalFrame(new CANNON.Vec3(p.x, p.y, p.z));
      const c = new CANNON.PointToPointConstraint(piece.body, local, joint, new CANNON.Vec3(0, 0, 0), 40);
      sim.world.addConstraint(c);
      piece.body.wakeUp();
      d.constraint = c; d.joint = joint;
      el.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      toNdc(e);
      if (!d.joint) {
        const over = ray.intersectObjects(meshes.current.filter((m): m is THREE.Mesh => m !== null), false).length > 0;
        el.style.cursor = over ? 'grab' : 'default';
        return;
      }
      const hit = ray.ray.intersectPlane(d.plane, new THREE.Vector3());
      if (!hit) return;
      const lim = sim.half * 0.96;
      d.joint.position.set(THREE.MathUtils.clamp(hit.x, -lim, lim), THREE.MathUtils.clamp(hit.y, 0.2, 12), THREE.MathUtils.clamp(hit.z, -lim, lim));
    };
    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      if (d.constraint) sim.world.removeConstraint(d.constraint);
      if (d.joint) sim.world.removeBody(d.joint);
      d.constraint = null; d.joint = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [sim, gl, camera, ray]);

  useFrame((_, dt) => {
    if (!sim) return;
    if (running) sim.world.fixedStep(1 / 60, Math.min(dt, 1 / 20));
    sim.pieces.forEach((p, k) => {
      const m = meshes.current[k];
      if (!m) return;
      m.position.set(p.body.position.x, p.body.position.y, p.body.position.z);
      m.quaternion.set(p.body.quaternion.x, p.body.quaternion.y, p.body.quaternion.z, p.body.quaternion.w);
    });
  });

  if (!sim) return null;
  const span = sim.half * 2.4;
  return (
    <>
      <ambientLight intensity={dark ? 0.7 : 1.15} />
      <directionalLight position={[-6, 14, 9]} intensity={dark ? 1.6 : 1.5} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span} shadow-camera-near={1} shadow-camera-far={60} />
      <directionalLight position={[10, 6, -4]} intensity={dark ? 0.6 : 0.35} color={dark ? '#ffb347' : '#ffffff'} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[sim.half * 2, sim.half * 2]} />
        <shadowMaterial opacity={dark ? 0.45 : 0.16} />
      </mesh>
      <gridHelper args={[sim.half * 2, Math.round(sim.half * 2), dark ? '#24227a' : '#d9dbe3', dark ? '#16145a' : '#e6e8ee']} position={[0, 0.002, 0]} />
      {sim.pieces.map((p, k) => (
        <mesh key={k} ref={el => { meshes.current[k] = el; }} material={mats[p.tone]} castShadow receiveShadow scale={[p.size, p.size, p.size]} geometry={box}>
          {p.edges && <lineSegments geometry={edgeGeo} material={edgeMat} />}
        </mesh>
      ))}
    </>
  );
}

const ON_SCREEN: IntersectionObserverInit = { threshold: 0.15 };

export function PhysicsPlayground(props: PlaygroundProps) {
  // Mount the canvas the first time it shows up; simulate (and drop the cubes in) only while on screen.
  const { ref: viewRef, seen, visible: running } = useInView<HTMLDivElement>(ON_SCREEN);
  const stop = (e: ReactPointerEvent<HTMLDivElement>) => e.stopPropagation();
  return (
    <div ref={viewRef} className={props.className} role="img" aria-label={props.label ?? 'Cubos en 3D con física: arrástralos, lánzalos y apílalos'}
      style={{ touchAction: 'pan-y', cursor: 'grab' }} onPointerDown={stop}>
      {seen && <Canvas orthographic shadows flat dpr={[1, 2]} frameloop={running ? 'always' : 'demand'}
        camera={{ position: [40, 40, 40], zoom: props.zoom ?? 100, near: 0.1, far: 200 }} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => setupShadows(gl)}>
        <Scene {...props} running={running} />
      </Canvas>}
    </div>
  );
}
