import { type RouterGroup, temporaryRedirect, badRequest } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { GithubService } from './service';
import { Type } from '@sinclair/typebox';
import { parseOauthState } from '../../../utils/oauth';
import { createCookie, parseCookies } from '../../../utils/cookie';
import type { AuthService } from '../service';

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

      const state = this.authService.createOauthState(redirect);
      const redirectUrl = this.service.authorizationUrl(state);

      const stateCookie = this.service.stateCookie(state);

      return temporaryRedirect(`Redirecting to ${redirectUrl}`, {
        'Content-Type': 'text/plain',
        'Set-Cookie': createCookie(stateCookie),
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

      const cookieState = this.service.stateFromCookie(parseCookies(headers.get('cookie')));

      if (state !== cookieState) return badRequest({ message: 'Invalid or missing state' });
      const redirect = parseOauthState(state).state;

      const githubUser = await this.service.exchangeCodeForUserData(code, state);
      const [_, user] = await this.service.create(githubUser);

      const accessToken = await this.authService.accessToken(user);
      const refreshToken = await this.authService.refreshToken(user);

      const accessCookie = this.authService.accessTokenCookie(accessToken);
      const refreshCookie = this.authService.refreshTokenCookie(refreshToken);

      return temporaryRedirect(`Redirecting to ${redirect}`, {
        'Content-Type': 'text/plain',
        Location: redirect,
        'Set-Cookie': [accessCookie, refreshCookie].map(createCookie),
      });
    },
  });
}
