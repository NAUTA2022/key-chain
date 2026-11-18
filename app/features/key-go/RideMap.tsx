import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression, LatLngTuple } from 'leaflet';

/** Any geographic point; callers may pass richer objects (e.g. named places). */
export type LatLng = { lat: number; lng: number };

const GREEN = '#06C167';
const WHITE = '#ffffff';
const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function dotIcon(color: string, size = 14) {
  return L.divIcon({
    className: 'keydrive-dot',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #000;box-shadow:0 0 0 2px ${color}55"></div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2],
  });
}
// A directional chevron, like Uber/Google Maps' own vehicle marker — unlike
// a literal car glyph, a chevron reads correctly rotated to any heading.
function carIcon(color: string, heading = 0) {
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
type MapControllerProps = {
  pickup?: LatLng | null;
  dest?: LatLng | null;
  carPos?: LatLng | null;
  phase: string;
};

function MapController({ pickup, dest, carPos, phase }: MapControllerProps) {
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
export type RideMapProps = {
  pickup?: LatLng | null;
  dest?: LatLng | null;
  phase: string;
  carPos?: LatLng | null;
  heading?: number;
  routeCoords?: LatLng[] | null;
};

export default function RideMap({ pickup, dest, phase, carPos, heading, routeCoords }: RideMapProps) {
  const center: LatLngExpression = pickup ? [pickup.lat, pickup.lng] : [-34.596, -58.3838];
  const activeOpacity = phase === 'options' || phase === 'confirm' ? 0.95 : 0.4;
  return (
    <MapContainer center={center} zoom={13} zoomControl={false} scrollWheelZoom attributionControl={false} style={{ width:'100%', height:'100%' }}>
      <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
      <MapController pickup={pickup} dest={dest} carPos={carPos} phase={phase} />
      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={dotIcon(GREEN)} />}
      {dest && <Marker position={[dest.lat, dest.lng]} icon={dotIcon(WHITE)} />}
      {pickup && dest && (
        routeCoords && routeCoords.length > 1 ? (
          <Polyline positions={routeCoords.map((c): LatLngTuple => [c.lat, c.lng])} pathOptions={{ color: GREEN, weight: 4, opacity: activeOpacity }} />
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
