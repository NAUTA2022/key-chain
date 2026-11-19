import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import * as THREE from 'three';
import { HERO_ITEMS, heroModelUrl } from './heroItems';
import { Beams, Dust, GlowRing, SlotSpots, Smoke, STUDIO_BG, type Slot } from './Atmosphere';

/*
 * Hero: a 3D carousel of real-world assets (the client's models: collector car,
 * Dubai tower, villa, watch, wind turbine, minerals) on a black photo studio.
 * The active one stands in the light and in focus at the front; the others wait
 * around it, darker and more blurred the further back they are.
 */

/* ── assets: the client's Tripo models, two levels of detail ─────── */

/*
 * Each asset has:
 * - the ORIGINAL mesh (public/models/hq/, every one of the ~2M triangles and the
 *   original textures), used whenever it stands in front, in focus and in the light;
 * - a LIGHT version (public/models/bg/, ~60k triangles) used while it waits in the
 *   background, blurred and darkened by depth: the difference is not visible there,
 *   and the first load gets much lighter.
 * Both are packed with meshopt (16-bit positions, 12-bit normals: sub-pixel error,
 * no simplification); the raw exports live in models-src/ (~60 MB each, git-ignored, not deployed).
 * The original loads the first time the asset comes to the front. On desktop it stays;
 * on phones and low-memory devices it is released once the asset goes to the back.
 */
type AssetSpec = { name: string; length: number; fit: 'footprint' | 'height'; scale: number };

const ASSETS: Record<string, AssetSpec> = {
  car: { name: 'car', length: 4.6, fit: 'footprint', scale: 0.8 },
  tower: { name: 'building', length: 2.9, fit: 'height', scale: 0.85 },
  watch: { name: 'watch', length: 2.5, fit: 'height', scale: 0.95 },
  turbine: { name: 'turbine', length: 3.4, fit: 'height', scale: 0.85 },
  gold: { name: 'minerals', length: 2.9, fit: 'footprint', scale: 1 },
  villa: { name: 'house', length: 3.4, fit: 'footprint', scale: 0.85 },
};
const originalUrl = heroModelUrl;
const lightUrl = (name: string) => `/models/bg/brikme-${name}.glb`;
function withMeshopt(loader: GLTFLoader) { loader.setMeshoptDecoder(MeshoptDecoder); }

/** Frees the GPU buffers and textures of a model that left the stage. */
function disposeModel(root: THREE.Object3D) {
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
}

/** Phones, tablets and low-memory machines: lighter render and at most one original in memory. */
type Tier = 'low' | 'high';
function deviceTier(): Tier {
  if (typeof window === 'undefined') return 'high';
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse || memory <= 4 || window.innerWidth < 900 ? 'low' : 'high';
}

/*
 * The desktop depth of field renders into half-float buffers (largest value ~65 504). Under
 * the 420 cd spotlights, a pin-point highlight on a very glossy surface (gold, silver, gems)
 * can exceed that at some angles and turn into Inf, which tone mapping shows as coloured
 * static. Cap each fragment far below the limit (tone mapping is already white long before).
 */
const HDR_CAP = '64.0';
function capHighlights(mat: THREE.Material) {
  const data = mat.userData as { hdrCap?: boolean };
  if (data.hdrCap) return;
  data.hdrCap = true;
  mat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
	gl_FragColor.rgb = any( isnan( gl_FragColor.rgb ) ) ? vec3( 0.0 ) : min( gl_FragColor.rgb, vec3( ${HDR_CAP} ) );`);
  };
  mat.customProgramCacheKey = () => 'hdr-cap';
  mat.needsUpdate = true;
}

/** Places a loaded model on the floor and scales it. Only the transform changes. */
function normalizeModel(src: THREE.Object3D, length: number, fit: 'footprint' | 'height' = 'footprint'): THREE.Object3D {
  const obj = src.clone(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  obj.scale.setScalar(length / (fit === 'height' ? size.y : Math.max(size.x, size.z)));
  box.setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box.min.y, -c.z);
  obj.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true; mesh.receiveShadow = true;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) capHighlights(m);
  });
  return obj;
}

type LoadedProps = {
  url: string; spec: AssetSpec; onReady?: () => void; onProgress?: (fraction: number) => void;
  /** Free its GPU memory when it leaves the stage (the loader cache was cleared by the stage). */
  release?: boolean;
};

function LoadedModel({ url, spec, onReady, onProgress, release = false }: LoadedProps) {
  const gltf = useLoader(GLTFLoader, url, withMeshopt, e => { if (e.total > 0) onProgress?.(e.loaded / e.total); });
  const model = useMemo(() => normalizeModel(gltf.scene, spec.length, spec.fit), [gltf, spec]);
  useEffect(() => { onReady?.(); }, [onReady]);
  useEffect(() => (release ? () => { disposeModel(gltf.scene); } : undefined), [release, gltf]);
  return <primitive object={model} />;
}

type AssetProps = { spec: AssetSpec; original: boolean; release: boolean; onReady?: () => void; onProgress?: (fraction: number) => void };

/** Light version while in the background; the original (when requested) replaces it once loaded. */
function Asset({ spec, original, release, onReady, onProgress }: AssetProps) {
  const light = <LoadedModel url={lightUrl(spec.name)} spec={spec} />;
  if (!original) return <Suspense fallback={null}>{light}</Suspense>;
  return (
    <Suspense fallback={<Suspense fallback={null}>{light}</Suspense>}>
      <LoadedModel url={originalUrl(spec.name)} spec={spec} onReady={onReady} onProgress={onProgress} release={release} />
    </Suspense>
  );
}

/* ── carousel ─────────────────────────────────────────────────────── */


const N = HERO_ITEMS.length;
const STEP = (Math.PI * 2) / N;
const RADIUS = 5.4;

type Control = { target: number; angle: number; dragging: boolean; dragFrom: number; startX: number };

// Light slot: where the carousel parks the front asset.
const SLOT_TOP = 11;
// Only the asset in front is in the light; the others wait in the shadows.
const SLOTS: readonly Slot[] = [{ x: 0, z: 0, radius: 2.7, strength: 1 }];

type Lights = {
  ambient: THREE.AmbientLight | null;
  rimA: THREE.DirectionalLight | null; rimB: THREE.DirectionalLight | null; fill: THREE.DirectionalLight | null;
};
const LIGHT_BASE = { ambient: 0.35, spot: 420, rimA: 1.6, rimB: 1.2, fill: 0.55, env: 0.4 };

/** Studio light turning on: a few flickers, then a smooth rise to full power. */
function lightPower(sinceOn: number): number {
  if (sinceOn < 0) return 0.02;
  if (sinceOn < 0.08) return 0.9;
  if (sinceOn < 0.2) return 0.05;
  if (sinceOn < 0.28) return 0.7;
  if (sinceOn < 0.5) return 0.1;
  if (sinceOn < 1.3) return 0.3 + ((sinceOn - 0.5) / 0.8) * 0.7;
  return 1;
}
function applyLights(l: Lights, scene: THREE.Scene, p: number) {
  if (l.ambient) l.ambient.intensity = LIGHT_BASE.ambient * p + 0.015;
  if (l.rimA) l.rimA.intensity = LIGHT_BASE.rimA * Math.max(p, 0.04);
  if (l.rimB) l.rimB.intensity = LIGHT_BASE.rimB * Math.max(p, 0.04);
  if (l.fill) l.fill.intensity = LIGHT_BASE.fill * p;
  scene.environmentIntensity = LIGHT_BASE.env * p;
}

/*
 * Staged entrance: the front asset alone, then the two beside it, then the three
 * at the back, each fading in from the dark. Only then may the carousel turn.
 */
type Intro = { level: number; shownAt: number[]; done: boolean };
const REVEAL_GAP = 1.5; // seconds between tiers, once the previous tier is on stage
const REVEAL_FADE = 1.6; // seconds an asset takes to come out of the dark

/** 0 = front, 1 = beside it, 2 = at the back. */
function revealTier(i: number, start: number): number {
  const d = Math.min((i - start + N) % N, (start - i + N) % N);
  return Math.min(d, 2);
}
/** Advances the entrance when the current tier is loaded and has been shown long enough. */
function nextReveal(intro: Intro, tiers: readonly number[], t: number, litAt: number): 'level' | 'done' | null {
  if (intro.done || litAt < 0) return null;
  const shown = tiers.flatMap((tier, i) => (tier <= intro.level ? [intro.shownAt[i]] : []));
  if (shown.some(v => v < 0)) return null; // still loading
  if (t - Math.max(litAt, ...shown) < REVEAL_GAP) return null;
  if (intro.level >= 2) { intro.done = true; return 'done'; }
  intro.level += 1;
  return 'level';
}
/** 0 → 1 fade (smoothstep) since the asset first showed up. */
function appearance(shownAt: number, t: number): number {
  if (shownAt < 0) return 0;
  const x = Math.min(1, (t - shownAt) / REVEAL_FADE);
  return x * x * (3 - 2 * x);
}

/*
 * Adaptive quality: if frames stay slow (under ~45 fps for 2 s) once the stage is
 * running, first the pixel ratio drops to 1, then the depth of field turns off.
 */
type Perf = { time: number; frames: number; level: number };
const SLOW_FRAME = 1 / 45;
/** Returns the new quality level (1, 2) when the steady frame time is too slow. */
function trackFrame(p: Perf, dt: number): number | null {
  if (dt > 0.25 || p.level >= 2) return null; // hitches (a model being parsed, a tab switch) don't count
  p.time += dt; p.frames += 1;
  if (p.time < 2) return null;
  const slow = p.time / p.frames > SLOW_FRAME;
  p.time = 0; p.frames = 0;
  if (!slow) return null;
  p.level += 1;
  return p.level;
}
/** Shadows render once per frame (the depth-of-field passes render the scene three times). */
function queueShadows(gl: THREE.WebGLRenderer) { gl.shadowMap.needsUpdate = true; }

type StageProps = {
  control: RefObject<Control>; lightsOn: boolean; start: number; onRevealed: () => void;
  /** false: an original goes back to the light version when it leaves the front (memory cap). */
  keepOriginals: boolean;
  /** Depth of field allowed (wide screens, until the GPU proves too slow). */
  depthOfField: boolean;
  shadowSize: number;
  onSlow: (level: number) => void;
  onCarReady?: () => void; onCarProgress?: (fraction: number) => void;
};

function Stage({ control, lightsOn, start, onRevealed, keepOriginals, depthOfField, shadowSize, onSlow, onCarReady, onCarProgress }: StageProps) {
  const items = useRef<(THREE.Group | null)[]>([]);
  const spins = useRef<(THREE.Group | null)[]>([]);
  const lights = useRef<Lights>({ ambient: null, rimA: null, rimB: null, fill: null });
  const switchedAt = useRef(-1);
  // Stage light power (0 dark → 1 on), read by the atmosphere (beams, smoke, ring).
  const power = useRef(0);
  // Assets that already switched to their original model (the car starts with it).
  const [original, setOriginal] = useState<boolean[]>(() => HERO_ITEMS.map(it => it.key === 'car'));
  const requested = useRef<boolean[]>(HERO_ITEMS.map(it => it.key === 'car'));
  // Layers for the depth of field: ground (floor + ring), volumetric effects and the asset in front.
  const layers = useRef<StageLayers>({ ground: null, fx: null, items: [], front: 0, saved: [] });
  const tiers = useMemo(() => HERO_ITEMS.map((_, i) => revealTier(i, start)), [start]);
  const [level, setLevel] = useState(0);
  const intro = useRef<Intro>({ level: 0, shownAt: HERO_ITEMS.map(() => -1), done: false });
  const perf = useRef<Perf>({ time: 0, frames: 0, level: 0 });
  const { size } = useThree();

  useFrame((state, rawDt) => {
    const c = control.current;
    const dt = Math.min(rawDt, 1 / 30);
    queueShadows(state.gl);
    frameCamera(state.camera, size.width / Math.max(1, size.height));
    if (!showcaseSpin(c, dt, intro.current.done)) easeAngle(c, dt);
    const t = state.clock.elapsedTime;
    setFrontItem(layers.current, items.current, c.angle);
    if (lightsOn && switchedAt.current < 0) switchedAt.current = t;
    items.current.forEach((g, i) => {
      if (!g) return;
      const a = i * STEP - c.angle;
      const front = (Math.cos(a) + 1) / 2; // 1 at the front, 0 at the back
      g.position.set(Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS - RADIUS);
      const s = ASSETS[HERO_ITEMS[i].key].scale * (0.72 + front * 0.28);
      g.scale.setScalar(s);
      g.visible = front > 0.08;
      // Coming to the front: swap in the original model (once, then it stays).
      if (front > 0.85 && !requested.current[i]) {
        requested.current[i] = true;
        setOriginal(o => o.map((v, j) => v || j === i));
      }
      // Memory cap: once it leaves the front, the original gives way to the light version again.
      if (!keepOriginals && front < 0.8 && requested.current[i]) {
        requested.current[i] = false;
        useLoader.clear(GLTFLoader, originalUrl(ASSETS[HERO_ITEMS[i].key].name));
        setOriginal(o => o.map((v, j) => v && j !== i));
      }
      // No full turns: each asset faces the camera and rocks gently (~±20°) in slow motion.
      const sp = spins.current[i];
      if (sp) {
        if (intro.current.shownAt[i] < 0 && sp.children.length > 0) intro.current.shownAt[i] = t;
        sp.rotation.y = THREE.MathUtils.damp(sp.rotation.y, restAngle(HERO_ITEMS[i].key, t, i), 1.5, dt);
        // Depth shading: second plane dark, third plane almost black; new assets fade in from the dark.
        shadeModel(sp, (0.03 + 0.97 * front ** 6) * appearance(intro.current.shownAt[i], t));
      }
    });
    const step = nextReveal(intro.current, tiers, t, switchedAt.current);
    if (step === 'level') setLevel(intro.current.level);
    if (step === 'done') onRevealed();
    const slower = intro.current.done ? trackFrame(perf.current, rawDt) : null;
    if (slower !== null) onSlow(slower);
    const p = lightPower(lightsOn ? t - switchedAt.current : -1);
    power.current = p;
    applyLights(lights.current, state.scene, p);
  });

  return (
    <>
      <color attach="background" args={[STUDIO_BG]} />
      <fog attach="fog" args={[STUDIO_BG, 9, 30]} />
      <ambientLight ref={el => { lights.current.ambient = el; }} intensity={0.015} />
      {/* One real spotlight per slot: it lights the asset under it and pools on the floor. */}
      <SlotSpots slots={SLOTS} top={SLOT_TOP} power={power} base={LIGHT_BASE.spot} shadowSize={shadowSize} />
      <directionalLight ref={el => { lights.current.rimA = el; }} position={[-7, 4, -6]} intensity={0.06} color="#dfe6ff" />
      <directionalLight ref={el => { lights.current.rimB = el; }} position={[7, 3, -5]} intensity={0.05} color="#ffe6cc" />
      <directionalLight ref={el => { lights.current.fill = el; }} position={[0, 6, 8]} intensity={0} />
      <group ref={el => { layers.current.ground = el; }}>
        <Cyclorama />
        <GlowRing radius={RADIUS + 0.45} centerZ={-RADIUS} power={power} />
      </group>
      {HERO_ITEMS.map((it, i) => (
        <group key={it.key} ref={el => { items.current[i] = el; }}>
          <group ref={el => { spins.current[i] = el; }}>
            {level >= tiers[i] && (
              <Asset spec={ASSETS[it.key]} original={original[i]} release={!keepOriginals}
                {...(it.key === 'car' ? { onReady: onCarReady, onProgress: onCarProgress } : {})} />
            )}
          </group>
        </group>
      ))}
      {/* Light and haze over the front asset: drawn sharp, with it, on top of the blurred background. */}
      <group ref={el => { layers.current.fx = el; }}>
        <Beams slots={SLOTS} top={SLOT_TOP} power={power} />
        <Dust slots={SLOTS} top={SLOT_TOP} power={power} />
        <Smoke slots={SLOTS} power={power} />
      </group>
      {depthOfField && size.width >= 900 && <DepthOfField layers={layers} />}
    </>
  );
}

/**
 * Photo-studio cyclorama: one continuous dark surface that bends from the floor
 * up into the back wall, so there is no horizon line and no edges.
 */
function Cyclorama() {
  const geo = useMemo(() => cycloramaGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow>
      {/* One continuous dark lacquer surface (floor → curve → wall): only the spotlight pool and
          its soft sheen show on it, and the fog melts it into the background with no edges. */}
      <meshStandardMaterial color="#0c0c0e" roughness={0.32} metalness={0.15} envMapIntensity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Profile in (z, y) swept along x: floor → quarter-circle cove → wall. */
function cycloramaGeometry(): THREE.BufferGeometry {
  const W = 90, FRONT = 30, COVE_Z = -13, R = 6, TOP = 30, ARC = 24;
  const profile: [number, number][] = [[FRONT, 0], [COVE_Z, 0]];
  for (let k = 1; k <= ARC; k++) {
    const a = (k / ARC) * (Math.PI / 2);
    profile.push([COVE_Z - R * Math.sin(a), R - R * Math.cos(a)]);
  }
  profile.push([COVE_Z - R, TOP]);
  const pos: number[] = [];
  const idx: number[] = [];
  profile.forEach(([z, y]) => { pos.push(-W / 2, y, z, W / 2, y, z); });
  for (let i = 0; i < profile.length - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Scales each material's own colour (and reflections) by k; the base values are kept on the material. */
function shadeModel(root: THREE.Object3D, k: number) {
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat.color) continue;
      const data = mat.userData as { baseColor?: THREE.Color; baseEnv?: number };
      data.baseColor ??= mat.color.clone();
      data.baseEnv ??= mat.envMapIntensity;
      mat.color.copy(data.baseColor).multiplyScalar(k);
      mat.envMapIntensity = data.baseEnv * k;
    }
  });
}

/* ── depth of field ───────────────────────────────────────────────── */

/*
 * The asset in front must stay 100% sharp, so it never goes through the blur:
 * 1. the background (floor, ring and the other assets) renders without it (its
 *    material writes no colour but still casts its shadow on the floor);
 * 2. the bokeh blurs that background by depth;
 * 3. the front asset and the volumetric light/haze render sharp on top.
 */
type StageLayers = {
  ground: THREE.Group | null; fx: THREE.Group | null; items: (THREE.Group | null)[];
  /** Index of the asset at the front. */
  front: number;
  /** Item visibility saved while only the front asset is drawn. */
  saved: boolean[];
};

function setFrontItem(l: StageLayers, items: (THREE.Group | null)[], angle: number) {
  l.items = items;
  l.front = ((Math.round(angle / STEP) % N) + N) % N;
}
function frontItem(l: StageLayers): THREE.Group | null { return l.items[l.front] ?? null; }
/** colorWrite off hides a model from the image but keeps it in the shadow map. */
function setColorWrite(root: THREE.Object3D, on: boolean) {
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) { m.colorWrite = on; m.depthWrite = on; }
  });
}
function beginBackground(l: StageLayers) {
  if (l.fx) l.fx.visible = false;
  const f = frontItem(l);
  if (f) setColorWrite(f, false);
}
function beginOverlay(l: StageLayers) {
  if (l.ground) l.ground.visible = false;
  l.saved = l.items.map(g => g?.visible ?? false);
  l.items.forEach((g, i) => { if (g && i !== l.front) g.visible = false; });
  const f = frontItem(l);
  if (f) setColorWrite(f, true);
  if (l.fx) l.fx.visible = true;
}
function endOverlay(l: StageLayers) {
  if (l.ground) l.ground.visible = true;
  l.items.forEach((g, i) => { if (g) g.visible = l.saved[i] ?? true; });
}

// Depth (world units) around the focus that stays sharp: the floor right around the front asset.
const FOCUS_RANGE = 1.2;
const FOCUS_POINT = new THREE.Vector3(0, 1.1, 0);

/** Bokeh over the background only; its depth map leaves out the front asset. */
class StageBokehPass extends BokehPass {
  private readonly layers: RefObject<StageLayers>;
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, layers: RefObject<StageLayers>) {
    super(scene, camera, { focus: 10.5, aperture: 0.004, maxblur: 0.012 });
    this.layers = layers;
    // Sharp band around the focus instead of a single focal plane.
    this.materialBokeh.fragmentShader = this.materialBokeh.fragmentShader.replace(
      'float factor = ( focus + viewZ );',
      `float factor = ( focus + viewZ ); factor = sign( factor ) * max( abs( factor ) - ${FOCUS_RANGE.toFixed(2)}, 0.0 );`,
    );
    this.materialBokeh.needsUpdate = true;
  }
  override render(...args: Parameters<Pass['render']>) {
    const f = frontItem(this.layers.current);
    const was = f?.visible ?? false;
    if (f) f.visible = false;
    super.render(...args);
    if (f) f.visible = was;
  }
}

/** Draws the front asset and the light/haze, sharp, over the blurred background. */
class FrontOverlayPass extends Pass {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly layers: RefObject<StageLayers>;
  constructor(scene: THREE.Scene, camera: THREE.Camera, layers: RefObject<StageLayers>) {
    super();
    this.scene = scene; this.camera = camera; this.layers = layers;
    this.needsSwap = false;
  }
  override render(...args: Parameters<Pass['render']>) {
    const [renderer, , readBuffer] = args;
    const l = this.layers.current;
    const background = this.scene.background;
    const autoClear = renderer.autoClear;
    beginOverlay(l);
    // No background clear: draw on top of the blurred image, with a fresh depth buffer.
    this.scene.background = null;
    renderer.autoClear = false;
    renderer.setRenderTarget(readBuffer);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = autoClear;
    this.scene.background = background;
    endOverlay(l);
  }
}

type Post = { composer: EffectComposer; bokeh: StageBokehPass };

function makePost(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, layers: RefObject<StageLayers>): Post {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(gl, target);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new StageBokehPass(scene, camera, layers);
  composer.addPass(bokeh);
  composer.addPass(new FrontOverlayPass(scene, camera, layers));
  composer.addPass(new OutputPass());
  return { composer, bokeh };
}
function resizePost(post: Post, gl: THREE.WebGLRenderer, width: number, height: number) {
  post.composer.setPixelRatio(gl.getPixelRatio());
  post.composer.setSize(width, height);
}
function disposePost(post: Post) { post.bokeh.dispose(); post.composer.dispose(); }
/** Focus on the front slot (view depth, as the bokeh shader measures it) and render. */
function renderPost(post: Post, camera: THREE.Camera, layers: StageLayers) {
  const p = FOCUS_POINT.clone().applyMatrix4(camera.matrixWorldInverse);
  post.bokeh.materialBokeh.uniforms.focus.value = -p.z;
  beginBackground(layers);
  post.composer.render();
}

/** Desktop only: the front asset stays sharp, the ones behind blur with distance. */
function DepthOfField({ layers }: { layers: RefObject<StageLayers> }) {
  const { gl, scene, camera, size } = useThree();
  const post = useMemo(() => makePost(gl, scene, camera as THREE.PerspectiveCamera, layers), [gl, scene, camera, layers]);
  useEffect(() => { resizePost(post, gl, size.width, size.height); }, [post, gl, size.width, size.height]);
  useEffect(() => () => { disposePost(post); }, [post]);
  // Priority 1: R3F hands the frame to the composer.
  useFrame(state => { renderPost(post, state.camera, layers.current); }, 1);
  return null;
}

type HeroCarouselProps = {
  index: number; onIndex: (i: number) => void; onDragState?: (dragging: boolean) => void; className?: string;
  /** Stage lights: off (dark studio) until the intro switches them on. */
  lightsOn?: boolean;
  /** Fired once the collector car model has loaded. */
  onCarReady?: () => void;
  /** Download progress of the car model (0…1). */
  onCarProgress?: (fraction: number) => void;
  /** Fired once every asset is on stage: from then on the carousel may turn. */
  onRevealed?: () => void;
};

/** `index` is unbounded (keeps growing) so the carousel always turns the short way. */
export default function HeroCarousel({ index, onIndex, onDragState, className, lightsOn = true, onCarReady, onCarProgress, onRevealed }: HeroCarouselProps) {
  const control = useRef<Control>({ target: index * STEP, angle: index * STEP, dragging: false, dragFrom: 0, startX: 0 });
  const [start] = useState(index);
  // Dragging stays off until every asset is on stage.
  const ready = useRef(false);
  const revealed = useRef(onRevealed);
  useEffect(() => { revealed.current = onRevealed; }, [onRevealed]);
  const markRevealed = useMemo(() => () => { ready.current = true; revealed.current?.(); }, []);
  useEffect(() => { setTarget(control.current, index * STEP); }, [index]);
  // Showcase spin (capture only): keep the name and dots in step with the asset in front.
  const indexCb = useRef(onIndex);
  useEffect(() => { indexCb.current = onIndex; }, [onIndex]);
  useEffect(() => {
    if (!showcase()?.turn) return undefined;
    let raf = 0;
    let last = NaN;
    const tick = () => {
      const i = Math.round(control.current.angle / STEP);
      if (i !== last) { last = i; indexCb.current(i); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); };
  }, []);
  const [tier] = useState(deviceTier);
  // 0 full quality · 1 pixel ratio 1 · 2 also without depth of field (see trackFrame).
  const [quality, setQuality] = useState(0);
  const onSlow = useMemo(() => (level: number) => { setQuality(q => Math.max(q, level)); }, []);
  const dpr: [number, number] = quality >= 1 ? [1, 1] : tier === 'low' ? [1, 1.5] : [1, 2];
  // Nothing renders while the hero is scrolled out of view.
  const box = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([en]) => { setOnScreen(en.isIntersecting); });
    io.observe(el);
    return () => { io.disconnect(); };
  }, []);
  return (
    <div ref={box} className={className} style={{ touchAction: 'pan-y', cursor: 'grab' }}
      onPointerDown={e => { if (!ready.current) return; beginDrag(control.current, e.clientX); e.currentTarget.setPointerCapture(e.pointerId); onDragState?.(true); }}
      onPointerMove={e => { moveDrag(control.current, e.clientX, e.currentTarget.clientWidth); }}
      onPointerUp={e => { const i = endDrag(control.current); onDragState?.(false); onIndex(i); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => { endDrag(control.current); onDragState?.(false); }}>
      <Canvas shadows dpr={dpr} frameloop={onScreen ? 'always' : 'never'} camera={{ position: [0, 2.3, 10], fov: 34, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl, scene }) => setupRenderer(gl, scene)}>
        <Stage control={control} lightsOn={lightsOn} start={start} onRevealed={markRevealed}
          keepOriginals={tier === 'high'} depthOfField={quality < 2} shadowSize={tier === 'low' ? 1024 : 2048} onSlow={onSlow}
          onCarReady={onCarReady} onCarProgress={onCarProgress} />
      </Canvas>
    </div>
  );
}

function setTarget(c: Control, t: number) { c.target = t; }
const DEG = Math.PI / 180;
/** Slow rocking per asset (no full turns). The watch swings between 15° and 45°. */
function restAngle(key: string, t: number, i: number): number {
  if (key === 'watch') return (30 + Math.sin(t * 0.21) * 15) * DEG;
  return Math.sin(t * 0.21 + i * 0.9) * 20 * DEG;
}
/** Narrow screens pull the camera back so the side items stay in frame. */
const CAM_POS = new THREE.Vector3();
const PORTRAIT_EYE = 2.0;
const PORTRAIT_AIM = 1.3;
function frameCamera(camera: THREE.Camera, aspect: number) {
  // Landscape: aim above the stage so the assets sit in the lower half, under the headline.
  // Portrait (phones): aim at the assets themselves so they fill the empty middle band,
  // between the headline and the name/controls at the bottom.
  const portrait = aspect < 0.9;
  const dist = portrait ? 16 : aspect < 1.4 ? 12.5 : 10.5;
  camera.position.lerp(CAM_POS.set(0, portrait ? PORTRAIT_EYE : 2.6, dist), 0.08);
  camera.lookAt(0, portrait ? PORTRAIT_AIM : 2.35, -0.6);
}
function easeAngle(c: Control, dt: number) {
  if (!c.dragging) c.angle = THREE.MathUtils.damp(c.angle, c.target, 3.2, dt);
}
/*
 * Showcase (capture only): a recording script can set, before the page loads,
 *   window.__brikmeShowcase = { turn: 9 }
 * and once the staged entrance is over the carousel spins smoothly at a constant
 * speed (seconds per full turn) instead of stepping. Nothing changes without it.
 */
type Showcase = { turn?: number };
function showcase(): Showcase | undefined {
  return typeof window === 'undefined' ? undefined : (window as Window & { __brikmeShowcase?: Showcase }).__brikmeShowcase;
}
function showcaseSpin(c: Control, dt: number, ready: boolean): boolean {
  const turn = ready ? showcase()?.turn : undefined;
  if (!turn || c.dragging) return false;
  c.angle += (dt * Math.PI * 2) / turn;
  c.target = c.angle;
  return true;
}
function setupRenderer(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.shadowMap.autoUpdate = false; // queueShadows() asks for one update per frame
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  // Soft studio reflections so metallic paint and chrome read as in the original scan.
  const pmrem = new THREE.PMREMGenerator(gl);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0;
  pmrem.dispose();
}
function beginDrag(c: Control, x: number) { c.dragging = true; c.startX = x; c.dragFrom = c.angle; }
function moveDrag(c: Control, x: number, width: number) {
  if (!c.dragging) return;
  c.angle = c.dragFrom - ((x - c.startX) / Math.max(1, width)) * STEP * 2.4;
}
/** Snaps to the nearest item and returns its (unbounded) index. */
function endDrag(c: Control): number {
  c.dragging = false;
  const i = Math.round(c.angle / STEP);
  c.target = i * STEP;
  return i;
}
