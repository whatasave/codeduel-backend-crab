import { Type, type Static } from '@sinclair/typebox';
import type { Auth } from '../data';
import type { AuthService } from '../service';
import type { GitlabAccessToken, GitlabUserData } from './data';
import { CookieOptions } from '../../../utils/cookie';
import type { User } from '../../user/data';

export type GitlabServiceConfig = Static<typeof GitlabServiceConfig>;
export const GitlabServiceConfig = Type.Object({
  applicationId: Type.String(),
  secret: Type.String(),
  callbackUri: Type.String(),
  stateCookie: CookieOptions,
});

export class GitlabService {
  private static readonly PROVIDER: string = 'gitlab';

  constructor(
    private readonly authService: AuthService,
    private readonly config: GitlabServiceConfig
  ) {}

  async create(gitlabUser: GitlabUserData): Promise<[Auth, User]> {
    return await this.authService.createForce(
      { name: GitlabService.PROVIDER, userId: gitlabUser.id },
      {
        username: gitlabUser.username,
        name: gitlabUser.name ?? gitlabUser.username,
        avatar: gitlabUser.avatar_url,
      }
    );
  }

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

  get stateCookieOptions(): CookieOptions {
    return this.config.stateCookie;
  }
}
