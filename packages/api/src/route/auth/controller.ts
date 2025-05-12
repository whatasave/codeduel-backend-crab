import { internalServerError, noContent, type RouterGroup } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { AuthService } from './service';
import { GithubController } from './github/controller';
import { GitlabController } from './gitlab/controller';
import { GithubService } from './github/service';
import { GitlabService } from './gitlab/service';
import type { Config } from './config';
import { createCookie, parseCookies, removeCookie } from '../../utils/cookie';
import { Type } from '@sinclair/typebox';
import type { UserService } from '../user/service';
import { randomUUIDv7 } from 'bun';

export class AuthController {
  private readonly githubController: GithubController;
  private readonly gitlabController: GitlabController;

  constructor(
    private readonly service: AuthService,
    private readonly userService: UserService,
    config: Config
  ) {
    this.githubController = new GithubController(
      new GithubService(this.service, config.github),
      this.service
    );
    this.gitlabController = new GitlabController(
      new GitlabService(this.service, config.gitlab),
      this.service
    );
  }

  setup(group: RouterGroup): void {
    group.route(this.validate);
    group.route(this.refresh);
    group.route(this.logout);

    this.githubController.setup(group.group({ prefix: '/github' }));
    this.gitlabController.setup(group.group({ prefix: '/gitlab' }));
  }

  validate = validated({
    method: 'GET',
    path: '/validate',
    schema: {
      request: {},
      response: {},
    },
    handler: async () => {
      return internalServerError({ error: 'Path not implemented' });
    },
  });

  refresh = validated({
    method: 'GET',
    path: '/refresh',
    schema: {
      request: {},
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ headers }) => {
      const cookies = parseCookies(headers.get('cookie'));
      const logout = (): ReturnType<typeof noContent> => {
        const refreshTokenCookie = removeCookie(this.service.refreshTokenCookieOptions);
        const accessTokenCookie = removeCookie(this.service.accessTokenCookieOptions);

        return noContent(undefined, {
          'Set-Cookie': [accessTokenCookie, refreshTokenCookie],
        });
      };

      const refreshToken = cookies[this.service.refreshTokenCookieOptions.name];
      if (!refreshToken) return logout();
      const { sub: userId, jti } = await this.service.verifyRefreshToken(refreshToken);

      const session = await this.service.sessionByTokenId(jti);
      if (!session) return logout();

      const user = await this.userService.byId(userId);
      if (!user) return logout();

      const newAccessToken = await this.service.accessToken(user);
      const newJti = randomUUIDv7();
      const newRefreshToken = await this.service.refreshToken(user, newJti);

      await this.service.updateSession(session.id, newJti);

      const accessTokenCookie = createCookie({
        ...this.service.accessTokenCookieOptions,
        value: newAccessToken,
      });
      const refreshTokenCookie = createCookie({
        ...this.service.refreshTokenCookieOptions,
        value: newRefreshToken,
      });

      return noContent(undefined, {
        'Set-Cookie': [accessTokenCookie, refreshTokenCookie],
      });
    },
  });

  logout = validated({
    method: 'GET',
    path: '/logout',
    schema: {
      request: {},
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ headers }) => {
      const cookies = parseCookies(headers.get('cookie'));
      const refreshToken = cookies[this.service.refreshTokenCookieOptions.name];

      if (refreshToken) {
        const { jti } = await this.service.verifyRefreshToken(refreshToken);
        await this.service.deleteSessionTokenId(jti);
      }

      const accessTokenCookie = removeCookie(this.service.accessTokenCookieOptions);
      const refreshTokenCookie = removeCookie(this.service.refreshTokenCookieOptions);

      return noContent(undefined, {
        'Set-Cookie': [accessTokenCookie, refreshTokenCookie],
      });
    },
  });
}
