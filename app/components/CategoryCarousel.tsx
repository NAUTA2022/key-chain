import { useRef, type ReactNode } from 'react';

// "Explorar por categoría": a horizontal carousel of category tiles (icon +
// name) above the marketplace grids. Clicking a tile filters by it; clicking
// the active one again goes back to "Todos".

const svg = (d: ReactNode): ReactNode => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

const ICONS: Record<string, ReactNode> = {
  Todos: svg(<><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>),
  Inmuebles: svg(<><path d="M3.5 11L12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></>),
  Edificios: svg(<><rect x="4" y="3" width="10" height="18" rx="1.5" /><path d="M14 9h4.5a1.5 1.5 0 011.5 1.5V21" /><path d="M7.5 7h3M7.5 11h3M7.5 15h3M3 21h18" /></>),
  Campos: svg(<><path d="M12 21v-9" /><path d="M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5z" /><path d="M12 14c0-3-2.3-5-5.5-5 0 3 2.3 5 5.5 5z" /><path d="M6 21h12" /></>),
  Autos: svg(<><path d="M4 16.5V12l2-5h12l2 5v4.5" /><path d="M3.5 12h17" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /></>),
  Drones: svg(<><circle cx="5.5" cy="5.5" r="2.5" /><circle cx="18.5" cy="5.5" r="2.5" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /><rect x="9.5" y="9.5" width="5" height="5" rx="1.2" /><path d="M7.3 7.3l2.2 2.2M16.7 7.3l-2.2 2.2M7.3 16.7l2.2-2.2M16.7 16.7l-2.2-2.2" /></>),
  Hotelería: svg(<><rect x="3.5" y="7" width="17" height="12" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7" /><path d="M3.5 12h17" /></>),
  Energía: svg(<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />),
  Logística: svg(<><path d="M3 6.5h11v9.5H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>),
  Arte: svg(<><path d="M12 3.5a8.5 8.5 0 100 17c1.2 0 1.8-.9 1.4-2-.5-1.2.4-2.3 1.6-2.3H17a3.5 3.5 0 003.5-3.5c0-5-3.8-9.2-8.5-9.2z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7.5" r="1" /><circle cx="15" cy="8" r="1" /></>),
};
const FALLBACK = svg(<><path d="M3.5 12.5V5a1.5 1.5 0 011.5-1.5h7.5l8 8-9 9-8-8z" /><circle cx="8" cy="8" r="1.4" /></>);

const LABEL: Record<string, string> = { Todos: 'Todas' };

export type CategoryCarouselProps = {
  cats: readonly string[];
  value: string;
  onChange: (cat: string) => void;
  title?: string;
};

export default function CategoryCarousel({ cats, value, onChange, title = 'Explorar por categoría' }: CategoryCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <section className="catc" aria-label={title}>
      <div className="catc-head">
        <h2 className="catc-title">{title}</h2>
        <div className="catc-arrows">
          <button type="button" aria-label="Categorías anteriores" onClick={() => scroll(-1)}>‹</button>
          <button type="button" aria-label="Más categorías" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="catc-track" ref={track}>
        {cats.map(c => {
          const on = c === value;
          return (
            <button key={c} type="button" aria-pressed={on} className={`catc-item${on ? ' on' : ''}`}
              onClick={() => onChange(on && c !== 'Todos' ? 'Todos' : c)}>
              <span className="catc-ico">{ICONS[c] ?? FALLBACK}</span>
              <span className="catc-label">{LABEL[c] ?? c}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
