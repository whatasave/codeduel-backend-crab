import { createCookie, getCookieValueByName } from '../../../utils/cookie';
import type { AuthUser } from '../data';
import type { AuthService } from '../service';
import type { Config } from './config';
import type { GitlabAccessToken, GitlabUserData } from './data';

export class GitlabService {
  private static readonly PROVIDER: string = 'gitlab';

  constructor(
    private readonly authService: AuthService,
    private readonly config: Config
  ) {}

  /**
   * Create a new user if it does not exist.
   *
   * @returns The tokens and cookies for the user.
   */
  async create(gitlabUser: GitlabUserData): Promise<AuthUser> {
    return await this.authService.createForce(
      {
        username: gitlabUser.username,
        name: gitlabUser.name ?? gitlabUser.username,
        avatar: gitlabUser.avatar_url,
      },
      {
        name: GitlabService.PROVIDER,
        userId: gitlabUser.id,
      }
    );
  }

  /**
   * Get the access token from Gitlab.
   *
   * More info: https://docs.gitlab.com/api/oauth2/#authorization-code-flow
   */
  async exchangeCodeForToken(code: string): Promise<GitlabAccessToken> {
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
    const res = (await response.json()) as unknown as GitlabAccessToken;
    return res;
  }

  /**
   * Get the user data from Gitlab.
   */
  async userData(accessToken: string): Promise<GitlabUserData> {
    // or https://gitlab.com/oauth/userinfo
    const response = await fetch('https://gitlab.com/api/v4/user', {
      method: 'GET',
      headers: {
        'User-Agent': 'codeduel.it/1.0',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const res = (await response.json()) as unknown as GitlabUserData;
    return res;
  }

  /**
   * Create the authorization URL for Gitlab.
   */
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

  /**
   * Create state cookie to prevent CSRF attacks.
   * This cookie is set when the user is redirected to Gitlab for authentication.
   * The state is a random string that is used to verify the response from Gitlab.
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
   * This cookie is set when the user is redirected to Gitlab for authentication.
   * The state is a random string that is used to verify the response from Gitlab.
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
