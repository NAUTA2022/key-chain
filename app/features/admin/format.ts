// Display helpers for the admin panel (same number style as the rest of the UI).

/** $1,234.50 */
export function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Short money for KPI tiles: $8,200 · $142.5K · $28.4M. */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e5) return `$${(n / 1e3).toFixed(1)}K`;
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: abs < 10 ? 2 : 0 });
}

/** 12,840 */
export function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

/** Token price: up to 6 decimals, never fewer than 2. */
export function fmtPrice(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

/** 12 feb 2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** 12 feb 2026, 14:05 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** 0x12ab…89ef */
export function shortHex(v: string | null | undefined, head = 6, tail = 4): string {
  if (!v) return '—';
  return v.length <= head + tail + 1 ? v : `${v.slice(0, head)}…${v.slice(-tail)}`;
}

/** 'YYYY-MM' (UTC month key) → "oct 26". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('es-AR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
}

/** 1.2 MB */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO datetime → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO (UTC); null when empty or invalid. */
export function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Number typed in a text field; NaN when blank so validation can flag it. */
export function toNumber(v: string): number {
  const s = v.trim().replace(',', '.');
  return s === '' ? Number.NaN : Number(s);
}

/** Display name of a user reference. */
export function userName(u: { displayName: string | null; walletAddress: string }): string {
  return u.displayName?.trim() || shortHex(u.walletAddress);
}
