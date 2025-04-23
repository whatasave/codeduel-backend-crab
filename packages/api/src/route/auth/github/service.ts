import { createCookie, getCookieValueByName } from '../../../utils/cookie';
import type { Authentication } from '../data';
import type { AuthService } from '../service';
import type { Config } from './config';
import type { GithubAccessToken, GithubUserData } from './data';

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly config: Config
  ) {}

  async authenticate(githubUser: GithubUserData): Promise<Authentication> {
    return await this.authService.authenticate(
      {
        username: githubUser.login,
        name: githubUser.name ?? githubUser.login,
        avatar: githubUser.avatar_url,
      },
      {
        name: GithubService.PROVIDER,
        userId: githubUser.id,
      }
    );
  }

  async accessToken(code: string, state: string): Promise<GithubAccessToken> {
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

  createStateCookie(state: string): string {
    return createCookie(this.config.stateCookie.name, state, this.config.stateCookie);
  }

  stateCookie(cookie: string): string | undefined {
    return getCookieValueByName(cookie, this.config.stateCookie.name);
  }

  createRedirectCookie(redirect: string): string {
    return createCookie('redirect', redirect, { maxAge: 60 });
  }

  redirectCookie(cookie: string): string | undefined {
    return getCookieValueByName(cookie, 'redirect');
  }
}
