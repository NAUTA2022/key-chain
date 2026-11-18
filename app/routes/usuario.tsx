import { useLocation, useNavigate } from 'react-router';
import type { Route } from './+types/usuario';
import Profile from '~/pages/Profile';
import { PBtn } from '~/components/ui';
import { USER_BASE, useNav, type NavState } from '~/lib/navigation';
import { seo } from '~/lib/seo';
import { useSocialQuery, useSocialSource } from '~/lib/social/source';

export const meta: Route.MetaFunction = ({ params }) =>
  seo({ title: 'Perfil de inversor', path: `${USER_BASE}/${encodeURIComponent(params.slug)}`, noindex: true });

// Someone else's profile: a common investor, or a company owner (then the
// badge on their photo leads to their company). Live: the slug is the user's
// id; demo: the person's name slug.
export default function Page({ params }: Route.ComponentProps) {
  const nav = useNav();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as NavState | null)?.from ?? null;
  const source = useSocialSource();
  const personQ = useSocialQuery(source, `person:${params.slug}`, s => s.person(params.slug), src => src.getPerson(params.slug));
  const person = personQ.data ?? null;
  // Back to wherever the user came from inside the app, or to the Feed.
  const back = () => (from ? navigate(-1) : nav('feed'));

  if (!person) {
    return (
      <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto', fontFamily: 'var(--font-b)', color: 'var(--ter)' }}>
        {personQ.loading || (!source && !personQ.error)
          ? <span role="status">Cargando perfil…</span>
          : <>No encontramos este perfil. <PBtn variant="secondary" small onClick={back}>Volver</PBtn></>}
      </div>
    );
  }
  // My own public URL shows my profile.
  if (person.isSelf) return <Profile key="me" nav={nav} />;
  const company = person.company;
  // Keyed by person: moving between two profiles remounts with fresh state.
  return (
    <Profile key={person.id} nav={nav} person={person} onBack={back}
      onCompany={company ? () => nav('empresa', company.slug) : undefined} />
  );
}
