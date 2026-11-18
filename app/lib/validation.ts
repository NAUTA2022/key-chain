import { z } from 'zod';

/** EVM address: 0x followed by 40 hex characters. */
export const evmAddress = z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Dirección inválida');

/** Positive USD amount with at most 6 decimals and a sane upper bound. */
export const usdAmount = z
  .number()
  .finite()
  .positive('El monto debe ser mayor a 0')
  .max(1_000_000, 'El monto supera el máximo permitido')
  .refine(n => Number.isInteger(Math.round(n * 1e6)) && Math.abs(n * 1e6 - Math.round(n * 1e6)) < 1e-6, 'Máximo 6 decimales');

export const transferSchema = z.object({
  to: z.string().trim().min(1, 'Elegí un destinatario').max(128),
  amount: usdAmount,
});

export type TransferInput = z.infer<typeof transferSchema>;
