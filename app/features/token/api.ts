import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { call, useApi } from '~/features/profile/api';

/** Platform utility token as served by GET /v1/token (public). */
export type PlatformTokenDto = paths['/v1/token']['get']['responses'][200]['content']['application/json'];

export function usePlatformToken() {
  return useApi('platform-token', () => call(api.GET('/v1/token')));
}
