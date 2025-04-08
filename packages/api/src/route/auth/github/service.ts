import type { User } from '../../user/data';
import type { UserService } from '../../user/service';
import type { Auth } from '../data';
import type { AuthService } from '../service';
import type { Config } from './config';
import type { GithubAccessToken, GithubUserData } from './data';

export class GithubService {
  private static readonly PROVIDER: string = 'github';

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly config: Config
  ) {}

  public async create(user: GithubUserData): Promise<User | undefined> {
    const newUser = await this.userService.create({
      username: user.login,
      name: user.name ?? user.login,
      avatar: user.avatarUrl ?? undefined,
      biography: user.bio ?? undefined,
    });

    if (!newUser) return undefined;

    const auth = await this.authService.create({
      userId: newUser.id,
      provider: GithubService.PROVIDER,
      providerId: user.id,
    });

    if (!auth) {
      await this.userService.delete(newUser.id);
      return undefined;
    }

    return newUser;
  }

  public async byId(providerId: Auth['providerId']): Promise<Auth | undefined> {
    return await this.authService.byProvider(GithubService.PROVIDER, providerId);
  }

  public async userByProvider(providerId: Auth['providerId']): Promise<User | undefined> {
    const auth = await this.byId(providerId);
    if (!auth) return undefined;

    const authUser = await this.userService.findById(auth.userId);
    if (!authUser) return undefined;

    return authUser;
  }

  public async accessToken(code: string, state: string): Promise<GithubAccessToken | undefined> {
    try {
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
      const data = (await response.json()) as unknown as GithubAccessToken;
      return data;
    } catch (e) {
      console.error('[ERROR]', e);
      return undefined;
    }
  }

  public async userData(accessToken: string): Promise<GithubUserData | undefined> {
    try {
      const response = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'User-Agent': 'codeduel.it/1.0',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = (await response.json()) as unknown as GithubUserData;
      return data;
    } catch (e) {
      console.error('[ERROR]', e);
      return undefined;
    }
  }
}
