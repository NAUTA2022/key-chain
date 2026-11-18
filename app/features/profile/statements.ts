import { api } from '~/lib/api/client';
import { call, fmtDate, saveBlob, toCsv } from './api';
import type { Statement } from './hooks';

// Yearly statement exports (CSV and print), built client-side from GET /v1/me/statements.

const usd = (n: number): string => `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Years with a possible statement: from the member's first year (min 2020) to the current one, newest first. */
export function statementYears(memberSince: string | null | undefined, currentYear: number): number[] {
  const from = Math.max(2020, memberSince ? new Date(memberSince).getUTCFullYear() || currentYear : currentYear);
  const years: number[] = [];
  for (let y = currentYear; y >= Math.min(from, currentYear); y--) years.push(y);
  return years;
}

export function statementCsv(s: Statement): string {
  const rows: Array<Array<string | number | null>> = [
    ['Resumen anual KEY CHAIN', s.year],
    [],
    ['Inversiones'],
    ['Fecha', 'Activo', 'ID activo', 'Tokens', 'Monto (USD)', 'Transacción'],
    ...s.investments.map(i => [i.date.slice(0, 10), i.assetName, i.assetId, i.tokens, i.amount.toFixed(2), i.txHash]),
    [],
    ['Dividendos'],
    ['Fecha', 'Activo', 'ID activo', 'Monto (USD)'],
    ...s.dividends.map(d => [d.date.slice(0, 10), d.assetName, d.assetId, d.amount.toFixed(2)]),
    [],
    ['Total invertido (USD)', s.totals.invested.toFixed(2)],
    ['Total dividendos (USD)', s.totals.dividends.toFixed(2)],
  ];
  return toCsv(rows);
}

/** Saves the statement as CSV (UTF-8 with BOM so spreadsheet apps keep the accents). */
export function saveStatementCsv(s: Statement): void {
  saveBlob(new Blob(['﻿', statementCsv(s)], { type: 'text/csv;charset=utf-8' }), `keychain-resumen-${s.year}.csv`);
}

/** Fetches a year's statement and saves it as CSV. Returns false when it could not be loaded. */
export async function downloadStatementCsv(year: number): Promise<boolean> {
  const { data } = await call(api.GET('/v1/me/statements', { params: { query: { year } } }));
  if (!data) return false;
  saveStatementCsv(data);
  return true;
}

/**
 * Prints the statement from a hidden iframe. The document is built with DOM APIs
 * (textContent only), so API strings can never inject markup.
 */
export function printStatement(s: Statement, holder: { name: string; wallet: string }): void {
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
  doc.title = `Resumen ${s.year} — KEY CHAIN`;
  const style = el('style', 'body{font-family:system-ui,-apple-system,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}p{margin:2px 0;font-size:12px;color:#444}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}th{background:#f4f4f4}.t{margin-top:20px;font-size:13px}.n{font-size:11px;color:#666;margin-top:24px}');
  doc.head.appendChild(style);
  const body = doc.body;
  el('h1', `Resumen anual ${s.year}`, body);
  el('p', `Titular: ${holder.name}`, body);
  el('p', `Wallet: ${holder.wallet}`, body);
  el('p', `Emitido: ${fmtDate(new Date().toISOString())}`, body);

  const table = (title: string, head: string[], rows: string[][]) => {
    el('h2', title, body);
    if (!rows.length) {
      el('p', 'Sin movimientos en el año.', body);
      return;
    }
    const t = el('table', undefined, body);
    const hr = el('tr', undefined, el('thead', undefined, t));
    head.forEach(h => el('th', h, hr));
    const tb = el('tbody', undefined, t);
    rows.forEach(r => {
      const tr = el('tr', undefined, tb);
      r.forEach(c => el('td', c, tr));
    });
  };
  table('Inversiones', ['Fecha', 'Activo', 'Tokens', 'Monto'], s.investments.map(i => [fmtDate(i.date), i.assetName, String(i.tokens), usd(i.amount)]));
  table('Dividendos', ['Fecha', 'Activo', 'Monto'], s.dividends.map(d => [fmtDate(d.date), d.assetName, usd(d.amount)]));
  el('p', `Total invertido: ${usd(s.totals.invested)}`, body).className = 't';
  el('p', `Total dividendos: ${usd(s.totals.dividends)}`, body).className = 't';
  el('p', 'Incluye inversiones confirmadas on-chain y dividendos asignados en el año calendario (UTC). Este resumen es informativo; consultá a un asesor fiscal para tu situación particular.', body).className = 'n';

  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(() => {
    win.focus();
    win.print();
    // Browsers without afterprint: drop the frame after a while anyway.
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  }, 50);
}
