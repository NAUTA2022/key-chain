import type { PTagColor } from '~/components/ui';
import type { TokenizationRequest } from './api';

// Real lifecycle of a tokenization request: first the request (Enviada → En revisión →
// Requiere cambios / Rechazada / Aprobada) and, once approved, the project created from
// it (publication status + on-chain pool status from the API).

export type LifecycleStage =
  | 'submitted' | 'in_review' | 'changes_requested' | 'rejected' | 'approved'
  | 'draft' | 'project_review' | 'published' | 'tokenizing' | 'pool_failed' | 'active' | 'liquidated' | 'archived';

export type Lifecycle = {
  stage: LifecycleStage;
  label: string;
  color: PTagColor;
  /** One line telling the user what is going on and what comes next. */
  text: string;
  /** The project page exists publicly (only published assets are): "Ver activo" can link to it. */
  viewable: boolean;
  /** Last milestone of the timeline that was reached (0 request sent … 3 token on-chain). */
  milestone: 0 | 1 | 2 | 3;
};

type Source = Pick<TokenizationRequest, 'status' | 'assetId' | 'assetStatus' | 'poolStatus'>;

export function lifecycleOf(r: Source): Lifecycle {
  switch (r.status) {
    case 'submitted':
      return { stage: 'submitted', label: 'Enviada', color: 'blue', milestone: 0, viewable: false, text: 'Recibimos tu solicitud. El equipo la va a revisar pronto.' };
    case 'in_review':
      return { stage: 'in_review', label: 'En revisión', color: 'purple', milestone: 0, viewable: false, text: 'El equipo está revisando los datos y la documentación. Podés sumar documentos mientras tanto.' };
    case 'changes_requested':
      return { stage: 'changes_requested', label: 'Requiere cambios', color: 'dark', milestone: 0, viewable: false, text: 'El equipo necesita cambios o más documentación: leé la nota y subí lo que falta desde el detalle.' };
    case 'rejected':
      return { stage: 'rejected', label: 'Rechazada', color: 'red', milestone: 0, viewable: false, text: 'La solicitud no fue aprobada. El motivo está en la nota del equipo.' };
    case 'approved':
      return projectLifecycle(r);
  }
}

function projectLifecycle(r: Source): Lifecycle {
  const published = r.assetStatus === 'published';
  if (r.assetId === null || r.assetStatus === null) {
    return { stage: 'approved', label: 'Aprobada', color: 'green', milestone: 1, viewable: false, text: 'Solicitud aprobada. El equipo está preparando el proyecto.' };
  }
  if (r.assetStatus === 'archived') {
    return { stage: 'archived', label: 'Archivado', color: 'neutral', milestone: 1, viewable: false, text: 'El proyecto fue archivado y ya no está publicado. Escribinos a soporte si tenés dudas.' };
  }
  switch (r.poolStatus) {
    case 'liquidated':
      return { stage: 'liquidated', label: 'Liquidado', color: 'neutral', milestone: 3, viewable: published, text: 'El proyecto terminó y se liquidó el capital a los inversores.' };
    case 'active':
      return published
        ? { stage: 'active', label: 'Activo on-chain', color: 'green', milestone: 3, viewable: true, text: 'El token está emitido en la red y los inversores ya pueden participar.' }
        : { stage: 'active', label: 'Activo on-chain', color: 'green', milestone: 3, viewable: false, text: 'Los contratos ya están en la red; el proyecto todavía no es público.' };
    case 'deploying':
    case 'granting_roles':
      return {
        stage: 'tokenizing', label: 'Tokenizando on-chain', color: 'purple', milestone: published ? 2 : 1, viewable: published,
        text: r.poolStatus === 'deploying' ? 'Estamos desplegando los contratos del token en la red. Puede tardar unos minutos.' : 'Contratos desplegados: estamos configurando los permisos del token.',
      };
    case 'failed':
      return { stage: 'pool_failed', label: 'Tokenización demorada', color: 'red', milestone: published ? 2 : 1, viewable: published, text: 'Hubo un problema al desplegar el token en la red. El equipo ya lo está revisando.' };
    case null:
      break;
  }
  switch (r.assetStatus) {
    case 'draft':
      return { stage: 'draft', label: 'Borrador', color: 'blue', milestone: 1, viewable: false, text: 'Solicitud aprobada. El proyecto está en borrador, pendiente de publicación por el equipo; todavía no es público.' };
    case 'review':
      return { stage: 'project_review', label: 'Proyecto en revisión', color: 'purple', milestone: 1, viewable: false, text: 'El equipo está haciendo la revisión final del proyecto antes de publicarlo.' };
    case 'published':
      return { stage: 'published', label: 'Publicado', color: 'green', milestone: 2, viewable: true, text: 'El proyecto ya es público. El próximo paso es emitir el token en la red.' };
  }
}

/** Timeline shown in the request detail. */
export const MILESTONES = ['Solicitud', 'Aprobada', 'Publicado', 'On-chain'] as const;
