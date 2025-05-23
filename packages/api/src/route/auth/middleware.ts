import type { Middleware } from '@glass-cannon/router/middleware';
import type { AuthService } from './service';
import { json } from '@glass-cannon/server-bun';
import type { SessionUser } from './data';
import type { RouteContext } from '@glass-cannon/router';

export class AuthMiddleware {
  constructor(private readonly service: AuthService) {}

  requireAuth(): Middleware<{ user: SessionUser }> {
    return async (next, context) => {
      const user = await this.userSession(context);
      if (!user) {
        return json({ status: 401, body: 'Missing access token' });
      }

      return await next({ user });
    };
  }

  requirePermission(resource: string | null, name: string): Middleware<{ user: SessionUser }> {
    return async (next, context) => {
      const user =
        'user' in context ? (context.user as SessionUser | null) : await this.userSession(context);
      if (!user) {
        return json({ status: 401, body: 'Missing access token' });
      }

      if (!context.user.roles.includes(role)) {
        return json({ status: 403, body: 'Insufficient permissions' });
      }
      return next({ user });
    };
  }

  private async userSession(context: RouteContext): Promise<SessionUser | null> {
    const token = context.headers.get('Authorization')?.split(' ')[1];
    if (!token) return null;

    const payload = await this.service.verifyAccessToken(token);
    return {
      id: payload.sub,
      username: payload.username,
      roles: [],
    };
  }
}
