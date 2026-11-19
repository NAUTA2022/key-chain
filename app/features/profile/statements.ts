import { api } from '~/lib/api/client';
import { call, fmtDate, intlLocale, profileSourceT, saveBlob, toCsv, type ProfileT } from './api';
import type { Statement } from './hooks';

// Yearly statement exports (CSV and print), built client-side from GET /v1/me/statements.
// `t` (profile namespace) and `locale` translate the texts; without them they are Spanish.

const usd = (n: number, locale: string): string => `USD ${n.toLocaleString(intlLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Years with a possible statement: from the member's first year (min 2020) to the current one, newest first. */
export function statementYears(memberSince: string | null | undefined, currentYear: number): number[] {
  const from = Math.max(2020, memberSince ? new Date(memberSince).getUTCFullYear() || currentYear : currentYear);
  const years: number[] = [];
  for (let y = currentYear; y >= Math.min(from, currentYear); y--) years.push(y);
  return years;
}

export function statementCsv(s: Statement, t: ProfileT = profileSourceT): string {
  const rows: Array<Array<string | number | null>> = [
    [t('statements.csv.title'), s.year],
    [],
    [t('statements.investments')],
    [t('statements.cols.date'), t('statements.cols.asset'), t('statements.cols.assetId'), t('statements.cols.tokens'), t('statements.cols.amountUsd'), t('statements.cols.tx')],
    ...s.investments.map(i => [i.date.slice(0, 10), i.assetName, i.assetId, i.tokens, i.amount.toFixed(2), i.txHash]),
    [],
    [t('statements.dividends')],
    [t('statements.cols.date'), t('statements.cols.asset'), t('statements.cols.assetId'), t('statements.cols.amountUsd')],
    ...s.dividends.map(d => [d.date.slice(0, 10), d.assetName, d.assetId, d.amount.toFixed(2)]),
    [],
    [t('statements.csv.totalInvested'), s.totals.invested.toFixed(2)],
    [t('statements.csv.totalDividends'), s.totals.dividends.toFixed(2)],
  ];
  return toCsv(rows);
}

/** Saves the statement as CSV (UTF-8 with BOM so spreadsheet apps keep the accents). */
export function saveStatementCsv(s: Statement, t: ProfileT = profileSourceT): void {
  saveBlob(new Blob(['﻿', statementCsv(s, t)], { type: 'text/csv;charset=utf-8' }), t('statements.csv.fileName', { year: s.year }));
}

/** Fetches a year's statement and saves it as CSV. Returns false when it could not be loaded. */
export async function downloadStatementCsv(year: number, t: ProfileT = profileSourceT): Promise<boolean> {
  const { data } = await call(api.GET('/v1/me/statements', { params: { query: { year } } }));
  if (!data) return false;
  saveStatementCsv(data, t);
  return true;
}

/**
 * Prints the statement from a hidden iframe. The document is built with DOM APIs
 * (textContent only), so API strings can never inject markup.
 */
export function printStatement(s: Statement, holder: { name: string; wallet: string }, t: ProfileT = profileSourceT, locale = 'es-AR'): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, parent?: HTMLElement): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    parent?.appendChild(node);
    return node;
  };
  doc.documentElement.lang = locale.slice(0, 2);
  doc.documentElement.dir = locale.startsWith('ar') ? 'rtl' : 'ltr';
  doc.title = t('statements.print.docTitle', { year: s.year });
  const style = el('style', 'body{font-family:system-ui,-apple-system,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}p{margin:2px 0;font-size:12px;color:#444}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:start;padding:6px 8px;border-bottom:1px solid #ddd}th{background:#f4f4f4}.t{margin-top:20px;font-size:13px}.n{font-size:11px;color:#666;margin-top:24px}');
  doc.head.appendChild(style);
  const body = doc.body;
  el('h1', t('statements.print.heading', { year: s.year }), body);
  el('p', t('statements.print.holder', { name: holder.name }), body);
  el('p', t('statements.print.wallet', { wallet: holder.wallet }), body);
  el('p', t('statements.print.issued', { date: fmtDate(new Date().toISOString(), undefined, locale) }), body);

  const table = (title: string, head: string[], rows: string[][]) => {
    el('h2', title, body);
    if (!rows.length) {
      el('p', t('statements.noMovements'), body);
      return;
    }
    const tbl = el('table', undefined, body);
    const hr = el('tr', undefined, el('thead', undefined, tbl));
    head.forEach(h => el('th', h, hr));
    const tb = el('tbody', undefined, tbl);
    rows.forEach(r => {
      const tr = el('tr', undefined, tb);
      r.forEach(c => el('td', c, tr));
    });
  };
  const col = (k: string) => t(`statements.cols.${k}`);
  table(t('statements.investments'), [col('date'), col('asset'), col('tokens'), col('amount')], s.investments.map(i => [fmtDate(i.date, undefined, locale), i.assetName, String(i.tokens), usd(i.amount, locale)]));
  table(t('statements.dividends'), [col('date'), col('asset'), col('amount')], s.dividends.map(d => [fmtDate(d.date, undefined, locale), d.assetName, usd(d.amount, locale)]));
  el('p', t('statements.print.totalInvested', { amount: usd(s.totals.invested, locale) }), body).className = 't';
  el('p', t('statements.print.totalDividends', { amount: usd(s.totals.dividends, locale) }), body).className = 't';
  el('p', t('statements.print.note'), body).className = 'n';

  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(() => {
    win.focus();
    win.print();
    // Browsers without afterprint: drop the frame after a while anyway.
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  }, 50);
}
