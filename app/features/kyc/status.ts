import type { PTagColor } from '~/components/ui';
import type { KycStatus } from '~/lib/onchain';

const STATUS_TAG: Record<KycStatus['status'], { label: string; color: PTagColor }> = {
  verified: { label: 'Verificado ✓', color: 'green' },
  pending: { label: 'En revisión', color: 'blue' },
  rejected: { label: 'Rechazado', color: 'red' },
  none: { label: 'Sin verificar', color: 'neutral' },
};

export const kycStatusTag = (s: KycStatus['status'] | undefined) => STATUS_TAG[s ?? 'none'];
