import type { AuthService } from './service';
import { GithubController } from './github/controller';
import { GitlabController } from './gitlab/controller';
import { GithubService } from './github/service';
import { GitlabService } from './gitlab/service';
import type { Config } from './config';
import { createCookie, parseCookies, removeCookie } from '../../utils/cookie';
import { Type, type TUndefined } from '@sinclair/typebox';
import type { UserService } from '../user/service';
import { randomUUIDv7 } from 'bun';
import type { Response, TypeBoxGroup } from '@glass-cannon/typebox';
import { route } from '../../utils/route';
import type { PermissionService } from '../permission/service';
import type { Logger } from '@codeduel-backend-crab/logger';

export class AuthController {
  private readonly githubController: GithubController;
  private readonly gitlabController: GitlabController;
  private readonly logger: Logger;

  constructor(
    private readonly service: AuthService,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    config: Config,
    logger: Logger
  ) {
    this.logger = logger.group({ type: 'controller' });

    const githubLogger = logger.group({ type: 'github' });
    const gitlabLogger = logger.group({ type: 'gitlab' });

    this.githubController = new GithubController(
      new GithubService(this.service, config.github, githubLogger.group({ type: 'service' })),
      this.service,
      githubLogger.group({ type: 'controller' })
    );
    this.gitlabController = new GitlabController(
      new GitlabService(this.service, config.gitlab, gitlabLogger.group({ type: 'service' })),
      this.service,
      gitlabLogger.group({ type: 'controller' })
    );
  }

  setup(group: TypeBoxGroup<{ trace: string }>): void {
    this.validate(group);
    this.refresh(group);
    this.logout(group);

    this.githubController.setup(group.group({ prefix: '/github' }));
    this.gitlabController.setup(group.group({ prefix: '/gitlab' }));
  }

  validate = route({
    method: 'GET',
    path: '/validate',
    schema: {
      response: {},
    },
    handler: async () => {
      throw new Error('not implemented');
    },
  });

  refresh = route<{ trace: string }, unknown, { response: { 204: TUndefined } }>({
    method: 'POST',
    path: '/refresh',
    schema: {
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ headers, trace }) => {
      const cookies = parseCookies(headers.get('cookie'));
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
        this.logger.debug('refresh.noToken', 'no refresh token found', { trace });
        return logout();
      }

      const { sub: userId, jti } = await this.service.verifyRefreshToken(refreshToken);

      const session = await this.service.sessionByTokenId(jti);
      if (!session) {
        this.logger.warn('refresh.sessionNotFound', 'session not found', { jti, userId, trace });
        return logout();
      }

      const user = await this.userService.byId(userId);
      if (!user) {
        this.logger.warn('refresh.userNotFound', 'user not found', { userId });
        return logout();
      }

      const permissions = await this.permissionService.byUserId(user.id);

      const newAccessToken = await this.service.accessToken(
        user,
        permissions.map((p) => p.id)
      );
      const newJti = randomUUIDv7();
      const newRefreshToken = await this.service.refreshToken(user, newJti);

      await this.service.updateSession(session.id, newJti);

      this.logger.info('refresh.success', 'refreshed tokens', { userId: user.id });

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
  });

  logout = route({
    method: 'POST',
    path: '/logout',
    schema: {
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ headers }) => {
      const cookies = parseCookies(headers.get('cookie'));
      const refreshToken = cookies[this.service.refreshTokenCookieOptions.name];

      if (refreshToken) {
        try {
          const { sub: userId, jti } = await this.service.verifyRefreshToken(refreshToken);
          await this.service.deleteSessionTokenId(jti);
          this.logger.info('logout.success', 'user logged out', { userId });
        } catch (error) {
          this.logger.debug('logout.verifyError', 'failed to verify refresh token during logout', {
            error: this.logger.errorData(error),
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
  });
}
