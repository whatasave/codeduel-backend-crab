import {
  type RouterGroup,
  temporaryRedirect,
  permanentRedirect,
  badRequest,
} from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { GithubService } from './service';
import { randomUUIDv7 } from 'bun';
import { Type } from '@sinclair/typebox';

export class GithubController {
  constructor(private readonly githubService: GithubService) {}

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
          redirect: Type.Optional(Type.String()),
        },
      },
      response: {
        307: Type.Undefined(),
      },
    },
    handler: async ({ query }) => {
      const { redirect } = query;
      const state = randomUUIDv7();
      const cookie = this.githubService.createStateCookie(state);
      const redirectCookie = redirect && this.githubService.createRedirectCookie(redirect);
      const redirectUrl = this.githubService.authorizationUrl(state);

      return temporaryRedirect(undefined, {
        'Set-Cookie': [cookie, redirectCookie].filter(Boolean),
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
        308: Type.Undefined(),
        400: Type.Object({
          message: Type.String(),
        }),
      },
    },
    handler: async ({ query, headers }) => {
      const { code, state } = query;

      const cookieState = this.githubService.stateCookie(headers.get('cookie') ?? '');
      if (state !== cookieState) return badRequest({ message: 'Invalid or Missing state' });

      const githubToken = await this.githubService.exchangeCodeForToken(code, state);
      const githubUser = await this.githubService.userData(githubToken.access_token);

      const authentication = await this.githubService.create(githubUser);

      const cookies = authentication.cookies;
      const redirect = this.githubService.redirectCookie(headers.get('cookie') ?? '');

      return permanentRedirect(undefined, {
        ...(redirect !== undefined && { Location: redirect }),
        'Set-Cookie': [cookies.access, cookies.refresh],
      });
    },
  });
}
