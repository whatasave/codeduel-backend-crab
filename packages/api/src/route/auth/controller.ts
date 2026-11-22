import type { Logger } from '@codeduel-backend-crab/logger';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated, type Response } from '@glass-cannon/typebox';
import { Type, type Static } from '@sinclair/typebox';
import { randomUUIDv7 } from 'bun';

import { loggerDecorator } from '@/middleware/logger';
import type { PermissionService } from '@/route/permission/service';
import type { UserService } from '@/route/user/service';
import { parseCookies } from '@/utils/cookie';

import type { Config } from './config';
import type { JwtRefreshToken } from './data';
import { GithubController } from './github/controller';
import { GithubService } from './github/service';
import { GitlabController } from './gitlab/controller';
import { GitlabService } from './gitlab/service';
import type { AuthService } from './service';

export class AuthController {
  private readonly githubController: GithubController;
  private readonly gitlabController: GitlabController;

  constructor(
    private readonly service: AuthService,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly logger: Logger,
    config: Config
  ) {
    this.githubController = new GithubController(
      new GithubService(this.service, config.github),
      this.service,
      logger.group({ type: 'github' })
    );
    this.gitlabController = new GitlabController(
      new GitlabService(this.service, config.gitlab),
      this.service,
      logger.group({ type: 'gitlab' })
    );
  }

  setup(): NodeBuilder {
    const ownRoutes = routes({ middleware: loggerDecorator(this.logger) })
      .use(this.validate)
      .use(this.refresh)
      .use(this.logout);

    return routes()
      .use(ownRoutes)
      .group({ prefix: '/github' }, this.githubController.setup())
      .group({ prefix: '/gitlab' }, this.gitlabController.setup());
  }

  validate = route(
    validated({
      method: 'GET',
      path: '/validate',
      schema: {
        response: {},
      },
      handler: async () => {
        throw new Error('not implemented');
      },
    })
  );

  refresh = route<{ logger: Logger }>(
    validated({
      method: 'POST',
      path: '/refresh',
      schema: {
        response: {
          204: Type.Undefined(),
          403: InvalidCsrfResponse,
        },
      },
      handler: async ({ request, logger }) => {
        const cookies = parseCookies(request.headers.get('cookie'));
        const logout = (): Response<204, undefined> => ({
          status: 204,
          headers: cookieHeaders(this.service.clearSessionCookies()),
        });

        // No CSRF cookie at all (session from before CSRF, or the cookie got lost): the client
        // cannot recover by itself because the session cookies are HttpOnly, so clear them.
        if (!this.service.hasCsrfCookie(cookies)) {
          logger.info('refresh.csrfCookieMissing', 'no csrf cookie, clearing session cookies');
          return logout();
        }

        // CSRF next: a cross-site request must not be able to rotate or clear any cookie.
        const csrfToken = this.service.submittedCsrfToken(request.headers, cookies);
        if (!csrfToken) {
          logger.warn('refresh.csrfMissing', 'missing or mismatching csrf token');
          return invalidCsrf();
        }

        const refreshToken = cookies[this.service.refreshTokenCookieOptions.name];
        if (!refreshToken) {
          logger.debug('refresh.noToken', 'no refresh token found');
          return logout();
        }

        let payload: JwtRefreshToken;
        try {
          payload = await this.service.verifyRefreshToken(refreshToken, logger);
        } catch {
          return logout();
        }
        const { sub: userId, jti } = payload;

        if (!this.service.isCsrfTokenBound(jti, csrfToken)) {
          logger.warn('refresh.csrfInvalid', 'csrf token not bound to the session', { userId });
          return invalidCsrf();
        }

        const session = await this.service.sessionByTokenId(jti);
        if (!session) {
          logger.warn('refresh.sessionNotFound', 'session not found', { jti, userId });
          return logout();
        }

        const user = await this.userService.byId(userId, logger);
        if (!user) {
          logger.warn('refresh.userNotFound', 'user not found', { userId });
          return logout();
        }

        const permissions = await this.permissionService.byUserId(user.id, logger);

        const newJti = randomUUIDv7();
        const newAccessToken = await this.service.accessToken(
          user,
          permissions.map((p) => p.id),
          newJti,
          Date.now(),
          logger
        );
        const newRefreshToken = await this.service.refreshToken(user, newJti, Date.now(), logger);

        await this.service.updateSession(session.id, newJti, logger);

        logger.info('refresh.success', 'refreshed tokens', { userId: user.id });

        return {
          status: 204,
          headers: cookieHeaders(
            this.service.sessionCookies({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              sessionId: newJti,
            })
          ),
        };
      },
    })
  );

  logout = route<{ logger: Logger }>(
    validated({
      method: 'POST',
      path: '/logout',
      schema: {
        response: {
          204: Type.Undefined(),
          403: InvalidCsrfResponse,
        },
      },
      handler: async ({ request, logger }) => {
        const cookies = parseCookies(request.headers.get('cookie'));

        // No CSRF cookie at all: clear the HttpOnly session cookies so the user is not stuck.
        // The DB session is left to expire, since this request is not CSRF-verified.
        if (!this.service.hasCsrfCookie(cookies)) {
          logger.info('logout.csrfCookieMissing', 'no csrf cookie, clearing session cookies');
          return {
            status: 204,
            headers: cookieHeaders(this.service.clearSessionCookies()),
          };
        }

        // CSRF next: a cross-site request with the user's cookies must not log them out.
        const csrfToken = this.service.submittedCsrfToken(request.headers, cookies);
        if (!csrfToken) {
          logger.warn('logout.csrfMissing', 'missing or mismatching csrf token');
          return invalidCsrf();
        }

        const refreshToken = cookies[this.service.refreshTokenCookieOptions.name];
        if (!refreshToken) {
          logger.debug('logout.noToken', 'logout without refresh token, clearing cookies only');
        } else {
          try {
            const { sub: userId, jti } = await this.service.verifyRefreshToken(
              refreshToken,
              logger
            );
            if (!this.service.isCsrfTokenBound(jti, csrfToken)) {
              logger.warn('logout.csrfInvalid', 'csrf token not bound to the session', { userId });
              return invalidCsrf();
            }
            await this.service.deleteSessionTokenId(jti, logger);
            logger.info('logout.success', 'user logged out', { userId });
          } catch (error) {
            logger.warn('logout.verifyError', 'failed to verify refresh token during logout', {
              error: logger.errorData(error),
            });
          }
        }

        return {
          status: 204,
          headers: cookieHeaders(this.service.clearSessionCookies()),
        };
      },
    })
  );
}

const InvalidCsrfResponse = Type.Object({
  error: Type.String(),
  code: Type.Literal('INVALID_CSRF_TOKEN'),
});

function invalidCsrf(): Response<403, Static<typeof InvalidCsrfResponse>> {
  return {
    status: 403,
    body: { error: 'Invalid or missing CSRF token', code: 'INVALID_CSRF_TOKEN' },
  };
}

function cookieHeaders(cookies: string[]): Headers {
  const headers = new Headers();
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return headers;
}
