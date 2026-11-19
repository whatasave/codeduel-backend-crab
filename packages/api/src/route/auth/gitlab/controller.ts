import { Type } from '@sinclair/typebox';
import { createCookie, parseCookies } from '@/utils/cookie';
import type { AuthService } from '@/route/auth/service';
import { randomUUIDv7 } from 'bun';
import type { GitlabService } from './service';
import { getIp } from '@/utils/ip';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';
import type { Logger } from '@codeduel-backend-crab/logger';
import { loggerDecorator } from '@/middleware/logger';

export class GitlabController {
  constructor(
    private readonly service: GitlabService,
    private readonly authService: AuthService,
    private readonly logger: Logger
  ) {}

  setup(): NodeBuilder {
    return routes({ middleware: loggerDecorator(this.logger) })
      .use(this.login)
      .use(this.callback);
  }

  login = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/',
      schema: {
        query: { redirect: Type.String() },
        response: {
          307: Type.String(),
        },
      },
      handler: async ({ query, request, logger }) => {
        const { redirect } = query;
        logger.debug('login.start', 'starting gitlab login', { redirect });

        const state = this.authService.encodeState({
          csrfToken: randomUUIDv7('base64url'),
          redirect,
          ip: getIp(request.headers),
          userAgent: request.headers.get('user-agent') ?? undefined,
        });
        const redirectUrl = this.service.authorizationUrl(state);

        const stateCookie = createCookie({ ...this.service.stateCookieOptions, value: state });

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

  callback = route<{ logger: Logger }>(
    validated({
      method: 'GET',
      path: '/callback',
      schema: {
        query: {
          code: Type.String(),
          state: Type.String(),
        },
        response: {
          307: Type.String(),
          400: Type.String(),
        },
      },
      handler: async ({ query, request, logger }) => {
        const { code, state } = query;

        const cookies = parseCookies(request.headers.get('cookie'));
        const cookieState = cookies[this.service.stateCookieOptions.name];

        if (state !== cookieState) {
          logger.warn('callback.stateMismatch', 'state mismatch or missing', {
            hasState: Boolean(state),
            hasCookieState: Boolean(cookieState),
          });
          return { status: 400, body: 'Invalid or missing state' };
        }
        const { redirect, ip, userAgent } = this.authService.decodeState(state);

        const token = await this.service.exchangeCodeForToken(code, logger);
        const gitlabUser = await this.service.userData(token.access_token, logger);
        const { user, permissions } = await this.service.create(gitlabUser, logger);

        const accessToken = await this.authService.accessToken(
          user,
          permissions.map((p) => p.id),
          Date.now(),
          logger
        );
        const jti = randomUUIDv7();
        const refreshToken = await this.authService.refreshToken(user, jti, Date.now(), logger);

        await this.service.createSession(user.id, jti, ip, userAgent, logger);

        logger.info('callback.success', 'successfully logged in via gitlab', {
          userId: user.id,
        });

        const accessCookie = createCookie({
          ...this.authService.accessTokenCookieOptions,
          value: accessToken,
        });
        const refreshCookie = createCookie({
          ...this.authService.refreshTokenCookieOptions,
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
