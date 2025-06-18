import type { CreateAuthSession, CreateContext } from '../data';
import type { AuthService } from '../service';
import type { GithubAccessToken, GithubUserData } from './data';
import type { User } from '../../user/data';
import type { Config } from './config';
import type { CookieOptions } from '../../../utils/cookie';

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly config: Config
  ) {}

  get stateCookieOptions(): CookieOptions {
    return this.config.stateCookie;
  }

  async create(githubUser: GithubUserData): Promise<CreateContext> {
    return await this.authService.createForce(
      { name: GithubService.PROVIDER, userId: githubUser.id },
      {
        username: githubUser.login,
        name: githubUser.name ?? githubUser.login,
        avatar: githubUser.avatar_url,
      }
    );
  }

  async exchangeCodeForToken(code: string, state: string): Promise<GithubAccessToken> {
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
    return (await response.json()) as unknown as GithubAccessToken;
  }

  async userData(accessToken: string): Promise<GithubUserData> {
    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'User-Agent': 'codeduel.it/1.0',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return (await response.json()) as unknown as GithubUserData;
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
    userAgent: CreateAuthSession['userAgent']
  ): Promise<void> {
    const sessions: CreateAuthSession = {
      userId,
      tokenId,
      ip,
      userAgent,
      provider: GithubService.PROVIDER,
    };

    await this.authService.createSession(sessions);
  }
}
