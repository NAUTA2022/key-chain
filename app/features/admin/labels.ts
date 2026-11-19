import type { PTagColor } from '~/components/ui';
import type {
  AssetCategory, AssetStage, BroadcastAudience, ChainTx, DocumentKind, IssuerKind, OnchainIdentityStatus, PoolStatus,
  PublicationStatus, RequestCategory, RequestStatus, TicketCategory, TicketStatus, UserKycStatus, UserOrder, UserRole,
} from './types';

// Spanish labels and tag colors for every status the admin API returns.

export type TagSpec = { label: string; color: PTagColor };

export const ASSET_STATUS: Record<PublicationStatus, TagSpec> = {
  draft: { label: 'Borrador', color: 'neutral' },
  review: { label: 'En revisión', color: 'blue' },
  published: { label: 'Publicado', color: 'green' },
  archived: { label: 'Archivado', color: 'dark' },
};

export const POOL_STATUS: Record<PoolStatus, TagSpec> = {
  deploying: { label: 'Desplegando…', color: 'blue' },
  granting_roles: { label: 'Timelock: roles…', color: 'blue' },
  active: { label: 'On-chain ✓', color: 'green' },
  liquidated: { label: 'Liquidado', color: 'dark' },
  failed: { label: 'Error', color: 'red' },
};

export const ONCHAIN_IDENTITY: Record<OnchainIdentityStatus, TagSpec> = {
  queued: { label: 'En cola', color: 'blue' },
  deploying: { label: 'Creando identidad…', color: 'blue' },
  claiming: { label: 'Firmando claims…', color: 'blue' },
  registering: { label: 'Registrando…', color: 'blue' },
  verified: { label: 'Aprobado ✓', color: 'green' },
  failed: { label: 'Error on-chain', color: 'red' },
};

export const CATEGORY: Record<AssetCategory, string> = {
  autos: 'Autos', campos: 'Campos', drones: 'Drones', inmuebles: 'Inmuebles', edificios: 'Edificios',
};

/** Category of a tokenization request: "Otro: Velero" when the requester chose "otro". */
export function requestCategory(data: { category: RequestCategory; otherType?: string }): string {
  return data.category === 'otro' ? `Otro${data.otherType ? `: ${data.otherType}` : ''}` : CATEGORY[data.category];
}

export const STAGE: Record<AssetStage, string> = { recaudacion: 'Recaudación', operativo: 'Operativo' };

export const ISSUER_KIND: Record<IssuerKind, string> = { keychain: 'La 33', verified: 'Verificado', community: 'Comunidad' };

export const DOC_KIND: Record<DocumentKind, string> = {
  legal: 'Legal', financial: 'Financiero', technical: 'Técnico', insurance: 'Seguro', other: 'Otro',
};

export const ROLE: Record<UserRole, TagSpec> = {
  investor: { label: 'Inversor', color: 'neutral' },
  issuer: { label: 'Emisor', color: 'blue' },
  admin: { label: 'Admin', color: 'purple' },
};

export const KYC_STATUS: Record<UserKycStatus, TagSpec> = {
  none: { label: 'Sin KYC', color: 'neutral' },
  pending: { label: 'Pendiente', color: 'blue' },
  verified: { label: 'Aprobado', color: 'green' },
  rejected: { label: 'Rechazado', color: 'red' },
};

export const TICKET_STATUS: Record<TicketStatus, TagSpec> = {
  open: { label: 'Abierto', color: 'blue' },
  answered: { label: 'Respondido', color: 'green' },
  closed: { label: 'Cerrado', color: 'neutral' },
};

export const TICKET_CATEGORY: Record<TicketCategory, string> = {
  account: 'Cuenta', kyc: 'KYC', investment: 'Inversión', payments: 'Pagos', technical: 'Técnico', other: 'Otro',
};

export const REQUEST_STATUS: Record<RequestStatus, TagSpec> = {
  submitted: { label: 'Enviada', color: 'blue' },
  in_review: { label: 'En revisión', color: 'purple' },
  changes_requested: { label: 'Requiere cambios', color: 'dark' },
  approved: { label: 'Aprobada', color: 'green' },
  rejected: { label: 'Rechazada', color: 'red' },
};

export const ORDER_STATUS: Record<UserOrder['status'], TagSpec> = {
  pending: { label: 'Pendiente', color: 'neutral' },
  processing: { label: 'Procesando', color: 'blue' },
  paid: { label: 'Pagada', color: 'blue' },
  minted: { label: 'Acreditada', color: 'green' },
  failed: { label: 'Fallida', color: 'red' },
  cancelled: { label: 'Cancelada', color: 'neutral' },
};

export const TX_STATUS: Record<ChainTx['status'], TagSpec> = {
  submitted: { label: 'Enviada', color: 'blue' },
  confirmed: { label: 'Confirmada', color: 'green' },
  failed: { label: 'Fallida', color: 'red' },
};

const TX_KIND: Record<string, string> = {
  pool_deploy: 'Despliegue de pool',
  identity_deploy: 'Identidad on-chain',
  identity_register: 'Registro de identidad',
  invest: 'Inversión',
  dividend_seal: 'Sellado de dividendo',
  liquidation: 'Liquidación',
  usdc_approve_fee: 'Aprobación USDC (fee)',
  usdc_approve_net: 'Aprobación USDC (neto)',
  usdc_approve_liquidation: 'Aprobación USDC (liquidación)',
  faucet_usdc: 'Faucet USDC',
  faucet_gas: 'Faucet gas',
};
export const txKindLabel = (kind: string): string => TX_KIND[kind] ?? kind;

export const AUDIENCE: Record<BroadcastAudience, string> = {
  all: 'Todos los usuarios',
  investors: 'Inversores (con inversiones acreditadas)',
  kyc_verified: 'Usuarios con KYC aprobado',
};

/** Entities written to the audit log by the API. */
export const AUDIT_ENTITIES: Array<[value: string, label: string]> = [
  ['asset', 'Activo'],
  ['issuer', 'Emisor'],
  ['user', 'Usuario'],
  ['tokenization_request', 'Solicitud de tokenización'],
  ['support_ticket', 'Ticket de soporte'],
  ['academy_post', 'Artículo de academia'],
  ['faq', 'FAQ'],
  ['platform_token', 'Token KYCN'],
  ['notification', 'Notificación'],
  ['settings', 'Configuración'],
];

const AUDIT_ACTION: Record<string, string> = {
  'asset.create': 'Activo creado',
  'asset.update': 'Activo editado',
  'asset.publish': 'Activo publicado',
  'asset.archive': 'Activo archivado',
  'asset.image.add': 'Imagen agregada',
  'asset.image.delete': 'Imagen eliminada',
  'asset.image.reorder': 'Imágenes reordenadas',
  'asset.document.add': 'Documento agregado',
  'asset.document.delete': 'Documento eliminado',
  'asset.distribution': 'Distribución programada',
  'issuer.create': 'Emisor creado',
  'issuer.update': 'Emisor editado',
  'company.register': 'Empresa registrada',
  'company.update': 'Empresa editada',
  'company.resubmit': 'Empresa reenviada',
  'company.approve': 'Empresa aprobada',
  'company.reject': 'Empresa rechazada',
  'pool.deploy': 'Pool tokenizado',
  'pool.liquidate': 'Pool liquidado',
  'dividend.create': 'Dividendo distribuido',
  'kyc.approve': 'KYC aprobado',
  'kyc.reject': 'KYC rechazado',
  'user.role': 'Cambio de rol',
  'user.block': 'Usuario bloqueado',
  'user.unblock': 'Usuario desbloqueado',
  'user.sessions.revoke': 'Sesiones cerradas',
  'user.deletion_request': 'Pedido de baja',
  'tokenization.review': 'Solicitud revisada',
  'tokenization.approve': 'Solicitud aprobada',
  'support.reply': 'Respuesta de soporte',
  'support.close': 'Ticket cerrado',
  'academy.create': 'Artículo creado',
  'academy.update': 'Artículo editado',
  'academy.cover': 'Portada actualizada',
  'academy.archive': 'Artículo archivado',
  'faq.create': 'FAQ creada',
  'faq.update': 'FAQ editada',
  'faq.delete': 'FAQ eliminada',
  'faq.reorder': 'FAQ reordenadas',
  'token.update': 'Token KYCN editado',
  'notification.broadcast': 'Notificación masiva',
  'settings.update': 'Configuración editada',
};
export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION);
export const auditActionLabel = (action: string): string => AUDIT_ACTION[action] ?? action;
export const auditEntityLabel = (entity: string): string => AUDIT_ENTITIES.find(([v]) => v === entity)?.[1] ?? entity;
