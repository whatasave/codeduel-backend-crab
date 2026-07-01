import type { GithubService } from './service';
import { Type } from '@sinclair/typebox';
import { createCookie, parseCookies } from '../../../utils/cookie';
import type { AuthService } from '../service';
import { randomUUIDv7 } from 'bun';
import { getIp } from '../../../utils/ip';
import type { TypeBoxGroup } from '@glass-cannon/typebox';
import { route } from '../../../utils/route';
import type { Logger } from '@codeduel-backend-crab/logger';
import { loggerDecorator } from '../../../middleware/logger';

export class GithubController {
  constructor(
    private readonly service: GithubService,
    private readonly authService: AuthService,
    private readonly logger: Logger
  ) {}

  setup(group: TypeBoxGroup): void {
    this.login(group);
    this.callback(group);
  }

  login = route(() => ({
    method: 'GET',
    path: '/',
    schema: {
      query: { redirect: Type.String() },
      response: {
        307: Type.String(),
      },
    },
    middleware: loggerDecorator(this.logger),
    handler: async ({ query, headers, logger }) => {
      const { redirect } = query;
      logger.debug('start', 'starting github login', { redirect });

      const state = this.authService.encodeState({
        csrfToken: randomUUIDv7('base64url'),
        redirect,
        ip: getIp(headers),
        userAgent: headers.get('user-agent') ?? undefined,
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
  }));

  callback = route(() => ({
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
    middleware: loggerDecorator(this.logger),
    handler: async ({ query, headers, logger }) => {
      const { code, state } = query;

      const cookies = parseCookies(headers.get('cookie'));
      const cookieState = cookies[this.service.stateCookieOptions.name];

      if (state !== cookieState) {
        logger.warn('stateMismatch', 'state mismatch or missing', {
          state,
          cookieState,
        });
        return { status: 400, body: 'Invalid or missing state' };
      }
      const { redirect, ip, userAgent } = this.authService.decodeState(state);

      const token = await this.service.exchangeCodeForToken(code, state, logger);
      const githubUser = await this.service.userData(token.access_token, logger);
      const { user, permissions } = await this.service.create(githubUser, logger);

      const accessToken = await this.authService.accessToken(
        user,
        permissions.map((p) => p.id),
        Date.now(),
        logger
      );
      const jti = randomUUIDv7();
      const refreshToken = await this.authService.refreshToken(user, jti, Date.now(), logger);

      await this.service.createSession(user.id, jti, ip, userAgent, logger);

      logger.debug('success', 'successfully logged in via github', { userId: user.id });

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
  }));
}
