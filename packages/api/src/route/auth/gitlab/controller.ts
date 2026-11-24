import type { Logger } from '@codeduel-backend-crab/logger';
import { route, routes, type NodeBuilder } from '@glass-cannon/router';
import { validated } from '@glass-cannon/typebox';
import { Type } from '@sinclair/typebox';
import { randomUUIDv7 } from 'bun';

import { loggerDecorator } from '@/middleware/logger';
import type { AuthService } from '@/route/auth/service';
import { createCookie, parseCookies } from '@/utils/cookie';
import { getIp } from '@/utils/ip';

import type { GitlabService } from './service';

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

        const now = Date.now();
        const jti = randomUUIDv7();
        const session = await this.service.createSession(user.id, jti, ip, userAgent, logger);
        const accessToken = await this.authService.accessToken(
          user,
          permissions.map((p) => p.id),
          session.id,
          now,
          logger
        );
        const refreshToken = await this.authService.refreshToken(
          user,
          session.id,
          jti,
          now,
          logger
        );

        logger.info('callback.success', 'successfully logged in via gitlab', {
          userId: user.id,
        });

        const responseHeaders = new Headers();
        for (const cookie of this.authService.sessionCookies({
          accessToken,
          refreshToken,
          sessionId: session.id,
        })) {
          responseHeaders.append('Set-Cookie', cookie);
        }
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
