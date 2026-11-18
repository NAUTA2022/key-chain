import type { Category } from './schema';

// Spanish copy for the live tokenization wizard.

export const CATEGORY_META: Record<Category, { label: string; icon: string; desc: string }> = {
  autos: { label: 'Automóvil', icon: '🚗', desc: 'Vehículos premium, de colección o flotas' },
  campos: { label: 'Campo agrícola', icon: '🌾', desc: 'Tierras productivas con rendimiento' },
  drones: { label: 'Drones / Maquinaria', icon: '🚁', desc: 'Equipos con ingresos por servicio' },
  inmuebles: { label: 'Inmueble', icon: '🏢', desc: 'Oficinas, locales y residenciales' },
  edificios: { label: 'Edificio', icon: '🏙️', desc: 'Edificios completos con renta' },
  otro: { label: 'Otro activo', icon: '📦', desc: 'Cualquier otro activo que genere ingresos' },
};

/** "Otro activo: Velero" for requests of type "otro", the category label otherwise. */
export function categoryLabel(data: { category: Category; otherType?: string }): string {
  return data.category === 'otro' && data.otherType ? `Otro: ${data.otherType}` : CATEGORY_META[data.category].label;
}

export const LIVE_STEPS = ['Tipo de activo', 'Información', 'Tokenomics', 'Contacto', 'Revisión', 'Documentos'] as const;

/** Suggested documents. The API stores files without a type, so slots only guide the upload. */
export const DOC_SLOTS = [
  { id: 'legal', label: 'Título de propiedad o documentación legal', sub: 'Escritura, título del automotor, contrato o constancia de titularidad.', imagesOnly: false },
  { id: 'valuation', label: 'Tasación o valuación', sub: 'Tasación independiente o informe que respalde la valuación declarada.', imagesOnly: false },
  { id: 'insurance', label: 'Póliza de seguro', sub: 'Seguro vigente del activo, si lo tiene.', imagesOnly: false },
  { id: 'photos', label: 'Fotos del activo', sub: 'Imágenes recientes en PNG, JPG o WebP.', imagesOnly: true },
  { id: 'other', label: 'Otros documentos', sub: 'Planos, habilitaciones, contratos de alquiler, balances u otra documentación útil.', imagesOnly: false },
] as const;

export type DocSlotId = (typeof DOC_SLOTS)[number]['id'];
