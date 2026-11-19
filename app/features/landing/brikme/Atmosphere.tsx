import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * Studio atmosphere for the hero, built to read as one physical scene:
 * - every beam is a real spotlight: it lights the asset under it and leaves a
 *   pool on the floor; its visible cone (with drifting dust) is drawn over the asset;
 * - smoke drifts around and in front of the assets, glows where it crosses a
 *   beam and is pushed away by the cursor;
 * Everything follows the stage light power (0 = dark, 1 = on).
 */

export const STUDIO_BG = '#0b0b0d';

/** Light slots on the stage (where the carousel parks the front and the two side assets). */
export type Slot = { x: number; z: number; radius: number; strength: number };

/* ── Real spotlights, one per slot ────────────────────────────────── */

export function SlotSpots({ slots, top, power, base, shadowSize = 2048 }: { slots: readonly Slot[]; top: number; power: RefObject<number>; base: number; shadowSize?: number }) {
  const lights = useRef<(THREE.SpotLight | null)[]>([]);
  const targets = useMemo(() => slots.map(s => { const o = new THREE.Object3D(); o.position.set(s.x, 0, s.z); return o; }), [slots]);
  useEffect(() => { lights.current.forEach((l, i) => { if (l) l.target = targets[i]; }); }, [targets]);
  useFrame(() => { setSpots(lights.current, slots, base, power.current ?? 0); });
  return (
    <>
      {targets.map((t, i) => <primitive key={`t${i}`} object={t} />)}
      {slots.map((s, i) => (
        <spotLight key={i} ref={el => { lights.current[i] = el; }} position={[s.x, top, s.z]} angle={Math.atan(s.radius / top) * 1.05} penumbra={0.75}
          intensity={0} decay={1.6} distance={top * 2.2} color="#fff1dc" castShadow={i === 0}
          shadow-mapSize-width={shadowSize} shadow-mapSize-height={shadowSize} shadow-bias={-0.0004} />
      ))}
    </>
  );
}
function setSpots(lights: (THREE.SpotLight | null)[], slots: readonly Slot[], base: number, p: number) {
  lights.forEach((l, i) => { if (l) l.intensity = base * slots[i].strength * p; });
}

/* ── Volumetric beam (with drifting dust density) ─────────────────── */

const BEAM_VERT = /* glsl */ `
  uniform float uHeight;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  varying float vY;
  void main() {
    vY = position.y / uHeight + 0.5;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vView = -mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  varying float vY;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float edge = pow(facing, 1.7);
    float along = smoothstep(0.0, 0.18, vY) * (1.0 - smoothstep(0.92, 1.0, vY)) * mix(0.45, 1.0, vY);
    // Haze density drifting through the beam.
    vec3 q = vWorld * 0.55 + vec3(0.0, -uTime * 0.12, uTime * 0.05);
    float haze = 0.55 + 0.75 * (noise(q) * 0.65 + noise(q * 2.3) * 0.35);
    float a = edge * along * haze * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

type BeamsProps = { slots: readonly Slot[]; top: number; power: RefObject<number> };

/** Visible light cones. Drawn after the assets (depth-tested, additive): the haze sits over them. */
export function Beams({ slots, top, power }: BeamsProps) {
  const mats = useMemo(() => slots.map(() => new THREE.ShaderMaterial({
    uniforms: { uHeight: { value: top }, uColor: { value: new THREE.Color('#ffefd8') }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })), [slots, top]);
  const geos = useMemo(() => slots.map(s => new THREE.ConeGeometry(s.radius, top, 72, 1, true)), [slots, top]);
  useEffect(() => () => { mats.forEach(m => m.dispose()); geos.forEach(g => g.dispose()); }, [mats, geos]);
  useFrame(state => { setBeams(mats, slots, state.clock.elapsedTime, power.current ?? 0); });
  return (
    <>
      {slots.map((s, i) => <mesh key={i} geometry={geos[i]} material={mats[i]} position={[s.x, top / 2, s.z]} renderOrder={10} />)}
    </>
  );
}
function setBeams(mats: THREE.ShaderMaterial[], slots: readonly Slot[], t: number, p: number) {
  mats.forEach((m, i) => { m.uniforms.uOpacity.value = 0.42 * slots[i].strength * p; m.uniforms.uTime.value = t; });
}

/* ── Dust motes inside the beams ──────────────────────────────────── */

export function Dust({ slots, top, power }: BeamsProps) {
  const COUNT = 520;
  const { geo, seeds } = useMemo(() => makeDust(COUNT, slots.length), [slots]);
  const mat = useMemo(() => new THREE.PointsMaterial({ color: '#ffe8c8', size: 0.035, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((state, dt) => { moveDust(geo, seeds, slots, top, state.clock.elapsedTime, dt); fadeDust(mat, power.current ?? 0); });
  return <points geometry={geo} material={mat} renderOrder={11} />;
}
type Mote = { slot: number; r: number; a: number; y: number; v: number };
function makeDust(count: number, nSlots: number): { geo: THREE.BufferGeometry; seeds: Mote[] } {
  const seeds: Mote[] = [];
  for (let k = 0; k < count; k++) {
    seeds.push({ slot: k % nSlots, r: Math.sqrt(Math.random()), a: Math.random() * Math.PI * 2, y: Math.random(), v: 0.01 + Math.random() * 0.03 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  return { geo, seeds };
}
function fadeDust(m: THREE.PointsMaterial, p: number) { m.opacity = 0.75 * p; }
function moveDust(geo: THREE.BufferGeometry, seeds: Mote[], slots: readonly Slot[], top: number, t: number, dt: number) {
  const arr = (geo.attributes.position as THREE.BufferAttribute).array as Float32Array;
  seeds.forEach((s, k) => {
    s.y = (s.y + s.v * dt) % 1;
    const sl = slots[s.slot];
    const h = s.y * top * 0.85;
    const rad = sl.radius * (1 - h / top) * s.r * 0.9;
    const a = s.a + t * 0.05 + Math.sin(t * 0.3 + k) * 0.2;
    arr[k * 3] = sl.x + Math.cos(a) * rad;
    arr[k * 3 + 1] = h;
    arr[k * 3 + 2] = sl.z + Math.sin(a) * rad;
  });
  geo.attributes.position.needsUpdate = true;
}

/* ── Smoke: around and in front of the assets, lit by the beams, pushed by the cursor ── */

function smokeTexture(): THREE.CanvasTexture {
  // Value-noise fBm masked by a soft disc: organic, wispy puffs.
  const N = 128;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const grid = 12;
  const rnd = Array.from({ length: (grid + 1) * (grid + 1) }, () => Math.random());
  const val = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const at = (i: number, j: number) => rnd[((j % grid) * (grid + 1)) + (i % grid)];
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy;
  };
  if (g) {
    const img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let f = 0, amp = 0.55, fr = 3;
      for (let o = 0; o < 4; o++) { f += val(u * fr, v * fr) * amp; amp *= 0.5; fr *= 2; }
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      const mask = Math.max(0, 1 - d) ** 1.6;
      const a = Math.max(0, Math.min(1, (f - 0.28) * 1.6)) * mask;
      const k = (y * N + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Puff = { home: THREE.Vector3; pos: THREE.Vector3; vel: THREE.Vector3; size: number; alpha: number; spin: number; phase: number };

function makePuffs(): Puff[] {
  const out: Puff[] = [];
  const add = (x: number, y: number, z: number, size: number, alpha: number) =>
    out.push({ home: new THREE.Vector3(x, y, z), pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), size, alpha, spin: (Math.random() - 0.5) * 0.08, phase: Math.random() * 10 });
  // Ground haze hugging the floor, through and in front of the assets.
  for (let k = 0; k < 22; k++) add(-11 + (k / 21) * 22 + (Math.random() - 0.5), 0.35 + Math.random() * 0.35, -7 + Math.random() * 9, 3.2 + Math.random() * 2.4, 0.1 + Math.random() * 0.07);
  // Mid-height wisps, some between the camera and the assets.
  for (let k = 0; k < 12; k++) add(-9 + Math.random() * 18, 1.4 + Math.random() * 2.2, -6 + Math.random() * 7.5, 2.6 + Math.random() * 2.2, 0.1 + Math.random() * 0.08);
  return out;
}

export function Smoke({ slots, power }: { slots: readonly Slot[]; power: RefObject<number> }) {
  const tex = useMemo(() => smokeTexture(), []);
  const puffs = useMemo(() => makePuffs(), []);
  const mats = useMemo(() => puffs.map(() => new THREE.SpriteMaterial({ map: tex, color: '#c9ccd4', transparent: true, depthWrite: false, opacity: 0, fog: true })), [tex, puffs]);
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const cursor = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -1), []);
  useEffect(() => () => { tex.dispose(); mats.forEach(m => m.dispose()); }, [tex, mats]);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    ray.setFromCamera(state.pointer, state.camera);
    const hit = ray.ray.intersectPlane(plane, cursor);
    stepSmoke(puffs, sprites.current, mats, slots, hit, state.clock.elapsedTime, dt, power.current ?? 0);
  });
  return (
    <>
      {puffs.map((f, i) => (
        <sprite key={i} ref={el => { sprites.current[i] = el; }} material={mats[i]} position={f.pos} scale={[f.size * 1.6, f.size, 1]} renderOrder={12} />
      ))}
    </>
  );
}

function stepSmoke(puffs: Puff[], sprites: (THREE.Sprite | null)[], mats: THREE.SpriteMaterial[], slots: readonly Slot[], cursor: THREE.Vector3 | null, t: number, dt: number, p: number) {
  const tmp = new THREE.Vector3();
  puffs.forEach((f, i) => {
    // Cursor pushes the smoke away; a soft spring brings it back home.
    if (cursor) {
      tmp.set(f.pos.x - cursor.x, 0, f.pos.z - cursor.z);
      const d = tmp.length();
      if (d < 2.4) f.vel.addScaledVector(tmp.normalize(), (2.4 - d) * 3.2 * dt);
    }
    f.vel.addScaledVector(tmp.copy(f.home).sub(f.pos), 0.6 * dt);
    f.vel.multiplyScalar(1 - 1.6 * dt);
    f.pos.addScaledVector(f.vel, dt);
    f.pos.x += Math.sin(t * 0.07 + f.phase) * 0.004;
    const s = sprites[i];
    if (s) s.position.copy(f.pos);
    // Brighter where it crosses a beam (the light catches the smoke).
    let lit = 0;
    for (const sl of slots) {
      const r = Math.hypot(f.pos.x - sl.x, f.pos.z - sl.z);
      lit = Math.max(lit, Math.max(0, 1 - r / (sl.radius * 1.25)) * sl.strength);
    }
    const m = mats[i];
    m.rotation += f.spin * dt;
    m.opacity = f.alpha * (0.15 + 0.85 * p) * (0.3 + 1.6 * lit);
    m.color.setScalar(0.4 + 0.7 * lit * p);
  });
}

/* ── Golden ring on the floor ─────────────────────────────────────── */

export function GlowRing({ radius, centerZ, power }: { radius: number; centerZ: number; power: RefObject<number> }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f2a541', transparent: true, opacity: 0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => { setRing(mat, power.current ?? 0); });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, centerZ]} material={mat} renderOrder={5}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 220]} />
    </mesh>
  );
}
function setRing(m: THREE.MeshBasicMaterial, p: number) { m.opacity = 0.9 * p; }
