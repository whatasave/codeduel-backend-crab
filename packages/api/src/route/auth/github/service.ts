import { Type, type Static } from '@sinclair/typebox';
import type { Auth } from '../data';
import type { AuthService } from '../service';
import type { GithubAccessToken, GithubUserData } from './data';
import { CookieOptions, type Cookies, type ResponseCookie } from '../../../utils/cookie';
import type { User } from '../../user/data';

export type GithubServiceConfig = Static<typeof GithubServiceConfig>;
export const GithubServiceConfig = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
  stateCookie: CookieOptions,
});

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly config: GithubServiceConfig
  ) {}

  async create(githubUser: GithubUserData): Promise<[Auth, User]> {
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

  async exchangeCodeForUserData(code: string, state: string): Promise<GithubUserData> {
    const token = await this.exchangeCodeForToken(code, state);
    return await this.userData(token.access_token);
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

  stateCookie(state: string): ResponseCookie {
    return {
      ...this.config.stateCookie,
      value: state,
    };
  }

  stateFromCookie(cookie: Cookies): string {
    const state = cookie[this.config.stateCookie.name];
    if (!state) throw new Error('Invalid or missing state');

    return state;
  }
}
