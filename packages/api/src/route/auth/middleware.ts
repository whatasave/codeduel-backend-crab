import { unauthorized, type Middleware } from '@codeduel-backend-crab/server';
import type { AuthService } from './service';

export class AuthMiddleware {
  constructor(private readonly service: AuthService) {}

  requireAuth(): Middleware {
    return (route) => ({
      ...route,
      handler: async (request) => {
        const token = request.headers.get('Authorization')?.split(' ')[1];
        if (!token) {
          return unauthorized('Missing token');
        }
        const user = await this.service.verifyAccessToken(token);
        request.user = {
          id: user.sub,
          username: user.username,
        };
        return await route.handler(request);
      },
    });
  }

  requireRole(role: string): Middleware {
    return (route) => ({
      ...route,
      handler: async (request) => {
        if (!request.user) return unauthorized('Missing user');
        if (!request.user.roles.includes(role)) return unauthorized('Insufficient permissions');
        return await route.handler(request);
      },
    });
  }
}
