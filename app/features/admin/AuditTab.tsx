import { useState } from 'react';
import { Link } from 'react-router';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { unwrap, useDebounced, usePaged } from './api';
import { fmtDateTime, shortHex, userName } from './format';
import { AUDIT_ACTIONS, AUDIT_ENTITIES, auditActionLabel, auditEntityLabel } from './labels';
import { strong, sub, td, tdDim, toolbar } from './styles';
import type { AuditEntry } from './types';
import { DataTable, LoadMore, Row, Select, TextInput } from './ui';

/** Admin route + id for entities that have a detail view. */
function entityLink(entity: string, id: string): string | null {
  if (entity === 'user') return `/admin?tab=usuarios&id=${encodeURIComponent(id)}`;
  if (entity === 'asset') return `/admin?tab=proyectos&id=${encodeURIComponent(id)}`;
  if (entity === 'support_ticket') return `/admin?tab=soporte&id=${encodeURIComponent(id)}`;
  if (entity === 'tokenization_request') return `/admin?tab=solicitudes&id=${encodeURIComponent(id)}`;
  return null;
}

/** "Auditoría": every admin/user action recorded by the API, newest first. */
export function AuditTab() {
  const mobile = useMobile();
  const [entity, setEntity] = useState('');
  const [actionInput, setActionInput] = useState('');
  const action = useDebounced(actionInput.trim().slice(0, 60));
  const query = { limit: 50, ...(entity ? { entity } : {}), ...(action ? { action } : {}) };
  const log = usePaged<AuditEntry>(`audit|${JSON.stringify(query)}`, cursor =>
    unwrap(api.GET('/v1/admin/audit', { params: { query: { ...query, ...(cursor ? { cursor } : {}) } } }), 'No se pudo cargar la auditoría.'));

  return (
    <>
      <div style={toolbar}>
        <Select value={entity} onChange={e => setEntity(e.target.value)} aria-label="Filtrar por entidad" style={{ width: mobile ? '100%' : 230, padding: '9px 12px', fontSize: 13 }}>
          <option value="">Todas las entidades</option>
          {AUDIT_ENTITIES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </Select>
        <div style={{ width: mobile ? '100%' : 260 }}>
          <TextInput value={actionInput} onChange={e => setActionInput(e.target.value)} list="admin-audit-actions" maxLength={60} placeholder="Acción (ej.: asset.publish)" aria-label="Filtrar por acción" style={{ padding: '9px 14px', fontSize: 13 }} />
          <datalist id="admin-audit-actions">{AUDIT_ACTIONS.map(a => <option key={a} value={a}>{auditActionLabel(a)}</option>)}</datalist>
        </div>
      </div>
      <DataTable
        head={['Fecha', 'Acción', 'Entidad', 'Actor', 'Datos']}
        minWidth={900}
        loading={log.loading} error={log.error} empty={log.items.length === 0} emptyText="No hay registros con estos filtros."
      >
        {log.items.map((a, i) => {
          const href = entityLink(a.entity, a.entityId);
          const data = a.data === null || a.data === undefined ? null : JSON.stringify(a.data, null, 2);
          return (
            <Row key={a.id} last={i === log.items.length - 1}>
              <td style={tdDim}>{fmtDateTime(a.createdAt)}</td>
              <td style={td}><span style={strong}>{auditActionLabel(a.action)}</span><div style={{ ...sub, marginTop: 2 }}>{a.action}</div></td>
              <td style={td}>
                {auditEntityLabel(a.entity)}
                <div style={{ ...sub, marginTop: 2 }} title={a.entityId}>
                  {href ? <Link to={href} style={{ color: 'var(--sec)' }}>{shortHex(a.entityId, 8, 4)}</Link> : shortHex(a.entityId, 8, 4)}
                </div>
              </td>
              <td style={td}>{a.actor ? <Link to={`/admin?tab=usuarios&id=${encodeURIComponent(a.actor.id)}`} style={{ color: 'var(--text)' }}>{userName(a.actor)}</Link> : <span style={sub}>Sistema</span>}</td>
              <td style={{ ...td, maxWidth: 320 }}>
                {data && data !== '{}' ? (
                  <details>
                    <summary style={{ ...sub, cursor: 'pointer', fontWeight: 600 }}>Ver datos</summary>
                    <pre style={{ margin: '8px 0 0', padding: 10, borderRadius: 10, background: 'var(--surface2)', fontSize: 11.5, lineHeight: 1.45, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--sec)' }}>{data}</pre>
                  </details>
                ) : <span style={sub}>—</span>}
              </td>
            </Row>
          );
        })}
      </DataTable>
      <LoadMore visible={log.hasMore} busy={log.loadingMore} error={log.moreError} onClick={() => void log.loadMore()} />
    </>
  );
}
