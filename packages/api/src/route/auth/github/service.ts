import { Type, type Static } from '@sinclair/typebox';
import type { Tokens } from '../data';
import type { AuthService } from '../service';
import type { GithubAccessToken, GithubUserData } from './data';

export type GithubServiceConfig = Static<typeof GithubServiceConfig>;
export const GithubServiceConfig = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
});

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly config: GithubServiceConfig
  ) {}

  /**
   * Create a new user if it does not exist.
   *
   * @returns The tokens and cookies for the user.
   */
  async create(githubUser: GithubUserData): Promise<Tokens> {
    return await this.authService.createForce(
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

  /**
   * Get the access token from Github.
   *
   * More info: https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#web-application-flow
   */
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

  /**
   * Get the user data from Github.
   */
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

  /**
   * Create the authorization URL for Github.
   */
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
}
