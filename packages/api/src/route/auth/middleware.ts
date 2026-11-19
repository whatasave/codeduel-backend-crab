import { middleware, type MiddlewareWrapper } from '@glass-cannon/router/middleware';
import type { AuthService } from './service';
import { json } from '@glass-cannon/server-bun';
import type { SessionUser } from './data';
import type { RouteContext } from '@glass-cannon/router';
import { Permissions } from '@/route/permission/permissions';
import type { Logger } from '@codeduel-backend-crab/logger';
import { parseCookies } from '../../utils/cookie';

export class AuthMiddleware {
  constructor(private readonly service: AuthService) {}

  requireAuth(): MiddlewareWrapper<
    { user: SessionUser; permissions: Permissions },
    { logger: Logger }
  > {
    return middleware<{ user: SessionUser; permissions: Permissions }, { logger: Logger }>(
      async (next, context) => {
        const { logger } = context;
        const user = await this.userSession(context);
        if (!user) {
          logger.debug('requireAuth.unauthenticated', 'request without a valid session');
          return json({
            status: 401,
            body: { error: 'Authentication required', code: 'MISSING_TOKEN' },
          });
        }

        return await next({ ...context, user, permissions: new Permissions(user.permissions) });
      }
    );
  }

  requirePermission(
    ...requiredPermissions: { resource: string; name: string }[]
  ): MiddlewareWrapper<
    { user: SessionUser; permissions: Permissions },
    { logger: Logger; user?: SessionUser | null; permissions?: Permissions }
  > {
    return middleware(async (next, context) => {
      const { logger } = context;
      const user = context.user !== undefined ? context.user : await this.userSession(context);
      if (!user) {
        logger.debug('requirePermission.unauthenticated', 'request without a valid session');
        return json({
          status: 401,
          body: { error: 'Authentication required', code: 'MISSING_TOKEN' },
        });
      }
      const permissions = context.permissions ?? new Permissions(user.permissions);

      if (!permissions.hasAll(requiredPermissions)) {
        logger.warn('requirePermission.forbidden', 'user lacks required permissions', {
          userId: user.id,
          required: requiredPermissions,
        });
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
      return await next({ ...context, user, permissions });
    });
  }

  private async userSession(
    context: RouteContext & { logger: Logger }
  ): Promise<SessionUser | null> {
    const { logger } = context;
    try {
      const cookies = parseCookies(context.request.headers.get('cookie'));
      const token = cookies[this.service.accessTokenCookieOptions.name];
      if (!token) return null;

      return await this.service.verifySession(token, logger);
    } catch (error) {
      logger.debug('userSession.invalid', 'cannot verify session token', {
        error: logger.errorData(error),
      });
      return null;
    }
  }
}
