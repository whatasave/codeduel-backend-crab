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
import type { Response, TypeBoxGroup } from '@glass-cannon/typebox';
import { route } from '../../utils/route';
import type { PermissionService } from '../permission/service';

export class AuthController {
  private readonly githubController: GithubController;
  private readonly gitlabController: GitlabController;

  constructor(
    private readonly service: AuthService,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
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

  setup(group: TypeBoxGroup): void {
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

  refresh = route({
    method: 'POST',
    path: '/refresh',
    schema: {
      response: {
        204: Type.Undefined(),
      },
    },
    handler: async ({ headers }) => {
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
      if (!refreshToken) return logout();
      const { sub: userId, jti } = await this.service.verifyRefreshToken(refreshToken);

      const session = await this.service.sessionByTokenId(jti);
      if (!session) return logout();

      const user = await this.userService.byId(userId);
      if (!user) return logout();

      const permissions = await this.permissionService.byUserId(user.id);

      const newAccessToken = await this.service.accessToken(
        user,
        permissions.map((p) => p.id)
      );
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
        const { jti } = await this.service.verifyRefreshToken(refreshToken);
        await this.service.deleteSessionTokenId(jti);
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
