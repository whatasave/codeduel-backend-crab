import type { Logger } from '@codeduel-backend-crab/logger';
import type { RouteContext } from '@glass-cannon/router';
import { middleware, type MiddlewareWrapper } from '@glass-cannon/router/middleware';
import { json } from '@glass-cannon/server-bun';

import { Permissions } from '@/route/permission/permissions';
import { parseCookies } from '@/utils/cookie';

import type { SessionUser } from './data';
import type { AuthService } from './service';

/** Methods that must not change state, so they do not need a CSRF token. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

type AuthResult = { user: SessionUser; response?: never } | { user?: never; response: Response };

export class AuthMiddleware {
  constructor(private readonly service: AuthService) {}

  requireAuth(): MiddlewareWrapper<
    { user: SessionUser; permissions: Permissions },
    { logger: Logger }
  > {
    return middleware<{ user: SessionUser; permissions: Permissions }, { logger: Logger }>(
      async (next, context) => {
        const { user, response } = await this.authenticate(context);
        if (!user) return response;

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
      // When requireAuth already ran, the session and the CSRF token are already verified.
      const auth: AuthResult = context.user
        ? { user: context.user }
        : await this.authenticate(context);
      if (!auth.user) return auth.response;
      const { user } = auth;
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

  private async authenticate(context: RouteContext & { logger: Logger }): Promise<AuthResult> {
    const { logger, request } = context;
    const cookies = parseCookies(request.headers.get('cookie'));

    const user = await this.userSession(cookies, logger);
    if (!user) {
      logger.debug('auth.unauthenticated', 'request without a valid session');
      return {
        response: json({
          status: 401,
          body: { error: 'Authentication required', code: 'MISSING_TOKEN' },
        }),
      };
    }

    if (
      !SAFE_METHODS.has(request.method.toUpperCase()) &&
      !this.service.verifyCsrfRequest(request.headers, cookies, user.sessionId)
    ) {
      logger.warn('auth.invalidCsrf', 'missing or invalid csrf token', {
        userId: user.id,
        method: request.method,
      });
      return {
        response: json({
          status: 403,
          body: { error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF_TOKEN' },
        }),
      };
    }

    return { user };
  }

  private async userSession(
    cookies: Record<string, string>,
    logger: Logger
  ): Promise<SessionUser | null> {
    try {
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
