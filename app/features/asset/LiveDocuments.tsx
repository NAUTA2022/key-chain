import { useState } from 'react';
import { motion } from 'framer-motion';
import { Icons, PBtn } from '~/components/ui';
import type { NavFn } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { fmtShortDate } from '~/features/portfolio/format';
import { downloadDocument, useAssetDocuments, type AssetDocument } from './api';

const KIND: Record<AssetDocument['kind'], string> = {
  legal: 'Legal', financial: 'Financiero', technical: 'Técnico', insurance: 'Seguro', other: 'Otro',
};

function fileTag(doc: AssetDocument): string {
  const ext = /\.([a-z0-9]{2,5})$/i.exec(doc.filename)?.[1];
  if (ext) return ext.toUpperCase();
  return doc.contentType === 'application/pdf' ? 'PDF' : 'Archivo';
}

function fileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const note = { textAlign: 'center', padding: '36px 0', color: 'var(--ter)', fontFamily: 'var(--font-b)', fontSize: 13.5 } as const;

type LiveDocumentsProps = { idOrSlug: string; nav: NavFn };

/** Investor documents of the asset, downloaded with the user's session. */
export default function LiveDocuments({ idOrSlug, nav }: LiveDocumentsProps) {
  const { status } = useSession();
  const docs = useAssetDocuments(idOrSlug);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (doc: AssetDocument) => {
    setBusy(doc.id);
    setError(null);
    try {
      await downloadDocument(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el documento.');
    } finally {
      setBusy(null);
    }
  };

  let body;
  if (status === 'loading' || (status === 'authenticated' && docs.loading && !docs.data)) {
    body = <div role="status" style={note}>Cargando documentos…</div>;
  } else if (status !== 'authenticated') {
    body = (
      <div style={note}>
        <div style={{ marginBottom: 14 }}>Iniciá sesión para ver los documentos del proyecto.</div>
        <PBtn variant="accent" small onClick={() => nav('login')}>Iniciar sesión</PBtn>
      </div>
    );
  } else if (!docs.data) {
    body = (
      <div style={note}>
        <div style={{ marginBottom: 14 }}>No se pudieron cargar los documentos.</div>
        <PBtn variant="secondary" small onClick={docs.reload}>Reintentar</PBtn>
      </div>
    );
  } else if (docs.data.length === 0) {
    body = <div style={note}>El emisor todavía no publicó documentos de este proyecto.</div>;
  } else {
    body = docs.data.map(doc => (
      <button key={doc.id} type="button" onClick={() => void open(doc)} disabled={busy !== null}
        aria-label={`Descargar ${doc.title}`}
        style={{ width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border-l)', borderRadius: 14, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 13, cursor: busy ? 'wait' : 'pointer', font: 'inherit', color: 'inherit' }}>
        <span style={{ color: 'var(--sec)', display: 'flex' }}>{Icons.doc}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
          <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>
            {KIND[doc.kind]} · {fileSize(doc.size)} · {fmtShortDate(doc.createdAt)}
          </span>
        </span>
        <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--surface2)', color: 'var(--sec)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
          {busy === doc.id ? 'Descargando…' : fileTag(doc)}
        </span>
        <span style={{ color: 'var(--ter)', display: 'flex' }}>{Icons.chevR}</span>
      </button>
    ));
  }

  return (
    <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {body}
      {error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>{error}</div>}
    </motion.div>
  );
}
