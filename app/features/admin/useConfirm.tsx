import { useCallback, useState, type ReactNode } from 'react';
import { ConfirmModal } from './ui';

export type ConfirmOptions = { title: string; message?: ReactNode; confirmLabel?: string; danger?: boolean };

/** Promise-based confirmation for destructive admin actions: `if (!(await confirm({...}))) return;`. */
export function useConfirm(): { confirm: (o: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ ...o, resolve })), []);
  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const dialog = pending ? (
    <ConfirmModal
      title={pending.title} message={pending.message} confirmLabel={pending.confirmLabel ?? 'Confirmar'} danger={pending.danger}
      onConfirm={() => settle(true)} onCancel={() => settle(false)}
    />
  ) : null;
  return { confirm, dialog };
}
