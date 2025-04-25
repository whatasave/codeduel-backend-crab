import { type RouterGroup, temporaryRedirect, badRequest } from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { GitlabService } from './service';
import { Type, type Static } from '@sinclair/typebox';
import { CookieOptions, createCookie, parseCookies } from '../../../utils/cookie';
import { createOauthState, parseOauthState } from '../../../utils/oauth';

export type GitlabControllerConfig = Static<typeof GitlabControllerConfig>;
export const GitlabControllerConfig = Type.Object({
  stateCookie: CookieOptions,
  accessTokenCookie: CookieOptions,
  refreshTokenCookie: CookieOptions,
});

export class GitlabController {
  constructor(
    private readonly gitlabService: GitlabService,
    private readonly config: GitlabControllerConfig
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
      const redirectUrl = this.gitlabService.authorizationUrl(state);

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

      const gitlabUser = await this.gitlabService.exchangeCodeForUserData(code);
      const authentication = await this.gitlabService.create(gitlabUser);

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
