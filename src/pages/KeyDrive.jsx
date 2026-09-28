import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useActiveAccount, useDisconnect } from 'thirdweb/react';
import KeyPayLogin from './KeyPayLogin';
import { CartCheckout, KP_VARS } from './KeyPay';
import { addPendingPayment, getPendingPayments } from '../lib/keypayInbox';
import { useMobile } from '../hooks/useMobile';

const DESKTOP_BP = 900;
const PANEL_WIDTH = 420;

// ─── Design tokens — Uber's own black/white/green language, not the
// platform's design system (same reasoning as Bookey being self-themed) ────
const BLACK = '#000000';
const WHITE = '#ffffff';
const GREEN = '#06C167';
// A plausible city-driving pace used only for the HUD's displayed speed/ETA
// — deliberately NOT derived from the on-screen animation's wall-clock rate,
// since that animation is time-compressed for demo watchability (a 32km
// trip plays out in ~22 seconds on screen). Backing "speed" out of
// compressed-distance/compressed-time gives nonsense like 5000 km/h; real
// distance divided by a real assumed pace does not.
const SIM_AVG_SPEED_KMH = 34;
const RED   = '#e11900';
const GRAY2 = '#1f1f1f'; // cards
const GRAY3 = '#2c2c2c'; // borders
const SUB   = 'rgba(255,255,255,0.55)';
const FONT_H = 'var(--font-h)';
const FONT_B = 'var(--font-b)';

const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─── Icons ────────────────────────────────────────────────────────────────────
const KDIcons = {
  search:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  chevronLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  star:    (filled) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#fff' : 'none'} stroke="currentColor" strokeWidth="1.6"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1L12 2z"/></svg>,
  clock:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>,
  phone:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .6 2.9a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.9.5 2.9.6a2 2 0 011.7 2z"/></svg>,
  message: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  home:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/></svg>,
  pin:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>,
  work:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  flight:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2.5 19.5L21 12 2.5 4.5 5 11l-2.5 1 2.5 1z"/></svg>,
  speed:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15a8 8 0 1116 0"/><path d="M12 15l3.5-4.5" strokeLinecap="round"/><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>,
  wallet:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M17 12h.01M2 10h20"/></svg>,
  logout:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  checkCircle: <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  send:    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>,
  hangup:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .6 2.9a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.9.5 2.9.6a2 2 0 011.7 2z" transform="rotate(135 12 12)"/></svg>,
};

function CarSVG({ color = WHITE, size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M8 30l3-11a4 4 0 014-3h18a4 4 0 014 3l3 11" stroke={color} strokeWidth="2.3" strokeLinejoin="round"/>
      <rect x="6" y="29" width="36" height="9" rx="3" fill={color} opacity="0.14" stroke={color} strokeWidth="2.3"/>
      <circle cx="14" cy="38" r="3" fill={color}/>
      <circle cx="34" cy="38" r="3" fill={color}/>
      <path d="M14 21l2-5h16l2 5" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

function VanSVG({ color = WHITE, size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="14" width="36" height="18" rx="3" fill={color} opacity="0.14" stroke={color} strokeWidth="2.3"/>
      <path d="M6 24h36" stroke={color} strokeWidth="1.6" opacity="0.5"/>
      <circle cx="15" cy="34" r="3.2" fill={color}/>
      <circle cx="33" cy="34" r="3.2" fill={color}/>
    </svg>
  );
}

// ─── Data — Buenos Aires locations, real approximate coordinates ────────────
const PLACES = [
  { id:'current',  name:'Tu ubicación actual', sub:'GPS', lat:-34.5960, lng:-58.3838 },
  { id:'recoleta', name:'Recoleta',            sub:'CABA, Argentina',    lat:-34.5875, lng:-58.3974 },
  { id:'palermo',  name:'Palermo',             sub:'CABA, Argentina',    lat:-34.5889, lng:-58.4173 },
  { id:'micro',    name:'Microcentro',         sub:'Obelisco, CABA',     lat:-34.6037, lng:-58.3816 },
  { id:'madero',   name:'Puerto Madero',       sub:'CABA, Argentina',    lat:-34.6091, lng:-58.3634 },
  { id:'belgrano', name:'Belgrano',            sub:'CABA, Argentina',    lat:-34.5627, lng:-58.4560 },
  { id:'telmo',    name:'San Telmo',           sub:'CABA, Argentina',    lat:-34.6212, lng:-58.3731 },
  { id:'crespo',   name:'Villa Crespo',        sub:'CABA, Argentina',    lat:-34.5993, lng:-58.4392 },
  { id:'ezeiza',   name:'Aeropuerto Ezeiza (EZE)', sub:'Buenos Aires',   lat:-34.8222, lng:-58.5358 },
];

const NEARBY_COUNT = 24;
const QUICK_PLACES = [
  { ...PLACES.find(p=>p.id==='palermo'), id:'palermo-q', name:'Palermo',             icon:KDIcons.pin },
  { ...PLACES.find(p=>p.id==='ezeiza'),  id:'ezeiza-q',  name:'Aeropuerto (EZE)',    icon:KDIcons.flight },
  { ...PLACES.find(p=>p.id==='micro'),   id:'micro-q',   name:'Microcentro',         icon:KDIcons.work },
];

const RIDE_TYPES = [
  { id:'keyx',     name:'KeyX',         sub:'Económico · autos tokenizados',    capacity:4, base:2.5, perKm:1.10, etaBase:3, discount:15, Icon:CarSVG, accent:WHITE },
  { id:'comfort',  name:'Key Comfort',  sub:'Más espacio · top rated',          capacity:4, base:4.0, perKm:1.60, etaBase:5, discount:15, Icon:CarSVG, accent:'#8ecbff' },
  { id:'black',    name:'Key Black',    sub:'Lujo · flota premium KEYCHAIN',    capacity:4, base:8.0, perKm:2.80, etaBase:8, discount:20, Icon:CarSVG, accent:'#d9b25c' },
  { id:'xl',       name:'KeyXL',        sub:'Van/SUV · hasta 6 pasajeros',      capacity:6, base:5.0, perKm:1.90, etaBase:6, discount:15, Icon:VanSVG, accent:'#a7f3d0' },
];

const DRIVERS = {
  keyx:    [{ name:'Martín Ríos', car:'Tesla Model 3', plate:'AB 123 CD', rating:4.92, color:'#2196F3' }, { name:'Sofía Gómez', car:'Tesla Model 3', plate:'AC 552 FE', rating:4.88, color:'#4CAF50' }],
  comfort: [{ name:'Lucas Fernández', car:'Toyota Corolla Hybrid', plate:'AD 771 GH', rating:4.9, color:'#4CAF50' }, { name:'Valentina Cruz', car:'Toyota Corolla Hybrid', plate:'AE 341 JK', rating:4.95, color:'#03A9F4' }],
  black:   [{ name:'Diego Molina', car:'Porsche 911 Carrera', plate:'AF 118 LM', rating:4.99, color:'#FF9800' }, { name:'Ana Paz', car:'Mercedes S-Class', plate:'AG 902 NP', rating:4.97, color:'#9C27B0' }],
  xl:      [{ name:'Carla Suárez', car:'Chevrolet Suburban', plate:'AH 664 QR', rating:4.91, color:'#607D8B' }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function haversineKm(a, b) {
  const R = 6371, dLat = (b.lat-a.lat) * Math.PI/180, dLng = (b.lng-a.lng) * Math.PI/180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}
function fmt2(n) { return `$${n.toFixed(2)}`; }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPoint(a, b, t) { return { lat: lerp(a.lat, b.lat, t), lng: lerp(a.lng, b.lng, t) }; }
function pickDriver(rideTypeId) {
  const pool = DRIVERS[rideTypeId] || DRIVERS.keyx;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Real street-following route via OSRM's public routing API (no key needed,
// same OSM road network the map tiles are already drawn from) — falls back
// to a straight line if the request fails, so the app never breaks offline.
async function fetchRoute(pickup, dest) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route) return null;
    const coords = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    return { coords, distanceKm: route.distance / 1000, meta: buildRouteMeta(coords) };
  } catch {
    return null;
  }
}

function bearingDeg(a, b) {
  const φ1 = a.lat * Math.PI / 180, φ2 = b.lat * Math.PI / 180;
  const Δλ = (b.lng - a.lng) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Cumulative per-segment distance, computed once when a route arrives
// instead of on every animation frame — pointAlongRoute used to re-run
// haversine over every segment ~60x/sec, which is wasted CPU since a
// route's geometry never changes after it's fetched.
function buildRouteMeta(coords) {
  const cum = [0];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1], coords[i]);
    cum.push(total);
  }
  return { coords, cum, total };
}

// Position + heading at parameter t (0..1) along a precomputed route,
// walking cumulative distance instead of lerping between two endpoints —
// this is what makes the car follow the streets instead of cutting through
// blocks, and the heading is what lets the marker rotate to face travel
// direction instead of sitting at a fixed angle.
function sampleRoute(meta, t) {
  const { coords, cum, total } = meta;
  if (coords.length < 2) return { ...coords[0], heading: 0 };
  const clampedT = Math.min(1, Math.max(0, t));
  const target = clampedT * total;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const segStart = cum[i - 1], segLen = cum[i] - segStart;
  const segT = segLen > 0 ? (target - segStart) / segLen : 0;
  const pos = lerpPoint(coords[i - 1], coords[i], segT);
  return { ...pos, heading: bearingDeg(coords[i - 1], coords[i]) };
}

function dotIcon(color, size = 14) {
  return L.divIcon({
    className: 'keydrive-dot',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #000;box-shadow:0 0 0 2px ${color}55"></div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2],
  });
}
// A directional chevron, like Uber/Google Maps' own vehicle marker — unlike
// a literal car glyph, a chevron reads correctly rotated to any heading.
function carIcon(color, heading = 0) {
  return L.divIcon({
    className: 'keydrive-car',
    html: `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;transform:rotate(${heading}deg);transition:transform 220ms linear;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.55))">
      <svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 2.5 L19.3 20 L12 15.8 L4.7 20 Z" fill="${color}" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>
    </div>`,
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
}

// Keeps the map camera in sync with the active ride: fits both pickup and
// destination in view once they're known, then smoothly follows the car
// marker while a ride is actually under way (enroute/trip) — react-leaflet's
// own `center` prop only applies once, on mount, so without this the
// viewport would just sit still while the car drives off past its edge.
function MapController({ pickup, dest, carPos, phase }) {
  const map = useMap();
  const fitDoneRef = useRef(false);

  useEffect(() => {
    if (!dest) { fitDoneRef.current = false; return; }
    if (!pickup || fitDoneRef.current) return;
    fitDoneRef.current = true;
    map.fitBounds(L.latLngBounds([[pickup.lat, pickup.lng], [dest.lat, dest.lng]]), { padding: [64, 64], maxZoom: 15 });
  }, [pickup, dest, map]);

  useEffect(() => {
    if (!carPos || (phase !== 'enroute' && phase !== 'trip')) return;
    map.panTo([carPos.lat, carPos.lng], { animate: true, duration: 0.3, easeLinearity: 0.4 });
  }, [carPos, phase, map]);

  return null;
}

// ─── Live map ─────────────────────────────────────────────────────────────────
function RideMap({ pickup, dest, phase, carPos, heading, routeCoords }) {
  const center = pickup ? [pickup.lat, pickup.lng] : [-34.596, -58.3838];
  const activeOpacity = phase === 'options' || phase === 'confirm' ? 0.95 : 0.4;
  return (
    <MapContainer center={center} zoom={13} zoomControl={false} scrollWheelZoom attributionControl={false} style={{ width:'100%', height:'100%' }}>
      <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
      <MapController pickup={pickup} dest={dest} carPos={carPos} phase={phase} />
      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={dotIcon(GREEN)} />}
      {dest && <Marker position={[dest.lat, dest.lng]} icon={dotIcon(WHITE)} />}
      {pickup && dest && (
        routeCoords && routeCoords.length > 1 ? (
          <Polyline positions={routeCoords.map(c => [c.lat, c.lng])} pathOptions={{ color: GREEN, weight: 4, opacity: activeOpacity }} />
        ) : (
          // Still resolving (or the routing request failed) — a dashed
          // straight line as a visible "loading/fallback" state rather than
          // silently pretending it's the real route.
          <Polyline positions={[[pickup.lat, pickup.lng], [dest.lat, dest.lng]]} pathOptions={{ color: GREEN, weight: 3, opacity: activeOpacity * 0.7, dashArray: '2 8' }} />
        )
      )}
      {carPos && <Marker position={[carPos.lat, carPos.lng]} icon={carIcon(GREEN, heading)} />}
    </MapContainer>
  );
}

// ─── Address search sheet ─────────────────────────────────────────────────────
function AddressSearch({ pickup, dest, onSetPickup, onSetDest, onClose, onConfirm }) {
  const [focus, setFocus] = useState('dest'); // 'pickup' | 'dest'
  const [query, setQuery] = useState('');
  const results = PLACES.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:320, damping:34 }}
      style={{ position:'absolute', inset:0, zIndex:1010, background:BLACK, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'18px 18px 10px' }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:WHITE, cursor:'pointer', display:'flex' }}>{KDIcons.chevronLeft}</button>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:17, color:WHITE }}>¿A dónde vamos?</div>
      </div>

      <div style={{ padding:'8px 18px 14px', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:12, background:GRAY2, border:focus==='pickup' ? `1.5px solid ${GREEN}` : '1.5px solid transparent' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:GREEN, flexShrink:0 }} />
          <input
            value={pickup?.name || ''} onFocus={() => setFocus('pickup')} onChange={e => { onSetPickup({ name:e.target.value }); setQuery(e.target.value); }}
            placeholder="Ubicación de partida" style={{ flex:1, background:'none', border:'none', outline:'none', color:WHITE, fontFamily:FONT_B, fontSize:14 }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:12, background:GRAY2, border:focus==='dest' ? `1.5px solid ${WHITE}` : '1.5px solid transparent' }}>
          <span style={{ width:8, height:8, borderRadius:2, background:WHITE, flexShrink:0 }} />
          <input
            value={dest?.name || ''} onFocus={() => setFocus('dest')} onChange={e => { onSetDest({ name:e.target.value }); setQuery(e.target.value); }}
            placeholder="¿A dónde vas?" autoFocus style={{ flex:1, background:'none', border:'none', outline:'none', color:WHITE, fontFamily:FONT_B, fontSize:14 }} />
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'4px 6px' }}>
        {results.map(p => (
          <button key={p.id} onClick={() => {
            if (focus === 'pickup') { onSetPickup(p); setQuery(''); setFocus('dest'); }
            else { onSetDest(p); setQuery(''); if (pickup) onConfirm(); }
          }}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderRadius:12 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:GRAY2, display:'flex', alignItems:'center', justifyContent:'center', color:SUB, flexShrink:0 }}>{KDIcons.pin}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:FONT_B, fontWeight:600, fontSize:14, color:WHITE }}>{p.name}</div>
              <div style={{ fontFamily:FONT_B, fontSize:12, color:SUB }}>{p.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Ride options sheet ───────────────────────────────────────────────────────
function RideOptions({ pickup, dest, distanceKm, selected, onSelect, onBack, onConfirm }) {
  return (
    <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:320, damping:34 }}
      style={{ position:'absolute', left:0, right:0, bottom:0, zIndex:1005, background:BLACK, borderRadius:'22px 22px 0 0', boxShadow:'0 -8px 40px rgba(0,0,0,0.6)', maxHeight:'78%', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px 10px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:WHITE, cursor:'pointer', display:'flex' }}>{KDIcons.chevronLeft}</button>
        <div>
          <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:15, color:WHITE }}>Elegí un viaje</div>
          <div style={{ fontFamily:FONT_B, fontSize:11.5, color:SUB }}>{pickup.name} → {dest.name} · {distanceKm.toFixed(1)} km</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'6px 14px' }}>
        {RIDE_TYPES.map(r => {
          const subtotal = r.base + r.perKm * distanceKm;
          const afterDisc = subtotal * (1 - r.discount/100);
          const fee = afterDisc * 0.035;
          const total = afterDisc + fee;
          const isSel = selected === r.id;
          return (
            <motion.button key={r.id} onClick={() => onSelect(r.id)} whileHover={{ background: isSel ? GRAY2 : 'rgba(255,255,255,0.05)' }} whileTap={{ scale:0.99 }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'12px 10px', borderRadius:14, border:`1.5px solid ${isSel ? WHITE : 'transparent'}`, background: isSel ? GRAY2 : 'transparent', cursor:'pointer', marginBottom:4 }}>
              <r.Icon color={r.accent} size={40} />
              <div style={{ flex:1, textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:FONT_H, fontWeight:700, fontSize:14.5, color:WHITE }}>{r.name}</span>
                  <span style={{ display:'flex', alignItems:'center', gap:3, fontFamily:FONT_B, fontSize:11, color:SUB }}>{KDIcons.clock} {r.etaBase} min</span>
                </div>
                <div style={{ fontFamily:FONT_B, fontSize:11.5, color:SUB, marginTop:1 }}>{r.sub}</div>
                <div style={{ fontFamily:FONT_B, fontSize:10.5, color:GREEN, marginTop:2 }}>Descuento inversor -{r.discount}%</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:FONT_B, fontSize:10.5, color:SUB, textDecoration:'line-through' }}>{fmt2(subtotal)}</div>
                <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:15, color:WHITE }}>{fmt2(total)}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div style={{ padding:'12px 18px 20px' }}>
        <button disabled={!selected} onClick={onConfirm}
          style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background: selected ? WHITE : GRAY3, color: selected ? BLACK : SUB, fontFamily:FONT_H, fontWeight:800, fontSize:15, cursor: selected ? 'pointer' : 'default' }}>
          {selected ? `Elegir ${RIDE_TYPES.find(r=>r.id===selected)?.name}` : 'Elegí un tipo de viaje'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Confirm sheet ────────────────────────────────────────────────────────────
function ConfirmRide({ pickup, dest, ride, distanceKm, onBack, onRequest }) {
  const subtotal = ride.base + ride.perKm * distanceKm;
  const afterDisc = subtotal * (1 - ride.discount/100);
  const fee = afterDisc * 0.035;
  const total = afterDisc + fee;
  return (
    <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:320, damping:34 }}
      style={{ position:'absolute', left:0, right:0, bottom:0, top:70, zIndex:1005, background:BLACK, borderRadius:'22px 22px 0 0', boxShadow:'0 -8px 40px rgba(0,0,0,0.6)', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 20px 10px' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:WHITE, cursor:'pointer', display:'flex' }}>{KDIcons.chevronLeft}</button>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:16, color:WHITE }}>Confirmá tu viaje</div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'0 20px' }}>
      <div style={{ background:`linear-gradient(160deg, ${GRAY2}, ${BLACK})`, borderRadius:18, padding:'20px 18px', marginBottom:14, border:`1px solid ${GRAY3}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
          <div>
            <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:19, color:WHITE }}>{ride.name}</div>
            <div style={{ fontFamily:FONT_B, fontSize:12, color:SUB, marginTop:2 }}>{ride.sub}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:20, color:WHITE }}>{fmt2(total)}</div>
            <div style={{ fontFamily:FONT_B, fontSize:11, color:GREEN }}>-{ride.discount}% inversor</div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'center', padding:'6px 0 4px' }}>
          <ride.Icon color={ride.accent} size={104} />
        </div>
        <div style={{ display:'flex', borderTop:`1px solid ${GRAY3}`, marginTop:4, paddingTop:12 }}>
          {[
            [KDIcons.clock, `${ride.etaBase} min`, 'llegada'],
            [KDIcons.star(true), '4.9', 'promedio'],
            [KDIcons.pin, `${distanceKm.toFixed(1)} km`, 'distancia'],
          ].map(([icon, val, lbl], i) => (
            <div key={i} style={{ flex:1, textAlign:'center', color: i===1 ? '#FFC043' : WHITE }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}>{icon}</div>
              <div style={{ fontFamily:FONT_H, fontWeight:700, fontSize:13.5, color:WHITE }}>{val}</div>
              <div style={{ fontFamily:FONT_B, fontSize:10, color:SUB }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:GRAY2, borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:GREEN, marginTop:5, flexShrink:0 }} />
          <div style={{ fontFamily:FONT_B, fontSize:13, color:WHITE }}>{pickup.name}</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <span style={{ width:8, height:8, borderRadius:2, background:WHITE, marginTop:5, flexShrink:0 }} />
          <div style={{ fontFamily:FONT_B, fontSize:13, color:WHITE }}>{dest.name}</div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:GRAY2, marginBottom:16 }}>
        {KDIcons.wallet}
        <span style={{ fontFamily:FONT_B, fontSize:13, color:WHITE }}>Key Pay · USDC</span>
      </div>
      </div>

      <div style={{ padding:'12px 20px 20px' }}>
        <button onClick={onRequest}
          style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background:WHITE, color:BLACK, fontFamily:FONT_H, fontWeight:800, fontSize:15.5, cursor:'pointer' }}>
          Confirmar {ride.name}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Searching overlay ────────────────────────────────────────────────────────
function SearchingDriver({ ride }) {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:1020, background:'rgba(0,0,0,0.88)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:22 }}>
      <div style={{ position:'relative', width:100, height:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {[0, 0.6, 1.2].map(delay => (
          <motion.div key={delay} initial={{ scale:0.4, opacity:0.7 }} animate={{ scale:2.1, opacity:0 }} transition={{ duration:1.8, repeat:Infinity, delay }}
            style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${GREEN}` }} />
        ))}
        <ride.Icon color={WHITE} size={40} />
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:17, color:WHITE, marginBottom:4 }}>Buscando tu {ride.name}…</div>
        <div style={{ fontFamily:FONT_B, fontSize:13, color:SUB }}>Conectando con conductores de la flota tokenizada</div>
      </div>
    </div>
  );
}

// ─── Call overlay — simulated, no real telephony backend here ──────────────
function CallOverlay({ driver, onClose }) {
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div style={{ position:'absolute', inset:0, zIndex:1030, background:'rgba(10,10,10,0.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:22 }}>
      <div style={{ position:'relative', width:110, height:110, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {!connected && [0, 0.6, 1.2].map(delay => (
          <motion.div key={delay} initial={{ scale:0.4, opacity:0.7 }} animate={{ scale:2.1, opacity:0 }} transition={{ duration:1.8, repeat:Infinity, delay }}
            style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${GREEN}` }} />
        ))}
        <div style={{ width:92, height:92, borderRadius:'50%', background:driver.color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_H, fontWeight:800, fontSize:30, color:'#000' }}>
          {driver.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
        </div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:18, color:WHITE, marginBottom:4 }}>{driver.name}</div>
        <div style={{ fontFamily:FONT_B, fontSize:13.5, color:SUB }}>{connected ? `En llamada · ${mm}:${ss}` : 'Llamando…'}</div>
      </div>
      <button onClick={onClose} style={{ width:58, height:58, borderRadius:'50%', border:'none', background:RED, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', marginTop:10 }}>
        {KDIcons.hangup}
      </button>
    </div>
  );
}

// ─── Message thread — simulated, no real backend here ───────────────────────
function MessageModal({ driver, onClose }) {
  const [messages, setMessages] = useState([{ from:'driver', text:`¡Hola! Soy ${driver.name.split(' ')[0]}, ya estoy en camino 🚗` }]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setMessages(m => [...m, { from:'me', text:t }]);
    setText('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(m => [...m, { from:'driver', text:'¡Perfecto, nos vemos pronto!' }]);
    }, 1400);
  };

  return (
    <div style={{ position:'absolute', inset:0, zIndex:1030, background:BLACK, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderBottom:`1px solid ${GRAY3}` }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:driver.color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_H, fontWeight:800, fontSize:13, color:'#000', flexShrink:0 }}>
          {driver.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
        </div>
        <div style={{ flex:1, fontFamily:FONT_H, fontWeight:700, fontSize:14.5, color:WHITE }}>{driver.name}</div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:WHITE, cursor:'pointer', display:'flex' }}>{KDIcons.x}</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth:'75%', padding:'10px 14px', borderRadius:14, background: m.from === 'me' ? GREEN : GRAY2, color: m.from === 'me' ? BLACK : WHITE, fontFamily:FONT_B, fontSize:13.5 }}>
            {m.text}
          </div>
        ))}
        {typing && <div style={{ alignSelf:'flex-start', padding:'10px 14px', borderRadius:14, background:GRAY2, color:SUB, fontFamily:FONT_B, fontSize:13 }}>escribiendo…</div>}
      </div>
      <div style={{ display:'flex', gap:10, padding:'14px 18px', borderTop:`1px solid ${GRAY3}` }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escribí un mensaje…"
          style={{ flex:1, padding:'11px 15px', borderRadius:999, border:`1px solid ${GRAY3}`, background:GRAY2, color:WHITE, fontFamily:FONT_B, fontSize:13.5, outline:'none' }} />
        <button onClick={send} style={{ width:42, height:42, borderRadius:'50%', border:'none', background:GREEN, color:BLACK, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          {KDIcons.send}
        </button>
      </div>
    </div>
  );
}

// ─── En route / trip driver card ──────────────────────────────────────────────
function DriverCard({ driver, ride, phase, etaMin, durationS, onCancel, onFinishTrip }) {
  const [overlay, setOverlay] = useState(null); // null | 'call' | 'message'
  return (
    <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:320, damping:34 }}
      style={{ position:'absolute', left:0, right:0, bottom:0, zIndex:1005, background:BLACK, borderRadius:'22px 22px 0 0', boxShadow:'0 -8px 40px rgba(0,0,0,0.6)', padding:'18px 20px 22px' }}>
      <div style={{ textAlign:'center', marginBottom:14 }}>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:15.5, color:WHITE }}>
          {phase === 'enroute' ? `Tu conductor llega en ${etaMin} min` : `En viaje hacia tu destino`}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:driver.color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_H, fontWeight:800, fontSize:18, color:'#000', flexShrink:0 }}>
          {driver.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:FONT_H, fontWeight:700, fontSize:15, color:WHITE }}>{driver.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:FONT_B, fontSize:12.5, color:SUB }}>
            {KDIcons.star(true)} {driver.rating} · {driver.car}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:15, color:WHITE, letterSpacing:'0.04em' }}>{driver.plate}</div>
          <div style={{ fontFamily:FONT_B, fontSize:11, color:SUB }}>{ride.name}</div>
        </div>
      </div>

      <div style={{ margin:'6px 0 16px', height:4, borderRadius:999, background:GRAY2, overflow:'hidden' }}>
        {/* Duration comes from the same simDurationSeconds() value driving the
            car's actual position animation — previously this had its own
            hardcoded "9" here, independent of both the real trip distance
            and the car marker's own animation duration, so the progress bar
            (and the phase transition it triggers via onAnimationComplete)
            could finish before or after the car visually arrived. */}
        <motion.div key={phase} initial={{ width:0 }} animate={{ width:'100%' }} transition={{ duration: durationS, ease:'linear' }}
          style={{ height:'100%', borderRadius:999, background:GREEN }}
          onAnimationComplete={onFinishTrip} />
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => setOverlay('call')} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, border:`1.5px solid ${GRAY3}`, background:'none', color:WHITE, fontFamily:FONT_B, fontWeight:600, fontSize:13.5, cursor:'pointer' }}>
          {KDIcons.phone} Llamar
        </button>
        <button onClick={() => setOverlay('message')} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, border:`1.5px solid ${GRAY3}`, background:'none', color:WHITE, fontFamily:FONT_B, fontWeight:600, fontSize:13.5, cursor:'pointer' }}>
          {KDIcons.message} Mensaje
        </button>
        {phase === 'enroute' && (
          <button onClick={onCancel} style={{ padding:'13px 16px', borderRadius:12, border:'none', background:'none', color:RED, fontFamily:FONT_B, fontWeight:600, fontSize:13.5, cursor:'pointer' }}>
            Cancelar
          </button>
        )}
      </div>

      <AnimatePresence>
        {overlay === 'call' && <CallOverlay driver={driver} onClose={() => setOverlay(null)} />}
        {overlay === 'message' && <MessageModal driver={driver} onClose={() => setOverlay(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Trip complete — fare, rating, real KeyPay checkout ──────────────────────
function TripComplete({ dest, ride, driver, distanceKm, onPay, onDone }) {
  const [stars, setStars] = useState(5);
  const [tipPct, setTipPct] = useState(15);
  const [paid, setPaid] = useState(false);

  const subtotal = ride.base + ride.perKm * distanceKm;
  const afterDisc = subtotal * (1 - ride.discount/100);
  const fee = afterDisc * 0.035;
  const tip = afterDisc * (tipPct/100);
  const total = afterDisc + fee + tip;

  if (paid) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ position:'absolute', inset:0, zIndex:1010, background:BLACK, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:30 }}>
      {KDIcons.checkCircle}
      <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:19, color:WHITE }}>¡Viaje completado!</div>
      <div style={{ fontFamily:FONT_B, fontSize:13.5, color:SUB, textAlign:'center' }}>Pagaste {fmt2(total)} USDC · {dest.name}</div>
      <button onClick={onDone} style={{ width:'100%', maxWidth:280, padding:'14px', borderRadius:14, border:'none', background:WHITE, color:BLACK, fontFamily:FONT_H, fontWeight:800, fontSize:14.5, cursor:'pointer' }}>
        Volver al inicio
      </button>
    </motion.div>
  );

  return (
    <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', stiffness:320, damping:34 }}
      style={{ position:'absolute', left:0, right:0, bottom:0, zIndex:1005, background:BLACK, borderRadius:'22px 22px 0 0', boxShadow:'0 -8px 40px rgba(0,0,0,0.6)', padding:'20px 20px 24px', maxHeight:'85%', overflowY:'auto' }}>
      <div style={{ textAlign:'center', marginBottom:16 }}>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:17, color:WHITE, marginBottom:4 }}>Llegaste — calificá a {driver.name.split(' ')[0]}</div>
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:8 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setStars(n)} style={{ background:'none', border:'none', cursor:'pointer' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill={n <= stars ? '#FFC043' : 'none'} stroke={n <= stars ? '#FFC043' : GRAY3} strokeWidth="1.5"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1L12 2z"/></svg>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:GRAY2, borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
        {[['Subtotal', afterDisc], ['Fee de plataforma (3.5%)', fee]].map(([k,v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0' }}>
            <span style={{ fontFamily:FONT_B, fontSize:12.5, color:SUB }}>{k}</span>
            <span style={{ fontFamily:FONT_B, fontWeight:600, fontSize:12.5, color:WHITE }}>{fmt2(v)}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0 3px', borderTop:`1px solid ${GRAY3}`, marginTop:4 }}>
          <span style={{ fontFamily:FONT_H, fontWeight:700, fontSize:14, color:WHITE }}>Total</span>
          <span style={{ fontFamily:FONT_H, fontWeight:800, fontSize:16, color:WHITE }}>{fmt2(total)}</span>
        </div>
      </div>

      <div style={{ fontFamily:FONT_B, fontSize:12, color:SUB, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Propina para {driver.name.split(' ')[0]}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:18 }}>
        {[0,10,15,20].map(p => (
          <button key={p} onClick={() => setTipPct(p)}
            style={{ padding:'10px 0', borderRadius:10, border:`1.5px solid ${tipPct===p ? WHITE : GRAY3}`, background: tipPct===p ? GRAY2 : 'none', color:WHITE, fontFamily:FONT_B, fontWeight:600, fontSize:12.5, cursor:'pointer' }}>
            {p === 0 ? 'Sin propina' : `${p}%`}
          </button>
        ))}
      </div>

      <button onClick={() => onPay(total, () => setPaid(true))}
        style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background:WHITE, color:BLACK, fontFamily:FONT_H, fontWeight:800, fontSize:15, cursor:'pointer' }}>
        Pagar {fmt2(total)}
      </button>
    </motion.div>
  );
}

// ─── Live trip HUD — speed + countdown, floating over the map ───────────────
// Driven entirely by the parent's animation loop (progress + speed are
// derived from the car's actual simulated movement) instead of running its
// own independent setInterval — a previous version had this HUD maintain a
// separate random-jitter timer that could never agree with what the map was
// actually showing. One state, one source of truth.
function TripHUD({ progress, distanceKm, destName }) {
  const remainingKm = Math.max(0, distanceKm * (1 - progress));
  const mins = Math.max(1, Math.ceil(remainingKm / SIM_AVG_SPEED_KMH * 60));
  // A small deterministic wobble around the baseline pace (never literal
  // random jitter) — reads as natural speed variation over the course of
  // the trip without the noisy, disconnected-from-anything randomness the
  // previous version had.
  const speed = Math.round(SIM_AVG_SPEED_KMH + 6 * Math.sin(progress * Math.PI * 4));

  return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
      style={{ position:'absolute', top:16, right:16, zIndex:1000, width:150, borderRadius:16, background:'rgba(15,15,15,0.9)', backdropFilter:'blur(10px)', border:`1px solid ${GRAY3}`, padding:'14px 14px 12px', boxShadow:'0 8px 26px rgba(0,0,0,0.45)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ width:7, height:7, borderRadius:'50%', background:WHITE, flexShrink:0 }} />
        <span style={{ fontFamily:FONT_B, fontSize:11, color:SUB, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{destName}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, color:GREEN, marginBottom:10 }}>
        {KDIcons.speed}
        <span style={{ fontFamily:FONT_H, fontWeight:700, fontSize:13, color:WHITE }}>{speed} km/h</span>
      </div>
      <div style={{ borderTop:`1px solid ${GRAY3}`, paddingTop:9 }}>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:26, color:WHITE, lineHeight:1 }}>{mins}</div>
        <div style={{ fontFamily:FONT_B, fontSize:10.5, color:SUB, marginTop:2 }}>minutos</div>
      </div>
    </motion.div>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
  const tabs = [['home', 'Inicio', KDIcons.home], ['activity', 'Actividad', KDIcons.clock], ['account', 'Cuenta', KDIcons.wallet]];
  return (
    <div style={{ display:'flex', borderTop:`1px solid ${GRAY3}`, background:BLACK, padding:'8px 0 max(8px, env(safe-area-inset-bottom))' }}>
      {tabs.map(([id, label, icon]) => (
        <button key={id} onClick={() => setTab(id)}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'6px 0', background:'none', border:'none', cursor:'pointer', color: tab===id ? WHITE : SUB }}>
          {icon}
          <span style={{ fontFamily:FONT_B, fontSize:10.5, fontWeight: tab===id ? 700 : 500 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Desktop top nav — replaces the bottom tab bar above DESKTOP_BP ─────────
function DesktopNav({ tab, setTab }) {
  const tabs = [['home', 'Inicio'], ['activity', 'Actividad'], ['account', 'Cuenta']];
  return (
    <div style={{ display:'flex', gap:6 }}>
      {tabs.map(([id, label]) => (
        <motion.button key={id} onClick={() => setTab(id)} whileHover={{ background: tab===id ? WHITE : 'rgba(255,255,255,0.08)' }} whileTap={{ scale:0.96 }}
          style={{ padding:'8px 16px', borderRadius:999, border:'none', background: tab===id ? WHITE : 'transparent', color: tab===id ? BLACK : SUB, fontFamily:FONT_B, fontWeight:700, fontSize:13, cursor:'pointer' }}>
          {label}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Home — the ride-request state machine ───────────────────────────────────
function KeyDriveHome({ setHistory, isMobile }) {
  const [phase, setPhase]     = useState('idle'); // idle | search | options | confirm | searching | enroute | trip | complete
  const [pickup, setPickup]   = useState(PLACES[0]);
  const [dest, setDest]       = useState(null);
  const [rideId, setRideId]   = useState(null);
  const [driver, setDriver]   = useState(null);
  const [carPos, setCarPos]   = useState(null);
  const [heading, setHeading] = useState(0);
  const [tripT, setTripT] = useState(0);
  const [tripDurationS, setTripDurationS] = useState(9);
  const [enrouteDurationS, setEnrouteDurationS] = useState(9);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [route, setRoute] = useState(null); // { coords, distanceKm, meta } | null — real streets via OSRM
  const carAnimRef = useRef(null);
  const paySuccessRef = useRef(null);

  const ride = RIDE_TYPES.find(r => r.id === rideId);
  const distanceKm = route?.distanceKm ?? (pickup && dest ? haversineKm(pickup, dest) : 0);

  // Fetch the real street route the moment both ends of the trip are known,
  // so the preview line (and later the car) follows actual roads instead of
  // cutting straight through blocks. Falls back to the haversine estimate
  // above until it resolves (or if the request fails).
  useEffect(() => {
    if (!pickup || !dest) return;
    let cancelled = false;
    fetchRoute(pickup, dest).then(r => { if (!cancelled) setRoute(r); });
    // Clears the previous route as soon as pickup/dest change (this runs
    // before the next effect's fetch resolves) or the component unmounts —
    // cleanup, not a synchronous setState in the effect body itself.
    return () => { cancelled = true; setRoute(null); };
  }, [pickup, dest]);

  // Demo pacing: scales with real distance (so a long trip visibly takes
  // longer than a short one) but clamped to a range that's still watchable —
  // this replaces a previous version that hardcoded every trip to exactly 9
  // seconds regardless of how far it actually was.
  function simDurationSeconds(km) {
    return Math.min(22, Math.max(6, km * 1.8));
  }

  // Shared tick logic for both animation modes below: updates position,
  // heading (so the marker rotates to face travel direction), overall
  // progress (0..1, consumed by TripHUD), and an instantaneous speed derived
  // from actual distance/time between frames — not a random number.
  // Position/heading update every animation frame (for a buttery-smooth car),
  // but speed is sampled on a coarser ~300ms window and exponentially
  // smoothed on top of that — computing "instantaneous" speed from a single
  // rAF frame is too noisy to display (a single frame's tiny, jittery
  // duration divided into its tiny distance easily produces nonsense like
  // several thousand km/h), the same class of problem real GPS speed
  // readings have and why they're smoothed rather than read raw.
  function driveAnimation(sampleAt, seconds) {
    if (carAnimRef.current) cancelAnimationFrame(carAnimRef.current);
    const start = performance.now();
    const dur = seconds * 1000;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const sample = sampleAt(t);
      setCarPos({ lat: sample.lat, lng: sample.lng });
      setHeading(sample.heading);
      setTripT(t);
      if (t < 1) carAnimRef.current = requestAnimationFrame(tick);
    };
    carAnimRef.current = requestAnimationFrame(tick);
  }

  function animateAlongMeta(meta, seconds) {
    driveAnimation(t => sampleRoute(meta, t), seconds);
  }
  function animateStraight(from, to, seconds) {
    const heading0 = bearingDeg(from, to);
    driveAnimation(t => ({ ...lerpPoint(from, to, t), heading: heading0 }), seconds);
  }

  const startSearching = () => {
    setPhase('searching');
    const farAway = { lat: pickup.lat + 0.02, lng: pickup.lng - 0.015 };
    // Kick off the approach-leg route fetch immediately, in parallel with
    // the fake "searching" wait below, so it's ready (or very close) by the
    // time the driver is assigned — this leg used to always be a straight
    // line; now it follows real streets the same way the main trip does.
    const approachPromise = fetchRoute(farAway, pickup);
    setTimeout(async () => {
      const d = pickDriver(rideId);
      setDriver(d);
      setPhase('enroute');
      const approach = await approachPromise;
      const approachKm = approach?.distanceKm ?? haversineKm(farAway, pickup);
      const durationS = simDurationSeconds(approachKm);
      setEnrouteDurationS(durationS);
      setTripT(0);
      if (approach?.meta) animateAlongMeta(approach.meta, durationS);
      else animateStraight(farAway, pickup, durationS);
    }, 2600);
  };

  const startTrip = () => {
    setPhase('trip');
    const durationS = simDurationSeconds(distanceKm);
    setTripDurationS(durationS);
    setTripT(0);
    if (route?.meta) animateAlongMeta(route.meta, durationS);
    else animateStraight(pickup, dest, durationS);
  };

  const handlePay = (total, onSuccess) => {
    const id = addPendingPayment({ name: `Viaje Key Go — ${pickup.name} → ${dest.name}`, qty: 1, unit: total, source: 'Key Go' });
    setPaymentId(id);
    paySuccessRef.current = onSuccess;
    setCheckoutOpen(true);
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    if (paymentId && !getPendingPayments().some(x => x.id === paymentId)) {
      setHistory(h => [{ id: Date.now(), from: pickup.name, to: dest.name, car: ride.name, cost: fmt2(distanceKm), date: new Date().toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' }) }, ...h]);
      paySuccessRef.current?.();
    }
    setPaymentId(null);
  };

  const reset = () => {
    setPhase('idle'); setDest(null); setRideId(null); setDriver(null); setCarPos(null); setRoute(null);
    setHeading(0); setTripT(0);
    if (carAnimRef.current) cancelAnimationFrame(carAnimRef.current);
  };

  useEffect(() => () => { if (carAnimRef.current) cancelAnimationFrame(carAnimRef.current); }, []);

  // Same phase content either way — on mobile it overlays the map edge to
  // edge (position:absolute inset relative to the whole screen); on desktop
  // it's pinned inside a persistent left panel instead (position:absolute
  // inset relative to that narrower panel), Uber.com's own web layout.
  const panelContent = (
    <>
      {phase === 'idle' && (
        <div style={{ position:'absolute', left:16, right:16, top:16, zIndex:1000, display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => setPhase('search')}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderRadius:16, border:'none', background:WHITE, color:BLACK, fontFamily:FONT_B, fontWeight:600, fontSize:14.5, cursor:'pointer', boxShadow:'0 6px 24px rgba(0,0,0,0.4)' }}>
            {KDIcons.search} ¿A dónde vamos?
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:14, background:'rgba(20,20,20,0.85)', backdropFilter:'blur(8px)', border:`1px solid ${GRAY3}`, boxShadow:'0 6px 20px rgba(0,0,0,0.35)' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`${GREEN}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <CarSVG color={GREEN} size={20} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:FONT_H, fontWeight:700, fontSize:13, color:WHITE }}>{NEARBY_COUNT} conductores cerca</div>
              <div style={{ fontFamily:FONT_B, fontSize:11.5, color:SUB }}>Llegan en 3-8 min · flota tokenizada</div>
            </div>
            <span style={{ width:7, height:7, borderRadius:'50%', background:GREEN, flexShrink:0, boxShadow:`0 0 0 4px ${GREEN}22` }} />
          </div>

          <div style={{ display:'flex', gap:8, overflowX:'auto' }}>
            {QUICK_PLACES.map(p => (
              <motion.button key={p.id} onClick={() => { setDest(p); setPhase('options'); }} whileHover={{ background:'rgba(40,40,40,0.9)' }} whileTap={{ scale:0.96 }}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 13px', borderRadius:999, border:'none', background:'rgba(20,20,20,0.85)', backdropFilter:'blur(8px)', color:WHITE, fontFamily:FONT_B, fontWeight:600, fontSize:12, cursor:'pointer', flexShrink:0, boxShadow:'0 4px 14px rgba(0,0,0,0.3)' }}>
                {p.icon}{p.name}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {phase === 'search' && (
          <AddressSearch
            pickup={pickup} dest={dest}
            onSetPickup={setPickup} onSetDest={setDest}
            onClose={() => setPhase('idle')}
            onConfirm={() => setPhase('options')}
          />
        )}
        {phase === 'options' && dest && (
          <RideOptions pickup={pickup} dest={dest} distanceKm={distanceKm} selected={rideId}
            onSelect={setRideId} onBack={() => setPhase('search')} onConfirm={() => setPhase('confirm')} />
        )}
        {phase === 'confirm' && ride && (
          <ConfirmRide pickup={pickup} dest={dest} ride={ride} distanceKm={distanceKm}
            onBack={() => setPhase('options')} onRequest={startSearching} />
        )}
        {phase === 'searching' && ride && <SearchingDriver ride={ride} />}
        {(phase === 'enroute' || phase === 'trip') && driver && ride && (
          <DriverCard driver={driver} ride={ride} phase={phase} etaMin={ride.etaBase}
            durationS={phase === 'enroute' ? enrouteDurationS : tripDurationS}
            onCancel={reset} onFinishTrip={phase === 'enroute' ? startTrip : () => setPhase('complete')} />
        )}
        {phase === 'complete' && ride && driver && (
          <TripComplete pickup={pickup} dest={dest} ride={ride} driver={driver} distanceKm={distanceKm}
            onPay={handlePay} onDone={reset} />
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div style={{ position:'relative', flex:1, overflow:'hidden', display:'flex' }}>
      {!isMobile && (
        <div style={{ width:PANEL_WIDTH, flexShrink:0, position:'relative', overflow:'hidden', background:BLACK, borderRight:`1px solid ${GRAY3}` }}>
          {panelContent}
        </div>
      )}

      <div style={{ position:'relative', flex:1, overflow:'hidden' }}>
        <RideMap pickup={pickup} dest={dest} phase={phase} carPos={carPos} heading={heading} routeCoords={route?.coords} />
        {phase === 'trip' && dest && <TripHUD progress={tripT} distanceKm={distanceKm} destName={dest.name} />}
        {isMobile && panelContent}
      </div>

      {createPortal(
        <AnimatePresence>
          {checkoutOpen && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ position:'fixed', inset:0, zIndex:2000, ...KP_VARS }}>
              <CartCheckout onClose={handleCheckoutClose} focusId={paymentId} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────────────────────────
function ActivityScreen({ history }) {
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 18px' }}>
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:20, color:WHITE, marginBottom:16 }}>Actividad</div>
        {history.length === 0 && (
          <div style={{ fontFamily:FONT_B, fontSize:13.5, color:SUB, textAlign:'center', padding:'40px 0' }}>Todavía no hiciste ningún viaje.</div>
        )}
        {history.map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 4px', borderBottom:`1px solid ${GRAY3}` }}>
            <div style={{ width:42, height:42, borderRadius:12, background:GRAY2, display:'flex', alignItems:'center', justifyContent:'center' }}><CarSVG color={WHITE} size={24} /></div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:FONT_B, fontWeight:600, fontSize:13.5, color:WHITE }}>{t.from} → {t.to}</div>
              <div style={{ fontFamily:FONT_B, fontSize:12, color:SUB }}>{t.date} · {t.car}</div>
            </div>
            <div style={{ fontFamily:FONT_H, fontWeight:700, fontSize:14, color:WHITE }}>{t.cost}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Account tab ──────────────────────────────────────────────────────────────
function AccountScreen({ onLogout }) {
  const account = useActiveAccount();
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'20px 18px' }}>
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        <div style={{ fontFamily:FONT_H, fontWeight:800, fontSize:20, color:WHITE, marginBottom:20 }}>Cuenta</div>
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', borderRadius:14, background:GRAY2, marginBottom:16 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:GREEN, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_H, fontWeight:800, fontSize:18, color:'#000' }}>K</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:FONT_H, fontWeight:700, fontSize:14.5, color:WHITE }}>Wallet conectada</div>
            <div style={{ fontFamily:FONT_B, fontSize:12, color:SUB, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{account?.address}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, border:`1.5px solid ${GRAY3}`, background:'none', color:RED, fontFamily:FONT_B, fontWeight:600, fontSize:13.5, cursor:'pointer' }}>
          {KDIcons.logout} Cerrar sesión
        </button>
      </div>
    </div>
  );
}

const SEED_HISTORY = [
  { id:1, from:'Palermo', to:'Microcentro', car:'KeyX', cost:'$4.20', date:'28 jun 2026' },
  { id:2, from:'Recoleta', to:'Aeropuerto Ezeiza (EZE)', car:'Key Black', cost:'$41.50', date:'25 jun 2026' },
];

// Key Go is a standalone product (its own route, outside KEYCHAIN's
// login-gated Shell — see App.jsx PLATFORM_PATHS), same pattern as Bookey:
// it owns its own login gate (useActiveAccount already reflects a wallet
// connected anywhere else in the app, since everything sits under the same
// root <ThirdwebProvider>) and its own tab navigation instead of relying on
// an external nav/routeData pair.
export default function KeyDrive() {
  const account = useActiveAccount();
  const { disconnect } = useDisconnect();
  const routerNavigate = useNavigate();
  const isMobile = useMobile(DESKTOP_BP);
  const [tab, setTab] = useState('home');
  const [history, setHistory] = useState(SEED_HISTORY);

  if (!account) {
    return <KeyPayLogin onSuccess={() => {}} onBack={() => routerNavigate('/')} />;
  }

  return (
    <div style={{ position:'fixed', inset:0, background:BLACK, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'14px 18px 10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontFamily:FONT_H, fontWeight:900, fontSize:19, color:WHITE, letterSpacing:'-0.03em' }}>Key Go</span>
          <span style={{ fontSize:10.5, padding:'3px 8px', borderRadius:999, background:`${GREEN}22`, color:GREEN, fontWeight:700, fontFamily:FONT_B }}>by KEYCHAIN</span>
        </div>
        {!isMobile && <DesktopNav tab={tab} setTab={setTab} />}
      </div>

      {tab === 'home' && <KeyDriveHome history={history} setHistory={setHistory} isMobile={isMobile} />}
      {tab === 'activity' && <ActivityScreen history={history} />}
      {tab === 'account' && <AccountScreen onLogout={() => disconnect()} />}

      {isMobile && <TabBar tab={tab} setTab={setTab} />}
    </div>
  );
}
