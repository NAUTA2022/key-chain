import { useState, useRef, useMemo, useCallback, useEffect, Suspense } from 'react';
import { MeshStandardMaterial, DoubleSide, SRGBColorSpace } from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Stars, Html, Line, Environment, Lightformer, Sparkles, Trail, Float, useGLTF, Detailed, useTexture } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { playNodeHover, playNodeSelect, playZoomIn, playZoomOut } from '../lib/sound';
import { GOLD, AMBER, WHITE, BLUE, GREEN, BG, ICON_MAP, INITIAL_DATA, COMPANY_META, cardColor } from '../lib/ecosystemData';
import { buildGraph } from '../lib/ecosystemGraph';
import { CoreCard, CountryCard, CategoryCard, CompanyCard, ProjectCard, CompanyGalleryOverlay } from '../components/EcosystemCards';

// World units are the same weighted-sunburst graph (buildGraph) used by the 2D
// view, just dropped onto the XZ ground plane instead of screen XY — so the
// hierarchical, never-colliding layout is identical in both views.
const SCALE = 40;
const toWorld = (x, y) => [x / SCALE, 0, y / SCALE];

// Liquid-glass shell shared by every node shape: low metalness + high
// transmission/clearcoat reads as frosted glass rather than plastic, while
// emissive keeps an inner "energy" glow visible even without reflections.
// It's also the expensive part of the material (transmission needs an extra
// render pass), which is exactly what proximity LOD (<Detailed> below) exists
// to avoid paying for on every node at once.
const glassShell = { roughness: 0.12, metalness: 0.06, transmission: 0.88, thickness: 0.55, ior: 1.42, clearcoat: 1, clearcoatRoughness: 0.1 };

// ─── CAMERA FLY-TO ──────────────────────────────────────────────────────────
// Clicking a node flies the camera to frame it close-up, sliding along the
// same viewing ray the home camera uses (so the angle never feels wrong),
// then flies back to HOME on close/click-empty.
const HOME_EYE = [0, 17, 21];
const HOME_TARGET = [0, 0, 0];
const HOME_DIR = (() => {
  const [dx, dy, dz] = [HOME_EYE[0] - HOME_TARGET[0], HOME_EYE[1] - HOME_TARGET[1], HOME_EYE[2] - HOME_TARGET[2]];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return [dx / len, dy / len, dz / len];
})();
const FOCUS_DISTANCE = { core: 6, country: 4.4, category: 3.4, company: 2.6, project: 2 };
const eyeFor = (target, dist) => [target[0] + HOME_DIR[0] * dist, target[1] + HOME_DIR[1] * dist, target[2] + HOME_DIR[2] * dist];

function ringPoints(rWorld, segments = 64) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([Math.cos(a) * rWorld, 0.01, Math.sin(a) * rWorld]);
  }
  return pts;
}
// ─── REAL PROXIMITY LOD ─────────────────────────────────────────────────────
// Every asset ships as three actual decimated meshes — LOD0 full quality,
// LOD1 and LOD2 progressively simplified via gltf-transform/meshoptimizer
// (offline, see public/models/*-lod1.glb / *-lod2.glb) — never a placeholder
// primitive. <Detailed> (THREE.LOD) swaps between them by camera distance;
// the swap is a visibility flip, so off-screen tiers cost nothing to render.
function useLodScenes(basePath) {
  const lod0 = useGLTF(`${basePath}.glb`);
  const lod1 = useGLTF(`${basePath}-lod1.glb`);
  const lod2 = useGLTF(`${basePath}-lod2.glb`);
  return useMemo(() => {
    [lod0, lod1, lod2].forEach(({ scene }) => {
      // The mesh-compression pass can leave bounding spheres degenerate,
      // which makes three.js frustum-cull the model even though it's on screen.
      scene.traverse((obj) => { if (obj.isMesh) obj.frustumCulled = false; });
    });
    return [lod0.scene, lod1.scene, lod2.scene];
  }, [lod0, lod1, lod2]);
}

// Núcleo: a single instance, so each LOD tier is used directly (no <Clone>).
function NucleoLod({ scale }) {
  const [s0, s1, s2] = useLodScenes('/models/nucleo');
  const rot = [0, Math.PI / 4, Math.PI / 12];
  return (
    <Detailed distances={[0, 8, 16]}>
      <primitive object={s0} scale={scale} rotation={rot} />
      <primitive object={s1} scale={scale} rotation={rot} />
      <primitive object={s2} scale={scale} rotation={rot} />
    </Detailed>
  );
}
useGLTF.preload('/models/nucleo.glb');
useGLTF.preload('/models/nucleo-lod1.glb');
useGLTF.preload('/models/nucleo-lod2.glb');

// Key — sits centered inside the núcleo crystal, given a brushed-metal look
// since the source asset ships with no material of its own.
// Raw bbox isn't centered on Z (it's [0, 1.28]) — shift so the model's own
// geometric center lands exactly at the group's origin.
const KEY_CENTER_Z = 0.64;
function KeyModel({ scale }) {
  const { scene } = useGLTF('/models/key.glb');
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.material = new MeshStandardMaterial({
          color: GOLD, metalness: 0.35, roughness: 0.15,
          emissive: GOLD, emissiveIntensity: 2.8, toneMapped: false,
        });
      }
    });
    return clone;
  }, [scene]);
  return <primitive object={model} scale={scale} position={[0, 0, -KEY_CENTER_Z * scale]} />;
}
useGLTF.preload('/models/key.glb');

// Empresa: a glass sphere with low diffraction (low IOR, high transmission)
// wrapping a slowly-spinning inner sphere textured with the company's own
// profile photo — replaces the GLTF model entirely.
function CompanySphere({ logo, R, glow }) {
  const diskRef = useRef();
  const texture = useTexture(logo);
  useEffect(() => {
    // Configuring a loaded THREE.Texture's runtime properties (anisotropy,
    // colorSpace) is the standard three.js pattern, not React state mutation.
    // eslint-disable-next-line react-hooks/immutability
    texture.anisotropy = 16;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);
  useFrame((_, delta) => { if (diskRef.current) diskRef.current.rotation.y += delta * 0.35; });
  return (
    <group>
      {/* Flat 2D profile photo — a disc, not a photo-mapped sphere — spinning
          slowly on its own vertical axis inside the glass shell. */}
      <mesh ref={diskRef} scale={R * 0.72}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh scale={R}>
        <sphereGeometry args={[1, 40, 40]} />
        <meshPhysicalMaterial
          transparent opacity={0.16}
          roughness={0.03} metalness={0} transmission={0.99} thickness={0.12}
          ior={1.02} clearcoat={0.4} clearcoatRoughness={0.08}
          color={BLUE} emissive={BLUE} emissiveIntensity={glow * 0.12}
        />
      </mesh>
    </group>
  );
}



// ─── EDGES ──────────────────────────────────────────────────────────────────
// Each edge is a bright core line plus a wider, dimmer "glow halo" line behind
// it (a cheap way to fake illumination without postprocessing). Hovering lights
// it up neon-white via an invisible, wider hit-target mesh laid along the edge
// (fat lines are too thin to raycast reliably on their own).
function EdgeLine({ edge }) {
  const [hovered, setHovered] = useState(false);
  const baseColor = edge.tier === 'cross' ? '#ffffff' : edge.tier === 'core' ? GOLD : edge.tier === 'country' ? AMBER : edge.tier === 'sub' ? BLUE : GREEN;
  const baseOp = edge.tier === 'cross' ? 0.18 : edge.tier === 'core' ? 0.55 : edge.tier === 'country' ? 0.4 : edge.tier === 'sub' ? 0.32 : 0.2;
  const pts = useMemo(() => [[edge.x1 / SCALE, 0, edge.y1 / SCALE], [edge.x2 / SCALE, 0, edge.y2 / SCALE]], [edge.x1, edge.y1, edge.x2, edge.y2]);
  const { mid, length, angle } = useMemo(() => {
    const x1 = edge.x1 / SCALE, z1 = edge.y1 / SCALE, x2 = edge.x2 / SCALE, z2 = edge.y2 / SCALE;
    const dx = x2 - x1, dz = z2 - z1;
    return { mid: [(x1 + x2) / 2, 0, (z1 + z2) / 2], length: Math.sqrt(dx * dx + dz * dz) || 0.001, angle: Math.atan2(dx, dz) };
  }, [edge.x1, edge.y1, edge.x2, edge.y2]);

  const color = hovered ? '#ffffff' : baseColor;
  const op = hovered ? 1 : baseOp;
  const width = hovered ? (edge.tier === 'core' ? 3 : 2.2) : (edge.tier === 'core' ? 1.4 : 1);

  return (
    <group>
      <mesh
        position={mid} rotation={[0, angle, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[0.22, 0.22, length]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {edge.tier === 'cross'
        ? <Line points={pts} color={color} transparent opacity={op} lineWidth={hovered ? width + 4 : width} dashed dashSize={0.15} gapSize={0.12} />
        : <Line points={pts} color={color} transparent opacity={op} lineWidth={hovered ? width + 4 : width} />}
    </group>
  );
}

// ─── SELECTION LIGHT ────────────────────────────────────────────────────────
// Illuminates whatever's focused, in that node's own color.
function SelectionLight({ node }) {
  const pos = node.type === 'core' ? [0, 0, 0] : toWorld(node.x, node.y);
  return <pointLight position={pos} intensity={3} color={cardColor(node.type)} distance={7} decay={2} />;
}

// ─── CORE (3D hex prism + particle halo + orbiting KYCN moon with a comet trail) ─
function Core3D({ active, onSelect }) {
  const moonRef = useRef();
  const modelRef = useRef();
  useFrame((_, delta) => {
    if (moonRef.current) moonRef.current.rotation.y += delta * 0.22;
    if (modelRef.current) modelRef.current.rotation.y += delta * 0.05;
  });
  const R = 1.8, H = 3.4, orbitR = R * 2.4;

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); playNodeHover(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Particle-dust halo, plus a few big soft "bokeh" points */}
      <Sparkles count={160} scale={[R * 3, R * 2, R * 3]} size={2.5} speed={0.3} opacity={0.7} color={GOLD} />
      <Sparkles count={18} scale={[R * 4, R * 2.6, R * 4]} size={9} speed={0.08} opacity={0.25} color={BLUE} />

      {/* Invisible hit target, roughly matching the model's footprint */}
      <mesh>
        <sphereGeometry args={[R, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Float speed={1.1} rotationIntensity={0.06} floatIntensity={0.35}>
        <group ref={modelRef} scale={active ? 1.12 : 1}>
          <Suspense fallback={null}>
            <NucleoLod scale={1.1} />
            <KeyModel scale={0.115} />
          </Suspense>
        </group>
        <Html center zIndexRange={[1, 0]} position={[0, H / 2 + 0.28, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ color: GOLD, fontWeight: 900, fontSize: 12, letterSpacing: 1, textAlign: 'center', textShadow: '0 0 8px #000' }}>KYCN</div>
        </Html>
        <Html center zIndexRange={[1, 0]} position={[0, -H / 2 - 0.4, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ color: GOLD, fontWeight: 900, fontSize: 14, letterSpacing: 3, textAlign: 'center', textShadow: '0 0 8px #000', whiteSpace: 'nowrap' }}>KEYCHAIN</div>
        </Html>
      </Float>

      {/* KYCN moon, orbiting forever with a fading comet trail */}
      <Line points={ringPoints(orbitR)} color={GOLD} transparent opacity={0.16} lineWidth={1} />
      <group ref={moonRef}>
        <Trail width={2.2} length={7} color={GOLD} attenuation={(t) => t * t} decay={1}>
          <mesh position={[orbitR, 0, 0]}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshPhysicalMaterial {...glassShell} color={GOLD} emissive={GOLD} emissiveIntensity={0.85} />
          </mesh>
        </Trail>
      </group>
    </group>
  );
}

// ─── NODES (país / categoría / empresa / proyecto) ─────────────────────────
function NodeMesh3D({ node, active, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const pos = useMemo(() => toWorld(node.x, node.y), [node.x, node.y]);
  const handleClick = useCallback((e) => { e.stopPropagation(); onSelect(node); }, [node, onSelect]);
  const handleOver = useCallback((e) => { e.stopPropagation(); setHovered(true); playNodeHover(); document.body.style.cursor = 'pointer'; }, []);
  const handleOut = useCallback(() => { setHovered(false); document.body.style.cursor = 'auto'; }, []);
  const glow = active ? 0.95 : hovered ? 0.55 : 0.26;
  const scale = active ? 1.18 : hovered ? 1.08 : 1;

  if (node.type === 'country') {
    const R = 27 / SCALE, H = 0.24;
    return (
      <group position={pos} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
          <Detailed distances={[0, 10]}>
            <mesh rotation={[0, Math.PI / 6, 0]} scale={scale}>
              <cylinderGeometry args={[R, R, H, 6]} />
              <meshPhysicalMaterial {...glassShell} color={AMBER} emissive={AMBER} emissiveIntensity={glow} />
            </mesh>
            <mesh rotation={[0, Math.PI / 6, 0]} scale={scale}>
              <cylinderGeometry args={[R, R, H, 6]} />
              <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={glow} />
            </mesh>
          </Detailed>
        </Float>
        <Html center zIndexRange={[1, 0]} position={[0, H / 2 + 0.16, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 20, filter: 'drop-shadow(0 2px 4px #000)' }}>{node.flag}</div>
        </Html>
        <Html center zIndexRange={[1, 0]} position={[0, -H / 2 - 0.26, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ color: AMBER, fontWeight: 700, fontSize: 11, textShadow: '0 0 6px #000', whiteSpace: 'nowrap' }}>{node.name}</div>
        </Html>
      </group>
    );
  }
  if (node.type === 'category') {
    const S = 22 / SCALE;
    const Icon = ICON_MAP[node.icon];
    return (
      <group position={pos} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
        <Float speed={1} rotationIntensity={0.15} floatIntensity={0.3}>
          <Detailed distances={[0, 8]}>
            <mesh scale={scale}>
              <boxGeometry args={[S * 1.7, S * 1.7, S * 1.7]} />
              <meshPhysicalMaterial {...glassShell} color={WHITE} emissive={WHITE} emissiveIntensity={glow * 0.6} />
            </mesh>
            <mesh scale={scale}>
              <boxGeometry args={[S * 1.7, S * 1.7, S * 1.7]} />
              <meshStandardMaterial color={WHITE} emissive={WHITE} emissiveIntensity={glow * 0.6} />
            </mesh>
          </Detailed>
          {Icon && <Html center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}><Icon size={13} color="#161616" /></Html>}
        </Float>
        <Html center zIndexRange={[1, 0]} position={[0, -S - 0.24, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ color: WHITE, fontWeight: 700, fontSize: 10, textShadow: '0 0 6px #000', whiteSpace: 'nowrap' }}>{node.name}</div>
        </Html>
      </group>
    );
  }
  // company — a low-diffraction glass sphere wrapping the company's own
  // profile photo, spinning slowly on its own axis. Projects no longer show
  // as graph nodes at all — they only appear as the stacked carousel inside
  // the company's info card once it's selected.
  const R = 15 / SCALE;
  const logo = COMPANY_META[node.id]?.logo;
  return (
    <group position={pos} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
      {/* Invisible hit target — guarantees clicks land even while the texture streams in */}
      <mesh>
        <sphereGeometry args={[R, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Always-on illumination so the sphere reads clearly even unselected */}
      <pointLight color={BLUE} intensity={active ? 5 : hovered ? 3.2 : 1.8} distance={4} decay={2} />
      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.35}>
        <group scale={scale * R}>
          {logo && (
            <Suspense fallback={null}>
              <CompanySphere logo={logo} R={1} glow={active ? 1 : hovered ? 0.6 : 0.3} />
            </Suspense>
          )}
        </group>
      </Float>
      <Html center zIndexRange={[1, 0]} position={[0, -R - 0.2, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ color: BLUE, fontWeight: 600, fontSize: 9.5, textShadow: '0 0 6px #000', whiteSpace: 'nowrap' }}>{node.name}</div>
      </Html>
    </group>
  );
}

// ─── INFO DOCK (reuses the same card content as the 2D view) ───────────────
function InfoDock({ node, onClose, nav, data, allNodes, onNavigate }) {
  const color = cardColor(node.type);
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onMouseDown={e => e.stopPropagation()}
      style={{ position: 'absolute', right: 16, top: 74, bottom: 16, width: 360, zIndex: 30, background: 'linear-gradient(160deg,#0e0c0a,#08080f)', border: `1px solid ${color}22`, borderRadius: 20, overflowY: 'auto', boxShadow: `0 0 0 1px ${color}08, 0 0 50px ${color}10, 0 24px 64px rgba(0,0,0,0.85)` }}
    >
      <button onClick={onClose} style={{ position: 'sticky', top: 11, marginLeft: 'calc(100% - 37px)', width: 26, height: 26, borderRadius: 7, border: `1px solid ${color}25`, background: '#0a0a0ecc', color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <FaTimes size={9} />
      </button>
      <div style={{ marginTop: -26 }}>
        {node.type === 'core' && <CoreCard />}
        {node.type === 'country' && <CountryCard node={node} data={data} nav={nav} />}
        {node.type === 'category' && <CategoryCard node={node} nav={nav} />}
        {node.type === 'company' && <CompanyCard node={node} nav={nav} data={data} allNodes={allNodes} onNavigate={onNavigate} />}
        {node.type === 'project' && <ProjectCard node={node} nav={nav} />}
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function Ecosystem3D({ nav }) {
  const [data] = useState(INITIAL_DATA);
  const graph = useMemo(() => buildGraph(data), [data]);
  const [card, setCard] = useState(null);
  const controlsRef = useRef(null);

  const flyTo = useCallback((target, type) => {
    const eye = eyeFor(target, FOCUS_DISTANCE[type] ?? 3);
    controlsRef.current?.setLookAt(eye[0], eye[1], eye[2], target[0], target[1], target[2], true);
  }, []);
  const flyHome = useCallback(() => {
    controlsRef.current?.setLookAt(HOME_EYE[0], HOME_EYE[1], HOME_EYE[2], HOME_TARGET[0], HOME_TARGET[1], HOME_TARGET[2], true);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setCard(prev => {
      if (prev?.node.id === node.id) { playZoomOut(); flyHome(); return null; }
      playNodeSelect(); playZoomIn();
      flyTo(toWorld(node.x, node.y), node.type);
      return { node };
    });
  }, [flyTo, flyHome]);
  const handleCoreClick = useCallback(() => {
    setCard(prev => {
      if (prev?.node?.id === 'keychain') { playZoomOut(); flyHome(); return null; }
      playNodeSelect(); playZoomIn();
      flyTo([0, 0, 0], 'core');
      return { node: { id: 'keychain', type: 'core', name: 'KEYCHAIN' } };
    });
  }, [flyTo, flyHome]);
  const closeCard = useCallback(() => { setCard(null); flyHome(); }, [flyHome]);
  const resetView = useCallback(() => { flyHome(); }, [flyHome]);

  const stats = useMemo(() => {
    const countries = data.countries.length;
    const categories = data.countries.reduce((a, c) => a + c.categories.length, 0);
    const companies = data.countries.reduce((a, c) => a + c.categories.reduce((b, cat) => b + cat.companies.length, 0), 0);
    const projects = data.countries.reduce((a, c) => a + c.categories.reduce((b, cat) => b + cat.companies.reduce((d, co) => d + co.projects.length, 0), 0), 0);
    return { countries, categories, companies, projects };
  }, [data]);

  // Projects never render as graph nodes/edges — they only ever appear as the
  // stacked carousel inside a company's info card (see ProjectStack).
  const visibleNodes = useMemo(() => graph.nodes.filter(n => n.type !== 'project'), [graph.nodes]);
  const visibleEdges = useMemo(() => graph.edges.filter(e => e.tier !== 'leaf'), [graph.edges]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, overflow: 'hidden', fontFamily: "'Space Grotesk','Inter',system-ui,sans-serif" }}>
      <Canvas camera={{ position: [0, 17, 21], fov: 48 }} onPointerMissed={closeCard} dpr={[1, 1.6]}>
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 20, 58]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 9, 0]} intensity={1.3} color={GOLD} distance={32} decay={2} />
        <directionalLight position={[12, 22, 8]} intensity={0.22} />
        <Stars radius={80} depth={30} count={500} factor={2} saturation={0} fade speed={0.35} />
        <Sparkles count={220} scale={[34, 6, 34]} size={1.6} speed={0.15} opacity={0.35} color={GOLD} />

        {/* Baked locally from light shapes (no HDRI fetch) — gives the glass
            shells reflections/highlights to read as glass instead of flat color. */}
        <Environment resolution={64}>
          <Lightformer intensity={3} color={GOLD} position={[0, 6, 0]} scale={[12, 12, 1]} />
          <Lightformer intensity={1.5} color={BLUE} position={[-8, 3, -4]} rotation={[0, Math.PI / 2, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={1.5} color={AMBER} position={[8, 3, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={1} color="#ffffff" position={[0, -6, 0]} rotation={[Math.PI, 0, 0]} scale={[14, 14, 1]} />
        </Environment>

        {visibleEdges.map((e, i) => <EdgeLine key={i} edge={e} />)}
        {visibleNodes.map(node => (
          <NodeMesh3D key={node.id} node={node} active={card?.node.id === node.id} onSelect={handleNodeClick} />
        ))}
        <Core3D active={card?.node?.id === 'keychain'} onSelect={handleCoreClick} />
        {card && <SelectionLight node={card.node} />}

        <CameraControls
          ref={controlsRef}
          minDistance={1.5} maxDistance={46}
          maxPolarAngle={Math.PI / 2.1}
          smoothTime={0.6}
        />
      </Canvas>

      {/* Title pill */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: '#0a0a0ecc', border: `1px solid ${GOLD}18`, borderRadius: 20, padding: '5px 16px', backdropFilter: 'blur(12px)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span style={{ color: GOLD, fontSize: 8, letterSpacing: 3, fontWeight: 800, textTransform: 'uppercase', opacity: 0.55 }}>Factoract</span>
        <span style={{ color: '#333', fontSize: 10 }}>·</span>
        <span style={{ color: '#666', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase' }}>Red Neuronal 3D del Ecosistema</span>
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', flexDirection: 'column', gap: 5, background: '#0a0a0ecc', border: '1px solid #ffffff0a', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(12px)', pointerEvents: 'none' }}>
        {[[GOLD, '⬡', 'Núcleo'], [AMBER, '⬡', 'País'], [WHITE, '◼', 'Categoría'], [BLUE, '●', 'Empresa']].map(([c, s, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, color: c, opacity: 0.8 }}>{s}</span>
            <span style={{ color: '#888', fontSize: 8.5, letterSpacing: 0.3 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Stats card */}
      <div style={{ position: 'absolute', top: 74, left: 16, display: 'flex', flexDirection: 'column', gap: 4, background: '#0a0a0ecc', border: `1px solid ${GOLD}18`, borderRadius: 14, padding: '12px 16px', backdropFilter: 'blur(12px)', pointerEvents: 'none' }}>
        <span style={{ color: '#eee', fontSize: 12, fontWeight: 800 }}>Ecosistema KEYCHAIN</span>
        <span style={{ color: '#666', fontSize: 9 }}>{stats.countries} países · {stats.categories} categorías · {stats.companies} empresas · {stats.projects} proyectos</span>
      </div>

      {/* Reset camera */}
      <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); resetView(); }} title="Centrar cámara" style={{ position: 'absolute', top: 14, right: 16, width: 34, height: 34, borderRadius: 9, border: `1px solid ${GOLD}28`, background: `${GOLD}08`, color: GOLD, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌂</button>

      {/* Orbit/zoom hint */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%) translateY(38px)', color: '#555', fontSize: 9, letterSpacing: 0.5, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        Arrastrá para orbitar · Scroll para zoom · Click en un nodo para explorar
      </div>

      <AnimatePresence>
        {card && card.node.type === 'company' && (
          <CompanyGalleryOverlay key={card.node.id} node={card.node} onClose={closeCard} onNavigate={handleNodeClick} allNodes={graph.nodes} nav={nav} />
        )}
        {card && card.node.type !== 'company' && (
          <InfoDock key={card.node.id} node={card.node} onClose={closeCard} nav={nav} data={data} allNodes={graph.nodes} onNavigate={handleNodeClick} />
        )}
      </AnimatePresence>
    </div>
  );
}
