import { randomBytes } from 'crypto';

import type { Logger } from '@codeduel-backend-crab/logger';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated, type Response } from '@glass-cannon/typebox';
import { Type, type TLiteral, type TUnion } from '@sinclair/typebox';
import { randomUUIDv7 } from 'bun';

import { loggerDecorator } from '@/middleware/logger';
import type { PermissionService } from '@/route/permission/service';
import type { UserService } from '@/route/user/service';
import { createCookie, parseCookies, removeCookie } from '@/utils/cookie';
import { getIp } from '@/utils/ip';

import type { Config } from './config';
import type { JwtRefreshToken } from './data';
import { GithubAuthProvider } from './github/provider';
import { GitlabAuthProvider } from './gitlab/provider';
import type { AuthProvider } from './provider';
import type { AuthService } from './service';

export class AuthController {
  private readonly providers: Record<string, AuthProvider>;
  private readonly ProviderName: TUnion<TLiteral<string>[]>;

  constructor(
    private readonly service: AuthService,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly logger: Logger,
    private readonly config: Config
  ) {
    this.providers = {
      github: new GithubAuthProvider(config.providers.github),
      gitlab: new GitlabAuthProvider(config.providers.gitlab),
    };
    this.ProviderName = Type.Union(Object.keys(this.providers).map((p) => Type.Literal(p)));
  }

  setup(): NodeBuilder {
    return routes({ middleware: loggerDecorator(this.logger) })
      .use(this.login())
      .use(this.callback())
      .use(this.refresh)
      .use(this.logout);
  }

  login(): NodeBuilder<{ logger: Logger }> {
    return route<{ logger: Logger }>(
      validated({
        method: 'GET',
        path: '/:provider/login',
        schema: {
          params: {
            provider: this.ProviderName,
          },
          query: {
            redirect: Type.String(),
          },
          response: {
            307: Type.String(),
          },
        },
        handler: async ({ params, query, logger }) => {
          const { provider } = params;
          const { redirect } = query;
          logger.debug('login.start', 'starting login', { provider, redirect });

          const state = this.service.encodeState({
            csrfToken: randomBytes(32).toString('base64url'),
            redirect,
          });
          const authProvider = this.providers[provider];
          if (!authProvider) throw new Error(`Invalid provider: ${provider}`);
          const redirectUrl = authProvider.authorizationUrl(state);

          const stateCookie = createCookie({ ...this.config.providers.stateCookie, value: state });

          return {
            status: 307,
            body: `Redirecting to ${redirectUrl}`,
            headers: {
              'Set-Cookie': stateCookie,
              Location: redirectUrl,
            },
          };
        },
      })
    );
  }

  callback(): NodeBuilder<{ logger: Logger }> {
    return route<{ logger: Logger }>(
      validated({
        method: 'GET',
        path: '/:provider/callback',
        schema: {
          params: {
            provider: this.ProviderName,
          },
          response: {
            307: Type.String(),
            400: Type.String(),
          },
        },
        handler: async ({ params, request, logger, url }) => {
          const query = url.searchParams.toJSON();
          const { provider } = params;
          const { state } = query;

          const cookies = parseCookies(request.headers.get('cookie'));
          const cookieState = cookies[this.config.providers.stateCookie.name];

          if (state === undefined || state !== cookieState) {
            logger.warn('callback.stateMismatch', 'state mismatch or missing', {
              hasState: Boolean(state),
              hasCookieState: Boolean(cookieState),
            });
            return { status: 400, body: 'Invalid or missing state' };
          }

          const authProvider = this.providers[provider];
          if (!authProvider) throw new Error(`Invalid provider: ${provider}`);
          const { providerId, createUser } = await authProvider.createUser(query);
          const { user, permissions } = await this.service.createForce(
            { name: provider, userId: providerId },
            createUser,
            logger
          );

          const { redirect } = this.service.decodeState(state);

          const permissionIds = permissions.map((p) => p.id);
          const now = Date.now();
          const accessToken = await this.service.accessToken(user, permissionIds, now, logger);

          const tokenId = randomUUIDv7();
          const refreshToken = await this.service.refreshToken(user, tokenId, now, logger);

          const ip = getIp(request.headers);
          const userAgent = request.headers.get('user-agent') ?? undefined;
          await this.service.createSession(
            {
              userId: user.id,
              provider,
              ip,
              userAgent,
              tokenId,
            },
            logger
          );

          logger.info('callback.success', 'successfully logged in via github', { userId: user.id });

          const accessCookie = createCookie({
            ...this.service.accessTokenCookieOptions,
            value: accessToken,
          });
          const refreshCookie = createCookie({
            ...this.service.refreshTokenCookieOptions,
            value: refreshToken,
          });

          const responseHeaders = new Headers();
          responseHeaders.append('Set-Cookie', accessCookie);
          responseHeaders.append('Set-Cookie', refreshCookie);
          responseHeaders.append('Location', redirect);

          return {
            status: 307,
            body: `Redirecting to ${redirect}`,
            headers: responseHeaders,
          };
        },
      })
    );
  }

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
