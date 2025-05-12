import { type RouterGroup, temporaryRedirect, badRequest } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { GithubService } from './service';
import { Type } from '@sinclair/typebox';
import { createCookie, parseCookies } from '../../../utils/cookie';
import type { AuthService } from '../service';
import { randomUUIDv7 } from 'bun';
import { getIp } from '../../../utils/ip';

export class GithubController {
  constructor(
    private readonly service: GithubService,
    private readonly authService: AuthService
  ) {}

  setup(group: RouterGroup): void {
    group.route(this.login);
    group.route(this.callback);
  }

  login = validated({
    method: 'GET',
    path: '/',
    schema: {
      request: {
        query: { redirect: Type.String() },
      },
      response: {
        307: Type.String(),
      },
    },
    handler: async ({ query, headers }) => {
      const { redirect } = query;

      const state = this.authService.encodeState({
        csrfToken: randomUUIDv7('base64url'),
        redirect,
        ip: getIp(headers),
        userAgent: headers.get('user-agent') ?? undefined,
      });
      const redirectUrl = this.service.authorizationUrl(state);

      const stateCookie = createCookie({ ...this.service.stateCookieOptions, value: state });

      return temporaryRedirect(`Redirecting to ${redirectUrl}`, {
        'Content-Type': 'text/plain',
        'Set-Cookie': stateCookie,
        Location: redirectUrl,
      });
    },
  });

  callback = validated({
    method: 'GET',
    path: '/callback',
    schema: {
      request: {
        query: {
          code: Type.String(),
          state: Type.String(),
        },
      },
      response: {
        307: Type.String(),
        400: Type.Object({
          message: Type.String(),
        }),
      },
    },
    handler: async ({ query, headers }) => {
      const { code, state } = query;

      const cookies = parseCookies(headers.get('cookie'));
      const cookieState = cookies[this.service.stateCookieOptions.name];

      if (state !== cookieState) return badRequest({ message: 'Invalid or missing state' });
      const { redirect, ip, userAgent } = this.authService.decodeState(state);

      const token = await this.service.exchangeCodeForToken(code, state);
      const githubUser = await this.service.userData(token.access_token);
      const [_, user] = await this.service.create(githubUser);

      const accessToken = await this.authService.accessToken(user);
      const jti = randomUUIDv7('base64url');
      const refreshToken = await this.authService.refreshToken(user, jti);

      await this.service.createSession(user.id, jti, ip, userAgent);

      const accessCookie = createCookie({
        ...this.authService.accessTokenCookieOptions,
        value: accessToken,
      });
      const refreshCookie = createCookie({
        ...this.authService.refreshTokenCookieOptions,
        value: refreshToken,
      });

      return temporaryRedirect(`Redirecting to ${redirect}`, {
        'Content-Type': 'text/plain',
        Location: redirect,
        'Set-Cookie': [accessCookie, refreshCookie],
      });
    },
  });
}
