import { unauthorized, type Middleware } from '@codeduel-backend-crab/server';
import type { AuthService } from './service';

export function requireAuth(service: AuthService): Middleware {
  return (route) => ({
    ...route,
    handler: async (request) => {
      const token = request.headers.get('Authorization')?.split(' ')[1];
      if (!token) {
        return unauthorized('Missing token');
      }
      const user = await service.verifyAccessToken(token);
      request.user = {
        id: user.sub,
        username: user.username,
      };
      return await route.handler(request);
    },
  });
}
