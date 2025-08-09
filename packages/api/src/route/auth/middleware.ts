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
        return json({
          status: 401,
          body: { error: 'Authentication required', code: 'MISSING_TOKEN' },
        });
      }

      return await next({ user, permissions: new Permissions(user.permissions) });
    };
  }

  requirePermission(
    ...requiredPermissions: { resource?: string; name: string }[]
  ): Middleware<{ user: SessionUser; permissions: Permissions }> {
    return async (next, context) => {
      const user =
        'user' in context ? (context.user as SessionUser | null) : await this.userSession(context);
      if (!user) {
        return json({
          status: 401,
          body: { error: 'Authentication required', code: 'MISSING_TOKEN' },
        });
      }
      const permissions =
        'permissions' in context
          ? (context.permissions as Permissions)
          : new Permissions(user.permissions);

      if (!permissions.hasAll(requiredPermissions)) {
        return json({
          status: 403,
          body: {
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: requiredPermissions,
            userPermissions: permissions.toArray(),
          },
        });
      }
      return next({ user, permissions });
    };
  }

  private async userSession(context: RouteContext): Promise<SessionUser | null> {
    try {
      const authHeader = context.headers.get('Authorization');
      if (!authHeader) return null;

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (!token) return null;

      return await this.service.verifySession(token);
    } catch (error) {
      console.error('Auth error:', error);
      return null;
    }
  }
}
