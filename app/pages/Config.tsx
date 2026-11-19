import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { PCard, PBtn, PTag, PSection, PInput, Icons } from '~/components/ui';
import { refreshPublicSettings, safeBannerHref, useChainInfo } from '~/features/banners/platform';
import { useMobile } from '~/hooks/useMobile';
import { api, isProblem } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { useSession } from '~/lib/session';

type TabId = 'general' | 'financial' | 'features' | 'blockchain' | 'banners' | 'danger';

const TABS: ReadonlyArray<readonly [TabId, string, ReactNode]> = [
  ['general',    'General',      Icons.settings],
  ['financial',  'Financiero',   Icons.token    ],
  ['features',   'Features',     Icons.star     ],
  ['blockchain', 'Blockchain',   Icons.shield   ],
  ['banners',    'Banners',      Icons.doc      ],
  ['danger',     'Zona Peligro', Icons.lock     ],
];

type RowProps = { label: string; sub?: string; children?: ReactNode };

function Row({ label, sub, children }: RowProps) {
  const isMobile = useMobile();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border-l)', ...(isMobile && { flexWrap: 'wrap', rowGap: 10 }) }}>
      <div style={{ flex: 1, ...(isMobile && { minWidth: 160 }) }}>
        <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

type ToggleProps = { on: boolean; onChange?: (v: boolean) => void; label?: string; disabled?: boolean };

// A real switch (button + aria) with the original look.
const Toggle = ({ on, onChange, label, disabled }: ToggleProps) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange?.(!on)} style={{ width: 44, height: 24, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--border)', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', flexShrink: 0, border: 'none', padding: 0, opacity: disabled ? 0.5 : 1 }}>
    <span style={{ display: 'block', position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
  </button>
);

type FieldProps = { value: string; onChange?: (v: string) => void; prefix?: string; width?: number; ariaLabel?: string; maxLength?: number; type?: 'text' | 'email'; inputMode?: 'decimal' };

const Field = ({ value, onChange, prefix, width = 80, ariaLabel, maxLength, type, inputMode }: FieldProps) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 10, border: '1.5px solid var(--border)', padding: '8px 12px', minWidth: 160, maxWidth: '100%' }}>
    {prefix && <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{prefix}</span>}
    <input type={type} inputMode={inputMode} aria-label={ariaLabel} maxLength={maxLength} value={value} onChange={e => onChange?.(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', width, maxWidth: '100%', minWidth: 0 }} />
  </div>
);

type TabNavProps<T extends string> = { tabs: ReadonlyArray<readonly [T, string, ReactNode]>; tab: T; onChange: (id: T) => void };

/** Tab bar; on phones it scrolls horizontally instead of overflowing the page. */
function TabNav<T extends string>({ tabs, tab, onChange }: TabNavProps<T>) {
  const isMobile = useMobile();
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-l)', marginBottom: 28, ...(isMobile && { overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20 }) }}>
      {tabs.map(([id, label, icon]) => (
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => onChange(id)} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: tab === id ? 700 : 450,
          color: tab === id ? 'var(--text)' : 'var(--ter)',
          borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1,
          ...(isMobile && { flexShrink: 0, whiteSpace: 'nowrap', padding: '10px 12px', marginBottom: 0 }),
        }}>
          <span style={{ color: tab === id ? 'var(--accent-text)' : 'var(--ter)' }}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Demo mode (no backend): the original static configuration screen. */
function ConfigDemo() {
  const [tab, setTab] = useState<TabId>('general');
  const [g, setG] = useState({ platformName: 'La 33', supportEmail: 'soporte@factoract.io', maxUsers: '10000', maintenanceMode: false, registrationOpen: true, emailNotif: true });
  const [fin, setFin] = useState({ platformFee: '1.5', minInvestment: '38', maxInvestment: '500000', autoDistribution: true, distributionDay: '15', usdcOnly: true });
  const [feat, setFeat] = useState({ academy: true, swap: true, secondaryMarket: true, staking: false, governance: false, referrals: true, demoMode: true });
  const [bc, setBc] = useState({ network: 'Polygon Mainnet', chainId: '137', rpcUrl: 'https://polygon-rpc.com', explorerUrl: 'https://polygonscan.com', contractRegistry: '0x4a9f…d82c', autoAudit: true });
  const [banners, setBanners] = useState([
    { id: 1, title: 'Nueva propiedad tokenizada en Miami', active: true, url: '' },
    { id: 2, title: 'ICO KYCN Token — Ronda Pública abierta', active: true, url: '' },
    { id: 3, title: 'Rendimientos Q2 2026 distribuidos', active: false, url: '' },
  ]);

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 960, margin: '0 auto' }}>
      <PSection title="Configuración" sub="Ajustes globales de la plataforma La 33." />

      {/* Tab nav */}
      <TabNav tabs={TABS} tab={tab} onChange={setTab} />

      {/* General */}
      {tab === 'general' && (
        <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Configuración general</div>
            <Row label="Nombre de plataforma" sub="Aparece en emails y UI pública">
              <Field value={g.platformName} onChange={v => setG(p => ({...p, platformName: v}))} />
            </Row>
            <Row label="Email de soporte" sub="Para tickets y notificaciones">
              <Field value={g.supportEmail} onChange={v => setG(p => ({...p, supportEmail: v}))} />
            </Row>
            <Row label="Máximo de usuarios" sub="Límite de registros activos">
              <Field value={g.maxUsers} onChange={v => setG(p => ({...p, maxUsers: v}))} />
            </Row>
            <Row label="Modo mantenimiento" sub="Bloquea acceso a todos los usuarios no-admin">
              <Toggle on={g.maintenanceMode} onChange={v => setG(p => ({...p, maintenanceMode: v}))} />
            </Row>
            <Row label="Registro abierto" sub="Permite nuevos registros en la plataforma">
              <Toggle on={g.registrationOpen} onChange={v => setG(p => ({...p, registrationOpen: v}))} />
            </Row>
            <Row label="Notificaciones por email" sub="Enviar emails transaccionales a usuarios">
              <Toggle on={g.emailNotif} onChange={v => setG(p => ({...p, emailNotif: v}))} />
            </Row>
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Financial */}
      {tab === 'financial' && (
        <motion.div key="fin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Parámetros financieros</div>
            <Row label="Fee de plataforma (%)" sub="Comisión sobre cada inversión">
              <Field value={fin.platformFee} onChange={v => setFin(p => ({...p, platformFee: v}))} prefix="%" />
            </Row>
            <Row label="Inversión mínima (USD)" sub="Mínimo por transacción">
              <Field value={fin.minInvestment} onChange={v => setFin(p => ({...p, minInvestment: v}))} prefix="$" />
            </Row>
            <Row label="Inversión máxima (USD)" sub="Máximo por transacción individual">
              <Field value={fin.maxInvestment} onChange={v => setFin(p => ({...p, maxInvestment: v}))} prefix="$" />
            </Row>
            <Row label="Distribución automática" sub="Ejecutar smart contract de distribución automáticamente">
              <Toggle on={fin.autoDistribution} onChange={v => setFin(p => ({...p, autoDistribution: v}))} />
            </Row>
            <Row label="Día de distribución" sub="Día del mes para distribución de rendimientos">
              <Field value={fin.distributionDay} onChange={v => setFin(p => ({...p, distributionDay: v}))} />
            </Row>
            <Row label="Solo USDC" sub="Forzar pagos únicamente en USDC">
              <Toggle on={fin.usdcOnly} onChange={v => setFin(p => ({...p, usdcOnly: v}))} />
            </Row>
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Features */}
      {tab === 'features' && (
        <motion.div key="feat" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Módulos de plataforma</div>
            {([
              ['academy',         'Academia',           'Módulo educativo con artículos y guías'],
              ['swap',            'Swap DeFi',          'Intercambio de tokens via QuickSwap/Uniswap'],
              ['secondaryMarket', 'Mercado Secundario', 'P2P trading entre inversores'],
              ['staking',         'Staking KYCN',       'APY 9-14% en token KYCN'],
              ['governance',      'Gobernanza DAO',     'Votaciones on-chain para holders de KYCN'],
              ['referrals',       'Programa referidos',  'Comisiones por referidos activos'],
              ['demoMode',        'Modo demo',          'Acceso sin wallet para explorar la plataforma'],
            ] as const).map(([key, label, sub]) => (
              <Row key={key} label={label} sub={sub}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {feat[key] ? <PTag label="Activo" color="green" /> : <PTag label="Inactivo" color="neutral" />}
                  <Toggle on={feat[key]} onChange={v => setFeat(p => ({...p, [key]: v}))} />
                </div>
              </Row>
            ))}
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Blockchain */}
      {tab === 'blockchain' && (
        <motion.div key="bc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>Configuración blockchain</div>
            {([
              ['network',          'Red',               bc.network],
              ['chainId',          'Chain ID',          bc.chainId],
              ['rpcUrl',           'RPC URL',           bc.rpcUrl],
              ['explorerUrl',      'Explorer URL',      bc.explorerUrl],
              ['contractRegistry', 'Contract Registry', bc.contractRegistry],
            ] as const).map(([key, label, val]) => (
              <Row key={key} label={label}>
                <Field value={val} onChange={v => setBc(p => ({...p, [key]: v}))} />
              </Row>
            ))}
            <Row label="Auditoría automática" sub="Verificar contratos con CertiK antes de emisión">
              <Toggle on={bc.autoAudit} onChange={v => setBc(p => ({...p, autoAudit: v}))} />
            </Row>
          </PCard>
          <PCard style={{ padding: '16px 22px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}>Estado de red:</strong> Polygon Mainnet — Bloque #62,481,234 — Gas: 31 Gwei — Latencia: 1.2s
            </div>
          </PCard>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PBtn variant="accent">Guardar cambios</PBtn>
          </div>
        </motion.div>
      )}

      {/* Banners */}
      {tab === 'banners' && (
        <motion.div key="ban" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Banners activos</div>
              <PBtn variant="accent" small>+ Nuevo banner</PBtn>
            </div>
            {banners.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < banners.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{b.title}</div>
                </div>
                {b.active ? <PTag label="Activo" color="green" /> : <PTag label="Inactivo" color="neutral" />}
                <Toggle on={b.active} onChange={v => setBanners(prev => prev.map(x => x.id === b.id ? {...x, active: v} : x))} />
                <PBtn variant="ghost" small>Editar</PBtn>
              </div>
            ))}
          </PCard>
        </motion.div>
      )}

      {/* Danger */}
      {tab === 'danger' && (
        <motion.div key="danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16, border: '1px solid var(--neg)' }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--neg)', marginBottom: 4 }}>Zona de peligro</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', marginBottom: 20 }}>Estas acciones son irreversibles y pueden afectar toda la plataforma.</div>
            {[
              ['Pausar todas las inversiones', 'Bloquea nuevas compras en todos los proyectos activos.'],
              ['Pausar distribuciones', 'Suspende pagos de rendimientos hasta nuevo aviso.'],
              ['Suspender mercado secundario', 'Deshabilita el trading P2P entre usuarios.'],
              ['Congelar plataforma', 'Modo emergencia: solo admins pueden acceder.'],
            ].map(([label, sub]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--border-l)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 2 }}>{sub}</div>
                </div>
                <PBtn variant="secondary" small style={{ borderColor: 'var(--neg)', color: 'var(--neg)', flexShrink: 0 }}>Ejecutar</PBtn>
              </div>
            ))}
          </PCard>
        </motion.div>
      )}
    </div>
  );
}

// ─── Live mode (backend enabled): GET/PUT /v1/admin/settings ────────────────

type AdminSettings = paths['/v1/admin/settings']['get']['responses'][200]['content']['application/json'];
type SettingsPatch = paths['/v1/admin/settings']['put']['requestBody']['content']['application/json'];
type Banner = AdminSettings['banners'][number];
type LiveTabId = 'general' | 'operations' | 'banners' | 'network';
type Section = 'general' | 'operations' | 'banners';
type Feedback = { section: Section; kind: 'ok' | 'error'; text: string } | null;

const LIVE_TABS: ReadonlyArray<readonly [LiveTabId, string, ReactNode]> = [
  ['general',    'General',     Icons.settings],
  ['operations', 'Operaciones', Icons.lock    ],
  ['banners',    'Banners',     Icons.doc     ],
  ['network',    'Red',         Icons.shield  ],
];

const MAX_BANNERS = 5;
const NEW_BANNER = '__new__';

const cardTitle: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 };
const cardSub: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', lineHeight: 1.5 };
const valueText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', textAlign: 'right', overflowWrap: 'anywhere', maxWidth: '100%' };
const mono: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 };
const textareaStyle: CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: '12px 16px', border: '1.5px solid var(--border)', width: '100%', boxSizing: 'border-box',
  fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', outline: 'none', resize: 'vertical', minHeight: 88, lineHeight: 1.5,
};

const generalSchema = z.object({
  platformName: z.string().trim().min(2, 'El nombre de la plataforma necesita al menos 2 caracteres.').max(60, 'El nombre admite hasta 60 caracteres.'),
  supportEmail: z.string().trim().max(200, 'El email es demasiado largo.').pipe(z.email('Ingresá un email de soporte válido.')),
  displayFeePercent: z.number('El fee tiene que ser un número.').min(0, 'El fee no puede ser negativo.').max(10, 'El fee máximo es 10%.'),
});

const bannerSchema = z.object({
  text: z.string().trim().min(1, 'Escribí el texto del banner.').max(200, 'El texto admite hasta 200 caracteres.'),
  href: z.string().trim().max(300, 'El enlace admite hasta 300 caracteres.')
    .refine(h => h === '' || safeBannerHref(h) !== null, 'El enlace tiene que empezar con "/" (página interna) o con "https://".'),
});

const chainStatusSchema = z.object({
  blockNumber: z.number(),
  contracts: z.record(z.string(), z.string()),
  timelockMinDelaySeconds: z.number(),
  defaultFeesBps: z.object({ issuance: z.number(), yield: z.number() }),
  engine: z.object({ address: z.string(), isOperator: z.boolean(), isIdentityAgent: z.boolean(), membershipTier: z.string(), poolsDeployed: z.number(), balancePol: z.string() }),
  signer: z.object({ configured: z.boolean(), address: z.string().nullable(), isEngine: z.boolean(), isTimelockProposer: z.boolean() }),
  claimSigner: z.object({ address: z.string().nullable(), authorized: z.boolean() }),
});
type ChainStatus = z.infer<typeof chainStatusSchema>;

type GeneralDraft = { platformName: string; supportEmail: string; displayFeePercent: string };
type OperationsDraft = { investmentsPaused: boolean; maintenanceMessage: string };
type BannerEdit = { id: string; text: string; href: string; error: string | null };

const toGeneral = (s: AdminSettings): GeneralDraft => ({ ...s.general, displayFeePercent: String(s.general.displayFeePercent) });
const toOperations = (s: AdminSettings): OperationsDraft => ({ investmentsPaused: s.operations.investmentsPaused, maintenanceMessage: s.operations.maintenanceMessage ?? '' });
const sameBanners = (a: Banner[], b: Banner[]) => JSON.stringify(a) === JSON.stringify(b);

function newBannerId(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `b-${Date.now().toString(36)}-${random}`;
}

function shortAddress(a: string): string {
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function settingsError(e: unknown): string {
  if (!isProblem(e)) return 'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.';
  if (e.status === 401) return 'Tu sesión expiró. Volvé a ingresar para guardar los cambios.';
  if (e.status === 403) return 'Necesitás permisos de administrador para cambiar la configuración.';
  if (e.status === 429) return 'Demasiados cambios seguidos. Esperá un momento y probá de nuevo.';
  if (e.code === 'validation_failed') return 'El servidor rechazó algunos valores. Revisá los datos e intentá de nuevo.';
  return 'No se pudieron guardar los cambios. Probá de nuevo en unos minutos.';
}

function FeedbackLine({ feedback, section }: { feedback: Feedback; section: Section }) {
  if (!feedback || feedback.section !== section) return null;
  const ok = feedback.kind === 'ok';
  return (
    <div role={ok ? 'status' : 'alert'} style={{ padding: '11px 14px', borderRadius: 12, marginBottom: 16, background: ok ? 'var(--accent-bg)' : 'var(--neg-bg)', color: ok ? 'var(--accent-text)' : 'var(--neg)', fontFamily: 'var(--font-b)', fontSize: 13, lineHeight: 1.5 }}>
      {feedback.text}
    </div>
  );
}

function SaveBar({ dirty, saving, onDiscard, onSave, label = 'Guardar cambios' }: { dirty: boolean; saving: boolean; onDiscard: () => void; onSave: () => void; label?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
      {dirty && !saving && <PBtn variant="ghost" onClick={onDiscard}>Descartar</PBtn>}
      <PBtn variant="accent" disabled={!dirty || saving} onClick={onSave}>{saving ? 'Guardando…' : label}</PBtn>
    </div>
  );
}

function YesNo({ value, yes = 'Sí', no = 'No' }: { value: boolean; yes?: string; no?: string }) {
  return value ? <PTag label={yes} color="green" /> : <PTag label={no} color="red" />;
}

function AddressValue({ address, explorer }: { address: string; explorer: string | null }) {
  const base = explorer && explorer.startsWith('https://') ? explorer.replace(/\/+$/, '') : null;
  const text = <span style={mono} title={address}>{shortAddress(address)}</span>;
  return base
    ? <a href={`${base}/address/${address}`} target="_blank" rel="noopener noreferrer" style={{ ...valueText, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>{text}{Icons.ext}</a>
    : <span style={valueText}>{text}</span>;
}

function BannerEditor({ edit, onChange, onApply, onCancel }: { edit: BannerEdit; onChange: (e: BannerEdit) => void; onApply: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 0', borderBottom: '1px solid var(--border-l)' }}>
      <PInput ariaLabel="Texto del banner" placeholder="Texto del aviso (máx. 200 caracteres)" maxLength={200} value={edit.text} onChange={e => onChange({ ...edit, text: e.target.value, error: null })} />
      <PInput ariaLabel="Enlace del banner (opcional)" placeholder="Enlace opcional: /tokenizaciones o https://…" maxLength={300} value={edit.href} onChange={e => onChange({ ...edit, href: e.target.value, error: null })} />
      {edit.error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>{edit.error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <PBtn variant="ghost" small onClick={onCancel}>Cancelar</PBtn>
        <PBtn variant="secondary" small onClick={onApply}>{edit.id === NEW_BANNER ? 'Agregar' : 'Aplicar'}</PBtn>
      </div>
    </div>
  );
}

function NetworkTab() {
  const info = useChainInfo();
  const [status, setStatus] = useState<{ data: ChainStatus | null; error: string | null } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api.GET('/v1/chain/status')
      .then(({ data, error }) => {
        if (!alive) return;
        // The OpenAPI document doesn't describe this response; validate it here.
        const parsed = chainStatusSchema.safeParse(data as unknown);
        if (parsed.success) return setStatus({ data: parsed.data, error: null });
        const problem: unknown = error;
        const unavailable = isProblem(problem) && problem.status === 503;
        setStatus({ data: null, error: unavailable ? 'La API todavía no tiene acceso a la red configurado.' : 'No se pudo leer el estado on-chain.' });
      })
      .catch(() => alive && setStatus({ data: null, error: 'No pudimos conectar con el servidor.' }));
    return () => {
      alive = false;
    };
  }, [tick]);

  const explorer = info?.explorer ?? null;
  const delay = status?.data?.timelockMinDelaySeconds ?? 0;
  const delayText = delay < 3600 ? `${Math.round(delay / 60)} min` : `${(delay / 3600).toFixed(delay % 3600 ? 1 : 0)} h`;
  const symbol = info?.nativeSymbol ?? 'POL';

  return (
    <motion.div key="net" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
        <div style={cardTitle}>Red blockchain</div>
        <div style={cardSub}>Solo lectura: la red se define en la configuración del servidor.</div>
        {!info ? (
          <div role="status" style={{ ...cardSub, padding: '16px 0 4px' }}>Cargando datos de la red…</div>
        ) : (
          <>
            <Row label="Red"><span style={valueText}>{info.name}{info.testnet ? ' · testnet' : ''}</span></Row>
            <Row label="Chain ID"><span style={{ ...valueText, ...mono }}>{info.chainId}</span></Row>
            <Row label="RPC público" sub="El que se agrega a la wallet de los usuarios"><span style={{ ...valueText, ...mono }}>{info.rpcUrl ?? '—'}</span></Row>
            <Row label="Explorador">{explorer ? <span style={{ ...valueText, ...mono }}>{explorer}</span> : <span style={valueText}>—</span>}</Row>
            <Row label="USDC" sub={`Stablecoin de la plataforma (${info.usdcDecimals} decimales)`}><AddressValue address={info.usdc} explorer={explorer} /></Row>
            <Row label="Faucet de pruebas" sub="Entrega USDC y gas de prueba a los usuarios"><YesNo value={info.faucetEnabled} yes="Activo" no="Inactivo" /></Row>
          </>
        )}
      </PCard>

      <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...cardTitle, marginBottom: 0 }}>Estado on-chain</div>
          <PBtn variant="ghost" small disabled={status === null} onClick={() => { setStatus(null); setTick(t => t + 1); }}>{status === null ? 'Leyendo…' : 'Actualizar'}</PBtn>
        </div>
        {status === null && <div role="status" style={{ ...cardSub, padding: '16px 0 4px' }}>Leyendo el estado de los contratos…</div>}
        {status?.error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--neg)', padding: '16px 0 4px' }}>{status.error}</div>}
        {status?.data && (
          <>
            <Row label="Último bloque"><span style={{ ...valueText, ...mono }}>#{status.data.blockNumber.toLocaleString('es-AR')}</span></Row>
            <Row label="Fees on-chain" sub="Aplicados por el FeeManager">
              <span style={valueText}>Emisión {status.data.defaultFeesBps.issuance / 100}% · Rendimientos {status.data.defaultFeesBps.yield / 100}%</span>
            </Row>
            <Row label="Demora del Timelock"><span style={valueText}>{delayText}</span></Row>
            <Row label="Motor de emisión" sub={`${status.data.engine.poolsDeployed} pools desplegados · membresía ${status.data.engine.membershipTier} · saldo ${Number(status.data.engine.balancePol).toFixed(4)} ${symbol}`}>
              <AddressValue address={status.data.engine.address} explorer={explorer} />
            </Row>
            <Row label="Permisos del motor" sub="Operador de pools y agente del registro de identidades">
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <YesNo value={status.data.engine.isOperator} yes="Operador ✓" no="Sin operador" />
                <YesNo value={status.data.engine.isIdentityAgent} yes="Agente ✓" no="Sin agente" />
              </span>
            </Row>
            <Row label="Firmante del servidor" sub={status.data.signer.address ? shortAddress(status.data.signer.address) : 'No configurado'}>
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <YesNo value={status.data.signer.isEngine} yes="Es el motor" no="No es el motor" />
                <YesNo value={status.data.signer.isTimelockProposer} yes="Proponente ✓" no="Sin Timelock" />
              </span>
            </Row>
            <Row label="Firmante de KYC" sub="Emite las credenciales de identidad on-chain"><YesNo value={status.data.claimSigner.authorized} yes="Autorizado" no="No autorizado" /></Row>
            {Object.entries(status.data.contracts).map(([name, address]) => (
              <Row key={name} label={`Contrato ${name}`}><AddressValue address={address} explorer={explorer} /></Row>
            ))}
          </>
        )}
      </PCard>
    </motion.div>
  );
}

function ConfigLive() {
  const [tab, setTab] = useState<LiveTabId>('general');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);
  const [general, setGeneral] = useState<GeneralDraft>({ platformName: '', supportEmail: '', displayFeePercent: '' });
  const [ops, setOps] = useState<OperationsDraft>({ investmentsPaused: false, maintenanceMessage: '' });
  const [banners, setBanners] = useState<Banner[]>([]);
  const [edit, setEdit] = useState<BannerEdit | null>(null);
  const [saving, setSaving] = useState<Section | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const apply = useCallback((s: AdminSettings, only?: Section) => {
    setSettings(s);
    if (!only || only === 'general') setGeneral(toGeneral(s));
    if (!only || only === 'operations') setOps(toOperations(s));
    if (!only || only === 'banners') setBanners(s.banners);
  }, []);

  useEffect(() => {
    let alive = true;
    api.GET('/v1/admin/settings')
      .then(({ data, error }) => {
        if (!alive) return;
        if (data) {
          setLoadError(null);
          apply(data);
        } else setLoadError(settingsError(error));
      })
      .catch(() => alive && setLoadError(settingsError(null)));
    return () => {
      alive = false;
    };
  }, [apply, loadTick]);

  async function save(section: Section, patch: SettingsPatch) {
    setSaving(section);
    setFeedback(null);
    try {
      const { data, error } = await api.PUT('/v1/admin/settings', { body: patch });
      if (!data) {
        setFeedback({ section, kind: 'error', text: settingsError(error) });
        return;
      }
      apply(data, section);
      setFeedback({ section, kind: 'ok', text: 'Cambios guardados. Ya se aplican en toda la plataforma.' });
      void refreshPublicSettings();
    } catch {
      setFeedback({ section, kind: 'error', text: settingsError(null) });
    } finally {
      setSaving(null);
    }
  }

  function saveGeneral() {
    const parsed = generalSchema.safeParse({ ...general, displayFeePercent: general.displayFeePercent.trim() === '' ? Number.NaN : Number(general.displayFeePercent.replace(',', '.')) });
    if (!parsed.success) {
      setFeedback({ section: 'general', kind: 'error', text: parsed.error.issues[0]?.message ?? 'Revisá los datos.' });
      return;
    }
    void save('general', { general: parsed.data });
  }

  function saveOperations() {
    const message = ops.maintenanceMessage.trim();
    if (message.length > 300) {
      setFeedback({ section: 'operations', kind: 'error', text: 'El mensaje admite hasta 300 caracteres.' });
      return;
    }
    void save('operations', { operations: { investmentsPaused: ops.investmentsPaused, maintenanceMessage: message || null } });
  }

  function applyEdit() {
    if (!edit) return;
    const parsed = bannerSchema.safeParse({ text: edit.text, href: edit.href });
    if (!parsed.success) {
      setEdit({ ...edit, error: parsed.error.issues[0]?.message ?? 'Revisá el banner.' });
      return;
    }
    const href = parsed.data.href || null;
    if (edit.id === NEW_BANNER) setBanners(list => [...list, { id: newBannerId(), text: parsed.data.text, href, active: true }]);
    else setBanners(list => list.map(b => (b.id === edit.id ? { ...b, text: parsed.data.text, href } : b)));
    setEdit(null);
  }

  if (!settings) {
    return (
      <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 960, margin: '0 auto' }}>
        <PSection title="Configuración" sub="Ajustes globales de la plataforma La 33." />
        <PCard style={{ padding: '22px 24px' }}>
          {loadError ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div role="alert" style={{ flex: 1, minWidth: 200, fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--neg)' }}>{loadError}</div>
              <PBtn variant="secondary" small onClick={() => { setLoadError(null); setLoadTick(t => t + 1); }}>Reintentar</PBtn>
            </div>
          ) : (
            <div role="status" style={cardSub}>Cargando configuración…</div>
          )}
        </PCard>
      </div>
    );
  }

  const generalDirty = JSON.stringify(general) !== JSON.stringify(toGeneral(settings));
  const opsDirty = ops.investmentsPaused !== settings.operations.investmentsPaused || ops.maintenanceMessage.trim() !== (settings.operations.maintenanceMessage ?? '');
  const bannersDirty = !sameBanners(banners, settings.banners);

  return (
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 960, margin: '0 auto' }}>
      <PSection title="Configuración" sub="Ajustes globales de la plataforma La 33." />

      <TabNav tabs={LIVE_TABS} tab={tab} onChange={id => { setTab(id); setFeedback(null); }} />

      {tab === 'general' && (
        <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={cardTitle}>Configuración general</div>
            <Row label="Nombre de plataforma" sub="Aparece en emails y en la UI pública">
              <Field ariaLabel="Nombre de plataforma" maxLength={60} width={180} value={general.platformName} onChange={v => setGeneral(p => ({ ...p, platformName: v }))} />
            </Row>
            <Row label="Email de soporte" sub="Contacto que ven los usuarios">
              <Field ariaLabel="Email de soporte" type="email" maxLength={200} width={210} value={general.supportEmail} onChange={v => setGeneral(p => ({ ...p, supportEmail: v }))} />
            </Row>
            <Row label="Fee de plataforma (%)" sub="Fee de emisión que se muestra a los inversores (0 a 10%). El contrato aplica el fee on-chain.">
              <Field ariaLabel="Fee de plataforma en porcentaje" inputMode="decimal" maxLength={6} prefix="%" value={general.displayFeePercent} onChange={v => setGeneral(p => ({ ...p, displayFeePercent: v }))} />
            </Row>
          </PCard>
          <FeedbackLine feedback={feedback} section="general" />
          <SaveBar dirty={generalDirty} saving={saving === 'general'} onDiscard={() => { setGeneral(toGeneral(settings)); setFeedback(null); }} onSave={saveGeneral} />
        </motion.div>
      )}

      {tab === 'operations' && (
        <motion.div key="ops" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={cardTitle}>Operaciones</div>
            <Row label="Pausar inversiones" sub="Bloquea nuevas órdenes y ejecuciones en todos los proyectos. Los usuarios ven un aviso arriba de cada página.">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {ops.investmentsPaused ? <PTag label="Pausadas" color="red" /> : <PTag label="Activas" color="green" />}
                <Toggle label="Pausar inversiones" on={ops.investmentsPaused} onChange={v => setOps(p => ({ ...p, investmentsPaused: v }))} />
              </div>
            </Row>
            <div style={{ padding: '16px 0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="kc-maintenance-message" style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Mensaje de mantenimiento</label>
              <div style={cardSub}>Opcional. Se muestra junto al aviso mientras las inversiones están pausadas.</div>
              <textarea
                id="kc-maintenance-message"
                maxLength={300}
                placeholder="Ej.: Estamos actualizando los contratos. Volvemos a operar a las 18 h."
                value={ops.maintenanceMessage}
                onChange={e => setOps(p => ({ ...p, maintenanceMessage: e.target.value }))}
                style={textareaStyle}
              />
              <div style={{ ...cardSub, textAlign: 'right' }}>{ops.maintenanceMessage.length}/300</div>
            </div>
          </PCard>
          <FeedbackLine feedback={feedback} section="operations" />
          <SaveBar dirty={opsDirty} saving={saving === 'operations'} onDiscard={() => { setOps(toOperations(settings)); setFeedback(null); }} onSave={saveOperations} />
        </motion.div>
      )}

      {tab === 'banners' && (
        <motion.div key="ban" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <div style={{ ...cardTitle, marginBottom: 2 }}>Banners</div>
                <div style={cardSub}>{banners.length}/{MAX_BANNERS} · los activos se muestran arriba de cada página.</div>
              </div>
              <PBtn variant="accent" small disabled={banners.length >= MAX_BANNERS || edit !== null} onClick={() => setEdit({ id: NEW_BANNER, text: '', href: '', error: null })}>+ Nuevo banner</PBtn>
            </div>
            {banners.length === 0 && edit?.id !== NEW_BANNER && (
              <div style={{ ...cardSub, padding: '14px 0 4px' }}>No hay banners. Creá uno para destacar una novedad o un aviso.</div>
            )}
            {banners.map((b, i) => (
              edit?.id === b.id ? (
                <BannerEditor key={b.id} edit={edit} onChange={setEdit} onApply={applyEdit} onCancel={() => setEdit(null)} />
              ) : (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 0', borderBottom: i < banners.length - 1 || edit?.id === NEW_BANNER ? '1px solid var(--border-l)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)', overflowWrap: 'anywhere' }}>{b.text}</div>
                    <div style={{ ...cardSub, marginTop: 2, overflowWrap: 'anywhere' }}>{b.href ? `Enlace: ${b.href}` : 'Sin enlace'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    {b.active ? <PTag label="Activo" color="green" /> : <PTag label="Inactivo" color="neutral" />}
                    <Toggle label={`Activar banner: ${b.text}`} on={b.active} onChange={v => setBanners(list => list.map(x => (x.id === b.id ? { ...x, active: v } : x)))} />
                    <PBtn variant="ghost" small disabled={edit !== null} onClick={() => setEdit({ id: b.id, text: b.text, href: b.href ?? '', error: null })}>Editar</PBtn>
                    <PBtn variant="secondary" small disabled={edit !== null} onClick={() => setBanners(list => list.filter(x => x.id !== b.id))} style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }}>Eliminar</PBtn>
                  </div>
                </div>
              )
            ))}
            {edit?.id === NEW_BANNER && <BannerEditor edit={edit} onChange={setEdit} onApply={applyEdit} onCancel={() => setEdit(null)} />}
          </PCard>
          <FeedbackLine feedback={feedback} section="banners" />
          <SaveBar
            dirty={bannersDirty && edit === null}
            saving={saving === 'banners'}
            label="Guardar banners"
            onDiscard={() => { setBanners(settings.banners); setEdit(null); setFeedback(null); }}
            onSave={() => void save('banners', { banners })}
          />
        </motion.div>
      )}

      {tab === 'network' && <NetworkTab />}
    </div>
  );
}

/** Admin configuration: live settings with the backend, the original demo screen without it. */
export default function Config() {
  const { status } = useSession();
  return status === 'disabled' ? <ConfigDemo /> : <ConfigLive />;
}
