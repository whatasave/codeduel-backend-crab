import type { Middleware } from '@glass-cannon/router/middleware';
import type { AuthService } from './service';
import { json } from '@glass-cannon/server-bun';
import type { SessionUser } from './data';
import type { RouteContext } from '@glass-cannon/router';
import { Permissions } from '../permission/permissions';

export class AuthMiddleware {
  constructor(private readonly service: AuthService) {}

  requireAuth(): Middleware<{ user: SessionUser; permissions: Permissions }> {
    return async (next, context) => {
      const user = await this.userSession(context);
      if (!user) {
        return json({ status: 401, body: 'Missing access token' });
      }

      return await next({ user, permissions: new Permissions(user.permissions) });
    };
  }

  requirePermission(
    resource: string | undefined,
    name: string
  ): Middleware<{ user: SessionUser; permissions: Permissions }> {
    return async (next, context) => {
      const user =
        'user' in context ? (context.user as SessionUser | null) : await this.userSession(context);
      if (!user) {
        return json({ status: 401, body: 'Missing access token' });
      }
      const permissions =
        'permissions' in context
          ? (context.permissions as Permissions)
          : new Permissions(user.permissions);

      if (!permissions.has(resource, name)) {
        return json({ status: 403, body: 'Insufficient permissions' });
      }
      return next({ user, permissions });
    };
  }

  private async userSession(context: RouteContext): Promise<SessionUser | null> {
    const token = context.headers.get('Authorization')?.split(' ')[1];
    if (!token) return null;

    return await this.service.verifySession(token);
  }
}
