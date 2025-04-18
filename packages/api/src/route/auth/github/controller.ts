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
      request: {},
      response: {
        307: Type.Object({}),
      },
    },
    handler: async () => {
      const state = randomUUIDv7();
      const cookie = this.githubService.createCookie(state);
      const redirectUrl = this.githubService.getAuthorizationUrl(state);

      return temporaryRedirect({
        headers: {
          'Set-Cookie': cookie,
          Location: redirectUrl,
        },
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
        308: Type.Object({}),
      },
    },
    handler: async ({ query }) => {
      const { code, state } = query;

      if (!code || !state) return internalServerError({ message: 'Missing code or state' });
      const cookieState = this.githubService.getState(state);

      if (state !== cookieState) return internalServerError({ message: 'Invalid state' });

      const token = await this.githubService.accessToken(code, state);
      if (!token) return internalServerError({ message: 'Failed to get access token' });

      const user = await this.githubService.userData(token.accessToken);
      if (!user) return internalServerError({ message: 'Failed to get user data' });

      const authUser =
        (await this.githubService.userByProvider(user.id)) ??
        (await this.githubService.create(user));

      if (!authUser) return internalServerError({ message: 'Failed to get user' });

      const tokens = await this.githubService.tokens(authUser);

      if (!tokens) return internalServerError({ message: 'Failed to get tokens' });
      const cookieAccessToken = this.githubService.createCookie(tokens.accessToken);
      const cookieRefreshToken = this.githubService.createCookie(tokens.refreshToken);
      const cookieExpiresIn = this.githubService.createCookie(tokens.expiresIn.toString());

      return permanentRedirect({
        headers: {
          Location: 'http://localhost',
          'Set-Cookie': [cookieAccessToken, cookieRefreshToken, cookieExpiresIn].join(','),
        },
      });
    },
  });
}
