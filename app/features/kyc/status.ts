import type { PTagColor } from '~/components/ui';
import type { KycStatus } from '~/lib/onchain';

/** KYC status tag: `labelKey` is a `profile`-namespace key (translate it with `useT('profile')`). */
const STATUS_TAG: Record<KycStatus['status'], { labelKey: string; color: PTagColor }> = {
  verified: { labelKey: 'kyc.status.verified', color: 'green' },
  pending: { labelKey: 'kyc.status.pending', color: 'blue' },
  rejected: { labelKey: 'kyc.status.rejected', color: 'red' },
  none: { labelKey: 'kyc.status.none', color: 'neutral' },
};

export const kycStatusTag = (s: KycStatus['status'] | undefined): { labelKey: string; color: PTagColor } => STATUS_TAG[s ?? 'none'];
