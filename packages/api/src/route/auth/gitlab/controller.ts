import { type RouterGroup, temporaryRedirect, badRequest } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { GitlabService } from './service';
import { Type } from '@sinclair/typebox';
import { createCookie, parseCookies } from '../../../utils/cookie';
import type { AuthService } from '../service';

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
        query: {
          redirect: Type.String(),
        },
      },
      response: {
        307: Type.String(),
      },
    },
    handler: async ({ query }) => {
      const { redirect } = query;

      const state = this.authService.state(redirect);
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
      const redirect = this.authService.parseState(state).state;

      const token = await this.service.exchangeCodeForToken(code);
      const gitlabUser = await this.service.userData(token.access_token);
      const [_, user] = await this.service.create(gitlabUser);

      const accessToken = await this.authService.accessToken(user);
      const refreshToken = await this.authService.refreshToken(user);

      const accessCookie = createCookie({
        ...this.service.stateCookieOptions,
        value: accessToken,
      });
      const refreshCookie = createCookie({
        ...this.service.stateCookieOptions,
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
