import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useCombobox } from 'downshift';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ConnectButton } from 'thirdweb/react';
import { useSessionAccount, useSessionDisconnect } from '../lib/devSession';
import { polygon } from 'thirdweb/chains';
import { client } from '../lib/client';
import Login from './Login';
import { COIN_ICON_URL, CartCheckout, KP_VARS } from './KeyPay';
import { addPendingPayment, getPendingPayments } from '../lib/keypayInbox';
import { useMobile } from '../hooks/useMobile';

// ─── Design tokens ────────────────────────────────────────────────────────────
const A  = '#8B5A2B'; // accent brown
const A2 = '#4ECDC4'; // teal
const G  = '#15803d'; // green — dark enough for text contrast on white

// ─── Icons (no emojis — same stroke-icon language as the amenity set below) ──
const BIcons = {
  globe:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>,
  beach:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 8c0 4-5 9-5 9S7 12 7 8a5 5 0 0110 0z"/><path d="M3 20h18"/></svg>,
  mountain: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 20l6-11 4 6 2-3 6 8H3z"/><circle cx="18" cy="6" r="2"/></svg>,
  city:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 20V9l5-4v15M4 20h16M9 20V9l5 4v7M14 13V6l5 3v11"/></svg>,
  wine:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 3h8M12 15v6M9 21h6"/><path d="M8 3c0 5 0 8 4 8s4-3 4-8"/></svg>,
  sparkle:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></svg>,
  leaf:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 20c9 0 14-5 14-14 0-1 0-2-.1-2.9C9.9 3.6 5 8.5 5 17c0 1 0 2 0 3z"/><path d="M5 20c3-3 6-7 8-11"/></svg>,
  wave:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>,
  token:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z"/></svg>,
  medal:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="9" r="6"/><path d="M9 14.5L7 22l5-3 5 3-2-7.5"/></svg>,
  check:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  checkCircle: <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clipboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 11h6M9 15h6"/></svg>,
  lock:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>,
  search:   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  palmIsland: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22c0-6 1-10 4-13"/><path d="M12 9c-3-3-7-2-9 1 3 1 6 0 9-1zM12 9c3-3 7-2 9 1-3 1-6 0-9-1zM12 9c-1-3 0-6 3-8-1 3-1 6-3 8z"/></svg>,
  coin:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1 2.5 2c0 2-5 1.5-5 3.5 0 1 1.1 2 2.5 2s2.5-1.1 2.5-2.5"/></svg>,
  logo:     <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="1.6"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/><circle cx="12" cy="15" r="1.3" fill={A} stroke="none"/></svg>,
  camera:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8a2 2 0 012-2h2l1.5-2h5L16 6h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="3.5"/></svg>,
  edit:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  briefcase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M2 13h20"/></svg>,
  cap:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 4L2 9l10 5 10-5-10-5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/></svg>,
  paw:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="8" r="1.8"/><circle cx="12" cy="5.5" r="1.8"/><circle cx="17" cy="8" r="1.8"/><path d="M8 15c-2.5 0-3.5 2-3.5 3.5S6 21 8 21c1.3 0 2-.6 4-.6s2.7.6 4 .6c2 0 3.5-1 3.5-2.5S18.5 15 16 15c-1.5 0-2.7 1-4 1s-2.5-1-4-1z"/></svg>,
  person:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  shieldCheck: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/><path d="M9 12l2 2 4-4"/></svg>,
  suitcase: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a1 1 0 011-1h6a1 1 0 011 1v2M3 12h18"/></svg>,
  heartOutline: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 4.5 5.8 4.5c2.2 0 3.7 1.2 4.7 2.7C11.5 5.7 13 4.5 15.2 4.5 19 4.5 20.6 8.4 22 11.7 19.5 16.4 12 21 12 21z"/></svg>,
  logout: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  hamburger: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  helpCircle: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 3.5"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/></svg>,
};

function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#ff385c' : 'rgba(0,0,0,0.5)'} stroke={filled ? '#ff385c' : '#fff'} strokeWidth={filled ? 0 : 1.6}>
      <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 4.5 5.8 4.5c2.2 0 3.7 1.2 4.7 2.7C11.5 5.7 13 4.5 15.2 4.5 19 4.5 20.6 8.4 22 11.7 19.5 16.4 12 21 12 21z"/>
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:'todos',      label:'Todos',        icon:BIcons.globe },
  { id:'playa',      label:'Playa',        icon:BIcons.beach },
  { id:'montaña',    label:'Montaña',      icon:BIcons.mountain },
  { id:'ciudad',     label:'Ciudad',       icon:BIcons.city },
  { id:'viñedo',     label:'Viñedos',      icon:BIcons.wine },
  { id:'lujo',       label:'Lujo',         icon:BIcons.sparkle },
  { id:'rural',      label:'Rural',        icon:BIcons.leaf },
  { id:'lago',       label:'Lago',         icon:BIcons.wave },
];

const AMENITIES_ICONS = {
  wifi:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>,
  pool:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12h20M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0M6 6a2 2 0 100-4 2 2 0 000 4zM6 6v6"/></svg>,
  parking:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>,
  kitchen:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 9h20v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9zM2 9V6a2 2 0 012-2h16a2 2 0 012 2v3M12 4v5"/></svg>,
  ac:        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="6" width="20" height="8" rx="2"/><path d="M7 14v4M12 14v4M17 14v4M6 10h.01M10 10h.01"/></svg>,
  tv:        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></svg>,
  gym:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6.5 6.5h11M6.5 17.5h11M4 10h2v4H4zM18 10h2v4h-2zM2 11h2v2H2zM20 11h2v2h-2z"/></svg>,
  washer:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M7 7h.01M10 7h2"/></svg>,
  terrace:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M9 21V13h6v8"/></svg>,
  jacuzzi:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M7 10V7a3 3 0 016 0v3M7 6c0-1.1.9-2 2-2"/></svg>,
  bbq:       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 18c0-3.9 3.1-7 7-7s7 3.1 7 7M12 11V6M8 6c0-2.2 1.8-4 4-4s4 1.8 4 4M3 20h18M12 6h.01"/></svg>,
  vineyard:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2C8 2 4 6 4 10c0 5 8 12 8 12s8-7 8-12c0-4-4-8-8-8z"/><path d="M12 6v8M8 8c1 1 2.5 1.5 4 1.5"/></svg>,
  beach:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 8c0 4-5 9-5 9S7 12 7 8a5 5 0 0110 0z"/><path d="M3 20h18"/></svg>,
  security:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/></svg>,
};

const PROPERTIES = [
  {
    id: 1, category: 'playa', type: 'vacacional', superhost: true, investor_discount: 18,
    name: 'Penthouse Frente al Mar', tagline: 'Lujo absoluto con vista al Caribe',
    location: 'Cartagena', city: 'Cartagena de Indias', country: 'Colombia',
    lat: 10.3910, lng: -75.4794,
    price: 280, unit: 'noche', guests: 8, bedrooms: 4, beds: 5, baths: 3,
    rating: 4.96, review_count: 142, owner: 'PropChain', verified: true,
    images: [
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&h=800&fit=crop&auto=format&q=85',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1540541338537-1220059af4dc?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    amenities: ['wifi','pool','ac','kitchen','tv','terrace','jacuzzi','security'],
    description: 'Bienvenido al máximo lujo caribeño. Este penthouse de diseño contemporáneo ocupa el último piso de la torre más exclusiva de Cartagena, con vistas de 360° al mar y a la Ciudad Amurallada. Cuatro habitaciones suite con baño privado, sala de estar triple altura y una piscina privada infinita en la terraza. Cada rincón fue diseñado por el arquitecto español Ramón Esteve.',
    host: { name: 'Carlos Torres', since: 2021, rating: 4.98, reviews: 89, superhost: true },
    reviews: [
      { name:'María F.', date:'Jun 2026', rating:5, text:'Increíble experiencia. La vista al amanecer desde la terraza es para quedarse sin palabras. El equipo de PropChain respondió cada consulta en minutos.' },
      { name:'James K.', date:'May 2026', rating:5, text:'Best property we have ever stayed at. The private pool, the design, everything is perfect. As a token holder we got an amazing discount too.' },
      { name:'Lucía P.', date:'Abr 2026', rating:5, text:'Superamos todas las expectativas. 4 noches que no olvidaremos. El descuento para inversores hace que sea imposible no repetir.' },
    ],
    rules: ['No fumadores','No mascotas','No fiestas','Check-in 15:00','Check-out 11:00'],
    checkin: '15:00', checkout: '11:00',
  },
  {
    id: 2, category: 'ciudad', type: 'residencial', superhost: true, investor_discount: 10,
    name: 'Apartamento Palermo Soho', tagline: 'En el corazón del barrio más cool de Buenos Aires',
    location: 'Buenos Aires', city: 'Palermo Soho, CABA', country: 'Argentina',
    lat: -34.5875, lng: -58.4257,
    price: 1800, unit: 'mes', guests: 2, bedrooms: 2, beds: 2, baths: 1,
    rating: 4.88, review_count: 67, owner: 'PropChain', verified: true,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop&auto=format&q=85',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    amenities: ['wifi','ac','kitchen','tv','washer','security','parking','gym'],
    description: 'Apartamento completamente amueblado con diseño de interiores profesional a metros de las mejores restaurantes y galerías de arte de Palermo. Dos ambientes amplios, cocina gourmet equipada, balcón corrido con parrilla y cochera cubierta incluida. Edificio boutique con gimnasio y salón de usos múltiples. Ideal para profesionales o parejas que buscan vivir la mejor versión de Buenos Aires.',
    host: { name: 'Valentina Ríos', since: 2020, rating: 4.94, reviews: 134, superhost: true },
    reviews: [
      { name:'Marco B.', date:'Jun 2026', rating:5, text:'Appartement magnifique dans le meilleur quartier. Tout était parfait, la qualité de la connexion internet, les équipements, la propreté.' },
      { name:'Sol M.', date:'May 2026', rating:4, text:'Muy buena ubicación y el dpto está impecable. El descuento de inversores hace que sea muy competitivo vs otras opciones de la zona.' },
    ],
    rules: ['No fumadores','No fiestas','Check-in 14:00','Check-out 10:00'],
    checkin: '14:00', checkout: '10:00',
  },
  {
    id: 3, category: 'viñedo', type: 'vacacional', superhost: false, investor_discount: 12,
    name: 'Villa Malbec, Valle de Uco', tagline: 'Dormí entre las vides bajo las estrellas de Mendoza',
    location: 'Mendoza', city: 'Valle de Uco, Mendoza', country: 'Argentina',
    lat: -33.6167, lng: -69.1833,
    price: 195, unit: 'noche', guests: 6, bedrooms: 3, beds: 4, baths: 2,
    rating: 4.92, review_count: 89, owner: 'VitivinARG', verified: true,
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop&auto=format&q=85',
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    amenities: ['wifi','vineyard','jacuzzi','bbq','kitchen','terrace','ac','parking'],
    description: 'Una villa boutique rodeada de 8 hectáreas de viñedos Malbec a 1.100 metros de altura en el Valle de Uco. Despertate con las cumbres nevadas de los Andes como fondo y terminá el día con una copa del vino que nació a metros de tu cama. Incluye degustación privada para 6 personas y acceso a bodega tokenizada. Los ingresos del vino producido son distribuidos a los holders del token.',
    host: { name: 'Ernesto Malbec', since: 2022, rating: 4.89, reviews: 56, superhost: false },
    reviews: [
      { name:'Pierre D.', date:'May 2026', rating:5, text:'Extraordinaire. La dégustation privée dans la cave était une expérience inoubliable. La propriété est exactement comme sur les photos.' },
      { name:'Ana B.', date:'Abr 2026', rating:5, text:'Simplesmente perfeito. A vista para os Andes ao amanhecer é indescritível. Voltaremos com certeza.' },
    ],
    rules: ['No fumadores','No mascotas en viñedo','Check-in 16:00','Check-out 12:00'],
    checkin: '16:00', checkout: '12:00',
  },
  {
    id: 4, category: 'ciudad', type: 'residencial', superhost: true, investor_discount: 8,
    name: 'Loft Ejecutivo Chamberí', tagline: 'Tu oficina + hogar en el Madrid más exclusivo',
    location: 'Madrid', city: 'Chamberí, Madrid', country: 'España',
    lat: 40.4326, lng: -3.7038,
    price: 2400, unit: 'mes', guests: 2, bedrooms: 1, beds: 1, baths: 1,
    rating: 4.81, review_count: 34, owner: 'EuroRent', verified: true,
    images: [
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=800&fit=crop&auto=format&q=85',
      'https://images.unsplash.com/photo-1463797221720-6b07e6426c24?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    amenities: ['wifi','ac','tv','kitchen','washer','gym','security','parking'],
    description: 'Loft de 85 m² con techos de 4 metros en el barrio más cotizado de Madrid. Espacio de trabajo integrado con fibra óptica simétrica de 1 Gbps, sala de reuniones compartida en el edificio y recepción 24hs. Diseño nórdico con materiales de primera calidad. A 3 minutos a pie del metro Alonso Martínez. Contracto de arrendamiento mínimo 3 meses, con descuento del 8% para inversores KEYCHAIN.',
    host: { name: 'Isabel Moreno', since: 2019, rating: 4.92, reviews: 201, superhost: true },
    reviews: [
      { name:'Thomas H.', date:'Jun 2026', rating:5, text:'Perfect location for business travel. The workspace is excellent and the building services are top notch. Would stay again without hesitation.' },
      { name:'Camille R.', date:'Mar 2026', rating:4, text:'Très bonne adresse pour une expatriation de courte durée. La remise investisseur est vraiment intéressante.' },
    ],
    rules: ['No fumadores','Silencio 22:00–8:00','Check-in 14:00','Check-out 12:00'],
    checkin: '14:00', checkout: '12:00',
  },
  {
    id: 5, category: 'playa', type: 'vacacional', superhost: true, investor_discount: 20,
    name: 'Casa Playera Miami Shores', tagline: 'Cinco habitaciones, playa privada y piscina infinita',
    location: 'Miami', city: 'Miami Shores, Florida', country: 'EE.UU.',
    lat: 25.8676, lng: -80.1836,
    price: 450, unit: 'noche', guests: 10, bedrooms: 5, beds: 6, baths: 4,
    rating: 4.97, review_count: 211, owner: 'PropChain', verified: true,
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop&auto=format&q=85',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    amenities: ['wifi','pool','beach','bbq','kitchen','ac','jacuzzi','security','parking','tv'],
    description: 'Propiedad icónica de Miami Shores con acceso directo a playa privada. Cinco suites con baño en suite, sala de cine, barra húmeda y barbacoa exterior para 20 personas. Piscina infinita con borde vidriado al océano, jacuzzi de hidroterapia y muelle privado para embarcaciones. El inmueble está tokenizado y cada noche que no está reservada genera rendimiento distribuido a los holders.',
    host: { name: 'Robert Miami', since: 2020, rating: 4.99, reviews: 178, superhost: true },
    reviews: [
      { name:'Alexandra V.', date:'Jun 2026', rating:5, text:'Absolutely stunning property. The private beach access and the view from the infinity pool are worth every penny. Investor discount makes it even better.' },
      { name:'Miguel Á.', date:'May 2026', rating:5, text:'La mejor casa que hemos rentado en Miami. El equipo de PropChain es muy profesional y el descuento de inversores fue una sorpresa increíble.' },
      { name:'Yuki T.', date:'Abr 2026', rating:5, text:'Perfect for a family gathering. 5 bedrooms, private beach, pool. Everything was immaculate. Highly recommended.' },
    ],
    rules: ['No fumadores dentro','No mascotas','Max 10 personas','Check-in 16:00','Check-out 11:00'],
    checkin: '16:00', checkout: '11:00',
  },
  {
    id: 6, category: 'montaña', type: 'vacacional', superhost: false, investor_discount: 12,
    name: 'Cabaña Andina Bariloche', tagline: 'Nieve, bosques y silencio a 5 min del cerro',
    location: 'Bariloche', city: 'San Carlos de Bariloche', country: 'Argentina',
    lat: -41.1335, lng: -71.3103,
    price: 145, unit: 'noche', guests: 4, bedrooms: 2, beds: 3, baths: 1,
    rating: 4.85, review_count: 56, owner: 'AndesToken', verified: false,
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop&auto=format&q=85',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1475688621402-4257c812d6db?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    amenities: ['wifi','bbq','kitchen','tv','terrace','parking','security'],
    description: 'Cabaña de madera nativa con diseño de arquitecta patagónica a 3 km del centro de Bariloche y a 5 minutos de la base del Cerro Catedral. Dos dormitorios en suite, cocina equipada, galería con vista al lago Nahuel Huapi y salamandra a leña. Ideal para esquí en invierno y trekking en verano. Incluye equipo básico de montaña.',
    host: { name: 'Florencia D.', since: 2023, rating: 4.82, reviews: 38, superhost: false },
    reviews: [
      { name:'Pablo S.', date:'Jul 2025', rating:5, text:'La ubicación es perfecta para esquiar. La cabaña es preciosa y la salamandra hace el ambiente ideal para las noches frías de Bariloche.' },
    ],
    rules: ['No fumadores dentro','Mascotas pequeñas OK','Check-in 15:00','Check-out 10:00'],
    checkin: '15:00', checkout: '10:00',
  },
];

// Destination autocomplete data — derived from the listings themselves
// (no geocoding API available here), deduped by city.
const DESTINATIONS = Array.from(
  new Map(PROPERTIES.map(p => [p.city, { city: p.city, location: p.location, country: p.country }])).values()
);

// Booking history is simulated (no backend) — seeded against real PROPERTIES
// entries so "Mis arriendos" on the profile page has something real to show.
const MY_BOOKINGS = [
  { id: 'b1', propertyId: 1, checkIn: '2025-12-09', checkOut: '2026-01-10', status: 'Completado' },
  { id: 'b2', propertyId: 5, checkIn: '2025-08-03', checkOut: '2025-08-13', status: 'Completado' },
  { id: 'b3', propertyId: 3, checkIn: '2025-07-15', checkOut: '2025-07-20', status: 'Completado' },
];

// Saved/liked properties — also localStorage-backed (no backend), read fresh
// on mount by whichever card/page needs it rather than kept in a shared
// store, since Home/Detail/Favorites are never mounted at the same time.
const FAVORITES_KEY = 'bookey_favorites';
function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveFavorites(set) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}

// ─── Maps (OpenStreetMap via Leaflet — no API key required) ──────────────────
// Custom div-icons instead of Leaflet's default marker image, which sidesteps
// the classic "marker icon 404s under Vite" bundling issue entirely and lets
// the pins match Bookey's own accent color instead of a generic red teardrop.
const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function priceBubbleIcon(price, active) {
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

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [48, 48] });
  }, [points, map]);
  return null;
}

// Multi-marker map for the search results — one price bubble per property.
function SearchMap({ properties, activeId, onHover, nav }) {
  const points = useMemo(() => properties.map(p => [p.lat, p.lng]), [properties]);
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
function LocationMap({ lat, lng }) {
  return (
    <MapContainer center={[lat, lng]} zoom={13} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} style={{ width: '100%', height: '100%' }}>
      <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
      <Marker position={[lat, lng]} icon={pinIcon()} />
    </MapContainer>
  );
}

// ─── Mini calendar (visual only) ──────────────────────────────────────────────
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS   = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

function MiniCalendar({ month, year, selected, onSelect, blockedDates = [] }) {
  const firstDay = new Date(year, month, 1).getDay();
  const offset   = firstDay === 0 ? 6 : firstDay - 1;
  const days     = new Date(year, month + 1, 0).getDate();
  const today    = new Date();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const isSelected = (d) => {
    if (!d || !selected.from) return false;
    const dt = new Date(year, month, d);
    if (selected.from && !selected.to) return dt.getTime() === selected.from.getTime();
    if (selected.from && selected.to) return dt >= selected.from && dt <= selected.to;
    return false;
  };
  const isStart = (d) => {
    if (!d || !selected.from) return false;
    return new Date(year, month, d).getTime() === selected.from.getTime();
  };
  const isEnd = (d) => {
    if (!d || !selected.to) return false;
    return new Date(year, month, d).getTime() === selected.to.getTime();
  };
  const isPast = (d) => {
    if (!d) return false;
    return new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  return (
    <div>
      <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14, color:'var(--text)', textAlign:'center', marginBottom:12 }}>
        {MONTHS[month]} {year}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:'center', fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', padding:'4px 0' }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const sel = isSelected(d);
          const start = isStart(d);
          const end   = isEnd(d);
          const past  = isPast(d);
          return (
            <div key={i}
              onClick={() => d && !past && onSelect(new Date(year, month, d))}
              style={{
                textAlign:'center', padding:'7px 0', borderRadius:8,
                fontFamily:'var(--font-b)', fontSize:13,
                cursor: d && !past ? 'pointer' : 'default',
                background: (start || end) ? A : sel ? `${A}22` : 'transparent',
                color: past ? 'var(--ter)' : (start || end) ? '#fff' : sel ? A : d ? 'var(--text)' : 'transparent',
                fontWeight: (start || end) ? 700 : 400,
                transition: 'background 0.15s',
              }}>
              {d || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({ value, onChange }) {
  const today = new Date();
  const [m1, setM1] = useState({ month: today.getMonth(), year: today.getFullYear() });
  const m2 = m1.month === 11
    ? { month: 0, year: m1.year + 1 }
    : { month: m1.month + 1, year: m1.year };

  const handleSelect = (date) => {
    if (!value.from || (value.from && value.to)) {
      onChange({ from: date, to: null });
    } else if (date < value.from) {
      onChange({ from: date, to: value.from });
    } else {
      onChange({ from: value.from, to: date });
    }
  };

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <button onClick={() => setM1(p => p.month === 0 ? { month:11, year:p.year-1 } : { month:p.month-1, year:p.year })}
          style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--sec)', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <div style={{ flex:1 }} />
        <button onClick={() => setM1(p => p.month === 11 ? { month:0, year:p.year+1 } : { month:p.month+1, year:p.year })}
          style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--sec)', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28 }}>
        <MiniCalendar {...m1} selected={value} onSelect={handleSelect} />
        <MiniCalendar {...m2} selected={value} onSelect={handleSelect} />
      </div>
      {(value.from || value.to) && (
        <button onClick={() => onChange({ from: null, to: null })}
          style={{ marginTop:12, padding:'6px 14px', borderRadius:999, border:'1px solid var(--border)', background:'transparent', color:'var(--ter)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12 }}>
          Limpiar fechas
        </button>
      )}
    </div>
  );
}

// ─── Search bar (Airbnb style) ────────────────────────────────────────────────
function SearchBar({ onSearch, initialQuery }) {
  const [dest, setDest]       = useState(initialQuery?.dest || '');
  const [dates, setDates]     = useState(initialQuery?.dates || { from: null, to: null });
  const [guests, setGuests]   = useState(initialQuery?.guests || 2);
  const [openDates, setOpenDates] = useState(false);
  const [openGuests, setOpenGuests] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpenDates(false); setOpenGuests(false); } };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const fmt = (d) => d ? d.toLocaleDateString('es-AR', { day:'numeric', month:'short' }) : null;
  const nights = dates.from && dates.to ? Math.max(1, Math.round((dates.to - dates.from) / 86400000)) : null;

  // Destino autocomplete (downshift) — only offers suggestions once at
  // least 3 characters were typed, matching city, region or country.
  const destSuggestions = useMemo(() => {
    const q = dest.trim().toLowerCase();
    if (q.length < 3) return [];
    return DESTINATIONS.filter(d =>
      d.city.toLowerCase().includes(q) || d.location.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
    );
  }, [dest]);

  const {
    isOpen: destOpen, getMenuProps, getInputProps, getItemProps, highlightedIndex,
  } = useCombobox({
    items: destSuggestions,
    inputValue: dest,
    onInputValueChange: ({ inputValue }) => setDest(inputValue || ''),
    itemToString: (item) => (item ? item.city : ''),
    onSelectedItemChange: ({ selectedItem }) => { if (selectedItem) setDest(selectedItem.city); },
  });
  const showDestMenu = destOpen && destSuggestions.length > 0;

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1px 1.1fr 1px 0.7fr 1px auto',
        alignItems:'center',
        background:'var(--surface)', border:'1.5px solid var(--border)',
        borderRadius:64, boxShadow:'0 4px 32px rgba(0,0,0,0.28)', overflow:'visible',
      }}>
        {/* Destino */}
        <div style={{ padding:'14px 24px', cursor:'text', position:'relative' }}>
          <div style={{ fontFamily:'var(--font-b)', fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:3 }}>Destino</div>
          <input {...getInputProps({
            placeholder: '¿A dónde vas?',
            style: { border:'none', background:'transparent', fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)', outline:'none', width:'100%' },
          })} />
          <ul {...getMenuProps()} style={{
            position:'absolute', top:'calc(100% + 10px)', left:8, right:8, zIndex:100, margin:0, listStyle:'none',
            background: showDestMenu ? 'var(--surface)' : 'transparent',
            border: showDestMenu ? '1px solid var(--border)' : 'none',
            borderRadius:18, boxShadow: showDestMenu ? '0 20px 60px rgba(0,0,0,0.5)' : 'none',
            padding: showDestMenu ? 8 : 0, overflow:'hidden',
          }}>
            {showDestMenu && destSuggestions.map((item, index) => (
              <li key={item.city} {...getItemProps({ item, index })}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, cursor:'pointer',
                  background: highlightedIndex === index ? 'var(--surface2)' : 'transparent',
                }}>
                <span style={{ color:'var(--ter)', display:'flex', flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                </span>
                <div>
                  <div style={{ fontFamily:'var(--font-b)', fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{item.city}</div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)' }}>{item.country}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ width:1, height:32, background:'var(--border)' }} />
        {/* Fechas */}
        <div onClick={() => { setOpenDates(o => !o); setOpenGuests(false); }}
          style={{ padding:'14px 24px', cursor:'pointer', userSelect:'none' }}>
          <div style={{ fontFamily:'var(--font-b)', fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:3 }}>
            {dates.from && dates.to ? `${nights} ${nights===1?'noche':'noches'}` : 'Llegada – Salida'}
          </div>
          <div style={{ fontFamily:'var(--font-b)', fontSize:14, color: dates.from ? 'var(--text)' : 'var(--ter)' }}>
            {dates.from && dates.to ? `${fmt(dates.from)} – ${fmt(dates.to)}` : 'Agregá fechas'}
          </div>
        </div>
        <div style={{ width:1, height:32, background:'var(--border)' }} />
        {/* Huéspedes */}
        <div onClick={() => { setOpenGuests(o => !o); setOpenDates(false); }}
          style={{ padding:'14px 24px', cursor:'pointer', userSelect:'none' }}>
          <div style={{ fontFamily:'var(--font-b)', fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:3 }}>Huéspedes</div>
          <div style={{ fontFamily:'var(--font-b)', fontSize:14, color: guests > 0 ? 'var(--text)' : 'var(--ter)' }}>
            {guests} {guests === 1 ? 'huésped' : 'huéspedes'}
          </div>
        </div>
        <div style={{ width:1, height:32, background:'var(--border)' }} />
        {/* Search button */}
        <div style={{ padding:'10px 12px 10px 8px' }}>
          <button onClick={() => onSearch({ dest, dates, guests })}
            style={{ width:52, height:52, borderRadius:40, border:'none', background:A, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 16px ${A}50` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>
      </div>

      {/* Date picker dropdown */}
      <AnimatePresence>
        {openDates && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            style={{ position:'absolute', top:'calc(100% + 12px)', left:'50%', transform:'translateX(-50%)', zIndex:100,
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:24,
              padding:'24px 28px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', minWidth:640 }}>
            <DateRangePicker value={dates} onChange={setDates} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guests dropdown */}
      <AnimatePresence>
        {openGuests && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            style={{ position:'absolute', top:'calc(100% + 12px)', right:0, zIndex:100,
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20,
              padding:'20px 24px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', minWidth:280 }}>
            {[['Adultos','18+',guests,v=>setGuests(v)],['Niños','2–17',0,()=>{}]].map(([label,sub,val,set]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border-l)' }}>
                <div>
                  <div style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{label}</div>
                  <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>{sub}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <button onClick={() => set(Math.max(1,val-1))} style={{ width:32, height:32, borderRadius:'50%', border:'1.5px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                  <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:16, color:'var(--text)', minWidth:16, textAlign:'center' }}>{val}</span>
                  <button onClick={() => set(val+1)} style={{ width:32, height:32, borderRadius:'50%', border:'1.5px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Property card (Airbnb-style, no border) ─────────────────────────────────
function PropertyCard({ p, nav }) {
  const [saved, setSaved] = useState(() => loadFavorites().has(p.id));
  const [imgIdx, setImgIdx] = useState(0);
  const price = Math.round(p.price * (1 - p.investor_discount / 100));

  const toggleSaved = (e) => {
    e.stopPropagation();
    const favs = loadFavorites();
    if (favs.has(p.id)) favs.delete(p.id); else favs.add(p.id);
    saveFavorites(favs);
    setSaved(favs.has(p.id));
  };

  return (
    <motion.div initial={{ y:16 }} animate={{ y:0 }} transition={{ duration:0.2 }}
      style={{ cursor:'pointer' }} onClick={() => nav('bookey-detail', p)}>
      {/* Photo */}
      <div style={{ position:'relative', borderRadius:18, overflow:'hidden', aspectRatio:'4/3', background:'var(--surface2)' }}>
        {/* initial={false}: only the carousel-arrow image *switch* crossfades —
            the first photo must never depend on a mount animation completing
            to be visible. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.img key={imgIdx} src={p.images[imgIdx]} alt={p.name}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        </AnimatePresence>

        {/* Nav dots */}
        {p.images.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setImgIdx(i => Math.max(0, i-1)); }}
              style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', color:'#fff', cursor:'pointer', fontSize:16, display: imgIdx===0 ? 'none' : 'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setImgIdx(i => Math.min(p.images.length-1, i+1)); }}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', color:'#fff', cursor:'pointer', fontSize:16, display: imgIdx===p.images.length-1 ? 'none' : 'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>›</button>
            <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4 }}>
              {p.images.map((_,i) => <div key={i} style={{ width: i===imgIdx ? 16 : 5, height:5, borderRadius:999, background:'rgba(255,255,255,0.9)', transition:'width 0.2s' }} />)}
            </div>
          </>
        )}

        {/* Heart */}
        <button onClick={toggleSaved}
          style={{ position:'absolute', top:12, right:12, background:'none', border:'none', cursor:'pointer', display:'flex', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
          <HeartIcon filled={saved} />
        </button>

        {/* Badges */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', flexDirection:'column', gap:5 }}>
          {p.superhost && <span style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', color:'#fff', fontSize:10.5, fontWeight:700, padding:'3px 10px', borderRadius:999 }}>Superhost</span>}
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:A, color:'#fff', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:999 }}>{BIcons.token} −{p.investor_discount}%</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'12px 2px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)', lineHeight:1.3, flex:1, marginRight:12 }}>{p.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#F5A623"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:13, color:'var(--text)' }}>{p.rating}</span>
          </div>
        </div>
        <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginTop:2 }}>{p.city}</div>
        <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginTop:2 }}>{p.bedrooms} hab. · {p.guests} huéspedes</div>
        <div style={{ marginTop:7, display:'flex', alignItems:'baseline', gap:4 }}>
          {price < p.price && <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', textDecoration:'line-through' }}>${p.price}</span>}
          <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:16, color:'var(--text)' }}>${price}</span>
          <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>/{p.unit}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Photo grid (Airbnb 1+4 layout) ──────────────────────────────────────────
function PhotoGrid({ images, onShowAll, isNarrow }) {
  const rowHeight = isNarrow ? 100 : 170;
  return (
    <div style={{ position:'relative', borderRadius:20, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:`${rowHeight}px ${rowHeight}px`, gap:6 }}>
      <div style={{ gridRow:'1/3', overflow:'hidden' }}>
        <img src={images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
      </div>
      {images.slice(1,5).map((img,i) => (
        <div key={i} style={{ overflow:'hidden' }}>
          <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        </div>
      ))}
      <button onClick={onShowAll}
        style={{ position:'absolute', bottom:16, right:16, padding:'9px 16px', borderRadius:10, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(12px)', border:'1.5px solid rgba(255,255,255,0.2)', color:'#fff', fontFamily:'var(--font-b)', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
        Ver todas las fotos
      </button>
    </div>
  );
}

// ─── Full screen gallery ──────────────────────────────────────────────────────
function Gallery({ images, onClose }) {
  const [idx, setIdx] = useState(0);
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:9999, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px' }}>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-b)', fontSize:14 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          Cerrar
        </button>
        <span style={{ fontFamily:'var(--font-b)', color:'rgba(255,255,255,0.6)', fontSize:14 }}>{idx+1} / {images.length}</span>
        <div style={{ width:80 }} />
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', padding:'0 60px' }}>
        <button onClick={() => setIdx(i => Math.max(0,i-1))} disabled={idx===0}
          style={{ position:'absolute', left:16, width:44, height:44, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.08)', color:'#fff', cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', opacity:idx===0?0.3:1 }}>‹</button>
        <AnimatePresence mode="wait">
          <motion.img key={idx} src={images[idx]} alt="" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
            style={{ maxHeight:'75vh', maxWidth:'100%', borderRadius:12, objectFit:'contain' }} />
        </AnimatePresence>
        <button onClick={() => setIdx(i => Math.min(images.length-1,i+1))} disabled={idx===images.length-1}
          style={{ position:'absolute', right:16, width:44, height:44, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.08)', color:'#fff', cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', opacity:idx===images.length-1?0.3:1 }}>›</button>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'16px 20px', overflowX:'auto' }}>
        {images.map((img,i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width:72, height:52, borderRadius:8, overflow:'hidden', padding:0, border:`2px solid ${i===idx ? '#fff' : 'transparent'}`, cursor:'pointer', flexShrink:0 }}>
            <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Booking widget ───────────────────────────────────────────────────────────
function BookingWidget({ p }) {
  const routerNavigate = useNavigate();
  const [dates, setDates]     = useState({ from:null, to:null });
  const [guests, setGuests]   = useState(2);
  const [showCal, setShowCal] = useState(false);
  const [mode, setMode]       = useState('reservar'); // 'reservar'|'arrendar'
  const [step, setStep]       = useState('idle'); // 'idle'|'confirmed'
  const [payToken, setPayToken] = useState('USDC');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  const price    = Math.round(p.price * (1 - p.investor_discount / 100));
  const nights   = dates.from && dates.to ? Math.max(1, Math.round((dates.to - dates.from) / 86400000)) : null;
  const subtotal = p.unit === 'noche' ? (nights || 1) * price : price;
  const fee      = Math.round(subtotal * 0.035);
  const total    = subtotal + fee;
  const saved    = Math.round((nights||1) * p.price * (p.investor_discount/100));

  // Booking never collects payment itself — it hands the charge off to
  // KeyPay's shared pending-payments inbox (same pattern as the main
  // platform's Checkout.jsx), then opens KeyPay's own Checkout screen where
  // thirdweb's CheckoutWidget actually charges the wallet.
  const handleReserve = () => {
    const id = addPendingPayment({ name: `Reserva — ${p.name}`, qty: 1, unit: total, source: 'Bookey' });
    setPaymentId(id);
    setCheckoutOpen(true);
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    if (paymentId && !getPendingPayments().some(x => x.id === paymentId)) setStep('confirmed');
    setPaymentId(null);
  };

  const fmt = (d) => d ? d.toLocaleDateString('es-AR', { day:'numeric', month:'short' }) : '—';

  if (step === 'confirmed') return (
    <div style={{ textAlign:'center', padding:'10px 0' }}>
      <motion.div initial={{ scale:0.8 }} animate={{ scale:1 }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>{BIcons.checkCircle}</div>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:8 }}>¡Reserva confirmada!</div>
        <div style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', lineHeight:1.6, marginBottom:20 }}>
          Recibirás los datos de acceso en tu wallet. Total cobrado: <b style={{ color:A }}>${total} {payToken}</b>
        </div>
        <button onClick={() => routerNavigate('/')}
          style={{ width:'100%', padding:'13px', borderRadius:14, background:`${A}18`, border:`1.5px solid ${A}40`, color:A, fontFamily:'var(--font-b)', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          Ver portal del inquilino en KEYCHAIN →
        </button>
        <button onClick={() => setStep('idle')}
          style={{ width:'100%', padding:'11px', borderRadius:14, background:'transparent', border:'none', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:13, cursor:'pointer', marginTop:8 }}>
          Nueva reserva
        </button>
      </motion.div>
    </div>
  );

  return (
    <div>
      {/* Price header */}
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--ter)', textDecoration:'line-through' }}>${p.price}</span>
          <span style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:26, color:'var(--text)' }}>${price}</span>
          <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--ter)' }}>/{p.unit}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#F5A623"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:13.5, color:'var(--text)' }}>{p.rating}</span>
          <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>({p.review_count})</span>
        </div>
      </div>

      {/* Investor discount badge */}
      <div style={{ padding:'7px 12px', borderRadius:10, background:`${A}14`, border:`1px solid ${A}30`, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:A, display:'flex' }}>{BIcons.token}</span>
        <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:A, fontWeight:600 }}>Precio inversor: −{p.investor_discount}% aplicado</span>
      </div>

      {/* Mode toggle (vacacional only) */}
      {p.type === 'vacacional' && (
        <div style={{ display:'flex', gap:4, padding:4, background:'var(--surface2)', borderRadius:12, marginBottom:14 }}>
          {['reservar','arrendar'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex:1, padding:'9px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:13, fontWeight:700, background: mode===m ? 'var(--surface)' : 'transparent', color: mode===m ? 'var(--text)' : 'var(--ter)', boxShadow: mode===m ? '0 2px 8px rgba(0,0,0,0.2)' : 'none', transition:'all 0.15s' }}>
              {m === 'reservar' ? 'Por noches' : 'Arrendar'}
            </button>
          ))}
        </div>
      )}

      {/* Crypto payment method */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontFamily:'var(--font-b)', fontSize:11, fontWeight:700, color:'var(--ter)', letterSpacing:'0.06em', marginBottom:8 }}>PAGÁS EN CRIPTO CON</div>
        <div style={{ display:'flex', gap:8 }}>
          {['USDC','KYCN'].map(tk => (
            <button key={tk} onClick={() => setPayToken(tk)}
              style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px', borderRadius:11, cursor:'pointer',
                border: payToken===tk ? `1.5px solid ${A}` : '1.5px solid var(--border)',
                background: payToken===tk ? `${A}0f` : 'transparent',
                fontFamily:'var(--font-b)', fontWeight:700, fontSize:13.5, color: payToken===tk ? A : 'var(--text)',
                transition:'all 0.15s',
              }}>
              <span style={{ width:18, height:18, borderRadius:'50%', overflow:'hidden', display:'flex', flexShrink:0 }}>
                <img src={COIN_ICON_URL[tk]} alt={tk} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </span>
              {tk}
            </button>
          ))}
        </div>
      </div>

      {/* Date picker */}
      <div style={{ border:'1.5px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
        <div onClick={() => setShowCal(s => !s)}
          style={{ display:'grid', gridTemplateColumns:'1fr 1fr', cursor:'pointer' }}>
          {[['LLEGADA', fmt(dates.from)],['SALIDA', fmt(dates.to)]].map(([label,val],i) => (
            <div key={label} style={{ padding:'10px 14px', borderRight: i===0 ? '1px solid var(--border)' : 'none', background: showCal ? `${A}08` : 'transparent' }}>
              <div style={{ fontFamily:'var(--font-b)', fontSize:10, fontWeight:700, color:'var(--ter)', letterSpacing:'0.06em', marginBottom:3 }}>{label}</div>
              <div style={{ fontFamily:'var(--font-b)', fontSize:14, color: (i===0?dates.from:dates.to) ? 'var(--text)' : 'var(--ter)' }}>{val}</div>
            </div>
          ))}
        </div>
        {/* Guests row */}
        <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--font-b)', fontSize:10, fontWeight:700, color:'var(--ter)', letterSpacing:'0.06em', marginBottom:3 }}>HUÉSPEDES</div>
            <div style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)' }}>{guests} {guests===1?'huésped':'huéspedes'}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setGuests(g => Math.max(1,g-1))} style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
            <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:15, color:'var(--text)', minWidth:14, textAlign:'center' }}>{guests}</span>
            <button onClick={() => setGuests(g => Math.min(p.guests,g+1))} style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid var(--border)', background:'transparent', cursor:'pointer', color:'var(--text)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
          </div>
        </div>
      </div>

      {/* Inline calendar */}
      <AnimatePresence>
        {showCal && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:'hidden', marginBottom:10 }}>
            <div style={{ padding:'18px 16px', background:'var(--surface2)', borderRadius:14 }}>
              <DateRangePicker value={dates} onChange={(v) => { setDates(v); if(v.from && v.to) setShowCal(false); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <button onClick={handleReserve}
        style={{ width:'100%', padding:'15px', borderRadius:14, background:A, border:'none', color:'#fff', fontFamily:'var(--font-h)', fontWeight:800, fontSize:16, cursor:'pointer', boxShadow:`0 6px 24px ${A}50`, marginBottom:12 }}>
        {p.unit === 'noche' ? `Reservar${nights ? ` · ${nights} noches` : ''}` : 'Arrendar'}
      </button>

      <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'var(--ter)', textAlign:'center', marginBottom:16 }}>
        Sin cargo hasta confirmar · Pago con {payToken} on-chain
      </div>

      {/* Price breakdown */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)', textDecoration:'underline', cursor:'pointer' }}>
            ${price} × {p.unit === 'noche' ? `${nights||1} noches` : '1 mes'}
          </span>
          <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)' }}>${subtotal}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)', textDecoration:'underline', cursor:'pointer' }}>Fee de servicio (3.5%)</span>
          <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)' }}>${fee}</span>
        </div>
        {saved > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:G }}>Ahorro inversor KEYCHAIN</span>
            <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:13.5, color:G }}>−${saved}</span>
          </div>
        )}
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:15, color:'var(--text)' }}>Total</span>
          <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:15, color:'var(--text)' }}>${total} {payToken}</span>
        </div>
      </div>

      {/* Checkout — handed off to KeyPay's own Checkout screen (CartCheckout),
          same as the rest of the platform (see Checkout.jsx + lib/keypayInbox.js).
          Rendered standalone (not the whole <KeyPay> shell) so there's no dark
          home-screen bleeding through behind it — CartCheckout already owns
          its own backdrop + centered card, it just needs the --kp-* theme
          variables an ancestor would normally set (see KeyPay's own root
          effect). Portaled straight to document.body: this widget lives
          inside a `position:sticky` sidebar (the booking widget's own
          wrapper in PropertyDetail), which forms its own stacking context. A
          plain `position:fixed` child stays trapped inside that context no
          matter its z-index, so Leaflet's own z-index:1000 controls/panes
          (see leaflet.css) render above it. Portaling out of the tree — same
          fix already used by Sidebar's SubsidiariesModal — avoids that. */}
      {createPortal(
        <AnimatePresence>
          {checkoutOpen && (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:'fixed', inset:0, zIndex:2000, ...KP_VARS }}
            >
              <CartCheckout onClose={handleCheckoutClose} focusId={paymentId} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ─── Property detail ──────────────────────────────────────────────────────────
function PropertyDetail({ p, nav }) {
  const [showGallery, setShowGallery] = useState(false);
  // Below this width the fixed 380px booking sidebar has nowhere to go —
  // stack everything into a single column instead (booking widget floats
  // up via `order`, right after the photos) so nothing overflows or gets
  // squeezed unreadable on tablet/mobile.
  const isNarrow = useMobile(960);

  return (
    <>
      <AnimatePresence>
        {showGallery && <Gallery images={p.images} onClose={() => setShowGallery(false)} />}
      </AnimatePresence>

      <div style={{ padding: isNarrow ? '0 16px 48px' : '0 32px 60px', maxWidth:1180, margin:'0 auto' }}>
        {/* Back */}
        <button onClick={() => nav('bookey')}
          style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor:'pointer', color:'var(--sec)', fontFamily:'var(--font-b)', fontSize:13.5, padding:'24px 0 18px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Volver a Bookey
        </button>

        {/* Title row */}
        <div style={{ display:'flex', flexDirection: isNarrow ? 'column' : 'row', alignItems: isNarrow ? 'flex-start' : 'flex-start', justifyContent:'space-between', gap: isNarrow ? 12 : 0, marginBottom:16 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize: isNarrow ? 22 : 28, color:'var(--text)', margin:0, letterSpacing:'-0.02em' }}>{p.name}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:6, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#F5A623"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{p.rating}</span>
                <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', textDecoration:'underline', cursor:'pointer' }}>({p.review_count} reseñas)</span>
              </div>
              {p.superhost && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--text)' }}>
                  · <span style={{ display:'flex' }}>{BIcons.medal}</span> Superhost
                </span>
              )}
              <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', textDecoration:'underline', cursor:'pointer' }}>· {p.city}</span>
            </div>
          </div>
          {p.verified && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:999, background:`${A}12`, border:`1px solid ${A}30`, flexShrink:0 }}>
              <span style={{ color:A, display:'flex' }}>{BIcons.token}</span>
              <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:A, fontWeight:700, whiteSpace:'nowrap' }}>Tokenizado en KEYCHAIN</span>
            </div>
          )}
        </div>

        {/* Photo grid */}
        <div style={{ marginBottom: isNarrow ? 28 : 40 }}>
          <PhotoGrid images={p.images} onShowAll={() => setShowGallery(true)} isNarrow={isNarrow} />
        </div>

        {/* Two column on desktop, single stacked column (booking widget
            floated to the top via order) once it can't fit side by side */}
        <div style={{ display:'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 380px', gap: isNarrow ? 32 : 64, alignItems:'start' }}>

          {/* ── Left ── */}
          <div style={{ order: isNarrow ? 1 : 0 }}>
            {/* Host + capacity */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:28, borderBottom:'1px solid var(--border-l)' }}>
              <div>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:4 }}>
                  {p.type==='vacacional' ? 'Alojamiento completo' : 'Apartamento completo'} gestionado por {p.owner}
                </div>
                <div style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)', display:'flex', gap:8 }}>
                  <span>{p.bedrooms} {p.bedrooms===1?'hab.':'habs.'}</span>·
                  <span>{p.beds} {p.beds===1?'cama':'camas'}</span>·
                  <span>{p.baths} {p.baths===1?'baño':'baños'}</span>·
                  <span>Hasta {p.guests} huéspedes</span>
                </div>
              </div>
              <div style={{ width:52, height:52, borderRadius:'50%', background:A, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, color:'#fff', flexShrink:0 }}>
                {p.host.name.slice(0,1)}
              </div>
            </div>

            {/* Features */}
            <div style={{ padding:'28px 0', borderBottom:'1px solid var(--border-l)', display:'flex', flexDirection:'column', gap:16 }}>
              {[
                { icon:BIcons.token, title:`Token KEYCHAIN · −${p.investor_discount}% para inversores`, desc:'El activo está tokenizado on-chain. Holders de tokens acceden a descuentos exclusivos y rendimientos.' },
                { icon:BIcons.medal, title: p.superhost ? 'Superhost verificado' : 'Anfitrión verificado', desc:`${p.host.name} lleva ${new Date().getFullYear()-p.host.since} años en la plataforma con ${p.host.reviews} reseñas y calificación ${p.host.rating}.` },
                { icon:BIcons.clipboard, title:`Check-in ${p.checkin} · Check-out ${p.checkout}`, desc:'Acceso autónomo con código en tu wallet. El smart contract libera el acceso al confirmar el pago.' },
              ].map(f => (
                <div key={f.title} style={{ display:'flex', gap:16 }}>
                  <span style={{ color:A, flexShrink:0, marginTop:2, display:'flex' }}>{f.icon}</span>
                  <div>
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:3 }}>{f.title}</div>
                    <div style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', lineHeight:1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div style={{ padding:'28px 0', borderBottom:'1px solid var(--border-l)' }}>
              <p style={{ fontFamily:'var(--font-b)', fontSize:15, color:'var(--sec)', lineHeight:1.75, margin:0 }}>{p.description}</p>
            </div>

            {/* Amenities */}
            <div style={{ padding:'28px 0', borderBottom:'1px solid var(--border-l)' }}>
              <h3 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:20, marginTop:0 }}>Lo que este espacio ofrece</h3>
              <div style={{ display:'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap:12 }}>
                {p.amenities.map(key => {
                  const labels = { wifi:'Wi-Fi', pool:'Piscina', parking:'Estacionamiento', kitchen:'Cocina equipada', ac:'Aire acondicionado', tv:'Smart TV', gym:'Gimnasio', washer:'Lavarropas', terrace:'Terraza/Balcón', jacuzzi:'Jacuzzi', bbq:'Parrilla/BBQ', vineyard:'Viñedo privado', beach:'Acceso a playa', security:'Seguridad 24hs' };
                  return (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0' }}>
                      <span style={{ color:'var(--text)', flexShrink:0 }}>{AMENITIES_ICONS[key]}</span>
                      <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)' }}>{labels[key]||key}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar section */}
            <div style={{ padding:'28px 0', borderBottom:'1px solid var(--border-l)' }}>
              <h3 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:6, marginTop:0 }}>Disponibilidad</h3>
              <p style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--ter)', marginBottom:20, marginTop:0 }}>Podés agregar las fechas en el panel de reserva →</p>
              <div style={{ pointerEvents:'none', opacity:0.7 }}>
                <DateRangePicker value={{ from:null, to:null }} onChange={() => {}} />
              </div>
            </div>

            {/* Location */}
            <div style={{ padding:'28px 0', borderBottom:'1px solid var(--border-l)' }}>
              <h3 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)', marginBottom:6, marginTop:0 }}>Dónde vas a estar</h3>
              <p style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)', marginBottom:16, marginTop:0 }}>{p.city}, {p.country}</p>
              <div style={{ height:280, borderRadius:20, overflow:'hidden', border:'1px solid var(--border-l)' }}>
                <LocationMap lat={p.lat} lng={p.lng} />
              </div>
            </div>

            {/* Reviews */}
            <div style={{ padding:'28px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5A623"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <h3 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)', margin:0 }}>{p.rating} · {p.review_count} reseñas</h3>
              </div>

              {/* Rating bars */}
              <div style={{ display:'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap:'8px 32px', marginBottom:32 }}>
                {[['Limpieza','4.9'],['Comunicación','5.0'],['Check-in','4.8'],['Precio/calidad','4.7'],['Ubicación','4.9'],['Precisión','4.8']].map(([cat,val]) => (
                  <div key={cat} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', minWidth:100 }}>{cat}</span>
                    <div style={{ flex:1, height:3, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
                      <div style={{ width:`${parseFloat(val)/5*100}%`, height:'100%', background:'var(--text)', borderRadius:999 }} />
                    </div>
                    <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:13, color:'var(--text)', minWidth:24 }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap:24 }}>
                {p.reviews.map((r,i) => (
                  <div key={i}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:A, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'#fff', flexShrink:0 }}>
                        {r.name.slice(0,1)}
                      </div>
                      <div>
                        <div style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{r.name}</div>
                        <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>{r.date}</div>
                      </div>
                    </div>
                    <p style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)', lineHeight:1.65, margin:0 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: booking widget ── */}
          <div style={{ position: isNarrow ? 'static' : 'sticky', top:88, order: isNarrow ? 0 : 1 }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border-l)', borderRadius:24, padding:'24px 24px', boxShadow:'0 8px 40px rgba(0,0,0,0.28)' }}>
              <BookingWidget p={p} />
            </div>

            {/* Trust signals */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:20 }}>
              {[[BIcons.token,'Smart contract auditado en Polygon'],[BIcons.lock,'Pago protegido por escrow on-chain'],[BIcons.check,'Propiedad tokenizada y auditada']].map(([ic,txt]) => (
                <div key={txt} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ color:'var(--ter)', display:'flex' }}>{ic}</span>
                  <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>{txt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
const HERO_PILLS = [
  { icon:BIcons.palmIsland, text:'Vacacional o residencial' },
  { icon:BIcons.coin, text:'Pagá en cripto' },
  { icon:BIcons.token, text:'Descuento si sos inversor' },
];

function HeroBlobs() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      <motion.div
        animate={{ x:[0,30,0], y:[0,-20,0] }} transition={{ duration:14, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', top:'-10%', left:'6%', width:340, height:340, borderRadius:'50%', background:`${A}16`, filter:'blur(60px)' }} />
      <motion.div
        animate={{ x:[0,-24,0], y:[0,24,0] }} transition={{ duration:16, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', top:'8%', right:'10%', width:280, height:280, borderRadius:'50%', background:`${A2}18`, filter:'blur(60px)' }} />
      <motion.div
        animate={{ x:[0,16,0], y:[0,-16,0] }} transition={{ duration:11, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', bottom:'-14%', left:'38%', width:260, height:260, borderRadius:'50%', background:`${G}12`, filter:'blur(60px)' }} />
    </div>
  );
}

function BookeyHome({ nav, query, searched, onSearch }) {
  const [cat, setCat]     = useState('todos');
  const [view, setView]   = useState('grid'); // 'grid' | 'map'
  const [hoverId, setHoverId] = useState(null);
  const catRef = useRef(null);

  const filtered = useMemo(() => PROPERTIES.filter(p => {
    if (cat !== 'todos' && p.category !== cat) return false;
    if (query.dest) {
      const q = query.dest.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.country.toLowerCase().includes(q);
    }
    return true;
  }), [cat, query.dest]);

  // Once a search runs, jump straight to the split grid+map layout — same
  // as Airbnb's results page — instead of leaving the user on the plain grid.
  const handleSearch = (q) => { onSearch(q); setView('map'); };

  return (
    <div style={{ minHeight:'100%', background:'var(--bg)' }}>
      {/* Hero — hidden once a search has run, same as Airbnb dropping its
          marketing hero for the results page. HeroBlobs clips itself (own
          overflow:hidden wrapper), so this container stays unclipped: it
          must not cut off the SearchBar's date/guests dropdowns, which are
          absolutely positioned relative to it and can extend past its
          bottom edge. */}
      {!searched && (
        <div style={{ position:'relative', borderBottom:'1px solid var(--border-l)', padding:'56px 32px 36px' }}>
          <HeroBlobs />
          <div style={{ position:'relative', maxWidth:860, margin:'0 auto' }}>
            {/* Logo — content is opacity:1 from frame one; motion only ever
                adds a settle-in slide, so nothing can render invisible if an
                entrance animation stalls (e.g. rAF throttled in a background
                tab) or reduced-motion kicks in. */}
            <motion.div initial={{ y:-8 }} animate={{ y:0 }}
              style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, justifyContent:'center' }}>
              <span style={{ display:'flex' }}>{BIcons.logo}</span>
              <span style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:34, color:'var(--text)', letterSpacing:'-0.03em' }}>Bookey</span>
              <span style={{ padding:'3px 10px', borderRadius:999, background:`${A}14`, color:A, fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>by KEYCHAIN</span>
            </motion.div>

            <motion.h1
              initial={{ y:14 }} animate={{ y:0 }} transition={{ delay:0.08, duration:0.5 }}
              style={{ textAlign:'center', fontFamily:'var(--font-h)', fontWeight:900, fontSize:40, letterSpacing:'-0.04em', lineHeight:1.08, color:'var(--text)', margin:'0 0 14px' }}>
              Tu próxima estadía,{' '}
              <span style={{ color:A }}>tokenizada</span>.
            </motion.h1>

            <p style={{ textAlign:'center', fontFamily:'var(--font-b)', fontSize:15.5, color:'var(--sec)', margin:'0 0 24px', lineHeight:1.6 }}>
              Alquilá propiedades vacacionales o residenciales tokenizadas en Polygon. Pagá en cripto y, si sos inversor del activo, llevate descuento exclusivo.
            </p>

            {/* Value pills */}
            <motion.div initial="hidden" animate="show"
              variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.08, delayChildren:0.2 } } }}
              style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:32 }}>
              {HERO_PILLS.map(pill => (
                <motion.div key={pill.text}
                  variants={{ hidden:{ y:10, scale:0.96 }, show:{ y:0, scale:1 } }}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:999, background:'var(--surface)', border:'1px solid var(--border-l)', boxShadow:'var(--sh-sm)' }}>
                  <span style={{ fontSize:15 }}>{pill.icon}</span>
                  <span style={{ fontFamily:'var(--font-b)', fontSize:13, fontWeight:600, color:'var(--text)' }}>{pill.text}</span>
                </motion.div>
              ))}
            </motion.div>

            <SearchBar onSearch={handleSearch} initialQuery={query} />
          </div>
        </div>
      )}

      {/* Category scroll */}
      <div style={{ borderBottom:'1px solid var(--border-l)', padding:'0 32px', position:'sticky', top:64, background:'var(--bg)', zIndex:9 }}>
        <div ref={catRef} style={{ display:'flex', gap:4, justifyContent:'safe center', overflowX:'auto', scrollbarWidth:'none', padding:'14px 0', maxWidth:1180, margin:'0 auto' }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                padding:'8px 16px 10px', borderRadius:0, flexShrink:0,
                border:'none', borderBottom: `2px solid ${cat===c.id ? 'var(--text)' : 'transparent'}`,
                background:'transparent', cursor:'pointer',
                opacity: cat===c.id ? 1 : 0.5,
                transition:'all 0.15s',
              }}>
              <span style={{ fontSize:20 }}>{c.icon}</span>
              <span style={{ fontFamily:'var(--font-b)', fontSize:12, fontWeight: cat===c.id ? 700 : 500, color:'var(--text)', whiteSpace:'nowrap' }}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results heading — Airbnb-style, only once a search has actually run */}
      {searched && (
        <div style={{ padding:'28px 32px 0', maxWidth:1180, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:26, letterSpacing:'-0.02em', color:'var(--text)', margin:'0 0 6px' }}>
            {filtered.length} alojamiento{filtered.length===1?'':'s'}{query.dest ? ` en ${query.dest}` : ''}
          </h2>
          <div style={{ display:'flex', alignItems:'center', gap:7, fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)' }}>
            <span style={{ color:A, display:'flex' }}>{BIcons.token}</span>
            Los precios incluyen el descuento inversor cuando aplica
          </div>
        </div>
      )}

      {/* Investor banner */}
      <div style={{ padding:'20px 32px 0', maxWidth:1180, margin:'0 auto' }}>
        <motion.div initial={{ y:-8 }} animate={{ y:0 }}
          style={{ padding:'12px 18px', borderRadius:14, background:`${A}0f`, border:`1px solid ${A}25`, display:'flex', alignItems:'center', gap:12, marginBottom:0 }}>
          <span style={{ color:A, display:'flex', transform:'scale(1.5)' }}>{BIcons.token}</span>
          <div style={{ flex:1 }}>
            <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:13.5, color:A }}>Precio inversor activo · </span>
            <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--sec)' }}>Como holder de tokens KEYCHAIN, obtenés entre 8% y 20% de descuento en cada propiedad. El precio ya está aplicado en los listados.</span>
          </div>
        </motion.div>
      </div>

      {/* Results header + grid/map toggle */}
      <div style={{ padding:'28px 32px 0', maxWidth:1180, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)' }}>
          {filtered.length} {filtered.length===1?'propiedad':'propiedades'} {cat!=='todos' ? `en ${CATEGORIES.find(c=>c.id===cat)?.label}` : 'disponibles'}
        </div>
        <div style={{ display:'flex', gap:2, padding:3, background:'var(--surface2)', borderRadius:999 }}>
          {[['grid','Grilla'],['map','Mapa']].map(([id,label]) => (
            <button key={id} onClick={() => setView(id)}
              style={{
                padding:'7px 16px', borderRadius:999, border:'none', cursor:'pointer',
                fontFamily:'var(--font-b)', fontSize:12.5, fontWeight:700,
                background: view===id ? 'var(--surface)' : 'transparent',
                color: view===id ? 'var(--text)' : 'var(--ter)',
                boxShadow: view===id ? 'var(--sh-sm)' : 'none',
                transition:'all 0.15s',
              }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Grid or Grid+Map split */}
      {view === 'grid' ? (
        <div style={{ padding:'20px 32px 60px', maxWidth:1180, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:28 }}>
            {filtered.map(p => <PropertyCard key={p.id} p={p} nav={nav} />)}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'80px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:15 }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>{BIcons.search}</div>
              No se encontraron propiedades con esos filtros.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding:'20px 32px 60px', maxWidth:1180, margin:'0 auto', display:'grid', gridTemplateColumns:'0.85fr 1fr', gap:24, alignItems:'start' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:24, alignContent:'start', maxHeight:'calc(100vh - 260px)', overflowY:'auto', paddingRight:4 }}>
            {filtered.map(p => (
              <div key={p.id} onMouseEnter={() => setHoverId(p.id)} onMouseLeave={() => setHoverId(null)}>
                <PropertyCard p={p} nav={nav} />
              </div>
            ))}
          </div>
          <div style={{ position:'sticky', top:88, height:'calc(100vh - 260px)', borderRadius:24, overflow:'hidden', border:'1px solid var(--border-l)', boxShadow:'var(--sh-md)' }}>
            {filtered.length > 0
              ? <SearchMap properties={filtered} activeId={hoverId} onHover={setHoverId} nav={nav} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:14 }}>Sin resultados para mostrar en el mapa.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
// No backend here, so the editable fields (name/photo/bio) persist to
// localStorage instead — same lightweight pattern KeyPay already uses for
// its "tour seen" flag. Booking history is simulated (MY_BOOKINGS above).
const PROFILE_DEFAULTS = { name:'', photo:null, location:'', study:'', dest:'', job:'', pets:'No', bio:'' };
const PROFILE_KEY = 'bookey_profile';

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    return saved ? { ...PROFILE_DEFAULTS, ...saved } : { ...PROFILE_DEFAULTS };
  } catch {
    return { ...PROFILE_DEFAULTS };
  }
}

function BookeyProfile({ nav, initialTab = 'info' }) {
  const [profile, setProfile] = useState(loadProfile);
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState(initialTab); // 'info' | 'bookings'
  const fileRef = useRef(null);

  const save = (next) => {
    setProfile(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  };

  const startEdit = () => { setDraft(profile); setEditing(true); };
  const cancelEdit = () => { setDraft(profile); setEditing(false); };
  const confirmEdit = () => { save(draft); setEditing(false); };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => save({ ...profile, photo: reader.result });
    reader.readAsDataURL(file);
  };

  const bookings = MY_BOOKINGS
    .map(b => ({ ...b, property: PROPERTIES.find(p => p.id === b.propertyId) }))
    .filter(b => b.property)
    .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
  const bookingsByYear = bookings.reduce((acc, b) => {
    const year = new Date(b.checkIn).getFullYear();
    (acc[year] ||= []).push(b);
    return acc;
  }, {});

  const fmtDate = (d) => new Date(d).toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });

  const infoRows = [
    { key:'study', icon:BIcons.cap, label:'Dónde estudié', placeholder:'Ej. Universidad de Buenos Aires' },
    { key:'dest', icon:BIcons.globe, label:'A donde siempre quise ir', placeholder:'Ej. Japón' },
    { key:'job', icon:BIcons.briefcase, label:'A qué me dedico', placeholder:'Ej. Diseñador de producto' },
    { key:'pets', icon:BIcons.paw, label:'Mascotas', placeholder:'Ej. Sí, un gato' },
  ];

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'32px 32px 60px' }}>
      <button onClick={() => nav('bookey')}
        style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor:'pointer', color:'var(--sec)', fontFamily:'var(--font-b)', fontSize:13.5, padding:'0 0 24px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        Volver a Bookey
      </button>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:48, alignItems:'start' }}>
        {/* Left: tabs */}
        <div>
          <h1 style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:26, color:'var(--text)', margin:'0 0 24px' }}>Perfil</h1>
          {[['info','Información sobre mí', BIcons.person], ['bookings','Mis arriendos', BIcons.suitcase]].map(([id, label, icon]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 14px', borderRadius:14,
                border:'none', background: tab===id ? 'var(--surface2)' : 'transparent', cursor:'pointer', marginBottom:4,
                fontFamily:'var(--font-b)', fontWeight: tab===id ? 700 : 500, fontSize:14, color:'var(--text)', textAlign:'left',
              }}>
              <span style={{ display:'flex', color: tab===id ? A : 'var(--ter)' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Right: content */}
        <div>
          {tab === 'info' ? (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <h2 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)', margin:0 }}>Información sobre mí</h2>
                {!editing && (
                  <button onClick={startEdit}
                    style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text)', fontFamily:'var(--font-b)', fontWeight:700, fontSize:13.5, cursor:'pointer' }}>
                    Editar
                  </button>
                )}
              </div>

              {/* Identity card */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border-l)', borderRadius:20, padding:'28px 28px', display:'flex', alignItems:'center', gap:32, marginBottom:24, flexWrap:'wrap' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:100, height:100, borderRadius:'50%', overflow:'hidden', background:`linear-gradient(135deg,${A},#c9a888)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {profile.photo
                      ? <img src={profile.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ color:'#fff', fontFamily:'var(--font-h)', fontWeight:800, fontSize:36 }}>{(profile.name || '?').slice(0,1).toUpperCase()}</span>}
                  </div>
                  <button onClick={() => fileRef.current?.click()} title="Cambiar foto de perfil"
                    style={{ position:'absolute', bottom:0, right:0, width:32, height:32, borderRadius:'50%', background:'var(--text)', color:'var(--bg)', border:'2px solid var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    {BIcons.camera}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }} />
                </div>

                <div style={{ flex:1, minWidth:160 }}>
                  {editing ? (
                    <input value={draft.name} onChange={e => setDraft({ ...draft, name:e.target.value })} placeholder="Tu nombre"
                      style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)', border:'1.5px solid var(--border)', borderRadius:10, padding:'6px 10px', outline:'none', background:'var(--surface2)', width:'100%', boxSizing:'border-box', marginBottom:6 }} />
                  ) : (
                    <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)' }}>{profile.name || 'Sin nombre'}</div>
                  )}
                  {editing ? (
                    <input value={draft.location} onChange={e => setDraft({ ...draft, location:e.target.value })} placeholder="Ciudad, país"
                      style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', border:'1.5px solid var(--border)', borderRadius:10, padding:'6px 10px', outline:'none', background:'var(--surface2)', width:'100%', boxSizing:'border-box' }} />
                  ) : (
                    <div style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)' }}>{profile.location || 'Ubicación sin definir'}</div>
                  )}
                </div>

                <div style={{ display:'flex', gap:28, flexShrink:0 }}>
                  {[['Arriendos', bookings.length], ['Reseñas', 1], ['Años en Bookey', 1]].map(([label,val]) => (
                    <div key={label} style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, color:'var(--text)' }}>{val}</div>
                      <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:20 }}>
                {infoRows.map(row => (
                  <div key={row.key} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 4px' }}>
                    <span style={{ display:'flex', color:'var(--ter)', flexShrink:0 }}>{row.icon}</span>
                    {editing ? (
                      <input value={draft[row.key]} onChange={e => setDraft({ ...draft, [row.key]:e.target.value })}
                        placeholder={`${row.label}: ${row.placeholder}`}
                        style={{ flex:1, fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)', border:'1.5px solid var(--border)', borderRadius:10, padding:'8px 12px', outline:'none', background:'var(--surface2)' }} />
                    ) : (
                      <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)' }}>
                        {row.label}: {profile[row.key] ? <b>{profile[row.key]}</b> : <span style={{ color:'var(--ter)' }}>sin definir</span>}
                      </span>
                    )}
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 4px' }}>
                  <span style={{ display:'flex', color:'var(--ter)', flexShrink:0 }}>{BIcons.shieldCheck}</span>
                  <span style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)' }}>Wallet verificada on-chain</span>
                </div>
              </div>

              {editing ? (
                <textarea value={draft.bio} onChange={e => setDraft({ ...draft, bio:e.target.value })}
                  placeholder="Contá algo sobre vos..." rows={3}
                  style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--font-b)', fontSize:14, color:'var(--text)', border:'1.5px solid var(--border)', borderRadius:12, padding:'12px 14px', outline:'none', background:'var(--surface2)', resize:'vertical', marginBottom:16 }} />
              ) : profile.bio ? (
                <p style={{ fontFamily:'var(--font-b)', fontSize:14, color:'var(--sec)', lineHeight:1.6, marginBottom:16 }}>{profile.bio}</p>
              ) : null}

              {editing && (
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={confirmEdit}
                    style={{ padding:'11px 22px', borderRadius:11, border:'none', background:A, color:'#fff', fontFamily:'var(--font-b)', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                    Guardar
                  </button>
                  <button onClick={cancelEdit}
                    style={{ padding:'11px 22px', borderRadius:11, border:'1.5px solid var(--border)', background:'transparent', color:'var(--sec)', fontFamily:'var(--font-b)', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                    Cancelar
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)', margin:'0 0 20px' }}>Mis arriendos</h2>
              {bookings.length === 0 ? (
                <div style={{ color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:14 }}>Todavía no reservaste ninguna propiedad.</div>
              ) : (
                Object.keys(bookingsByYear).sort((a,b) => b - a).map(year => (
                  <div key={year} style={{ marginBottom:28 }}>
                    <div style={{ display:'inline-block', padding:'5px 14px', borderRadius:999, background:'var(--surface2)', fontFamily:'var(--font-b)', fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:14 }}>{year}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20 }}>
                      {bookingsByYear[year].map(b => (
                        <div key={b.id} onClick={() => nav('bookey-detail', b.property)} style={{ cursor:'pointer' }}>
                          <div style={{ borderRadius:16, overflow:'hidden', height:150, marginBottom:8 }}>
                            <img src={b.property.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          </div>
                          <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14.5, color:'var(--text)' }}>{b.property.city}</div>
                          <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)' }}>{fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}</div>
                          <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:G, fontWeight:600, marginTop:2 }}>{b.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Favorites ────────────────────────────────────────────────────────────────
function BookeyFavorites({ nav }) {
  const favProperties = useMemo(() => {
    const ids = loadFavorites();
    return PROPERTIES.filter(p => ids.has(p.id));
  }, []);

  return (
    <div style={{ maxWidth:1180, margin:'0 auto', padding:'32px 32px 60px' }}>
      <button onClick={() => nav('bookey')}
        style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor:'pointer', color:'var(--sec)', fontFamily:'var(--font-b)', fontSize:13.5, padding:'0 0 24px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        Volver a Bookey
      </button>
      <h1 style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:26, color:'var(--text)', margin:'0 0 24px' }}>Favoritos</h1>

      {favProperties.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:15 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}><HeartIcon filled={false} /></div>
          Todavía no guardaste ninguna propiedad. Tocá el corazón en una propiedad para guardarla acá.
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:28 }}>
          {favProperties.map(p => <PropertyCard key={p.id} p={p} nav={nav} />)}
        </div>
      )}
    </div>
  );
}

// ─── Help ─────────────────────────────────────────────────────────────────────
const HELP_FAQS = [
  { q:'¿Cómo reservo una propiedad?', a:'Elegí una propiedad, seleccioná fechas y huéspedes, y confirmá el pago desde el checkout de KEYCHAIN.' },
  { q:'¿Qué es el descuento inversor?', a:'Si tenés tokens KEYCHAIN de una propiedad, accedés a un descuento de entre 8% y 20% sobre el precio de esa propiedad.' },
  { q:'¿En qué puedo pagar?', a:'Todos los pagos se hacen en cripto on-chain, con USDC o el token KYCN.' },
  { q:'¿Cómo cancelo una reserva?', a:'Escribinos a soporte@keychain.io y te ayudamos según la política de cancelación de esa propiedad.' },
];

function BookeyHelp({ nav }) {
  return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'32px 32px 60px' }}>
      <button onClick={() => nav('bookey')}
        style={{ display:'flex', alignItems:'center', gap:7, background:'none', border:'none', cursor:'pointer', color:'var(--sec)', fontFamily:'var(--font-b)', fontSize:13.5, padding:'0 0 24px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        Volver a Bookey
      </button>
      <h1 style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:26, color:'var(--text)', margin:'0 0 24px' }}>Centro de ayuda</h1>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {HELP_FAQS.map(f => (
          <div key={f.q} style={{ background:'var(--surface)', border:'1px solid var(--border-l)', borderRadius:16, padding:'18px 20px' }}>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:6 }}>{f.q}</div>
            <div style={{ fontFamily:'var(--font-b)', fontSize:13.5, color:'var(--sec)', lineHeight:1.6 }}>{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
// Bookey's own persistent chrome — separate from KEYCHAIN's Sidebar/Topbar,
// since Bookey is a standalone subsidiary product (see App.jsx PLATFORM_PATHS).
// Every sticky offset below it (category bar `top:64`, booking widget `top:88`)
// was already sized to sit right under this 64px bar.
function BookeyNavbar({ nav, searched, query, onEditSearch }) {
  const fmt = (d) => d ? d.toLocaleDateString('es-AR', { day:'numeric', month:'short' }) : null;
  const datesLabel = query?.dates?.from && query?.dates?.to
    ? `${fmt(query.dates.from)} – ${fmt(query.dates.to)}`
    : 'Agregá fechas';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const disconnect = useSessionDisconnect();

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const goTo = (id, payload) => { setMenuOpen(false); nav(id, payload); };
  const menuItems = [
    { icon:BIcons.heartOutline, label:'Favoritos', onClick:() => goTo('bookey-favorites') },
    { icon:BIcons.suitcase, label:'Mis arriendos', onClick:() => goTo('bookey-profile', 'bookings') },
    { icon:BIcons.person, label:'Perfil', onClick:() => goTo('bookey-profile', 'info') },
  ];

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, height:64, zIndex:30,
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'0 32px',
      background:'var(--bg)', borderBottom:'1px solid var(--border-l)',
    }}>
      <button onClick={() => nav('bookey')}
        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
        <span style={{ display:'flex' }}>{BIcons.logo}</span>
        <span style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:19, color:'var(--text)', letterSpacing:'-0.02em' }}>Bookey</span>
      </button>

      {/* Compact search pill — replaces the big hero search bar once a
          search has run, same as Airbnb docking its search into the navbar.
          Centered on the whole bar via absolute positioning (not a flex
          gap between logo/connect button) so it stays dead-center no
          matter how wide either side ends up being. */}
      {searched && (
        <button onClick={onEditSearch}
          style={{
            position:'absolute', left:'50%', transform:'translateX(-50%)',
            display:'flex', alignItems:'center', padding:'6px 6px 6px 20px', borderRadius:999,
            border:'1px solid var(--border)', background:'var(--surface)', boxShadow:'var(--sh-sm)',
            cursor:'pointer', maxWidth:480,
          }}>
          <span style={{ fontFamily:'var(--font-b)', fontWeight:700, fontSize:13, color:'var(--text)', whiteSpace:'nowrap' }}>
            {query.dest || 'Cualquier destino'}
          </span>
          <span style={{ width:1, height:20, background:'var(--border)', margin:'0 16px', flexShrink:0 }} />
          <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--text)', whiteSpace:'nowrap' }}>{datesLabel}</span>
          <span style={{ width:1, height:20, background:'var(--border)', margin:'0 16px', flexShrink:0 }} />
          <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--sec)', whiteSpace:'nowrap', marginRight:12 }}>
            {query.guests} huésped{query.guests===1?'':'es'}
          </span>
          <span style={{ width:32, height:32, borderRadius:'50%', background:A, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
        </button>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={() => nav('bookey-profile')} title="Mi perfil"
          style={{ width:38, height:38, borderRadius:'50%', border:'1.5px solid var(--border-l)', background:'var(--surface)', color:'var(--sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          {BIcons.person}
        </button>

        {/* Account menu — mirrors Airbnb's hamburger dropdown (Favoritos,
            Mis arriendos, Perfil, Ayuda, Cerrar sesión). Items that don't map
            to anything real in Bookey yet (notifications, language, hosting)
            are left out rather than shown as dead links. */}
        <div ref={menuRef} style={{ position:'relative' }}>
          <button onClick={() => setMenuOpen(o => !o)} title="Menú"
            style={{ width:38, height:38, borderRadius:'50%', border:'1.5px solid var(--border-l)', background: menuOpen ? 'var(--surface2)' : 'var(--surface)', color:'var(--sec)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            {BIcons.hamburger}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity:0, y:-8, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-8, scale:0.97 }}
                transition={{ duration:0.15 }}
                style={{ position:'absolute', top:48, right:0, width:220, background:'var(--surface)', border:'1px solid var(--border-l)', borderRadius:16, boxShadow:'var(--sh-lg)', overflow:'hidden', padding:'6px 0', zIndex:40 }}>
                {menuItems.map(item => (
                  <button key={item.label} onClick={item.onClick}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, fontWeight:500, textAlign:'left' }}>
                    <span style={{ display:'flex', color:'var(--ter)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <div style={{ height:1, background:'var(--border-l)', margin:'6px 12px' }} />
                <button onClick={() => goTo('bookey-help')}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, fontWeight:500, textAlign:'left' }}>
                  <span style={{ display:'flex', color:'var(--ter)' }}>{BIcons.helpCircle}</span>
                  Centro de ayuda
                </button>
                <div style={{ height:1, background:'var(--border-l)', margin:'6px 12px' }} />
                <button onClick={() => { setMenuOpen(false); disconnect(); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', color:'#c0392b', fontFamily:'var(--font-b)', fontSize:13.5, fontWeight:500, textAlign:'left' }}>
                  <span style={{ display:'flex' }}>{BIcons.logout}</span>
                  Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display:'flex', alignItems:'center', padding:4, borderRadius:999, border:'1.5px solid var(--border-l)' }}>
          <ConnectButton
            client={client}
            chain={polygon}
            theme="light"
            detailsButton={{ style:{ height:'auto', minHeight:40, padding:'4px 14px', borderRadius:999, background:'transparent', border:'none', overflow:'visible', whiteSpace:'nowrap' } }}
            connectModal={{ title:'Conectar a Bookey' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
// Bookey is a standalone product (its own route, outside KEYCHAIN's
// login-gated Shell — see App.jsx PLATFORM_PATHS), so it can't rely on an
// external nav/routeData pair from a parent app. It owns its own
// Home <-> Detail navigation instead; `nav('bookey-detail', property)` and
// `nav('bookey')` (used throughout PropertyCard/PropertyDetail) resolve here.
//
// It also owns its own login gate — the same KeyPayLogin screen KEYCHAIN
// itself gates on. Since both sit under the same root <ThirdwebProvider>
// (see App.jsx), useActiveAccount() already reflects a wallet connected
// anywhere else in the app: if a session is already active, the gate is
// skipped entirely and Bookey opens straight into the marketplace.
export default function Bookey() {
  const account = useSessionAccount();
  const routerNavigate = useNavigate();
  const [page, setPage] = useState('home'); // 'home' | 'detail' | 'profile' | 'favorites' | 'help'
  const [selected, setSelected] = useState(null);
  const [profileTab, setProfileTab] = useState('info');
  const [query, setQuery] = useState({ dest:'', dates:{ from:null, to:null }, guests:2 });
  const [searched, setSearched] = useState(false);

  const nav = (id, payload) => {
    if (id === 'bookey-detail') { setSelected(payload); setPage('detail'); window.scrollTo(0, 0); }
    else if (id === 'bookey') { setSelected(null); setPage('home'); window.scrollTo(0, 0); }
    else if (id === 'bookey-profile') { setProfileTab(payload || 'info'); setPage('profile'); window.scrollTo(0, 0); }
    else if (id === 'bookey-favorites') { setPage('favorites'); window.scrollTo(0, 0); }
    else if (id === 'bookey-help') { setPage('help'); window.scrollTo(0, 0); }
  };

  // Lifted above both Home and the navbar: once a search runs, the compact
  // pill in BookeyNavbar needs to show the same query Home is filtering by,
  // and clicking that pill needs to bring the full search bar back.
  const handleSearch = (q) => { setQuery(q); setSearched(true); };
  const handleEditSearch = () => setSearched(false);

  if (!account) {
    return <Login onSuccess={() => {}} onBack={() => routerNavigate('/')} />;
  }

  return (
    <>
      <BookeyNavbar nav={nav} searched={searched} query={query} onEditSearch={handleEditSearch} />
      <div style={{ paddingTop:64 }}>
        {page === 'profile' ? <BookeyProfile key={profileTab} nav={nav} initialTab={profileTab} />
          : page === 'favorites' ? <BookeyFavorites nav={nav} />
          : page === 'help' ? <BookeyHelp nav={nav} />
          : page === 'detail' ? <PropertyDetail p={selected} nav={nav} />
          : <BookeyHome nav={nav} query={query} searched={searched} onSearch={handleSearch} />}
      </div>
    </>
  );
}
