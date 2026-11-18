import { useState } from 'react';
import { api } from '~/lib/api/client';
import { downloadFile, errorText, unwrap, useApiData } from './api';
import { fmtBytes, fmtDate, fmtDateTime, fmtInt, fmtMoney, fmtPrice, shortHex, userName } from './format';
import { ASSET_STATUS, CATEGORY, POOL_STATUS, REQUEST_STATUS, requestCategory } from './labels';
import { ASSET_CATEGORIES, reviewSchema, validate } from './schemas';
import { body, linkBtn, strong, sub, td, tdDim, tdStrong } from './styles';
import type { AssetCategory, RequestStatus, TokenizationRequest, TokenizationRequestDetail } from './types';
import { Btn, Chips, DataTable, Drawer, Field, Hash, KV, Notice, Panel, Row, Select, Tag, TextArea } from './ui';
import { useConfirm } from './useConfirm';

type Filter = 'all' | RequestStatus;
const FILTERS: Array<[Filter, string]> = [
  ['all', 'Todas'], ['submitted', 'Enviadas'], ['in_review', 'En revisión'], ['changes_requested', 'Requieren cambios'], ['approved', 'Aprobadas'], ['rejected', 'Rechazadas'],
];

/** Request status plus, once approved, the project's publication and pool status (same lifecycle the requester sees). */
function StatusTags({ r }: { r: Pick<TokenizationRequest, 'status' | 'assetStatus' | 'poolStatus'> }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <Tag spec={REQUEST_STATUS[r.status]} />
      {r.assetStatus && <Tag spec={ASSET_STATUS[r.assetStatus]} />}
      {r.poolStatus && <Tag spec={POOL_STATUS[r.poolStatus]} />}
    </span>
  );
}

/** "Solicitudes": tokenization requests from issuers; review, reject or approve into a draft asset. */
export function RequestsTab({ selected, onSelect, onChange, onOpenAsset }: {
  selected: string | null; onSelect: (id: string | null) => void; onChange: () => void; onOpenAsset: (assetId: number) => void;
}) {
  const [status, setStatus] = useState<Filter>('all');
  const list = useApiData(`requests|${status}`, () =>
    unwrap(api.GET('/v1/admin/tokenization-requests', { params: { query: status === 'all' ? {} : { status } } }), 'No se pudieron cargar las solicitudes.'), { keepPrevious: true });
  const rows = list.data ?? [];

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Chips<Filter> ariaLabel="Filtrar solicitudes por estado" options={FILTERS} value={status} onChange={setStatus} />
      </div>
      <DataTable
        head={['Activo', 'Categoría', 'Solicitante', 'Valuación', 'Token', 'Estado', 'Fecha', '']}
        minWidth={980}
        loading={list.loading} error={list.error} empty={rows.length === 0} emptyText="No hay solicitudes en este estado."
      >
        {rows.map((r, i) => (
          <Row key={r.id} last={i === rows.length - 1}>
            <td style={td}><span style={strong}>{r.data.assetName}</span><div style={{ ...sub, marginTop: 2 }}>{r.data.location}, {r.data.country}</div></td>
            <td style={td}>{requestCategory(r.data)}</td>
            <td style={td}>{r.data.contactName}<div style={{ ...sub, marginTop: 2 }}>{userName(r.user)}</div></td>
            <td style={tdStrong}>{fmtMoney(r.data.valuation)}</td>
            <td style={td}>{fmtPrice(r.data.tokenPrice)} × {fmtInt(r.data.totalTokens)}</td>
            <td style={td}><StatusTags r={r} /></td>
            <td style={tdDim}>{fmtDate(r.createdAt)}</td>
            <td style={td}><Btn small variant="ghost" onClick={() => onSelect(r.id)}>Ver</Btn></td>
          </Row>
        ))}
      </DataTable>
      {selected && (
        <RequestDrawer
          key={selected} id={selected} onClose={() => onSelect(null)} onOpenAsset={onOpenAsset}
          onChanged={() => { list.reload(); onChange(); }}
        />
      )}
    </>
  );
}

function RequestDrawer({ id, onClose, onChanged, onOpenAsset }: { id: string; onClose: () => void; onChanged: () => void; onOpenAsset: (assetId: number) => void }) {
  const detail = useApiData(`request|${id}`, () => unwrap(api.GET('/v1/admin/tokenization-requests/{id}', { params: { path: { id } } }), 'No se pudo cargar la solicitud.'));
  const r = detail.data;
  return (
    <Drawer title={r ? r.data.assetName : 'Solicitud de tokenización'} subtitle={r ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><StatusTags r={r} />Enviada {fmtDateTime(r.createdAt)}</span> : undefined} onClose={onClose}>
      {!r && (detail.error ? <Notice tone="error">{detail.error}</Notice> : <span style={sub}>Cargando…</span>)}
      {r && <RequestBody request={r} onOpenAsset={onOpenAsset} onChanged={() => { detail.reload(); onChanged(); }} />}
    </Drawer>
  );
}

function RequestBody({ request: r, onChanged, onOpenAsset }: { request: TokenizationRequestDetail; onChanged: () => void; onOpenAsset: (assetId: number) => void }) {
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { confirm, dialog } = useConfirm();
  const open = r.status === 'submitted' || r.status === 'in_review' || r.status === 'changes_requested';
  const d = r.data;
  // Category of the draft asset: the requested one by default; "otro" has none, so the admin picks it.
  const [category, setCategory] = useState<AssetCategory | ''>(d.category === 'otro' ? '' : d.category);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  async function review(status: 'in_review' | 'changes_requested' | 'rejected') {
    const v = validate(reviewSchema, { status, note: note.trim() ? note : undefined });
    if (!v.ok) return setNoteError(v.errors.note ?? 'Revisá la nota.');
    setNoteError(null);
    if (status === 'rejected' && !(await confirm({ title: 'Rechazar solicitud', message: `Se rechazará "${d.assetName}" y se notificará al solicitante${v.data.note ? ' con tu nota' : ''}.`, confirmLabel: 'Rechazar', danger: true }))) return;
    setBusy(true);
    setResult(null);
    try {
      await unwrap(api.POST('/v1/admin/tokenization-requests/{id}/review', { params: { path: { id: r.id } }, body: v.data }), 'No se pudo actualizar la solicitud.');
      setNote('');
      setResult({ tone: 'ok', text: { rejected: 'Solicitud rechazada.', changes_requested: 'Se pidieron cambios al solicitante.', in_review: 'Solicitud marcada en revisión.' }[status] });
      onChanged();
    } catch (e) {
      setResult({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!category) return setCategoryError('Elegí la categoría del activo antes de aprobar.');
    setCategoryError(null);
    const ok = await confirm({
      title: 'Aprobar solicitud',
      message: `Se creará el activo "${d.assetName}" como borrador en la categoría ${CATEGORY[category]} (emisor: ${d.contactName}) con los datos de la solicitud. Después podés completarlo, cargar imágenes y publicarlo.`,
      confirmLabel: 'Aprobar y crear borrador',
    });
    if (!ok) return;
    setBusy(true);
    setResult(null);
    try {
      const updated = await unwrap(api.POST('/v1/admin/tokenization-requests/{id}/approve', { params: { path: { id: r.id } }, body: { category } }), 'No se pudo aprobar la solicitud.');
      setResult({ tone: 'ok', text: updated.assetId ? `Solicitud aprobada: se creó el activo #${updated.assetId} en borrador.` : 'Solicitud aprobada.' });
      onChanged();
    } catch (e) {
      setResult({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function download(url: string, filename: string) {
    try {
      await downloadFile(url, filename);
    } catch (e) {
      setResult({ tone: 'error', text: errorText(e, 'No se pudo descargar el archivo.') });
    }
  }

  return (
    <>
      {r.assetId !== null && (
        <Notice>
          Activo creado: #{r.assetId}.{' '}
          <button type="button" onClick={() => onOpenAsset(r.assetId ?? 0)} style={{ ...linkBtn, color: 'inherit', fontSize: 13 }}>Editar en Proyectos</button>
        </Notice>
      )}
      <Panel title="Activo propuesto">
        <KV rows={[
          ['Nombre', d.assetName],
          ['Categoría', requestCategory(d)],
          ['Ubicación', `${d.location}, ${d.country}`],
          ['Valuación', fmtMoney(d.valuation)],
          ['Precio por token', fmtPrice(d.tokenPrice)],
          ['Tokens', fmtInt(d.totalTokens)],
          ['APY esperado', `${d.expectedApy}%`],
          ['Plazo', d.lifespan],
        ]} />
        <div style={{ ...body, marginTop: 14, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{d.description}</div>
      </Panel>
      <Panel title="Solicitante">
        <KV rows={[
          ['Contacto', d.contactName],
          ['Email', <a key="e" href={`mailto:${d.contactEmail}`} style={{ color: 'var(--text)' }}>{d.contactEmail}</a>],
          ['Teléfono', d.contactPhone ?? '—'],
          ['Usuario', userName(r.user)],
          ['Wallet', <Hash key="w" value={r.user.walletAddress} kind="address" />],
          ...(r.reviewedBy ? [['Revisada por', shortHex(r.reviewedBy)] as [string, string]] : []),
          ...(r.reviewNote ? [[r.status === 'rejected' ? 'Motivo del rechazo' : 'Nota de revisión', r.reviewNote] as [string, string]] : []),
        ]} />
      </Panel>
      <Panel title={`Documentos (${r.documents.length})`}>
        {r.documents.length === 0 && <div style={sub}>Sin documentos adjuntos.</div>}
        {r.documents.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < r.documents.length - 1 ? '1px solid var(--border-l)' : 'none', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={strong}>{f.filename}</div>
              <div style={{ ...sub, marginTop: 2 }}>{fmtBytes(f.size)} · {fmtDate(f.createdAt)}</div>
            </div>
            <button type="button" style={linkBtn} onClick={() => void download(f.url, f.filename)}>Descargar</button>
          </div>
        ))}
      </Panel>
      {open && (
        <Panel title="Revisión">
          <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
            <Field label="Nota para el solicitante" hint="Obligatoria para pedir cambios o rechazar: el solicitante la ve en su solicitud." error={noteError ?? undefined}>
              <TextArea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={3} placeholder="Qué falta, qué hay que corregir o por qué se rechaza" invalid={Boolean(noteError)} />
            </Field>
            <Field
              label="Categoría del activo al aprobar"
              hint={d.category === 'otro' ? `El solicitante eligió "Otro"${d.otherType ? ` (${d.otherType})` : ''}: elegí la categoría más cercana.` : 'Por defecto, la que eligió el solicitante.'}
              error={categoryError ?? undefined}
            >
              <Select value={category} onChange={e => { setCategory(e.target.value === '' ? '' : (ASSET_CATEGORIES.find(c => c === e.target.value) ?? '')); setCategoryError(null); }} invalid={Boolean(categoryError)}>
                <option value="" disabled>Elegí una categoría</option>
                {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY[c]}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn small variant="accent" disabled={busy} onClick={() => void approve()}>Aprobar y crear borrador</Btn>
              {r.status !== 'in_review' && <Btn small variant="ghost" disabled={busy} onClick={() => void review('in_review')}>Marcar en revisión</Btn>}
              {r.status !== 'changes_requested' && <Btn small variant="ghost" disabled={busy} onClick={() => void review('changes_requested')}>Pedir cambios</Btn>}
              <Btn small variant="secondary" disabled={busy} onClick={() => void review('rejected')} style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }}>Rechazar</Btn>
            </div>
          </form>
        </Panel>
      )}
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      {dialog}
    </>
  );
}
