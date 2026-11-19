// Plain-language glossary for people new to blockchain. Shown in the Help Center ("Glosario")
// and reused by the guided tours. The copy lives in the `help` dictionaries under
// `glossary.<id>`: `term`, `definition` and, for entries with `aka`, the other name.

export type GlossaryEntry = {
  /** Stable id (used for anchors: #glosario-<id>) and dictionary key (`help:glossary.<id>`). */
  id: string;
  /** Has another name the user may see in the app (`help:glossary.<id>.aka`). */
  aka?: true;
};

export const GLOSSARY: readonly GlossaryEntry[] = [
  { id: 'blockchain' },
  { id: 'wallet', aka: true },
  { id: 'direccion' },
  { id: 'firma' },
  { id: 'usdc', aka: true },
  { id: 'token' },
  { id: 'tokenizacion' },
  { id: 'contrato', aka: true },
  { id: 'red', aka: true },
  { id: 'gas', aka: true },
  { id: 'kyc', aka: true },
  { id: 'identidad' },
  { id: 'pool' },
  { id: 'apy', aka: true },
  { id: 'dividendo' },
  { id: 'liquidacion' },
  { id: 'primario' },
  { id: 'secundario' },
  { id: 'faucet', aka: true },
];

/** Dictionary key (`help` namespace) of a glossary field. */
export const glossaryKey = (id: string, field: 'term' | 'aka' | 'definition') => `glossary.${id}.${field}`;
