import { randomBytes } from 'crypto';

import type { Logger } from '@codeduel-backend-crab/logger';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated, type Response } from '@glass-cannon/typebox';
import { Type, type Static, type TLiteral, type TUnion } from '@sinclair/typebox';
import { randomUUIDv7 } from 'bun';

import { loggerDecorator } from '@/middleware/logger';
import type { PermissionService } from '@/route/permission/service';
import type { UserService } from '@/route/user/service';
import { createCookie, parseCookies } from '@/utils/cookie';
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
    private readonly config: Config,
    private readonly baseUrl: `${string}/`
  ) {
    this.providers = {
      github: new GithubAuthProvider(config.providers.github),
      gitlab: new GitlabAuthProvider(config.providers.gitlab),
    };
    this.ProviderName = Type.Union(Object.keys(this.providers).map((p) => Type.Literal(p)));
  }

  private callbackUri(provider: string): string {
    return new URL(`${provider}/callback`, this.baseUrl).toString();
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
          const callbackUri = this.callbackUri(provider);
          const redirectUrl = authProvider.authorizationUrl(state, callbackUri, logger);

          const stateCookie = createCookie({
            ...this.config.providers.stateCookie,
            path: new URL(callbackUri).pathname,
            value: state,
          });

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
          const { providerId, createUser } = await authProvider.createUser(
            query,
            this.callbackUri(provider),
            logger
          );
          const { user, permissions } = await this.service.createForce(
            { name: provider, userId: providerId },
            createUser,
            logger
          );

          const { redirect } = this.service.decodeState(state);

          const permissionIds = permissions.map((p) => p.id);
          const now = Date.now();
          const tokenId = randomUUIDv7();
          const ip = getIp(request.headers);
          const userAgent = request.headers.get('user-agent') ?? undefined;
          const session = await this.service.createSession(
            {
              userId: user.id,
              provider,
              ip,
              userAgent,
              tokenId,
            },
            logger
          );

          const accessToken = await this.service.accessToken(
            user,
            permissionIds,
            session.id,
            now,
            logger
          );
          const refreshToken = await this.service.refreshToken(
            user,
            session.id,
            tokenId,
            now,
            logger
          );

          logger.info('callback.success', `successfully logged in via ${provider}`, {
            userId: user.id,
          });

          const responseHeaders = cookieHeaders(
            this.service.sessionCookies({
              accessToken,
              refreshToken,
              sessionId: session.id,
            })
          );
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
          403: InvalidCsrfResponse,
        },
      },
      handler: async ({ request, logger }) => {
        const cookies = parseCookies(request.headers.get('cookie'));
        const logout = (): Response<204, undefined> => ({
          status: 204,
          headers: cookieHeaders(this.service.clearSessionCookies()),
        });

        if (!this.service.hasCsrfCookie(cookies)) {
          logger.warn('refresh.csrfCookieMissing', 'no csrf cookie');
          return invalidCsrf();
        }

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
        const { sub: userId, jti, sid } = payload;

        if (!this.service.isCsrfTokenBound(sid, csrfToken)) {
          logger.warn('refresh.csrfInvalid', 'csrf token not bound to the session', { userId });
          return invalidCsrf();
        }

        const user = await this.userService.byId(userId, logger);
        if (!user) {
          logger.warn('refresh.userNotFound', 'user not found', { userId });
          return logout();
        }

        const permissions = await this.permissionService.byUserId(user.id, logger);

        const now = Date.now();
        const newJti = randomUUIDv7();
        const newAccessToken = await this.service.accessToken(
          user,
          permissions.map((p) => p.id),
          sid,
          now,
          logger
        );
        const newRefreshToken = await this.service.refreshToken(user, sid, newJti, now, logger);

        const responseHeaders = cookieHeaders(
          this.service.sessionCookies({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            sessionId: sid,
          })
        );

        const rotation = await this.service.rotateRefreshToken(payload, newJti, now, logger);
        if (rotation.status === 'reused') {
          logger.warn('refresh.tokenReused', 'refresh token reused, session revoked', {
            userId,
            sessionId: rotation.sessionId,
          });
          return logout();
        }
        if (rotation.status === 'invalid') {
          logger.warn('refresh.sessionNotFound', 'session not found', { jti, userId });
          return logout();
        }

        logger.info('refresh.success', 'refreshed tokens', { userId: user.id });

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
          403: InvalidCsrfResponse,
        },
      },
      handler: async ({ request, logger }) => {
        const cookies = parseCookies(request.headers.get('cookie'));

        if (!this.service.hasCsrfCookie(cookies)) {
          logger.warn('logout.csrfCookieMissing', 'no csrf cookie');
          return invalidCsrf();
        }

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
            const { sub: userId, sid } = await this.service.verifyRefreshToken(
              refreshToken,
              logger
            );
            if (!this.service.isCsrfTokenBound(sid, csrfToken)) {
              logger.warn('logout.csrfInvalid', 'csrf token not bound to the session', { userId });
              return invalidCsrf();
            }
            await this.service.deleteSession(sid, logger);
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
