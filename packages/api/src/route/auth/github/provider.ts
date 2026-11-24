import type { Logger } from '@codeduel-backend-crab/logger';

import type { CreateUser } from '@/route/user/data';

import type { AuthProvider } from '../provider';
import type { Config } from './config';
import type { GithubAccessToken, GithubUserData } from './data';

export class GithubAuthProvider implements AuthProvider {
  constructor(private readonly config: Config) {}

  authorizationUrl(state: string, callbackUri: string): string {
    const url = new URL('https://github.com/login/oauth/authorize');

    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: callbackUri,
      scope: 'read:user,user:email',
      state,
      allow_signup: 'false',
    }).toString();

    return url.toString();
  }

  async createUser(
    query: Record<string, string>,
    _callbackUri: string,
    logger?: Logger
  ): Promise<{ providerId: number; createUser: CreateUser }> {
    const { code, state } = query;
    if (!code || !state) {
      logger?.warn('createUser.missingParams', 'Missing code or state in query parameters', {
        query,
      });
      throw new Error('Missing code or state in query parameters');
    }

    const token = await this.exchangeCodeForToken(code, state);
    const githubUser = await this.userData(token.access_token);

    return {
      providerId: githubUser.id,
      createUser: {
        username: githubUser.login,
        name: githubUser.name ?? githubUser.login,
        avatar: githubUser.avatar_url,
      },
    };
  }

  async exchangeCodeForToken(
    code: string,
    state: string,
    logger?: Logger
  ): Promise<GithubAccessToken> {
    logger?.debug('exchangeCodeForToken.start', 'exchanging code for token');

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'User-Agent': 'codeduel.it/1.0',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        state,
      }),
    });

    if (!response.ok) {
      logger?.warn('exchangeCodeForToken.failed', 'GitHub token exchange failed', {
        status: response.status,
      });
    }

    const token = (await response.json()) as GithubAccessToken;
    if (!token.access_token) {
      logger?.warn('exchangeCodeForToken.missingToken', 'GitHub did not return an access token', {
        status: response.status,
      });
    }

    return token;
  }

  async userData(accessToken: string, logger?: Logger): Promise<GithubUserData> {
    logger?.debug('userData.start', 'fetching user data from github');

    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'User-Agent': 'codeduel.it/1.0',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger?.warn('userData.failed', 'cannot fetch user data from GitHub', {
        status: response.status,
      });
    }

    return (await response.json()) as GithubUserData;
  }
}
