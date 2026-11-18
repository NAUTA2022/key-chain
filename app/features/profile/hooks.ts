import { useCallback, useState } from 'react';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { useSession } from '~/lib/session';
import { call, checkFile, errorText, IMAGE_TYPES, MB, uploadFile, useApi } from './api';

// Typed reads for the live profile (/v1/me/*). Each hook is idle until the session is ready.

type Json<P extends keyof paths, M extends 'get' | 'post' | 'patch'> = paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T : never;

export type Me = Json<'/v1/me', 'get'>;
export type Preferences = Me['preferences'];
export type Stats = Json<'/v1/me/stats', 'get'>;
export type ActivityItem = Json<'/v1/me/activity', 'get'>[number];
export type Statement = Json<'/v1/me/statements', 'get'>;
export type SessionRow = Json<'/v1/me/sessions', 'get'>[number];
export type UpdateProfileBody = NonNullable<paths['/v1/me']['patch']['requestBody']>['content']['application/json'];
export type ProfileLocale = NonNullable<UpdateProfileBody['locale']>;

function useAuthedKey(key: string): string | null {
  const { status, user } = useSession();
  return status === 'authenticated' && user ? `${user.id}:${key}` : null;
}

export function useMe() {
  return useApi(useAuthedKey('me'), () => call(api.GET('/v1/me')));
}

export function useStats() {
  return useApi(useAuthedKey('stats'), () => call(api.GET('/v1/me/stats')));
}

export function useActivity() {
  return useApi(useAuthedKey('activity'), () => call(api.GET('/v1/me/activity')));
}

export function useSessions() {
  return useApi(useAuthedKey('sessions'), () => call(api.GET('/v1/me/sessions')));
}

export function useStatement(year: number) {
  return useApi(useAuthedKey(`statement:${year}`), () => call(api.GET('/v1/me/statements', { params: { query: { year } } })));
}

export const LOCALE_LABEL: Record<ProfileLocale, string> = { es: 'Español', en: 'English' };

/** Avatar upload/removal (POST/DELETE /v1/me/avatar), refreshing the session user afterwards. */
export function useAvatarActions() {
  const { refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useCallback(async (file: File) => {
    const problem = checkFile(file, { types: IMAGE_TYPES, maxBytes: 2 * MB });
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const { data, error: e } = await uploadFile<Me>('/v1/me/avatar', file);
    if (data) await refresh();
    else setError(errorText(e, 'No pudimos subir la foto. Probá con otra imagen.', { validation_failed: 'La imagen no es válida. Usá PNG, JPG o WebP de hasta 2 MB.', bad_request: 'La imagen no es válida. Usá PNG, JPG o WebP de hasta 2 MB.' }));
    setBusy(false);
  }, [refresh]);
  const remove = useCallback(async () => {
    setBusy(true);
    setError(null);
    const { data, error: e } = await call(api.DELETE('/v1/me/avatar'));
    if (data) await refresh();
    else setError(errorText(e, 'No pudimos quitar la foto.'));
    setBusy(false);
  }, [refresh]);
  return { busy, error, setError, upload, remove };
}
export type AvatarActions = ReturnType<typeof useAvatarActions>;
