import type { Logger } from '@codeduel-backend-crab/logger';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated, type Response } from '@glass-cannon/typebox';
import { Type } from '@sinclair/typebox';
import { randomUUIDv7 } from 'bun';

import { loggerDecorator } from '@/middleware/logger';
import type { PermissionService } from '@/route/permission/service';
import type { UserService } from '@/route/user/service';
import { createCookie, parseCookies, removeCookie } from '@/utils/cookie';

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
        },
      },
      handler: async ({ request, logger }) => {
        const cookies = parseCookies(request.headers.get('cookie'));
        const logout = (): Response<204, undefined> => {
          const refreshTokenCookie = removeCookie(this.service.refreshTokenCookieOptions);
          const accessTokenCookie = removeCookie(this.service.accessTokenCookieOptions);

          const headers = new Headers();
          headers.append('Set-Cookie', accessTokenCookie);
          headers.append('Set-Cookie', refreshTokenCookie);

          return {
            status: 204,
            headers,
          };
        };

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

        const newAccessToken = await this.service.accessToken(
          user,
          permissions.map((p) => p.id),
          Date.now(),
          logger
        );
        const newJti = randomUUIDv7();
        const newRefreshToken = await this.service.refreshToken(user, newJti, Date.now(), logger);

        await this.service.updateSession(session.id, newJti, logger);

        logger.info('refresh.success', 'refreshed tokens', { userId: user.id });

        const accessTokenCookie = createCookie({
          ...this.service.accessTokenCookieOptions,
          value: newAccessToken,
        });
        const refreshTokenCookie = createCookie({
          ...this.service.refreshTokenCookieOptions,
          value: newRefreshToken,
        });

        const responseHeaders = new Headers();
        responseHeaders.append('Set-Cookie', accessTokenCookie);
        responseHeaders.append('Set-Cookie', refreshTokenCookie);

        return {
          status: 204,
          headers: responseHeaders,
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
        },
      },
      handler: async ({ request, logger }) => {
        const cookies = parseCookies(request.headers.get('cookie'));
        const refreshToken = cookies[this.service.refreshTokenCookieOptions.name];

        if (!refreshToken) {
          logger.debug('logout.noToken', 'logout without refresh token, clearing cookies only');
        } else {
          try {
            const { sub: userId, jti } = await this.service.verifyRefreshToken(
              refreshToken,
              logger
            );
            await this.service.deleteSessionTokenId(jti, logger);
            logger.info('logout.success', 'user logged out', { userId });
          } catch (error) {
            logger.warn('logout.verifyError', 'failed to verify refresh token during logout', {
              error: logger.errorData(error),
            });
          }
        }

        const accessTokenCookie = removeCookie(this.service.accessTokenCookieOptions);
        const refreshTokenCookie = removeCookie(this.service.refreshTokenCookieOptions);

        const responseHeaders = new Headers();
        responseHeaders.append('Set-Cookie', accessTokenCookie);
        responseHeaders.append('Set-Cookie', refreshTokenCookie);

        return {
          status: 204,
          headers: responseHeaders,
        };
      },
    })
  );
}
