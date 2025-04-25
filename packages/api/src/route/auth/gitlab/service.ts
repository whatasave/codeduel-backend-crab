import { Type, type Static } from '@sinclair/typebox';
import type { Tokens } from '../data';
import type { AuthService } from '../service';
import type { GitlabAccessToken, GitlabUserData } from './data';

export type GitlabServiceConfig = Static<typeof GitlabServiceConfig>;
export const GitlabServiceConfig = Type.Object({
  applicationId: Type.String(),
  secret: Type.String(),
  callbackUri: Type.String(),
});

export class GitlabService {
  private static readonly PROVIDER: string = 'gitlab';

  constructor(
    private readonly authService: AuthService,
    private readonly config: GitlabServiceConfig
  ) {}

  /**
   * Create a new user if it does not exist.
   *
   * @returns The tokens and cookies for the user.
   */
  async create(gitlabUser: GitlabUserData): Promise<Tokens> {
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
    return (await response.json()) as unknown as GitlabAccessToken;
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
    return (await response.json()) as unknown as GitlabUserData;
  }

  async exchangeCodeForUserData(code: string): Promise<GitlabUserData> {
    const token = await this.exchangeCodeForToken(code);
    return await this.userData(token.access_token);
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
}
