import { useState } from 'react';
import { PTag } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { mediaUrl } from '~/lib/catalog';
import { PoolActions } from './AdminLive';
import { unwrap, useApiData, useDebounced } from './api';
import { AssetEditor } from './AssetEditor';
import { fmtPrice } from './format';
import { ASSET_STATUS, CATEGORY, POOL_STATUS } from './labels';
import { td, tdStrong, toolbar } from './styles';
import type { PublicationStatus } from './types';
import { Btn, Chips, DataTable, Row, Tag, TextInput } from './ui';
import type { AdminPool } from './useAdminData';

type StatusFilter = 'all' | PublicationStatus;

const FILTERS: Array<[StatusFilter, string]> = [
  ['all', 'Todos'], ['draft', 'Borradores'], ['review', 'En revisión'], ['published', 'Publicados'], ['archived', 'Archivados'],
];

/** "Proyectos": every asset of the catalog (any status) with its editor and on-chain actions. */
export function AssetsTab({ selected, onSelect, pools, onPoolsChange }: {
  selected: string | null; onSelect: (id: string | null) => void; pools: AdminPool[]; onPoolsChange: () => void;
}) {
  const mobile = useMobile();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const q = useDebounced(search.trim().slice(0, 80));
  const list = useApiData(`assets|${status}|${q}`, () =>
    unwrap(api.GET('/v1/admin/assets', { params: { query: { ...(status !== 'all' ? { status } : {}), ...(q ? { q } : {}) } } }), 'No se pudieron cargar los activos.'), { keepPrevious: true });
  const assets = list.data ?? [];
  const editingId = selected === 'nuevo' ? null : Number(selected);

  return (
    <>
      <div style={{ ...toolbar, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: mobile ? '100%' : 260 }}>
            <TextInput type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o slug" aria-label="Buscar activos" maxLength={80} style={{ padding: '9px 14px', fontSize: 13 }} />
          </div>
          <Chips<StatusFilter> ariaLabel="Filtrar por estado" options={FILTERS} value={status} onChange={setStatus} />
        </div>
        <Btn variant="accent" onClick={() => onSelect('nuevo')}>+ Nuevo activo</Btn>
      </div>

      <DataTable
        head={['Proyecto', 'Categoría', 'Token', 'Vendido', 'APY', 'Estado', 'On-chain', '']}
        minWidth={1040}
        loading={list.loading} error={list.error} empty={assets.length === 0} emptyText="No hay activos con estos filtros."
      >
        {assets.map((a, i) => {
          const pool = pools.find(p => p.assetId === a.id);
          return (
            <Row key={a.id} last={i === assets.length - 1}>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={mediaUrl(a.coverUrl)} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{a.name}</div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>#{a.id} · {a.issuer.name} · {a.imagesCount} img · {a.documentsCount} docs</div>
                  </div>
                </div>
              </td>
              <td style={td}><PTag label={CATEGORY[a.category]} color="neutral" /></td>
              <td style={td}>{fmtPrice(a.tokenPrice)}</td>
              <td style={tdStrong}>{a.soldPercent}%</td>
              <td style={{ ...td, color: 'var(--accent-text)', fontWeight: 600 }}>{a.apy}%</td>
              <td style={td}><Tag spec={ASSET_STATUS[a.status]} /></td>
              <td style={td}>
                {/* Until /admin/pools lists it, an existing pool is shown by its status only (never offer a second deploy). */}
                {pool || !a.poolStatus
                  ? <PoolActions assetId={a.id} assetName={a.name} pool={pool} onChange={() => { onPoolsChange(); list.reload(); }} />
                  : <Tag spec={POOL_STATUS[a.poolStatus]} />}
              </td>
              <td style={td}><Btn small variant="ghost" onClick={() => onSelect(String(a.id))}>Editar</Btn></td>
            </Row>
          );
        })}
      </DataTable>

      {selected !== null && (
        <AssetEditor
          key={selected}
          assetId={editingId}
          pool={editingId ? pools.find(p => p.assetId === editingId) : undefined}
          onClose={() => onSelect(null)}
          onCreated={id => { list.reload(); onSelect(String(id)); }}
          onChanged={list.reload}
          onPoolsChange={onPoolsChange}
        />
      )}
    </>
  );
}
