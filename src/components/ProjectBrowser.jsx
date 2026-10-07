import { useState } from 'react';
import { PCard, Icons } from './ui';
import AssetCard from './AssetCard';
import FilterSelect from './FilterSelect';

// Mini marketplace for a set of projects (a person's investments, a
// company's projects): search, Rubro / Estado dropdowns, sorting and the
// same cards as the market. `items` = [{ asset, since? }]. With `limit`
// only the first N results are shown, plus a "Ver todos" link (`onMore`).
const MONTH_IDX = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 };
const sinceKey = (label) => {
  const [m, y] = String(label || '').split(' ');
  return m in MONTH_IDX && y ? Number(y) * 12 + MONTH_IDX[m] : -1;
};

const SORTS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'apy', label: 'Mayor APY' },
  { value: 'funded', label: 'Más financiados' },
  { value: 'name', label: 'Nombre A–Z' },
];
const fundedPct = (a) => (a.totalTokens ? a.sold / a.totalTokens : 0);

export default function ProjectBrowser({ items, nav, isMobile, placeholder = 'Buscar proyectos…', limit, onMore, showCode, emptyText = 'Todavía no hay proyectos', minCard = 280 }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todos');
  const [stage, setStage] = useState('Todos');
  const [sort, setSort] = useState('recent');

  const countBy = (key) => items.reduce((m, it) => ({ ...m, [it.asset[key]]: (m[it.asset[key]] || 0) + 1 }), {});
  const cats = Object.entries(countBy('cat')).sort((a, b) => b[1] - a[1]);
  const stages = Object.entries(countBy('stage')).sort((a, b) => b[1] - a[1]);
  const term = q.trim().toLowerCase();
  const list = items
    .filter(it => cat === 'Todos' || it.asset.cat === cat)
    .filter(it => stage === 'Todos' || it.asset.stage === stage)
    .filter(it => !term || `${it.asset.name} ${it.asset.location} ${it.asset.company} ${it.asset.cat} ${it.asset.code || ''}`.toLowerCase().includes(term))
    .sort((a, b) => {
      if (sort === 'apy') return b.asset.apy - a.asset.apy;
      if (sort === 'funded') return fundedPct(b.asset) - fundedPct(a.asset);
      if (sort === 'name') return a.asset.name.localeCompare(b.asset.name);
      return (sinceKey(b.since) - sinceKey(a.since)) || (b.asset.id - a.asset.id);
    });
  const shown = limit ? list.slice(0, limit) : list;
  const filtered = cat !== 'Todos' || stage !== 'Todos' || !!term;
  const clear = () => { setQ(''); setCat('Todos'); setStage('Todos'); };

  const catOptions = [{ value: 'Todos', label: 'Todos', count: items.length }, ...cats.map(([v, n]) => ({ value: v, label: v, count: n }))];
  const stageOptions = [{ value: 'Todos', label: 'Todos', count: items.length }, ...stages.map(([v, n]) => ({ value: v, label: v, count: n }))];
  const sortSelect = <FilterSelect label="Ordenar" value={sort} onChange={setSort} options={SORTS} allValue="recent" align="right" />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <label style={{ flex: 1, minWidth: isMobile ? '100%' : 0, display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border-l)', color: 'var(--ter)', boxSizing: 'border-box' }}>
          {Icons.search}
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13.5 }} />
          {q && <button onClick={() => setQ('')} aria-label="Borrar búsqueda" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ter)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>}
        </label>
        <FilterSelect label="Rubro" value={cat} onChange={setCat} options={catOptions} block={isMobile} />
        <FilterSelect label="Estado" value={stage} onChange={setStage} options={stageOptions} block={isMobile} align={isMobile ? 'right' : 'left'} />
        {!isMobile && sortSelect}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 12, minHeight: 32 }}>
        <span>
          {list.length} {list.length === 1 ? 'proyecto' : 'proyectos'}{list.length !== items.length ? ` de ${items.length}` : ''}
          {filtered && <button onClick={clear} style={{ marginLeft: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', textDecoration: 'underline', font: 'inherit', fontWeight: 600 }}>Limpiar filtros</button>}
        </span>
        {isMobile && sortSelect}
      </div>

      {shown.length ? (
        <div className="g-market-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCard}px, 1fr))`, gap: 18 }}>
          {shown.map(it => <AssetCard key={it.asset.id} asset={it.asset} nav={nav} showCode={showCode} />)}
        </div>
      ) : (
        <PCard style={{ padding: '36px 20px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, margin: '0 auto 12px', background: 'var(--surface2)', color: 'var(--ter)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.search}</div>
          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{items.length ? 'Ningún proyecto coincide' : emptyText}</div>
          {items.length > 0 && <button onClick={clear} style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', textDecoration: 'underline', fontFamily: 'var(--font-b)', fontSize: 13 }}>Limpiar filtros</button>}
        </PCard>
      )}

      {onMore && list.length > shown.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button onClick={onMore} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 999, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600 }}>
            Ver los {list.length} proyectos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
