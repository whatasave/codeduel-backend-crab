import {
  type RouterGroup,
  temporaryRedirect,
  permanentRedirect,
  badRequest,
} from '@codeduel-backend-crab/server';
import { validated } from '@codeduel-backend-crab/server/validation';
import type { GitlabService } from './service';
import { randomUUIDv7 } from 'bun';
import { Type } from '@sinclair/typebox';

export class GitlabController {
  constructor(private readonly gitlabService: GitlabService) {}

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
      const cookie = this.gitlabService.createStateCookie(state);
      const redirectCookie = redirect && this.gitlabService.createRedirectCookie(redirect); // TODO move it to the auth service
      const redirectUrl = this.gitlabService.authorizationUrl(state);

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

      const cookieState = this.gitlabService.stateCookie(headers.get('cookie'));
      if (state !== cookieState) return badRequest({ message: 'Invalid or Missing state' });

      const gitlabToken = await this.gitlabService.exchangeCodeForToken(code);
      const gitlabUser = await this.gitlabService.userData(gitlabToken.access_token);

      const authentication = await this.gitlabService.create(gitlabUser);

      const cookies = authentication.cookies;
      const redirect = this.gitlabService.redirectCookie(headers.get('cookie'));

      return permanentRedirect(undefined, {
        ...(redirect !== undefined && { Location: redirect }),
        'Set-Cookie': [cookies.access, cookies.refresh],
      });
    },
  });
}
