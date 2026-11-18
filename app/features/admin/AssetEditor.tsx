import { useState, type FormEvent } from 'react';
import { api } from '~/lib/api/client';
import { COUNTRY_OPTIONS } from '~/lib/countries';
import { PoolActions } from './AdminLive';
import { errorText, unwrap, useApiData } from './api';
import { DocumentsPanel, ImagesPanel } from './AssetMedia';
import { IssuerPanel } from './IssuerPanel';
import { fmtDateTime, fmtInt, fmtPrice, localInputToIso, toLocalInput, toNumber } from './format';
import { ASSET_STATUS, CATEGORY, ISSUER_KIND, POOL_STATUS, STAGE } from './labels';
import {
  ASSET_CATEGORIES, ASSET_STAGES, createAssetSchema, distributionSchema, ISSUER_KINDS, updateAssetSchema, validate, type FieldErrors,
} from './schemas';
import { sub } from './styles';
import type { AdminAssetDetail, AdminIssuer, AssetCategory, AssetStage, IssuerKind } from './types';
import { Btn, Check, Chips, Drawer, Field, FormGrid, Hash, KV, Notice, Panel, Select, Tag, TextArea, TextInput } from './ui';
import { useConfirm } from './useConfirm';
import type { AdminPool } from './useAdminData';

const FREQUENCIES = ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];

type Note = { tone: 'ok' | 'error'; text: string } | null;

/** Create/edit drawer of one asset: data, publication, gallery, documents, distribution and pool. */
export function AssetEditor({ assetId, pool, onClose, onCreated, onChanged, onPoolsChange }: {
  assetId: number | null; pool: AdminPool | undefined; onClose: () => void; onCreated: (id: number) => void; onChanged: () => void; onPoolsChange: () => void;
}) {
  const invalid = assetId !== null && !(Number.isInteger(assetId) && assetId > 0);
  const detail = useApiData(assetId !== null && !invalid ? `asset|${assetId}` : null, () =>
    unwrap(api.GET('/v1/admin/assets/{id}', { params: { path: { id: assetId ?? 0 } } }), 'No se pudo cargar el activo.'));
  const issuers = useApiData('issuers', () => unwrap(api.GET('/v1/admin/issuers'), 'No se pudieron cargar los emisores.'));
  const asset = detail.data;
  const issuer = asset ? issuers.data?.find(i => i.id === asset.issuer.id) : undefined;
  const changed = () => {
    detail.reload();
    onChanged();
  };

  const subtitle = asset ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Tag spec={ASSET_STATUS[asset.status]} />
      <span>#{asset.id} · {asset.slug}</span>
      {asset.status === 'published' && <a href={`/tokenizaciones/${asset.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sec)', fontWeight: 600 }}>Ver ficha pública</a>}
    </span>
  ) : assetId === null ? 'Se crea como borrador o publicado; imágenes y documentos se cargan después de crearlo.' : undefined;

  return (
    <Drawer title={assetId === null ? 'Nuevo activo' : asset?.name ?? 'Activo'} subtitle={subtitle} onClose={onClose}>
      {invalid && <Notice tone="error">El identificador del activo no es válido.</Notice>}
      {issuers.error && <Notice tone="error">{issuers.error}</Notice>}
      {assetId === null && (
        <Panel title="Datos del activo">
          <AssetForm asset={null} issuers={issuers.data ?? []} onSaved={a => onCreated(a.id)} />
        </Panel>
      )}
      {assetId !== null && !invalid && !asset && (detail.error ? <Notice tone="error">{detail.error}</Notice> : <span style={sub}>Cargando…</span>)}
      {asset && (
        <>
          <PublishPanel asset={asset} onChanged={changed} />
          <Panel title="Datos del activo">
            <AssetForm key={asset.id} asset={asset} issuers={issuers.data ?? []} onSaved={changed} />
          </Panel>
          {issuer && <IssuerPanel key={issuer.id} issuer={issuer} onChanged={issuers.reload} />}
          <ImagesPanel asset={asset} onChanged={changed} />
          <DocumentsPanel asset={asset} onChanged={changed} />
          <DistributionPanel asset={asset} onChanged={changed} />
          <Panel title="On-chain">
            <KV rows={[
              ['Pool', pool ? <Tag spec={POOL_STATUS[pool.status]} /> : asset.poolStatus ? <Tag spec={POOL_STATUS[asset.poolStatus]} /> : 'Sin tokenizar'],
              ['Token', <Hash key="t" value={asset.contractAddress ?? pool?.token} kind="address" chainId={asset.chainId ?? pool?.chainId} />],
              ['Vault', <Hash key="v" value={pool?.vault} kind="address" chainId={pool?.chainId} />],
              ['Vendido', `${asset.soldPercent}% · ${fmtInt(asset.ordersMinted)} órdenes acreditadas`],
            ]} />
            {(pool || !asset.poolStatus) && (
              <div style={{ marginTop: 14 }}>
                <PoolActions assetId={asset.id} assetName={asset.name} pool={pool} onChange={() => { onPoolsChange(); changed(); }} />
              </div>
            )}
          </Panel>
        </>
      )}
    </Drawer>
  );
}

// ─── Data form ───────────────────────────────────────────────────────────────

type FormState = {
  name: string; category: AssetCategory; country: string; location: string; description: string;
  valuation: string; tokenPrice: string; totalTokens: string; apy: string; stage: AssetStage; lifespan: string;
  feedEnabled: boolean; distributionFrequency: string;
  issuerMode: 'existing' | 'new'; issuerId: string; newIssuerName: string; newIssuerKind: IssuerKind; status: 'draft' | 'published';
};

function initialForm(a: AdminAssetDetail | null): FormState {
  if (!a) {
    return {
      name: '', category: 'inmuebles', country: '', location: '', description: '', valuation: '', tokenPrice: '', totalTokens: '', apy: '',
      stage: 'recaudacion', lifespan: '', feedEnabled: false, distributionFrequency: 'Mensual',
      issuerMode: 'existing', issuerId: '', newIssuerName: '', newIssuerKind: 'community', status: 'draft',
    };
  }
  return {
    name: a.name, category: a.category, country: a.country, location: a.location, description: a.description,
    valuation: String(a.valuation), tokenPrice: String(a.tokenPrice), totalTokens: String(a.totalTokens), apy: String(a.apy),
    stage: a.stage, lifespan: a.lifespan, feedEnabled: a.feedEnabled, distributionFrequency: a.distributionFrequency,
    issuerMode: 'existing', issuerId: a.issuer.id, newIssuerName: '', newIssuerKind: 'community', status: 'draft',
  };
}

/** Keys of `next` whose value differs from `current` (PATCH only what changed). */
function changedFields<T extends object>(next: T, current: Partial<Record<keyof T, unknown>>): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(next) as Array<keyof T>) {
    if (next[k] !== undefined && next[k] !== current[k]) out[k] = next[k];
  }
  return out;
}

function AssetForm({ asset, issuers, onSaved }: { asset: AdminAssetDetail | null; issuers: AdminIssuer[]; onSaved: (a: AdminAssetDetail) => void }) {
  const [f, setF] = useState<FormState>(() => initialForm(asset));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(prev => ({ ...prev, [k]: v }));
  const locked = asset?.priceLocked ?? false;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    const common = {
      name: f.name, category: f.category, country: f.country, location: f.location, description: f.description,
      valuation: toNumber(f.valuation), apy: toNumber(f.apy), stage: f.stage, lifespan: f.lifespan,
      feedEnabled: f.feedEnabled, distributionFrequency: f.distributionFrequency,
      ...(locked ? {} : { tokenPrice: toNumber(f.tokenPrice), totalTokens: toNumber(f.totalTokens) }),
    };
    if (!asset) {
      const v = validate(createAssetSchema, {
        ...common, status: f.status,
        ...(f.issuerMode === 'existing' ? { issuerId: f.issuerId || undefined } : { newIssuer: { name: f.newIssuerName, kind: f.newIssuerKind } }),
      });
      if (!v.ok) return setErrors(v.errors);
      setErrors({});
      setBusy(true);
      try {
        onSaved(await unwrap(api.POST('/v1/admin/assets', { body: v.data }), 'No se pudo crear el activo.'));
      } catch (err) {
        setNote({ tone: 'error', text: errorText(err) });
      } finally {
        setBusy(false);
      }
      return;
    }
    const v = validate(updateAssetSchema, { ...common, ...(f.issuerId !== asset.issuer.id ? { issuerId: f.issuerId } : {}) });
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    const patch = changedFields(v.data, { ...asset, issuerId: asset.issuer.id });
    if (Object.keys(patch).length === 0) return setNote({ tone: 'ok', text: 'No hay cambios para guardar.' });
    setBusy(true);
    try {
      const updated = await unwrap(api.PATCH('/v1/admin/assets/{id}', { params: { path: { id: asset.id } }, body: patch }), 'No se pudieron guardar los cambios.');
      setF(initialForm(updated));
      setNote({ tone: 'ok', text: 'Cambios guardados.' });
      onSaved(updated);
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  const issuerOptions = issuers.length ? issuers : asset ? [{ ...asset.issuer, country: null, logoUrl: null, ownerId: null, assetsCount: 0 }] : [];

  return (
    <form onSubmit={e => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
      <FormGrid>
        <Field label="Nombre" error={errors.name} span>
          <TextInput value={f.name} onChange={e => set('name', e.target.value)} maxLength={120} invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Categoría" error={errors.category}>
          <Select value={f.category} onChange={e => set('category', e.target.value as AssetCategory)}>
            {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY[c]}</option>)}
          </Select>
        </Field>
        <Field label="Etapa" error={errors.stage}>
          <Select value={f.stage} onChange={e => set('stage', e.target.value as AssetStage)}>
            {ASSET_STAGES.map(s => <option key={s} value={s}>{STAGE[s]}</option>)}
          </Select>
        </Field>
        <Field label="País" error={errors.country}>
          <TextInput value={f.country} onChange={e => set('country', e.target.value)} maxLength={80} list="admin-countries" placeholder="Argentina" invalid={Boolean(errors.country)} />
        </Field>
        <Field label="Ubicación" error={errors.location}>
          <TextInput value={f.location} onChange={e => set('location', e.target.value)} maxLength={160} placeholder="Ciudad, provincia" invalid={Boolean(errors.location)} />
        </Field>
        <Field label="Descripción" error={errors.description} span>
          <TextArea value={f.description} onChange={e => set('description', e.target.value)} maxLength={5000} rows={5} invalid={Boolean(errors.description)} />
        </Field>
        <Field label="Valuación (USD)" error={errors.valuation}>
          <TextInput type="number" inputMode="decimal" min="0" step="any" value={f.valuation} onChange={e => set('valuation', e.target.value)} invalid={Boolean(errors.valuation)} />
        </Field>
        <Field label="APY esperado (%)" error={errors.apy}>
          <TextInput type="number" inputMode="decimal" min="0" max="100" step="any" value={f.apy} onChange={e => set('apy', e.target.value)} invalid={Boolean(errors.apy)} />
        </Field>
        <Field label="Precio por token (USDC)" error={errors.tokenPrice} hint={locked ? 'Bloqueado: el activo ya tiene un pool on-chain.' : undefined}>
          <TextInput type="number" inputMode="decimal" min="0" step="any" value={f.tokenPrice} onChange={e => set('tokenPrice', e.target.value)} disabled={locked} invalid={Boolean(errors.tokenPrice)} />
        </Field>
        <Field label="Total de tokens" error={errors.totalTokens} hint={locked ? 'Bloqueado: el activo ya tiene un pool on-chain.' : undefined}>
          <TextInput type="number" inputMode="numeric" min="1" step="1" value={f.totalTokens} onChange={e => set('totalTokens', e.target.value)} disabled={locked} invalid={Boolean(errors.totalTokens)} />
        </Field>
        <Field label="Plazo / vida útil" error={errors.lifespan}>
          <TextInput value={f.lifespan} onChange={e => set('lifespan', e.target.value)} maxLength={60} placeholder="Ej.: 5 años" invalid={Boolean(errors.lifespan)} />
        </Field>
        <Field label="Frecuencia de distribución" error={errors.distributionFrequency}>
          <TextInput value={f.distributionFrequency} onChange={e => set('distributionFrequency', e.target.value)} maxLength={40} list="admin-frequencies" invalid={Boolean(errors.distributionFrequency)} />
        </Field>
      </FormGrid>

      <Check checked={f.feedEnabled} onChange={v => set('feedEnabled', v)} label="Habilitar novedades del emisor antes de que el activo esté operativo" />

      <Field label="Emisor" error={errors.issuerId ?? errors['newIssuer.name']} group>
        {!asset && (
          <div style={{ marginBottom: 4 }}>
            <Chips<'existing' | 'new'> ariaLabel="Tipo de emisor" value={f.issuerMode} onChange={v => set('issuerMode', v)} options={[['existing', 'Emisor existente'], ['new', 'Nuevo emisor']]} />
          </div>
        )}
        {f.issuerMode === 'existing' ? (
          <Select value={f.issuerId} onChange={e => set('issuerId', e.target.value)} aria-label="Emisor" invalid={Boolean(errors.issuerId)}>
            <option value="">Elegí un emisor…</option>
            {issuerOptions.map(i => <option key={i.id} value={i.id}>{i.name} · {ISSUER_KIND[i.kind]}</option>)}
          </Select>
        ) : (
          <FormGrid>
            <TextInput value={f.newIssuerName} onChange={e => set('newIssuerName', e.target.value)} maxLength={120} placeholder="Nombre del emisor" aria-label="Nombre del nuevo emisor" invalid={Boolean(errors['newIssuer.name'])} />
            <Select value={f.newIssuerKind} onChange={e => set('newIssuerKind', e.target.value as IssuerKind)} aria-label="Tipo de emisor">
              {ISSUER_KINDS.map(k => <option key={k} value={k}>{ISSUER_KIND[k]}</option>)}
            </Select>
          </FormGrid>
        )}
      </Field>

      {!asset && (
        <Field label="Estado inicial">
          <Select value={f.status} onChange={e => set('status', e.target.value === 'published' ? 'published' : 'draft')}>
            <option value="draft">Borrador (no visible en el catálogo)</option>
            <option value="published">Publicado</option>
          </Select>
        </Field>
      )}

      <datalist id="admin-countries">{COUNTRY_OPTIONS.map(([code, name]) => <option key={code} value={name} />)}</datalist>
      <datalist id="admin-frequencies">{FREQUENCIES.map(v => <option key={v} value={v} />)}</datalist>

      {Object.keys(errors).length > 0 && <Notice tone="error">Revisá los campos marcados.</Notice>}
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <div>
        <Btn variant="accent" type="submit" disabled={busy}>{busy ? 'Guardando…' : asset ? 'Guardar cambios' : 'Crear activo'}</Btn>
      </div>
    </form>
  );
}

// ─── Publication ─────────────────────────────────────────────────────────────

function PublishPanel({ asset, onChanged }: { asset: AdminAssetDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const { confirm, dialog } = useConfirm();

  async function setStatus(target: 'publish' | 'archive') {
    const publish = target === 'publish';
    const ok = await confirm(publish
      ? { title: 'Publicar activo', message: `"${asset.name}" quedará visible en el catálogo público de tokenizaciones.`, confirmLabel: 'Publicar' }
      : { title: 'Archivar activo', message: `"${asset.name}" dejará de mostrarse en el catálogo. Las posiciones existentes no cambian.`, confirmLabel: 'Archivar', danger: true });
    if (!ok) return;
    setBusy(true);
    setNote(null);
    try {
      const path = { params: { path: { id: asset.id } } };
      await unwrap(publish ? api.POST('/v1/admin/assets/{id}/publish', path) : api.POST('/v1/admin/assets/{id}/archive', path), 'No se pudo cambiar el estado.');
      setNote({ tone: 'ok', text: publish ? 'Activo publicado.' : 'Activo archivado.' });
      onChanged();
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Publicación"
      action={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {asset.status !== 'published' && <Btn small variant="accent" disabled={busy} onClick={() => void setStatus('publish')}>Publicar</Btn>}
          {asset.status !== 'archived' && <Btn small variant="secondary" disabled={busy} onClick={() => void setStatus('archive')}>Archivar</Btn>}
        </div>
      }
    >
      <div style={sub}>
        Estado actual: <strong style={{ color: 'var(--text)' }}>{ASSET_STATUS[asset.status].label}</strong> · Precio {fmtPrice(asset.tokenPrice)} · {fmtInt(asset.totalTokens)} tokens · creado {fmtDateTime(asset.createdAt)}
      </div>
      {note && <div style={{ marginTop: 10 }}><Notice tone={note.tone}>{note.text}</Notice></div>}
      {dialog}
    </Panel>
  );
}

// ─── Distribution schedule ───────────────────────────────────────────────────

function DistributionPanel({ asset, onChanged }: { asset: AdminAssetDetail; onChanged: () => void }) {
  const [date, setDate] = useState(() => toLocalInput(asset.nextDistributionAt));
  const [frequency, setFrequency] = useState(asset.distributionFrequency);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const { confirm, dialog } = useConfirm();

  async function save(clear: boolean) {
    setNote(null);
    const iso = clear ? null : localInputToIso(date);
    if (!clear && !iso) return setErrors({ nextDistributionAt: 'Elegí la fecha y hora de la próxima distribución.' });
    const v = validate(distributionSchema, { nextDistributionAt: iso, distributionFrequency: frequency });
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    if (clear && !(await confirm({ title: 'Quitar fecha de distribución', message: 'El activo quedará sin próxima distribución programada.', confirmLabel: 'Quitar', danger: true }))) return;
    setBusy(true);
    try {
      const r = await unwrap(api.PUT('/v1/admin/assets/{id}/distribution', { params: { path: { id: asset.id } }, body: v.data }), 'No se pudo guardar la distribución.');
      setNote({
        tone: 'ok',
        text: r.nextDistributionAt
          ? `Próxima distribución: ${fmtDateTime(r.nextDistributionAt)} (${r.distributionFrequency}). Se notificó a ${fmtInt(r.notified)} holder${r.notified === 1 ? '' : 's'}.`
          : 'Fecha de distribución quitada.',
      });
      onChanged();
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Distribución de rentas">
      <div style={{ ...sub, marginBottom: 12 }}>
        Actual: {asset.nextDistributionAt ? `${fmtDateTime(asset.nextDistributionAt)} · ${asset.distributionFrequency}` : `sin fecha programada · ${asset.distributionFrequency}`}. Al programarla se notifica a los holders.
      </div>
      <form onSubmit={e => { e.preventDefault(); void save(false); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
        <FormGrid>
          <Field label="Próxima distribución" error={errors.nextDistributionAt}>
            <TextInput type="datetime-local" value={date} onChange={e => setDate(e.target.value)} invalid={Boolean(errors.nextDistributionAt)} />
          </Field>
          <Field label="Frecuencia" error={errors.distributionFrequency}>
            <TextInput value={frequency} onChange={e => setFrequency(e.target.value)} maxLength={40} list="admin-frequencies-dist" invalid={Boolean(errors.distributionFrequency)} />
          </Field>
        </FormGrid>
        <datalist id="admin-frequencies-dist">{FREQUENCIES.map(v => <option key={v} value={v} />)}</datalist>
        {note && <Notice tone={note.tone}>{note.text}</Notice>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn small variant="accent" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Programar'}</Btn>
          {asset.nextDistributionAt && <Btn small variant="secondary" disabled={busy} onClick={() => void save(true)}>Quitar fecha</Btn>}
        </div>
      </form>
      {dialog}
    </Panel>
  );
}
