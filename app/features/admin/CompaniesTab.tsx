import { useState } from 'react';
import { api } from '~/lib/api/client';
import { countryName } from '~/lib/countries';
import type { paths } from '~/lib/api/schema';
import { errorText, unwrap, useApiData } from './api';
import { fmtDate, fmtDateTime, shortHex, userName } from './format';
import { KYC_STATUS, type TagSpec } from './labels';
import { linkBtn, strong, sub, td, tdDim } from './styles';
import { Btn, Chips, DataTable, Drawer, Field, KV, Notice, Panel, Row, Tag, TextArea } from './ui';
import { useConfirm } from './useConfirm';

// "Empresas": self-registered company accounts. The admin checks the company
// data and its owner's KYB, then approves (company verified + KYB approved,
// public profile) or rejects with a reason. Every decision is audited and
// notified to the owner by the API.

type AdminCompany = paths['/v1/admin/companies']['get']['responses'][200]['content']['application/json'][number];
type Status = AdminCompany['status'];

const FILTERS: Array<[Status, string]> = [['pending', 'Pendientes'], ['verified', 'Verificadas'], ['rejected', 'Rechazadas']];
const STATUS: Record<Status, TagSpec> = {
  pending: { label: 'Pendiente', color: 'blue' },
  verified: { label: 'Verificada', color: 'green' },
  rejected: { label: 'Rechazada', color: 'red' },
};
const kybType = (t: AdminCompany['kyb']['type']) => (t === 'business' ? 'Empresa (KYB)' : t === 'individual' ? 'Persona (KYC)' : '—');

export function CompaniesTab({ selected, onSelect, onChange }: { selected: string | null; onSelect: (id: string | null) => void; onChange: () => void }) {
  const [status, setStatus] = useState<Status>('pending');
  const list = useApiData(`companies|${status}`, () =>
    unwrap(api.GET('/v1/admin/companies', { params: { query: { status } } }), 'No se pudieron cargar las empresas.'), { keepPrevious: true });
  const rows = list.data ?? [];
  const open = selected ? rows.find(c => c.id === selected) ?? null : null;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Chips<Status> ariaLabel="Filtrar empresas por estado" options={FILTERS} value={status} onChange={s => { setStatus(s); onSelect(null); }} />
      </div>
      <DataTable
        head={['Empresa', 'Identificación', 'País', 'Responsable', 'KYB', 'Enviada', 'Estado', '']}
        minWidth={980}
        loading={list.loading} error={list.error} empty={rows.length === 0} emptyText="No hay empresas en este estado."
      >
        {rows.map((c, i) => (
          <Row key={c.id} last={i === rows.length - 1}>
            <td style={td}><span style={strong}>{c.name}</span><div style={sub}>/{c.slug}</div></td>
            <td style={td}>{c.taxId ?? '—'}</td>
            <td style={td}>{countryName(c.country)}</td>
            <td style={td}>{userName(c.owner)}</td>
            <td style={td}><Tag spec={KYC_STATUS[c.kyb.status]} /></td>
            <td style={tdDim}>{fmtDate(c.submittedAt)}</td>
            <td style={td}><Tag spec={STATUS[c.status]} /></td>
            <td style={td}><Btn small variant="ghost" onClick={() => onSelect(c.id)}>Abrir</Btn></td>
          </Row>
        ))}
      </DataTable>
      {selected && (
        <Drawer
          title={open ? open.name : 'Empresa'}
          subtitle={open ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Tag spec={STATUS[open.status]} />{countryName(open.country)} · enviada {fmtDate(open.submittedAt)}</span> : undefined}
          onClose={() => onSelect(null)}
        >
          {open
            ? <CompanyReview key={open.id} company={open} onDone={() => { list.reload(); onChange(); }} />
            : <span style={sub}>{list.loading ? 'Cargando…' : 'Esta empresa no está en el filtro actual.'}</span>}
        </Drawer>
      )}
    </>
  );
}

function CompanyReview({ company: c, onDone }: { company: AdminCompany; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { confirm, dialog } = useConfirm();
  const path = { params: { path: { id: c.id } } };
  const kybReady = c.kyb.status === 'pending' || c.kyb.status === 'verified';

  async function approve() {
    const ok = await confirm({
      title: `¿Aprobar ${c.name}?`,
      message: c.kyb.status === 'pending'
        ? 'Se aprueba también la verificación (KYB) del responsable y se registra su identidad on-chain. La página de la empresa pasa a ser pública.'
        : 'La página de la empresa pasa a ser pública y el responsable recibe un aviso.',
      confirmLabel: 'Aprobar empresa',
    });
    if (!ok) return;
    setBusy(true);
    setNote(null);
    try {
      await unwrap(api.POST('/v1/admin/companies/{id}/approve', path), 'No se pudo aprobar la empresa.');
      setNote({ tone: 'ok', text: 'Empresa aprobada. Avisamos al responsable.' });
      onDone();
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e, 'No se pudo aprobar la empresa.') });
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const text = reason.trim();
    if (text.length < 3 || text.length > 300) return setReasonError('Escribí un motivo de 3 a 300 caracteres.');
    setReasonError(null);
    const ok = await confirm({ title: `¿Rechazar ${c.name}?`, message: `Motivo: ${text}`, confirmLabel: 'Rechazar', danger: true });
    if (!ok) return;
    setBusy(true);
    setNote(null);
    try {
      await unwrap(api.POST('/v1/admin/companies/{id}/reject', { ...path, body: { reason: text } }), 'No se pudo rechazar la empresa.');
      setNote({ tone: 'ok', text: 'Empresa rechazada. El responsable puede corregir los datos y reenviarla.' });
      setReason('');
      onDone();
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e, 'No se pudo rechazar la empresa.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {dialog}
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {c.status === 'rejected' && c.rejectionReason && <Notice tone="error">Rechazada: {c.rejectionReason}</Notice>}

      <Panel title="Datos de la empresa">
        <KV rows={[
          ['Razón social', c.name],
          ['Identificación tributaria', c.taxId ?? '—'],
          ['País', countryName(c.country)],
          ['Sitio web', c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" style={linkBtn}>{c.website}</a> : '—'],
          ['Descripción', c.bio ?? '—'],
          ['Página', `/empresas/${c.slug}`],
          ['Registrada', fmtDateTime(c.createdAt)],
          ['Revisada', c.reviewedAt ? fmtDateTime(c.reviewedAt) : '—'],
        ]} />
      </Panel>

      <Panel title="Responsable y KYB">
        <KV rows={[
          ['Responsable', userName(c.owner)],
          ['Email', c.owner.email ?? '—'],
          ['Wallet', shortHex(c.owner.walletAddress)],
          ['Estado KYB', <Tag key="kyb" spec={KYC_STATUS[c.kyb.status]} />],
          ['Tipo', kybType(c.kyb.type)],
          ['Nombre legal', c.kyb.legalName ?? '—'],
          ['Documento / Tax ID', c.kyb.documentId ?? '—'],
          ['País (KYB)', countryName(c.kyb.country)],
          ['Enviado', fmtDateTime(c.kyb.submittedAt)],
        ]} />
        {!kybReady && <div style={{ ...sub, marginTop: 10 }}>El responsable todavía no envió la verificación de empresa (KYB): no se puede aprobar.</div>}
        {c.kyb.type === 'individual' && kybReady && <div style={{ ...sub, marginTop: 10 }}>El responsable tiene una verificación de persona (KYC), no de empresa.</div>}
      </Panel>

      {c.status === 'pending' && (
        <Panel title="Decisión">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><Btn variant="accent" disabled={busy || !kybReady} onClick={() => void approve()}>Aprobar empresa</Btn></div>
            <Field label="Motivo del rechazo" error={reasonError ?? undefined} hint="Lo ve el responsable de la empresa.">
              <TextArea rows={3} maxLength={300} value={reason} invalid={!!reasonError} onChange={e => { setReason(e.target.value); setReasonError(null); }} />
            </Field>
            <div><Btn variant="secondary" disabled={busy} onClick={() => void reject()}>Rechazar</Btn></div>
          </div>
        </Panel>
      )}
    </div>
  );
}
