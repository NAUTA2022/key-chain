import { getContract, sendTransaction, waitForReceipt } from 'thirdweb';
import type { Chain } from 'thirdweb/chains';
import { transfer } from 'thirdweb/extensions/erc20';
import { isAddress, toUnits } from 'thirdweb/utils';
import type { Account, Wallet } from 'thirdweb/wallets';
import { client } from '~/lib/thirdweb';

// USDC withdrawals from the investor's own wallet (an ERC-20 transfer they sign).

const ZERO = '0x0000000000000000000000000000000000000000';

export type WithdrawField = 'to' | 'amount';
export type WithdrawCheck =
  | { ok: true; to: string; amount: string; amountWei: bigint }
  | { ok: false; field: WithdrawField; message: string };

export function validateWithdraw(
  input: { to: string; amount: string },
  ctx: { from: string; balanceWei: bigint | null; decimals: number },
): WithdrawCheck {
  const to = input.to.trim();
  if (!isAddress(to) || to.toLowerCase() === ZERO) return { ok: false, field: 'to', message: 'Ingresá una dirección de wallet válida (0x…).' };
  if (to.toLowerCase() === ctx.from.toLowerCase()) return { ok: false, field: 'to', message: 'La dirección de destino no puede ser tu propia wallet.' };

  const amount = input.amount.trim().replace(',', '.');
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${ctx.decimals}})?$`);
  if (!pattern.test(amount)) return { ok: false, field: 'amount', message: `Ingresá un monto válido (hasta ${ctx.decimals} decimales).` };
  const amountWei = toUnits(amount, ctx.decimals);
  if (amountWei <= 0n) return { ok: false, field: 'amount', message: 'El monto tiene que ser mayor a 0.' };
  if (ctx.balanceWei === null) return { ok: false, field: 'amount', message: 'Esperá a que cargue tu saldo de USDC.' };
  if (amountWei > ctx.balanceWei) return { ok: false, field: 'amount', message: 'El monto supera tu saldo de USDC.' };
  return { ok: true, to, amount, amountWei };
}

function walletError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(msg)) return 'Operación cancelada en la wallet.';
  if (/insufficient funds|gas/i.test(msg)) return 'No tenés saldo suficiente para pagar el gas de la red.';
  return 'La transferencia no se pudo completar.';
}

/** Where a withdrawal is: waiting for the wallet's signature, or sent and waiting for the network. */
export type SendStep = 'sign' | 'confirm';

/** Sends `amountWei` USDC to `to` and waits for the receipt; returns the tx hash. */
export async function sendUsdc(opts: {
  account: Account; wallet: Wallet | undefined; chain: Chain; token: string; to: string; amountWei: bigint; onStep?: (s: SendStep) => void;
}): Promise<string> {
  try {
    opts.onStep?.('sign');
    if (opts.wallet && opts.wallet.getChain()?.id !== opts.chain.id) await opts.wallet.switchChain(opts.chain);
    const contract = getContract({ client, chain: opts.chain, address: opts.token });
    const sent = await sendTransaction({
      account: opts.account,
      transaction: transfer({ contract, to: opts.to, amountWei: opts.amountWei }),
    });
    opts.onStep?.('confirm');
    const receipt = await waitForReceipt(sent);
    if (receipt.status !== 'success') throw new Error('reverted');
    return receipt.transactionHash;
  } catch (e) {
    throw new Error(walletError(e), { cause: e });
  }
}
