import { type RouterGroup, temporaryRedirect, badRequest } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { GithubService } from './service';
import { Type, type Static } from '@sinclair/typebox';
import { createOauthState, parseOauthState } from '../../../utils/oauth';
import { CookieOptions, createCookie, parseCookies } from '../../../utils/cookie';

export type GithubControllerConfig = Static<typeof GithubControllerConfig>;
export const GithubControllerConfig = Type.Object({
  stateCookie: CookieOptions,
  accessTokenCookie: CookieOptions,
  refreshTokenCookie: CookieOptions,
});

export class GithubController {
  constructor(
    private readonly githubService: GithubService,
    private readonly config: GithubControllerConfig
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

      const state = createOauthState(redirect);
      const stateCookie = createCookie({ ...this.config.stateCookie, value: state });
      const redirectUrl = this.githubService.authorizationUrl(state);

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
      const cookieState = cookies[this.config.stateCookie.name];

      if (state !== cookieState) return badRequest({ message: 'Invalid or missing state' });
      const redirect = parseOauthState(state).state;

      const githubUser = await this.githubService.exchangeCodeForUserData(code, state);
      const authentication = await this.githubService.create(githubUser);

      const accessCookie = createCookie({
        ...this.config.accessTokenCookie,
        value: authentication.access,
      });
      const refreshCookie = createCookie({
        ...this.config.refreshTokenCookie,
        value: authentication.refresh,
      });

      return temporaryRedirect(`Redirecting to ${redirect}`, {
        'Content-Type': 'text/plain',
        Location: redirect,
        'Set-Cookie': [accessCookie, refreshCookie],
      });
    },
  });
}
