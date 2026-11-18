// ─── Maps (OpenStreetMap via Leaflet — no API key required) ──────────────────
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple } from 'leaflet';
// Type-only import: erased at build time, so it doesn't pull Bookey into this lazy chunk.
import type { BookeyNav, BookeyProperty } from '~/features/bookey/Bookey';

const A = '#8B5A2B'; // Bookey accent brown (keep in sync with Bookey.tsx)

// Custom div-icons instead of Leaflet's default marker image, which sidesteps
// the classic "marker icon 404s under Vite" bundling issue entirely and lets
// the pins match Bookey's own accent color instead of a generic red teardrop.
const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function priceBubbleIcon(price: number, active: boolean) {
  const html = `<div style="
    background:${active ? A : '#fff'}; color:${active ? '#fff' : '#15161a'};
    font-family:'DM Sans',sans-serif; font-weight:700; font-size:13px;
    padding:6px 13px; border-radius:999px; white-space:nowrap;
    box-shadow:0 6px 18px rgba(15,18,25,0.18);
    border:1.5px solid ${active ? A : 'rgba(15,18,25,0.08)'};
    transition:transform 0.15s;
  ">$${price}</div>`;
  return L.divIcon({ className: 'bookey-price-marker', html, iconSize: [58, 30], iconAnchor: [29, 15] });
}

function pinIcon() {
  const html = `<div style="
    width:30px; height:30px; border-radius:50% 50% 50% 0; transform:rotate(-45deg);
    background:${A}; box-shadow:0 6px 16px rgba(108,99,255,0.45); border:3px solid #fff;
    display:flex; align-items:center; justify-content:center;
  "><div style="transform:rotate(45deg); width:8px; height:8px; border-radius:50%; background:#fff;"></div></div>`;
  return L.divIcon({ className: 'bookey-pin', html, iconSize: [30, 30], iconAnchor: [15, 30] });
}

type FitBoundsProps = { points: LatLngTuple[] };

function FitBounds({ points }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [48, 48] });
  }, [points, map]);
  return null;
}

// Multi-marker map for the search results — one price bubble per property.
export type SearchMapProps = {
  properties: BookeyProperty[];
  activeId?: number | null;
  onHover?: (id: number | null) => void;
  nav: BookeyNav;
};

export function SearchMap({ properties, activeId, onHover, nav }: SearchMapProps) {
  const points = useMemo(() => properties.map((p): LatLngTuple => [p.lat, p.lng]), [properties]);
  return (
    <MapContainer center={points[0] || [20, 0]} zoom={4} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
      <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
      <FitBounds points={points} />
      {properties.map(p => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={priceBubbleIcon(Math.round(p.price * (1 - p.investor_discount / 100)), activeId === p.id)}
          eventHandlers={{
            click: () => nav('bookey-detail', p),
            mouseover: () => onHover?.(p.id),
            mouseout: () => onHover?.(null),
          }}
        />
      ))}
    </MapContainer>
  );
}

// Single-marker map for a property's own location on its detail page.
export type LocationMapProps = { lat: number; lng: number };

export function LocationMap({ lat, lng }: LocationMapProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={13} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} style={{ width: '100%', height: '100%' }}>
      <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
      <Marker position={[lat, lng]} icon={pinIcon()} />
    </MapContainer>
  );
}
