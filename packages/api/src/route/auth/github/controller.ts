import {
  internalServerError,
  temporaryRedirect,
  permanentRedirect,
  type RouterGroup,
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
    handler: async ({ query, headers }) => {
      const { redirect } = query;
      const state = randomUUIDv7();
      const cookie = this.githubService.createStateCookie(state);
      const redirectCookie = this.githubService.createRedirectCookie(redirect);
      const redirectUrl = this.githubService.getAuthorizationUrl(state);

      return temporaryRedirect(undefined, {
        'Set-Cookie': [cookie, redirectCookie],
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
      },
    },
    handler: async ({ query, headers }) => {
      const { code, state } = query;

      if (!code || !state) return internalServerError({ message: 'Missing code or state' });
      const cookieState = this.githubService.getState(headers?.get('cookie') ?? '');

      if (state !== cookieState) return internalServerError({ message: 'Invalid state' });

      const githubToken = await this.githubService.accessToken(code, state);
      if (!githubToken) return internalServerError({ message: 'Failed to get access token' });

      const githubUser = await this.githubService.userData(githubToken.access_token);
      if (!githubUser) return internalServerError({ message: 'Failed to get user data' });

      const authentication = await this.githubService.authenticate(githubUser);
      if (!authentication) return internalServerError({ message: 'Failed to authenticate' });

      const cookies = authentication.cookies;
      console.log('Cookies:', cookies);

      const redirect = this.githubService.getRedirect(headers?.get('cookie') ?? '');
      console.log('Redirect:', redirect);

      return permanentRedirect(undefined, {
        ...(!redirect && { Location: redirect }),
        'Set-Cookie': [cookies.access, cookies.refresh],
      });
    },
  });
}
