import type { Logger } from '@codeduel-backend-crab/logger';

import type { CreateUser } from '@/route/user/data';

import type { AuthProvider } from '../provider';
import type { Config } from './config';
import type { GitlabAccessToken, GitlabUserData } from './data';

export class GitlabAuthProvider implements AuthProvider {
  constructor(private readonly config: Config) {}

  authorizationUrl(state: string): string {
    const url = new URL('https://gitlab.com/oauth/authorize');

    url.search = new URLSearchParams({
      client_id: this.config.applicationId,
      redirect_uri: this.config.callbackUri,
      response_type: 'code', // Tells GitLab you want to use the Authorization Code flow
      state,
      scope: 'api read_user profile',
    }).toString();

    return url.toString();
  }

  async createUser(
    query: Record<string, string>,
    logger?: Logger
  ): Promise<{ providerId: number; createUser: CreateUser }> {
    const { code } = query;
    if (!code) {
      logger?.warn('createUser.missingParams', 'Missing code in query parameters', {
        query,
      });
      throw new Error('Missing code in query parameters');
    }

    const token = await this.exchangeCodeForToken(code, logger);
    const gitlabUser = await this.userData(token.access_token, logger);

    return {
      providerId: gitlabUser.id,
      createUser: {
        username: gitlabUser.username,
        name: gitlabUser.name ?? gitlabUser.username,
        avatar: gitlabUser.avatar_url,
      },
    };
  }

  async exchangeCodeForToken(code: string, logger?: Logger): Promise<GitlabAccessToken> {
    logger?.debug('exchangeCodeForToken.start', 'exchanging code for token');

    const response = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: {
        'User-Agent': 'codeduel.it/1.0',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.applicationId,
        client_secret: this.config.secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.callbackUri,
      }),
    });

    if (!response.ok) {
      logger?.warn('exchangeCodeForToken.failed', 'GitLab token exchange failed', {
        status: response.status,
      });
    }

    const token = (await response.json()) as GitlabAccessToken;
    if (!token.access_token) {
      logger?.warn('exchangeCodeForToken.missingToken', 'GitLab did not return an access token', {
        status: response.status,
      });
    }

    return token;
  }

  async userData(accessToken: string, logger?: Logger): Promise<GitlabUserData> {
    logger?.debug('userData.start', 'fetching user data from gitlab');
    // or https://gitlab.com/oauth/userinfo
    const response = await fetch('https://gitlab.com/api/v4/user', {
      method: 'GET',
      headers: {
        'User-Agent': 'codeduel.it/1.0',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger?.warn('userData.failed', 'cannot fetch user data from GitLab', {
        status: response.status,
      });
    }

    return (await response.json()) as GitlabUserData;
  }
}
