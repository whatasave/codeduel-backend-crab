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
import type { AuthService } from '../service';

export class GithubController {
  constructor(
    private readonly githubService: GithubService,
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
      request: {},
      response: {
        307: Type.Undefined(),
      },
    },
    handler: async () => {
      const state = randomUUIDv7();
      const cookie = this.githubService.createCookie(state);
      const redirectUrl = this.githubService.getAuthorizationUrl(state);

      return temporaryRedirect(undefined, {
        'Set-Cookie': cookie,
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

      const user = await this.githubService.userData(githubToken.access_token);
      if (!user) return internalServerError({ message: 'Failed to get user data' });

      const authUser =
        (await this.githubService.userByProvider(user.id)) ??
        (await this.githubService.create(user));
      if (!authUser) return internalServerError({ message: 'Failed to get user' });

      const tokens = await this.authService.tokens(authUser);

      if (!tokens) return internalServerError({ message: 'Failed to get tokens' });
      const cookieAccessToken = this.githubService.createCookie(tokens.accessToken);
      const cookieRefreshToken = this.githubService.createCookie(tokens.refreshToken);
      // const cookieExpiresIn = this.githubService.createCookie(tokens.expiresIn.toString());

      const setCookie = [cookieAccessToken, cookieRefreshToken].join(',');

      return permanentRedirect(undefined, {
        Location: 'http://127.0.0.1:5000',
        'Set-Cookie': setCookie,
      });
    },
  });
}
