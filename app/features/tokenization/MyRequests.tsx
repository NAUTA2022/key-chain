import { useState } from 'react';
import { PBtn, PTag } from '~/components/ui';
import { call, errorText, fmtDate, useApi } from '~/features/profile/api';
import { EmptyState, Notice, Section, Skeleton } from '~/features/profile/kit';
import { bodyStyle, mutedStyle, titleStyle } from '~/features/profile/styles';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import type { NavFn } from '~/lib/navigation';
import { fmtMoney, type TokenizationRequest } from './api';
import { categoryLabel, CATEGORY_META } from './labels';
import { lifecycleOf } from './lifecycle';
import RequestDetail from './RequestDetail';

// "Mis solicitudes" tab: the user's tokenization requests (GET /v1/tokenization-requests).

export default function MyRequests({ nav, onNew }: { nav: NavFn; onNew: () => void }) {
  const isMobile = useMobile();
  const { data, error, loading, reload } = useApi<TokenizationRequest[]>('tokenization-requests', () => call(api.GET('/v1/tokenization-requests')));
  const [open, setOpen] = useState(false);
  // `n` remounts the dialog on every open so it always fetches fresh data.
  const [target, setTarget] = useState<{ id: string; n: number } | null>(null);

  const show = (id: string) => {
    setTarget(t => ({ id, n: (t?.n ?? 0) + 1 }));
    setOpen(true);
  };

  return (
    <>
      <Section
        title="Mis solicitudes"
        style={{ padding: isMobile ? '18px 16px' : '22px 24px' }}
        action={
          data && data.length > 0 ? (
            <PBtn variant="ghost" small onClick={reload} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</PBtn>
          ) : undefined
        }
      >
        {!data && loading ? (
          <Skeleton rows={4} height={18} />
        ) : !data ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
            <Notice tone="error">{errorText(error, 'No pudimos cargar tus solicitudes. Prueba de nuevo.')}</Notice>
            <PBtn variant="secondary" small onClick={reload}>Reintentar</PBtn>
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="Todavía no enviaste solicitudes"
            text="Cuando envíes una solicitud de tokenización, vas a ver aquí su estado y las notas del equipo."
            action={<PBtn variant="accent" small onClick={onNew}>Nueva solicitud</PBtn>}
          />
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {data.map((r, i) => {
              const meta = CATEGORY_META[r.data.category];
              const life = lifecycleOf(r);
              const assetId = life.viewable ? r.assetId : null;
              return (
                <li key={r.id} style={{ padding: i === 0 ? '0 0 16px' : '16px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-l)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 12, minWidth: 0, flex: '1 1 240px' }}>
                      <span aria-hidden="true" style={{ fontSize: 24, lineHeight: 1.2 }}>{meta.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ ...titleStyle, fontSize: 14.5, overflowWrap: 'anywhere' }}>{r.data.assetName}</h4>
                        <p style={{ ...mutedStyle, marginTop: 3 }}>
                          {categoryLabel(r.data)} · {fmtMoney(r.data.valuation)} · Enviada el {fmtDate(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <PTag label={life.label} color={life.color} />
                  </div>
                  <p style={{ ...mutedStyle, marginTop: 8, overflowWrap: 'anywhere' }}>
                    {r.status === 'approved' && <span className="sr-only">Solicitud aprobada. </span>}
                    {life.text}
                  </p>
                  {r.reviewNote && (
                    <p style={{ ...bodyStyle, fontSize: 13, color: 'var(--text)', background: 'var(--surface2)', borderRadius: 12, padding: '10px 14px', marginTop: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      <strong>{r.status === 'rejected' ? 'Motivo del rechazo:' : 'Nota del equipo:'}</strong> {r.reviewNote}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <PBtn variant="secondary" small onClick={() => show(r.id)}>
                      Ver detalle<span className="sr-only"> de {r.data.assetName}</span>
                    </PBtn>
                    {assetId !== null ? (
                      <PBtn variant="accent" small onClick={() => nav('detalle', { id: assetId })}>
                        Ver activo<span className="sr-only"> {r.data.assetName}</span>
                      </PBtn>
                    ) : r.status === 'changes_requested' ? (
                      <PBtn variant="accent" small onClick={() => show(r.id)}>
                        Subir documentos<span className="sr-only"> para {r.data.assetName}</span>
                      </PBtn>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {target && <RequestDetail key={target.n} id={target.id} open={open} onClose={() => setOpen(false)} nav={nav} />}
    </>
  );
}
