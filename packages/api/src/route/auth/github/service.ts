import type { CreateAuthSession, CreateContext } from '../data';
import type { AuthService } from '../service';
import type { GithubAccessToken, GithubUserData } from './data';
import type { User } from '../../user/data';
import type { Config } from './config';
import type { CookieOptions } from '../../../utils/cookie';
import type { Logger } from '@codeduel-backend-crab/logger';

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly config: Config
  ) {}

  get stateCookieOptions(): CookieOptions {
    return this.config.stateCookie;
  }

  async create(githubUser: GithubUserData, logger?: Logger): Promise<CreateContext> {
    logger?.debug('create.start', 'creating github user', { githubId: githubUser.id });
    return await this.authService.createForce(
      { name: GithubService.PROVIDER, userId: githubUser.id },
      {
        username: githubUser.login,
        name: githubUser.name ?? githubUser.login,
        avatar: githubUser.avatar_url,
      },
      logger
    );
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
    return (await response.json()) as GithubAccessToken;
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
    return (await response.json()) as GithubUserData;
  }

  authorizationUrl(state: string): string {
    const url = new URL('https://github.com/login/oauth/authorize');

    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'read:user,user:email',
      state,
      allow_signup: 'false',
    }).toString();

    return url.toString();
  }

  async createSession(
    userId: User['id'],
    tokenId: CreateAuthSession['tokenId'],
    ip: CreateAuthSession['ip'],
    userAgent: CreateAuthSession['userAgent'],
    logger?: Logger
  ): Promise<void> {
    const sessions: CreateAuthSession = {
      userId,
      tokenId,
      ip,
      userAgent,
      provider: GithubService.PROVIDER,
    };

    await this.authService.createSession(sessions, logger);
  }
}
