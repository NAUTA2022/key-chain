import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { Icons, PBtn, PSection } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import type { NavFn } from '~/lib/navigation';
import { KycQueueLive } from './AdminLive';
import { unwrap, useApiData, usePolling } from './api';
import { AssetsTab } from './AssetsTab';
import { AuditTab } from './AuditTab';
import { BroadcastTab } from './BroadcastTab';
import { ChainTab } from './ChainTab';
import { CompaniesTab } from './CompaniesTab';
import { ContentTab } from './ContentTab';
import { OverviewTab } from './OverviewTab';
import { RequestsTab } from './RequestsTab';
import { SupportTab } from './SupportTab';
import { AdminFieldTheme, TabBar } from './ui';
import { useAdminData } from './useAdminData';
import { UsersTab } from './UsersTab';

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'kyc', label: 'KYC' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'solicitudes', label: 'Solicitudes' },
  { id: 'soporte', label: 'Soporte' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'notificaciones', label: 'Notificaciones' },
  { id: 'auditoria', label: 'Auditoría' },
  { id: 'blockchain', label: 'Blockchain' },
] as const;

export type AdminTab = (typeof TABS)[number]['id'];

function isTab(v: string | null): v is AdminTab {
  return TABS.some(t => t.id === v);
}

/**
 * Live admin (backend enabled). The tab and the open record live in the URL
 * (`/admin?tab=soporte&id=<ticket>`), so notifications and links can deep-link.
 */
export function AdminConsole({ nav }: { nav: NavFn }) {
  const mobile = useMobile();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab: AdminTab = isTab(rawTab) ? rawTab : 'resumen';
  const selected = params.get('id');

  const go = useCallback((next: AdminTab, id?: string | null) => {
    const p = new URLSearchParams();
    p.set('tab', next);
    if (id) p.set('id', id);
    setParams(p, { preventScrollReset: true });
  }, [setParams]);
  const select = useCallback((id: string | null) => go(tab, id), [go, tab]);

  const stats = useApiData('stats', () => unwrap(api.GET('/v1/admin/stats'), 'No se pudieron cargar las métricas.'));
  usePolling(stats.reload, 60_000, true);
  const chain = useAdminData(true);
  const s = stats.data;
  const badges: Partial<Record<AdminTab, number>> = s ? { kyc: s.kyc.pending, solicitudes: s.tokenizationRequests.pending, soporte: s.support.open } : {};

  return (
    <div style={{ padding: mobile ? '18px 16px 96px' : '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <AdminFieldTheme />
      <PSection
        title="Panel Admin"
        sub="Control total de la plataforma KEY CHAIN."
        action={<PBtn variant="accent" onClick={() => nav('config')}>{Icons.settings} Configuración</PBtn>}
      />

      <TabBar<AdminTab>
        ariaLabel="Secciones del panel admin"
        tabs={TABS.map(t => ({ id: t.id, label: t.label, badge: badges[t.id] }))}
        active={tab}
        onChange={t => {
          go(t);
          stats.reload();
        }}
      />

      <motion.div key={tab} role="tabpanel" aria-label={TABS.find(t => t.id === tab)?.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {tab === 'resumen' && <OverviewTab stats={s} error={stats.error} onGo={t => go(t)} />}
        {tab === 'proyectos' && <AssetsTab selected={selected} onSelect={select} pools={chain.pools} onPoolsChange={chain.reload} />}
        {tab === 'usuarios' && <UsersTab selected={selected} onSelect={select} />}
        {tab === 'kyc' && <KycQueueLive queue={chain.queue} loaded={chain.loaded} loadError={chain.error} onChange={() => { chain.reload(); stats.reload(); }} />}
        {tab === 'empresas' && <CompaniesTab selected={selected} onSelect={select} onChange={() => { chain.reload(); stats.reload(); }} />}
        {tab === 'solicitudes' && <RequestsTab selected={selected} onSelect={select} onChange={stats.reload} onOpenAsset={id => go('proyectos', String(id))} />}
        {tab === 'soporte' && <SupportTab selected={selected} onSelect={select} onChange={stats.reload} />}
        {tab === 'contenido' && <ContentTab />}
        {tab === 'notificaciones' && <BroadcastTab />}
        {tab === 'auditoria' && <AuditTab />}
        {tab === 'blockchain' && <ChainTab pools={chain.pools} poolsLoaded={chain.loaded} poolsError={chain.error} />}
      </motion.div>
    </div>
  );
}
