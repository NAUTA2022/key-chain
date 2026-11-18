import type { ReactNode } from 'react';
import { PHelp } from '~/components/ui';

type ControlProps = { id: string; 'aria-describedby'?: string };

/**
 * Same look as the kit's `Field`, plus an optional "?" help bubble next to the label
 * (kept outside the <label>, which may not contain a button) and the hint/error linked
 * to the control through aria-describedby.
 */
export default function FormField({ id, label, help, hint, error, aside, children }: {
  id: string;
  label: ReactNode;
  help?: { text: string; label: string };
  hint?: ReactNode;
  error?: string;
  /** Right side of the label row (e.g. a character counter). */
  aside?: ReactNode;
  children: (control: ControlProps) => ReactNode;
}) {
  const msgId = `${id}-msg`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
          <label htmlFor={id} style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{label}</label>
          {help && <PHelp text={help.text} label={help.label} />}
        </span>
        {aside}
      </div>
      {children({ id, 'aria-describedby': error || hint ? msgId : undefined })}
      {error ? (
        <div id={msgId} role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' }}>{error}</div>
      ) : hint ? (
        <div id={msgId} style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{hint}</div>
      ) : null}
    </div>
  );
}
