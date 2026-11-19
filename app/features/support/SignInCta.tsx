import { useLocation, useNavigate } from 'react-router';
import { Icons, PBtn } from '~/components/ui';
import { EmptyState } from '~/features/profile/kit';
import { pathFor } from '~/lib/navigation';
import { useT } from '~/i18n/useT';

/** Sign-in prompt for signed-out visitors; returns to this same URL (incl. ?ticket=) after login. */
export default function SignInCta({ title, text }: { title: string; text: string }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { t } = useT('help');
  return (
    <EmptyState
      icon={Icons.lock}
      title={title}
      text={text}
      action={
        <PBtn variant="accent" small onClick={() => navigate(pathFor('login'), { state: { redirectTo: `${pathname}${search}` } })}>
          {t('shared.signIn')}
        </PBtn>
      }
    />
  );
}
