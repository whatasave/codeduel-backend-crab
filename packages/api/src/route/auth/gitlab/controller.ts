import { type RouterGroup, temporaryRedirect, badRequest } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import { Type } from '@sinclair/typebox';
import { createCookie, parseCookies } from '../../../utils/cookie';
import type { AuthService } from '../service';
import { randomUUIDv7 } from 'bun';
import type { GitlabService } from './service';
import { getIp } from '../../../utils/ip';

export class GitlabController {
  constructor(
    private readonly service: GitlabService,
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
      const { redirect, ip } = this.authService.decodeState(state);

      const token = await this.service.exchangeCodeForToken(code);
      const gitlabUser = await this.service.userData(token.access_token);
      const [_, user] = await this.service.create(gitlabUser);

      const accessToken = await this.authService.accessToken(user);
      const refreshToken = await this.authService.refreshToken(user);

      await this.service.createSession(
        user.id,
        refreshToken,
        ip,
        headers.get('user-agent') ?? undefined
      );

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
