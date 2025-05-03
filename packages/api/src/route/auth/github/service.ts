import { createCookie, getCookieValueByName } from '../../../utils/cookie';
import type { AuthUser } from '../data';
import type { AuthService } from '../service';
import type { Config } from './config';
import type { GithubAccessToken, GithubUserData } from './data';

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly config: Config
  ) {}

  /**
   * Create a new user if it does not exist.
   *
   * @returns The tokens and cookies for the user.
   */
  async create(githubUser: GithubUserData): Promise<AuthUser> {
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

  /**
   * Create state cookie to prevent CSRF attacks.
   * This cookie is set when the user is redirected to Github for authentication.
   * The state is a random string that is used to verify the response from Github.
   */
  createStateCookie(state: string): string {
    return createCookie({
      ...this.config.stateCookie,
      name: this.config.stateCookie.name,
      value: state,
    });
  }

  /**
   * Get the state cookie value.
   * This cookie is set when the user is redirected to Github for authentication.
   * The state is a random string that is used to verify the response from Github.
   */
  stateCookie(cookie: string | null): string | undefined {
    return getCookieValueByName(cookie, this.config.stateCookie.name);
  }

  /**
   * Create redirect cookie to store the redirect URL after authentication.
   */
  createRedirectCookie(redirect: string): string {
    return createCookie({ name: 'redirect', value: redirect, maxAge: 60 });
  }

  /**
   * Get the redirect cookie value.
   */
  redirectCookie(cookie: string | null): string | undefined {
    return getCookieValueByName(cookie, 'redirect');
  }
}
