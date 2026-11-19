import { useState, type FormEvent } from 'react';
import { PCard } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { errorText, unwrap, useApiData } from './api';
import { fmtDateTime, toNumber } from './format';
import { tokenSchema, validate, type FieldErrors } from './schemas';
import { errText, sub } from './styles';
import type { PlatformToken } from './types';
import { Btn, Field, FormGrid, Notice, Panel, TextInput } from './ui';

/** Token BRIK page content: scalar fields, sale rounds, allocations (must add up to 100) and utilities. */
export function TokenAdmin() {
  const token = useApiData('token', () => unwrap(api.GET('/v1/admin/token'), 'No se pudo cargar el token.'));
  if (!token.data) {
    return <PCard style={{ padding: '18px 20px' }}>{token.error ? <span role="alert" style={errText}>{token.error}</span> : <span style={sub}>Cargando…</span>}</PCard>;
  }
  return <TokenForm token={token.data} />;
}

type Round = { name: string; price: string; status: string; alloc: string; tge: string; cliff: string; vesting: string };
type Allocation = { label: string; percent: string; color: string };
type TokenFormState = {
  symbol: string; name: string; price: string; raised: string; goal: string; holders: string; contractAddress: string; chainId: string;
  utilities: string[]; rounds: Round[]; allocations: Allocation[];
};

const COLOR_OK = /^(#[0-9a-fA-F]{3,8}|var\(--[a-zA-Z0-9-]{1,40}\))$/;

function toForm(t: PlatformToken): TokenFormState {
  return {
    symbol: t.symbol, name: t.name, price: String(t.price), raised: String(t.raised), goal: String(t.goal), holders: String(t.holders),
    contractAddress: t.contractAddress ?? '', chainId: t.chainId === null ? '' : String(t.chainId),
    utilities: [...t.utilities],
    rounds: t.rounds.map(r => ({ ...r, price: String(r.price) })),
    allocations: t.allocations.map(a => ({ ...a, percent: String(a.percent) })),
  };
}

const ROUND_FIELDS: Array<[keyof Round, string]> = [
  ['name', 'Ronda'], ['price', 'Precio (USD)'], ['status', 'Estado'], ['alloc', 'Asignación'], ['tge', 'TGE'], ['cliff', 'Cliff'], ['vesting', 'Vesting'],
];

function TokenForm({ token }: { token: PlatformToken }) {
  const mobile = useMobile();
  const [f, setF] = useState(() => toForm(token));
  const [updatedAt, setUpdatedAt] = useState(token.updatedAt);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const set = <K extends keyof TokenFormState>(k: K, v: TokenFormState[K]) => setF(prev => ({ ...prev, [k]: v }));
  const setRound = (i: number, k: keyof Round, v: string) => set('rounds', f.rounds.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const setAlloc = (i: number, k: keyof Allocation, v: string) => set('allocations', f.allocations.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  const allocSum = f.allocations.reduce((s, a) => s + (Number.isFinite(toNumber(a.percent)) ? toNumber(a.percent) : 0), 0);
  const sumOk = Math.abs(allocSum - 100) <= 0.01;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    const v = validate(tokenSchema, {
      symbol: f.symbol.trim().toUpperCase(), name: f.name, price: toNumber(f.price), raised: toNumber(f.raised), goal: toNumber(f.goal),
      holders: toNumber(f.holders), contractAddress: f.contractAddress.trim() || null, chainId: f.chainId.trim() ? toNumber(f.chainId) : null,
      utilities: f.utilities,
      rounds: f.rounds.map(r => ({ ...r, price: toNumber(r.price) })),
      allocations: f.allocations.map(a => ({ ...a, percent: toNumber(a.percent) })),
    });
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      const saved = await unwrap(api.PUT('/v1/admin/token', { body: v.data }), 'No se pudo guardar el token.');
      setF(toForm(saved));
      setUpdatedAt(saved.updatedAt);
      setNote({ tone: 'ok', text: 'Token actualizado.' });
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  const err = (path: string) => errors[path];

  return (
    <form onSubmit={e => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
      <Panel title="Datos del token" action={<span style={sub}>Actualizado {fmtDateTime(updatedAt)}</span>}>
        <FormGrid cols={4}>
          <Field label="Símbolo" error={err('symbol')}><TextInput value={f.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} maxLength={12} invalid={Boolean(err('symbol'))} /></Field>
          <Field label="Nombre" error={err('name')}><TextInput value={f.name} onChange={e => set('name', e.target.value)} maxLength={60} invalid={Boolean(err('name'))} /></Field>
          <Field label="Precio (USD)" error={err('price')}><TextInput type="number" inputMode="decimal" min="0" step="any" value={f.price} onChange={e => set('price', e.target.value)} invalid={Boolean(err('price'))} /></Field>
          <Field label="Holders" error={err('holders')}><TextInput type="number" inputMode="numeric" min="0" step="1" value={f.holders} onChange={e => set('holders', e.target.value)} invalid={Boolean(err('holders'))} /></Field>
          <Field label="Recaudado (USD)" error={err('raised')}><TextInput type="number" inputMode="decimal" min="0" step="any" value={f.raised} onChange={e => set('raised', e.target.value)} invalid={Boolean(err('raised'))} /></Field>
          <Field label="Meta (USD)" error={err('goal')}><TextInput type="number" inputMode="decimal" min="0" step="any" value={f.goal} onChange={e => set('goal', e.target.value)} invalid={Boolean(err('goal'))} /></Field>
          <Field label="Contrato" error={err('contractAddress')} hint="Vacío si todavía no está desplegado."><TextInput value={f.contractAddress} onChange={e => set('contractAddress', e.target.value)} maxLength={42} placeholder="0x…" invalid={Boolean(err('contractAddress'))} /></Field>
          <Field label="Chain ID" error={err('chainId')}><TextInput type="number" inputMode="numeric" min="1" step="1" value={f.chainId} onChange={e => set('chainId', e.target.value)} placeholder="137" invalid={Boolean(err('chainId'))} /></Field>
        </FormGrid>
      </Panel>

      <Panel title={`Rondas (${f.rounds.length})`} action={<Btn small variant="ghost" disabled={f.rounds.length >= 20} onClick={() => set('rounds', [...f.rounds, { name: '', price: '', status: '', alloc: '', tge: '', cliff: '', vesting: '' }])}>+ Agregar ronda</Btn>}>
        {f.rounds.length === 0 && <div style={sub}>Sin rondas.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {f.rounds.map((r, i) => (
            <div key={i} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border-l)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...sub, fontWeight: 600 }}>Ronda {i + 1}</span>
                <Btn small variant="secondary" onClick={() => set('rounds', f.rounds.filter((_, j) => j !== i))} ariaLabel={`Quitar ronda ${i + 1}`}>Quitar</Btn>
              </div>
              <FormGrid cols={4}>
                {ROUND_FIELDS.map(([k, label]) => (
                  <Field key={k} label={label} error={err(`rounds.${i}.${k}`)}>
                    <TextInput value={r[k]} onChange={e => setRound(i, k, e.target.value)} maxLength={k === 'status' ? 30 : 60} type={k === 'price' ? 'number' : 'text'} step={k === 'price' ? 'any' : undefined} invalid={Boolean(err(`rounds.${i}.${k}`))} />
                  </Field>
                ))}
              </FormGrid>
            </div>
          ))}
        </div>
        {err('rounds') && <div style={{ ...errText, marginTop: 8 }}>{err('rounds')}</div>}
      </Panel>

      <Panel
        title="Asignaciones"
        action={<span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 700, color: sumOk ? 'var(--pos)' : 'var(--neg)' }}>Total {Math.round(allocSum * 100) / 100}% {sumOk ? '✓' : '(debe sumar 100)'}</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {f.allocations.map((a, i) => (
            <div key={i} style={{
              display: 'grid', gap: 8, alignItems: 'start',
              gridTemplateColumns: mobile ? 'minmax(0, 1fr) minmax(0, 1.3fr) auto' : 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.4fr) auto',
              ...(mobile && i > 0 ? { paddingTop: 10, borderTop: '1px solid var(--border-l)' } : null),
            }}>
              <Field label={i === 0 || mobile ? 'Destino' : ''} error={err(`allocations.${i}.label`)} span={mobile}>
                <TextInput value={a.label} onChange={e => setAlloc(i, 'label', e.target.value)} maxLength={60} aria-label={`Destino ${i + 1}`} invalid={Boolean(err(`allocations.${i}.label`))} />
              </Field>
              <Field label={i === 0 || mobile ? '%' : ''} error={err(`allocations.${i}.percent`)}>
                <TextInput type="number" inputMode="decimal" min="0" max="100" step="any" value={a.percent} onChange={e => setAlloc(i, 'percent', e.target.value)} aria-label={`Porcentaje ${i + 1}`} invalid={Boolean(err(`allocations.${i}.percent`))} />
              </Field>
              <Field label={i === 0 || mobile ? 'Color' : ''} error={err(`allocations.${i}.color`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, border: '1px solid var(--border)', background: COLOR_OK.test(a.color) ? a.color : 'transparent' }} />
                  <TextInput value={a.color} onChange={e => setAlloc(i, 'color', e.target.value)} maxLength={50} aria-label={`Color ${i + 1}`} invalid={Boolean(err(`allocations.${i}.color`))} />
                </div>
              </Field>
              <div style={{ paddingTop: i === 0 || mobile ? 22 : 0 }}>
                <Btn small variant="secondary" onClick={() => set('allocations', f.allocations.filter((_, j) => j !== i))} ariaLabel={`Quitar asignación ${i + 1}`} style={{ padding: '9px 12px' }}>×</Btn>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Btn small variant="ghost" disabled={f.allocations.length >= 20} onClick={() => set('allocations', [...f.allocations, { label: '', percent: '', color: '#8247E5' }])}>+ Agregar asignación</Btn>
        </div>
        {err('allocations') && <div style={{ ...errText, marginTop: 8 }}>{err('allocations')}</div>}
      </Panel>

      <Panel title={`Utilidades (${f.utilities.length})`} action={<Btn small variant="ghost" disabled={f.utilities.length >= 20} onClick={() => set('utilities', [...f.utilities, ''])}>+ Agregar utilidad</Btn>}>
        {f.utilities.length === 0 && <div style={sub}>Sin utilidades.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {f.utilities.map((u, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextInput value={u} onChange={e => set('utilities', f.utilities.map((x, j) => (j === i ? e.target.value : x)))} maxLength={200} aria-label={`Utilidad ${i + 1}`} invalid={Boolean(err(`utilities.${i}`))} />
                {err(`utilities.${i}`) && <div style={{ ...errText, marginTop: 4 }}>{err(`utilities.${i}`)}</div>}
              </div>
              <Btn small variant="secondary" onClick={() => set('utilities', f.utilities.filter((_, j) => j !== i))} ariaLabel={`Quitar utilidad ${i + 1}`} style={{ padding: '9px 12px' }}>×</Btn>
            </div>
          ))}
        </div>
      </Panel>

      {Object.keys(errors).length > 0 && <Notice tone="error">Revisa los campos marcados.</Notice>}
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <div><Btn variant="accent" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar token'}</Btn></div>
    </form>
  );
}
