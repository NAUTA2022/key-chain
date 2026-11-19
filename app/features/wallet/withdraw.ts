import { getContract, sendTransaction, waitForReceipt } from 'thirdweb';
import type { Chain } from 'thirdweb/chains';
import { transfer } from 'thirdweb/extensions/erc20';
import { isAddress, toUnits } from 'thirdweb/utils';
import type { Account, Wallet } from 'thirdweb/wallets';
import { SOURCE_MESSAGES, interpolate, lookup } from '~/i18n/messages';
import type { Translator } from '~/i18n/useT';
import { client } from '~/lib/thirdweb';

// USDC withdrawals from the investor's own wallet (an ERC-20 transfer they sign).
// Messages come from `portfolio:wallet.withdraw.errors.*`: callers pass the `t` of
// `useT('portfolio')` to get them in the active language (Spanish otherwise).

const ZERO = '0x0000000000000000000000000000000000000000';

type T = Translator['t'];

/** Spanish (source) texts of the portfolio namespace, for callers that pass no translator. */
const sourceT: T = (key, vars) => {
  const v = lookup(SOURCE_MESSAGES.portfolio, key);
  return typeof v === 'string' ? interpolate(v, vars) : key;
};

/** Validation error ids; the text is `portfolio:wallet.withdraw.errors.<id>`. */
export type WithdrawError = 'invalidAddress' | 'ownAddress' | 'invalidAmount' | 'zeroAmount' | 'balanceLoading' | 'overBalance';
export type WithdrawField = 'to' | 'amount';
export type WithdrawCheck =
  | { ok: true; to: string; amount: string; amountWei: bigint }
  | { ok: false; field: WithdrawField; error: WithdrawError; message: string };

export function validateWithdraw(
  input: { to: string; amount: string },
  ctx: { from: string; balanceWei: bigint | null; decimals: number; t?: T },
): WithdrawCheck {
  const t = ctx.t ?? sourceT;
  const fail = (field: WithdrawField, error: WithdrawError): WithdrawCheck =>
    ({ ok: false, field, error, message: t(`wallet.withdraw.errors.${error}`, { decimals: ctx.decimals }) });
  const to = input.to.trim();
  if (!isAddress(to) || to.toLowerCase() === ZERO) return fail('to', 'invalidAddress');
  if (to.toLowerCase() === ctx.from.toLowerCase()) return fail('to', 'ownAddress');

  const amount = input.amount.trim().replace(',', '.');
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${ctx.decimals}})?$`);
  if (!pattern.test(amount)) return fail('amount', 'invalidAmount');
  const amountWei = toUnits(amount, ctx.decimals);
  if (amountWei <= 0n) return fail('amount', 'zeroAmount');
  if (ctx.balanceWei === null) return fail('amount', 'balanceLoading');
  if (amountWei > ctx.balanceWei) return fail('amount', 'overBalance');
  return { ok: true, to, amount, amountWei };
}

function walletError(e: unknown, t: T): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(msg)) return t('wallet.withdraw.errors.cancelled');
  if (/insufficient funds|gas/i.test(msg)) return t('wallet.withdraw.errors.noGas');
  return t('wallet.withdraw.errors.failed');
}

/** Where a withdrawal is: waiting for the wallet's signature, or sent and waiting for the network. */
export type SendStep = 'sign' | 'confirm';

/** Sends `amountWei` USDC to `to` and waits for the receipt; returns the tx hash. */
export async function sendUsdc(opts: {
  account: Account; wallet: Wallet | undefined; chain: Chain; token: string; to: string; amountWei: bigint; onStep?: (s: SendStep) => void;
  /** `t` of `useT('portfolio')`, for the error message in the active language. */
  t?: T;
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
    throw new Error(walletError(e, opts.t ?? sourceT), { cause: e });
  }
}
